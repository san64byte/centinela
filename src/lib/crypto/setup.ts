import { deriveMasterKey, generateVaultKey, rewrapVaultKey, wrapVaultKey } from './keys';

export async function setupMasterPassword(masterPassword: string, vaultSalt: string) {
  const masterKey = await deriveMasterKey(masterPassword, vaultSalt);
  const vaultKey = await generateVaultKey();
  const { wrappedKey, iv } = await wrapVaultKey(vaultKey, masterKey);

  return {
    vaultKey,
    encryptedVaultKey: wrappedKey,
    encryptedVaultKeyIv: iv,
  };
}

export async function changeMasterPassword(
  currentVaultKey: CryptoKey,
  newMasterPassword: string,
  vaultSalt: string,
) {
  const newMasterKey = await deriveMasterKey(newMasterPassword, vaultSalt);
  const { wrappedKey, iv } = await rewrapVaultKey(currentVaultKey, newMasterKey);

  return {
    encryptedVaultKey: wrappedKey,
    encryptedVaultKeyIv: iv,
  };
}
