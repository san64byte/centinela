import { base64ToBuffer, bufferToBase64, generateIvBytes } from './encoding';

const PBKDF2_ITERATIONS = 600_000;
const AES_KEY_LENGTH = 256;

export async function deriveMasterKey(
  masterPassword: string,
  vaultSaltBase64: string,
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBuffer(vaultSaltBase64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: AES_KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function wrapVaultKey(
  vaultKey: CryptoKey,
  masterKey: CryptoKey,
): Promise<{ wrappedKey: string; iv: string }> {
  const iv = generateIvBytes();

  const wrapped = await crypto.subtle.wrapKey('raw', vaultKey, masterKey, {
    name: 'AES-GCM',
    iv,
  });

  return {
    wrappedKey: bufferToBase64(wrapped),
    iv: bufferToBase64(iv),
  };
}

export async function deriveMasterPasswordVerifier(
  masterPassword: string,
  salt: string,
): Promise<{ authProof: string; verifier: string }> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const authBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(`centinela-auth-verifier:${salt}`),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    256,
  );

  const authProof = bufferToBase64(authBits);
  const verifierBuffer = await crypto.subtle.digest('SHA-256', authBits);
  const verifier = bufferToBase64(verifierBuffer);

  return { authProof, verifier };
}

export async function unwrapVaultKey(
  wrappedKeyBase64: string,
  ivBase64: string,
  masterKey: CryptoKey,
  extractable: boolean = false,
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    base64ToBuffer(wrappedKeyBase64),
    masterKey,
    { name: 'AES-GCM', iv: base64ToBuffer(ivBase64) },
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    extractable,
    ['encrypt', 'decrypt'],
  );
}

export async function rewrapVaultKey(
  vaultKey: CryptoKey,
  newMasterKey: CryptoKey,
): Promise<{ wrappedKey: string; iv: string }> {
  return wrapVaultKey(vaultKey, newMasterKey);
}

/**
 * Unwraps the vault key directly from the master password and salt.
 * Combines PBKDF2 master key derivation and AES-GCM unwrap.
 */
export async function unlockVaultKey(
  masterPassword: string,
  vaultSaltBase64: string,
  wrappedKeyBase64: string,
  ivBase64: string,
  extractable: boolean = false,
): Promise<CryptoKey> {
  const masterKey = await deriveMasterKey(masterPassword, vaultSaltBase64);
  return unwrapVaultKey(wrappedKeyBase64, ivBase64, masterKey, extractable);
}
