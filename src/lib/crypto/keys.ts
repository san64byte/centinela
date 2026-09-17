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

export async function unwrapVaultKey(
  wrappedKeyBase64: string,
  ivBase64: string,
  masterKey: CryptoKey,
  extractable: boolean = true,
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
