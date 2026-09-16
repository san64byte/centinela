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

/**
 * Digunakan saat user mengganti master password.
 *
 * Hasil encryptedVaultKey dan encryptedVaultKeyIv
 * diperbarui di tabel user.
 */
export async function changeMasterPassword(
  currentVaultKey: CryptoKey,
  newMasterPassword: string,
  vaultSalt: string,
) {
  // Buat masterKey baru dari master password yang baru
  const newMasterKey = await deriveMasterKey(newMasterPassword, vaultSalt);

  // Bungkus ulang vaultKey dengan masterKey baru
  const { wrappedKey, iv } = await rewrapVaultKey(currentVaultKey, newMasterKey);

  // Kembalikan data yang akan disimpan ke database
  return {
    encryptedVaultKey: wrappedKey,
    encryptedVaultKeyIv: iv,
  };
}
