import { generateSalt } from './encoding';
import {
  deriveMasterKey,
  deriveMasterPasswordVerifier,
  generateVaultKey,
  rewrapVaultKey,
  wrapVaultKey,
} from './keys';

export async function setupMasterPassword(masterPassword: string, vaultSalt: string) {
  const masterKey = await deriveMasterKey(masterPassword, vaultSalt);
  const vaultKey = await generateVaultKey();
  const { wrappedKey, iv } = await wrapVaultKey(vaultKey, masterKey);
  const { verifier } = await deriveMasterPasswordVerifier(masterPassword, vaultSalt);

  return {
    vaultKey,
    encryptedVaultKey: wrappedKey,
    encryptedVaultKeyIv: iv,
    vaultVerifier: verifier,
  };
}

export async function changeMasterPassword(
  currentVaultKey: CryptoKey,
  currentMasterPassword: string,
  currentVaultSalt: string,
  newMasterPassword: string,
  providedNewSalt?: string,
) {
  // authProof from OLD master-password
  const { authProof: oldAuthProof } = await deriveMasterPasswordVerifier(
    currentMasterPassword,
    currentVaultSalt,
  );

  // Create new salt and verifier for NEW master-password
  const newVaultSalt = providedNewSalt || generateSalt();
  const { verifier: newVerifier } = await deriveMasterPasswordVerifier(
    newMasterPassword,
    newVaultSalt,
  );

  const newMasterKey = await deriveMasterKey(newMasterPassword, newVaultSalt);
  const { wrappedKey, iv } = await rewrapVaultKey(currentVaultKey, newMasterKey);

  return {
    authProof: oldAuthProof,
    newVaultSalt,
    newVaultVerifier: newVerifier,
    encryptedVaultKey: wrappedKey,
    encryptedVaultKeyIv: iv,
  };
}
