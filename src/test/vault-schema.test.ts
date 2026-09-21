import { describe, it, expect } from 'vitest';
import {
  vaultItemFormSchema,
  setupMasterPasswordSchema,
  updateMasterPasswordSchema,
  masterPasswordSchema,
} from '@/schemas/vault-schema';

describe('Vault Schema Validation', () => {
  describe('Master Password Schema', () => {
    it('harus menerima password kuat yang memenuhi semua kriteria (>= 12 karakter, huruf besar, kecil, angka, simbol)', () => {
      const result = masterPasswordSchema.safeParse('Kucing-terbang-merah-123!');
      expect(result.success).toBe(true);
    });

    it('harus menolak password kurang dari 12 karakter', () => {
      const result = masterPasswordSchema.safeParse('Secure123!');
      expect(result.success).toBe(false);
    });

    it('harus menolak password tanpa huruf besar', () => {
      const result = masterPasswordSchema.safeParse('lowercase123456!');
      expect(result.success).toBe(false);
    });

    it('harus menolak password tanpa huruf kecil', () => {
      const result = masterPasswordSchema.safeParse('UPPERCASE123456!');
      expect(result.success).toBe(false);
    });

    it('harus menolak password tanpa angka', () => {
      const result = masterPasswordSchema.safeParse('NoNumbersHere!!!');
      expect(result.success).toBe(false);
    });

    it('harus menolak password tanpa karakter khusus / simbol', () => {
      const result = masterPasswordSchema.safeParse('NoSpecialChars123');
      expect(result.success).toBe(false);
    });
  });

  describe('Setup Master Password Schema', () => {
    it('harus valid jika password dan konfirmasi cocok dan berbeda dari account password', () => {
      const result = setupMasterPasswordSchema.safeParse({
        accountPassword: 'MyAccountPassword123!',
        masterPassword: 'SecurePassword123!',
        confirmMasterPassword: 'SecurePassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('harus menolak jika password dan konfirmasi tidak cocok', () => {
      const result = setupMasterPasswordSchema.safeParse({
        accountPassword: 'MyAccountPassword123!',
        masterPassword: 'SecurePassword123!',
        confirmMasterPassword: 'DifferentPassword123!',
      });
      expect(result.success).toBe(false);
    });

    it('harus menolak jika master password sama dengan account password (mencegah password reuse)', () => {
      const result = setupMasterPasswordSchema.safeParse({
        accountPassword: 'SecurePassword123!',
        masterPassword: 'SecurePassword123!',
        confirmMasterPassword: 'SecurePassword123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'cannot be the same as your account login password',
        );
      }
    });
  });

  describe('Vault Item Form Schema - Type ACCOUNT', () => {
    it('harus valid untuk akun dengan email dan password', () => {
      const input = {
        type: 'ACCOUNT' as const,
        title: 'Google Account',
        url: 'https://accounts.google.com',
        pinned: true,
        email: 'joko@example.com',
        password: 'Password123',
        username: '',
        phone: '',
        pin: '',
        notes: '',
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('harus valid untuk akun dengan phone dan PIN', () => {
      const input = {
        type: 'ACCOUNT' as const,
        title: 'BCA Mobile',
        pinned: false,
        phone: '+628123456789',
        pin: '123456',
        email: '',
        username: '',
        password: '',
        notes: '',
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('harus menolak jika tidak ada identifier (email/username/phone)', () => {
      const input = {
        type: 'ACCOUNT' as const,
        title: 'No Identifier Account',
        pinned: false,
        password: 'Password123',
        email: '',
        username: '',
        phone: '',
        pin: '',
        notes: '',
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('harus valid jika tidak ada credential (password/pin bersifat opsional)', () => {
      const input = {
        type: 'ACCOUNT' as const,
        title: 'No Credential Account',
        pinned: false,
        email: 'user@example.com',
        password: '',
        username: '',
        phone: '',
        pin: '',
        notes: '',
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Vault Item Form Schema - Type NOTE', () => {
    it('harus valid untuk note yang berisi teks', () => {
      const input = {
        type: 'NOTE' as const,
        title: 'Private Recovery Keys',
        pinned: false,
        content: 'seed phrase content here...',
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('harus menolak jika content note kosong', () => {
      const input = {
        type: 'NOTE' as const,
        title: 'Empty Note',
        pinned: false,
        content: '   ',
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Update Master Password Schema', () => {
    it('harus valid jika data lengkap, berbeda dari account password dan current master password', () => {
      const result = updateMasterPasswordSchema.safeParse({
        accountPassword: 'MyAccountPassword123!',
        currentMasterPassword: 'OldMasterPassword123!',
        newMasterPassword: 'NewMasterPassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('harus menolak jika new master password sama dengan account password', () => {
      const result = updateMasterPasswordSchema.safeParse({
        accountPassword: 'SameSecretPassword123!',
        currentMasterPassword: 'OldMasterPassword123!',
        newMasterPassword: 'SameSecretPassword123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'cannot be the same as your account login password',
        );
      }
    });

    it('harus menolak jika new master password sama dengan current master password', () => {
      const result = updateMasterPasswordSchema.safeParse({
        accountPassword: 'MyAccountPassword123!',
        currentMasterPassword: 'SameMasterPassword123!',
        newMasterPassword: 'SameMasterPassword123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'must be different from current master password',
        );
      }
    });
  });
});
