import { describe, it, expect } from 'vitest';
import { generateSalt } from '@/lib/crypto/encoding';
import {
  deriveMasterKey,
  generateVaultKey,
  wrapVaultKey,
  unwrapVaultKey,
  rewrapVaultKey,
} from '@/lib/crypto/keys';
import { encryptData, decryptData } from '@/lib/crypto/encryption';
import { AccountData, NoteData } from '@/types/vault-type';

describe('Vault Cryptography (Zero-Knowledge & Envelope Encryption)', () => {
  const masterPassword = 'SuperSecretMasterPassword123!';
  const vaultSalt = generateSalt();

  it('harus berhasil melakukan derive masterKey dari password dan salt', async () => {
    const masterKey = await deriveMasterKey(masterPassword, vaultSalt);

    expect(masterKey).toBeDefined();
    expect(masterKey.type).toBe('secret');
    expect(masterKey.algorithm.name).toBe('AES-GCM');
    expect(masterKey.extractable).toBe(false);
  });

  it('harus menghasilkan masterKey yang konsisten dari password dan salt yang sama', async () => {
    const key1 = await deriveMasterKey(masterPassword, vaultSalt);
    const key2 = await deriveMasterKey(masterPassword, vaultSalt);

    const vaultKey = await generateVaultKey();
    const wrapped = await wrapVaultKey(vaultKey, key1);

    // Kunci kedua harus bisa membuka wrapped key dari kunci pertama
    const unwrapped = await unwrapVaultKey(wrapped.wrappedKey, wrapped.iv, key2);
    expect(unwrapped).toBeDefined();
  });

  it('harus berhasil generate, wrap, dan unwrap vaultKey', async () => {
    const masterKey = await deriveMasterKey(masterPassword, vaultSalt);
    const originalVaultKey = await generateVaultKey();

    const { wrappedKey, iv } = await wrapVaultKey(originalVaultKey, masterKey);
    expect(wrappedKey).toBeTypeOf('string');
    expect(iv).toBeTypeOf('string');

    const unwrappedVaultKey = await unwrapVaultKey(wrappedKey, iv, masterKey);
    expect(unwrappedVaultKey).toBeDefined();

    // Pastikan kunci yang di-unwrap bisa mengenkripsi dan mendekripsi data
    const testData = { message: 'hello world' };
    const encrypted = await encryptData(testData, unwrappedVaultKey);
    const decrypted = await decryptData(encrypted, originalVaultKey);

    expect(decrypted).toEqual(testData);
  });

  it('harus berhasil mengenkripsi dan mendekripsi data akun (ACCOUNT)', async () => {
    const vaultKey = await generateVaultKey();

    const accountData: AccountData = {
      email: 'user@example.com',
      username: 'jokosantoso',
      phone: '+628123456789',
      password: 'P@ssw0rdSecure!',
      pin: '123456',
      notes: 'Akun rahasia',
    };

    const encrypted = await encryptData(accountData, vaultKey);
    expect(encrypted.ciphertext).toBeTypeOf('string');
    expect(encrypted.iv).toBeTypeOf('string');

    const decrypted = await decryptData<AccountData>(encrypted, vaultKey);
    expect(decrypted).toEqual(accountData);
  });

  it('harus berhasil mengenkripsi dan mendekripsi data catatan (NOTE)', async () => {
    const vaultKey = await generateVaultKey();

    const noteData: NoteData = {
      content: 'Kumpulan seed phrase crypto rahasia: apple banana cherry...',
    };

    const encrypted = await encryptData(noteData, vaultKey);
    const decrypted = await decryptData<NoteData>(encrypted, vaultKey);

    expect(decrypted).toEqual(noteData);
  });

  it('harus mendukung penggantian master password (rewrap vaultKey) tanpa merusak dekripsi data', async () => {
    const oldMasterPassword = 'OldPassword123!';
    const newMasterPassword = 'NewStrongPassword456!';

    const oldMasterKey = await deriveMasterKey(oldMasterPassword, vaultSalt);
    const newMasterKey = await deriveMasterKey(newMasterPassword, vaultSalt);

    const vaultKey = await generateVaultKey();

    // Data dienkripsi dengan vaultKey saat ini
    const sensitiveData: AccountData = {
      email: 'vault@secret.com',
      password: 'MyVeryLongPassword789#',
    };
    const encryptedItem = await encryptData(sensitiveData, vaultKey);

    // Ganti Master Password (rewrap vaultKey)
    const { wrappedKey: newWrappedKey, iv: newIv } = await rewrapVaultKey(vaultKey, newMasterKey);

    // Buka vaultKey menggunakan newMasterKey
    const recoveredVaultKey = await unwrapVaultKey(newWrappedKey, newIv, newMasterKey);

    // Data lama harus tetap bisa didekripsi dengan recoveredVaultKey
    const decryptedData = await decryptData<AccountData>(encryptedItem, recoveredVaultKey);
    expect(decryptedData).toEqual(sensitiveData);

    // oldMasterKey sekarang harus gagal membuka newWrappedKey
    await expect(unwrapVaultKey(newWrappedKey, newIv, oldMasterKey)).rejects.toThrow();
  });

  it('harus gagal mendekripsi jika ciphertext atau IV dirusak (tampered)', async () => {
    const vaultKey = await generateVaultKey();
    const encrypted = await encryptData({ secret: 'classified' }, vaultKey);

    // Rusak ciphertext
    const tamperedPayload = {
      ciphertext: encrypted.ciphertext.substring(0, encrypted.ciphertext.length - 4) + 'AAAA',
      iv: encrypted.iv,
    };

    await expect(decryptData(tamperedPayload, vaultKey)).rejects.toThrow();
  });
});
