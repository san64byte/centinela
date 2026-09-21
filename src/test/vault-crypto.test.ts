import { describe, it, expect } from 'vitest';
import { generateSalt } from '@/lib/crypto/encoding';
import {
  deriveMasterKey,
  deriveMasterPasswordVerifier,
  generateVaultKey,
  wrapVaultKey,
  unwrapVaultKey,
  rewrapVaultKey,
  unlockVaultKey,
} from '@/lib/crypto/keys';
import { encryptData, decryptData, decryptVaultItem } from '@/lib/crypto/encryption';
import { AccountVaultPayload, NoteVaultPayload } from '@/types/vault-type';

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

  it('harus berhasil mengenkripsi dan mendekripsi data akun (ACCOUNT) flat', async () => {
    const vaultKey = await generateVaultKey();

    const accountData: AccountVaultPayload = {
      type: 'ACCOUNT',
      title: 'Google Account',
      url: 'https://google.com',
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

    const decrypted = await decryptData<AccountVaultPayload>(encrypted, vaultKey);
    expect(decrypted).toEqual(accountData);
  });

  it('harus berhasil mengenkripsi dan mendekripsi data catatan (NOTE) flat', async () => {
    const vaultKey = await generateVaultKey();

    const noteData: NoteVaultPayload = {
      type: 'NOTE',
      title: 'Crypto Seed',
      content: 'Kumpulan seed phrase crypto rahasia: apple banana cherry...',
    };

    const encrypted = await encryptData(noteData, vaultKey);
    const decrypted = await decryptData<NoteVaultPayload>(encrypted, vaultKey);

    expect(decrypted).toEqual(noteData);
  });

  it('harus mendukung penggantian master password (rewrap vaultKey) tanpa merusak dekripsi data', async () => {
    const oldMasterPassword = 'OldPassword123!';
    const newMasterPassword = 'NewStrongPassword456!';

    const oldMasterKey = await deriveMasterKey(oldMasterPassword, vaultSalt);
    const newMasterKey = await deriveMasterKey(newMasterPassword, vaultSalt);

    const vaultKey = await generateVaultKey();

    // Data dienkripsi dengan vaultKey saat ini
    const sensitiveData: AccountVaultPayload = {
      type: 'ACCOUNT',
      title: 'Secret Vault',
      email: 'vault@secret.com',
      password: 'MyVeryLongPassword789#',
    };
    const encryptedItem = await encryptData(sensitiveData, vaultKey);

    // Ganti Master Password (rewrap vaultKey)
    const { wrappedKey: newWrappedKey, iv: newIv } = await rewrapVaultKey(vaultKey, newMasterKey);

    // Buka vaultKey menggunakan newMasterKey
    const recoveredVaultKey = await unwrapVaultKey(newWrappedKey, newIv, newMasterKey);

    // Data lama harus tetap bisa didekripsi dengan recoveredVaultKey
    const decryptedData = await decryptData<AccountVaultPayload>(encryptedItem, recoveredVaultKey);
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

  it('harus mencegah ekspor raw key di browser saat extractable disetel false (default)', async () => {
    const masterKey = await deriveMasterKey(masterPassword, vaultSalt);
    const vaultKey = await generateVaultKey();
    const { wrappedKey, iv } = await wrapVaultKey(vaultKey, masterKey);

    // Buka kunci secara default (extractable: false)
    const secureVaultKey = await unwrapVaultKey(wrappedKey, iv, masterKey, false);

    expect(secureVaultKey.extractable).toBe(false);
    // Mencoba ekspor raw key harus ditolak oleh Web Crypto API
    await expect(crypto.subtle.exportKey('raw', secureVaultKey)).rejects.toThrow();
  });

  it('harus berhasil generate authProof dan verifier yang konsisten untuk verifikasi master password', async () => {
    const { authProof: proof1, verifier: verifier1 } = await deriveMasterPasswordVerifier(
      masterPassword,
      vaultSalt,
    );
    const { authProof: proof2, verifier: verifier2 } = await deriveMasterPasswordVerifier(
      masterPassword,
      vaultSalt,
    );

    expect(proof1).toBe(proof2);
    expect(verifier1).toBe(verifier2);

    // Verifier harus berbeda untuk password yang berbeda
    const { verifier: differentVerifier } = await deriveMasterPasswordVerifier(
      'DifferentPassword999!',
      vaultSalt,
    );
    expect(differentVerifier).not.toBe(verifier1);
  });

  it('harus berhasil unlockVaultKey langsung dari password dan salt (PBKDF2 + AES-GCM unwrap)', async () => {
    const vaultKey = await generateVaultKey();
    const masterKey = await deriveMasterKey(masterPassword, vaultSalt);
    const { wrappedKey, iv } = await wrapVaultKey(vaultKey, masterKey);

    // Buka kunci langsung via unlockVaultKey helper
    const unlockedKey = await unlockVaultKey(masterPassword, vaultSalt, wrappedKey, iv, false);
    expect(unlockedKey).toBeDefined();
    expect(unlockedKey.algorithm.name).toBe('AES-GCM');
    expect(unlockedKey.extractable).toBe(false);

    // Kunci hasil unwrap harus bisa mengenkripsi dan mendekripsi data
    const payload = await encryptData({ test: 'unlockVaultKey' }, unlockedKey);
    const decrypted = await decryptData(payload, unlockedKey);
    expect(decrypted).toEqual({ test: 'unlockVaultKey' });

    // Password yang salah harus melempar error
    await expect(
      unlockVaultKey('WrongPassword123!', vaultSalt, wrappedKey, iv, false),
    ).rejects.toThrow();
  });

  it('harus berhasil mendeskripsi item Prisma menggunakan decryptVaultItem helper', async () => {
    const vaultKey = await generateVaultKey();
    const accountPayload: AccountVaultPayload = {
      type: 'ACCOUNT',
      title: 'GitHub',
      username: 'joko@example.com',
      password: 'SecretGithubPassword123!',
      url: 'https://github.com',
    };

    const encrypted = await encryptData(accountPayload, vaultKey);

    const mockPrismaItem = {
      id: 'vault_item_123',
      userId: 'usr_xyz',
      pinned: true,
      encVersion: 1,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const decryptedItem = await decryptVaultItem(mockPrismaItem, vaultKey);

    expect(decryptedItem.id).toBe('vault_item_123');
    expect(decryptedItem.pinned).toBe(true);
    expect(decryptedItem.title).toBe('GitHub');
    expect(decryptedItem.type).toBe('ACCOUNT');
    if (decryptedItem.type === 'ACCOUNT') {
      expect(decryptedItem.username).toBe('joko@example.com');
      expect(decryptedItem.password).toBe('SecretGithubPassword123!');
    }
  });
});
