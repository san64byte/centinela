import { describe, it, expect } from 'vitest';
import {
  vaultItemFormSchema,
  setupMasterPasswordSchema,
  masterPasswordSchema,
} from '@/features/vault/schemas/vault-schema';

describe('Vault Schema Validation', () => {
  describe('Master Password Schema', () => {
    it('harus menerima password minimal 8 karakter', () => {
      const result = masterPasswordSchema.safeParse('12345678');
      expect(result.success).toBe(true);
    });

    it('harus menerima password dengan tanda hubung (-)', () => {
      const result = masterPasswordSchema.safeParse('kucing-terbang-merah-123');
      expect(result.success).toBe(true);
    });

    it('harus menolak password kurang dari 8 karakter', () => {
      const result = masterPasswordSchema.safeParse('short');
      expect(result.success).toBe(false);
    });
  });

  describe('Setup Master Password Schema', () => {
    it('harus valid jika password dan konfirmasi cocok', () => {
      const result = setupMasterPasswordSchema.safeParse({
        masterPassword: 'SecurePassword123!',
        confirmMasterPassword: 'SecurePassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('harus menolak jika password dan konfirmasi tidak cocok', () => {
      const result = setupMasterPasswordSchema.safeParse({
        masterPassword: 'SecurePassword123!',
        confirmMasterPassword: 'DifferentPassword123!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Vault Item Form Schema - Type ACCOUNT', () => {
    it('harus valid untuk akun dengan email dan password', () => {
      const input = {
        type: 'ACCOUNT',
        title: 'Google Account',
        url: 'https://accounts.google.com',
        pinned: true,
        data: {
          email: 'joko@example.com',
          password: 'Password123',
          username: '',
          phone: '',
          pin: '',
          notes: '',
        },
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('harus valid untuk akun dengan phone dan PIN', () => {
      const input = {
        type: 'ACCOUNT',
        title: 'BCA Mobile',
        pinned: false,
        data: {
          phone: '+628123456789',
          pin: '123456',
          email: '',
          username: '',
          password: '',
          notes: '',
        },
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('harus menolak jika tidak ada identifier (email/username/phone)', () => {
      const input = {
        type: 'ACCOUNT',
        title: 'No Identifier Account',
        pinned: false,
        data: {
          password: 'Password123',
          email: '',
          username: '',
          phone: '',
          pin: '',
          notes: '',
        },
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('harus menolak jika tidak ada credential (password/pin)', () => {
      const input = {
        type: 'ACCOUNT',
        title: 'No Credential Account',
        pinned: false,
        data: {
          email: 'user@example.com',
          password: '',
          username: '',
          phone: '',
          pin: '',
          notes: '',
        },
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Vault Item Form Schema - Type NOTE', () => {
    it('harus valid untuk note yang berisi teks', () => {
      const input = {
        type: 'NOTE',
        title: 'Private Recovery Keys',
        pinned: false,
        data: {
          content: 'seed phrase content here...',
        },
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('harus menolak jika content note kosong', () => {
      const input = {
        type: 'NOTE',
        title: 'Empty Note',
        pinned: false,
        data: {
          content: '   ',
        },
      };

      const result = vaultItemFormSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
