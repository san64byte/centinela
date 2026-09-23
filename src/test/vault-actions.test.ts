import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import {
  createEncryptedVaultItem,
  updateEncryptedVaultItem,
  deleteVaultItem,
  toggleVaultItemPin,
} from '@/actions/vault.action';
import { saveEncryptedVaultKey } from '@/actions/setup-vault.action';
import {
  updateMasterPassword,
  confirmResetMasterPassword,
  requestResetMasterPassword,
} from '@/actions/settings.action';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';
import { Session, User as AuthUser } from '@/lib/auth';
import { VaultItem } from '@/lib/generated/prisma/client';
import { sendEmail } from '@/lib/email';
import { resetAllRateLimits } from '@/lib/rate-limit';

vi.mock('@/lib/get-session', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({}),
}));

vi.mock('better-auth/crypto', () => ({
  hashPassword: vi.fn().mockImplementation(async (pwd: string) => `hashed_${pwd}`),
  verifyPassword: vi
    .fn()
    .mockImplementation(async ({ hash, password }: { hash: string; password: string }) => {
      if (hash === 'hashed_password') {
        return true;
      }
      return hash === `hashed_${password}` || hash === password;
    }),
}));

vi.mock('@/lib/prisma', () => {
  return {
    default: {
      vaultItem: {
        create: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        update: vi.fn(),
        updateMany: vi.fn(),
        findUnique: vi.fn(),
      },
      account: {
        findFirst: vi.fn(),
      },
      session: {
        deleteMany: vi.fn(),
      },
      verification: {
        findUnique: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
      $executeRaw: vi.fn(),
    },
  };
});

describe('Vault Server Actions', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    vaultSalt: 'dummy_salt',
    encryptedVaultKey: null,
    encryptedVaultKeyIv: null,
  } as unknown as AuthUser;

  const mockSession = {
    user: mockUser,
    session: {
      id: 'session_123',
      userId: 'user_123',
      expiresAt: new Date(),
      token: 'token_123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } as unknown as Session;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAllRateLimits();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUser.id,
      encryptedVaultKey: 'wrapped_key_test',
      vaultVerifier: 'verifier_test',
    } as unknown as never);
  });

  describe('createEncryptedVaultItem', () => {
    it('harus berhasil membuat vault item terenkripsi jika user terautentikasi', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.vaultItem.create).mockResolvedValueOnce({
        id: 'item_abc',
        userId: mockUser.id,
        ciphertext: 'base64ciphertext',
        iv: 'base64iv',
        pinned: false,
        encVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as VaultItem);

      const res = await createEncryptedVaultItem({
        ciphertext: 'base64ciphertext',
        iv: 'base64iv',
        pinned: false,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe('item_abc');
      }
      expect(prisma.vaultItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          ciphertext: 'base64ciphertext',
          iv: 'base64iv',
        }),
      });
    });

    it('harus menolak jika user tidak memiliki session (Unauthorized)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const res = await createEncryptedVaultItem({
        ciphertext: 'base64ciphertext',
        iv: 'base64iv',
        pinned: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Unauthorized');
      }
    });

    it('harus menolak jika payload tidak valid (ciphertext kosong)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      const res = await createEncryptedVaultItem({
        ciphertext: '',
        iv: 'base64iv',
        pinned: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Invalid vault item payload');
      }
    });

    it('harus menolak jika vault belum di-setup atau sudah di-reset', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: mockUser.id,
        encryptedVaultKey: null,
        vaultVerifier: null,
      } as unknown as never);

      const res = await createEncryptedVaultItem({
        ciphertext: 'base64ciphertext',
        iv: 'base64iv',
        pinned: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe(
          'Vault is not configured or has been reset. Please set up your master password.',
        );
      }
    });
  });

  describe('updateEncryptedVaultItem', () => {
    it('harus berhasil memperbarui item milik user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.vaultItem.updateMany).mockResolvedValueOnce({ count: 1 });

      const res = await updateEncryptedVaultItem('item_abc', {
        ciphertext: 'newCiphertext',
        iv: 'newIv',
        pinned: true,
      });

      expect(res.success).toBe(true);
      expect(prisma.vaultItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item_abc', userId: mockUser.id },
        data: expect.objectContaining({
          pinned: true,
        }),
      });
    });

    it('harus mengembalikan error jika item tidak ditemukan atau bukan milik user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.vaultItem.updateMany).mockResolvedValueOnce({ count: 0 });

      const res = await updateEncryptedVaultItem('nonexistent_id', {
        ciphertext: 'cipher',
        iv: 'iv',
        pinned: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('not found');
      }
    });

    it('harus menolak updateEncryptedVaultItem jika itemId kosong atau melebihi 128 karakter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const emptyRes = await updateEncryptedVaultItem('   ', {
        ciphertext: 'cipher',
        iv: 'iv',
        pinned: false,
      });
      expect(emptyRes.success).toBe(false);
      if (!emptyRes.success) {
        expect(emptyRes.error).toBe('Invalid vault item ID');
      }

      const longRes = await updateEncryptedVaultItem('a'.repeat(129), {
        ciphertext: 'cipher',
        iv: 'iv',
        pinned: false,
      });
      expect(longRes.success).toBe(false);
      if (!longRes.success) {
        expect(longRes.error).toBe('Invalid vault item ID');
      }
    });
  });

  describe('deleteVaultItem', () => {
    it('harus berhasil menghapus item milik user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.vaultItem.deleteMany).mockResolvedValueOnce({ count: 1 });

      const res = await deleteVaultItem('item_abc');
      expect(res.success).toBe(true);
      expect(prisma.vaultItem.deleteMany).toHaveBeenCalledWith({
        where: { id: 'item_abc', userId: mockUser.id },
      });
    });

    it('harus mengembalikan error jika ID item tidak ditemukan', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.vaultItem.deleteMany).mockResolvedValueOnce({ count: 0 });

      const res = await deleteVaultItem('nonexistent_id');
      expect(res.success).toBe(false);
    });
  });

  describe('toggleVaultItemPin', () => {
    it('harus berhasil mengubah status pin item menggunakan raw SQL tanpa mengubah updatedAt', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.$executeRaw).mockResolvedValueOnce(1);

      const res = await toggleVaultItemPin('item_abc', true);
      expect(res.success).toBe(true);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('harus menolak jika user tidak terautentikasi (Unauthorized)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const res = await toggleVaultItemPin('item_abc', true);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Unauthorized');
      }
    });

    it('harus mengembalikan error jika ID item tidak ditemukan', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.$executeRaw).mockResolvedValueOnce(0);

      const res = await toggleVaultItemPin('nonexistent_id', true);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Vault item not found');
      }
    });
  });

  describe('saveEncryptedVaultKey & Master Password Management', () => {
    it('harus berhasil menyimpan encryptedVaultKey untuk user yang aktif', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 1 });

      const res = await saveEncryptedVaultKey('wrappedKey123', 'iv123', 'verifier123');
      expect(res.success).toBe(true);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: mockUser.id, encryptedVaultKey: null },
        data: {
          encryptedVaultKey: 'wrappedKey123',
          encryptedVaultKeyIv: 'iv123',
          vaultVerifier: 'hashed_verifier123',
        },
      });
    });

    it('harus menolak saveEncryptedVaultKey jika vault key sudah pernah diinisialisasi', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 0 });

      const res = await saveEncryptedVaultKey('wrappedKey123', 'iv123', 'verifier123');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Vault key already initialized or user not found');
      }
    });

    it('harus berhasil mengubah master password key di user settings dan merevoke sesi lain', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: 'acc_123',
        userId: mockUser.id,
        providerId: 'credential',
        password: 'hashed_password',
        accountId: 'acc_123',
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const authProof = Buffer.from('correct_proof').toString('base64');
      const verifier = crypto
        .createHash('sha256')
        .update(Buffer.from(authProof, 'base64'))
        .digest('base64');

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        vaultVerifier: verifier,
      } as unknown as never);

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([
        {} as unknown as never,
        { count: 2 } as unknown as never,
      ]);

      const res = await updateMasterPassword(
        'newWrappedKey456',
        'newIv456',
        'AccountPassword123!',
        {
          newVaultSalt: 'new_salt',
          newVaultVerifier: 'new_verifier',
          authProof,
        },
      );
      expect(res.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('harus menolak updateMasterPassword jika authProof salah / verifikasi zero-knowledge gagal', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: 'acc_123',
        userId: mockUser.id,
        providerId: 'credential',
        password: 'hashed_password',
        accountId: 'acc_123',
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const verifier = crypto
        .createHash('sha256')
        .update(Buffer.from('correct_proof'))
        .digest('base64');

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        vaultVerifier: verifier,
      } as unknown as never);

      const wrongProof = Buffer.from('wrong_proof').toString('base64');

      const res = await updateMasterPassword(
        'newWrappedKey456',
        'newIv456',
        'AccountPassword123!',
        {
          newVaultSalt: 'new_salt',
          newVaultVerifier: 'new_verifier',
          authProof: wrongProof,
        },
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Current master password verification failed');
      }
    });

    it('harus menolak updateMasterPassword jika kata sandi akun salah', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: 'acc_123',
        userId: mockUser.id,
        providerId: 'credential',
        password: 'hashed_password',
        accountId: 'acc_123',
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { verifyPassword } = await import('better-auth/crypto');
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const res = await updateMasterPassword(
        'newWrappedKey456',
        'newIv456',
        'WrongAccountPassword!',
        {
          newVaultSalt: 'new_salt',
          newVaultVerifier: 'new_verifier',
        },
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Incorrect account password');
      }
    });

    it('harus mereset master password dan menghapus seluruh isi vault via confirmResetMasterPassword dengan token valid', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.verification.findUnique).mockResolvedValueOnce({
        id: 'reset-vault:valid_token_123',
        identifier: `reset-vault:${mockUser.id}`,
        value: 'valid_token_123',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([
        { count: 5 } as unknown as never,
        mockUser as unknown as never,
        {} as unknown as never,
        { count: 1 } as unknown as never,
      ]);

      const res = await confirmResetMasterPassword('valid_token_123');
      expect(res.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.verification.delete).toHaveBeenCalledWith({
        where: { id: 'reset-vault:valid_token_123' },
      });
    });

    it('harus menolak confirmResetMasterPassword jika token sudah kedaluwarsa atau tidak valid', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.verification.findUnique).mockResolvedValueOnce({
        id: 'reset-vault:expired_token',
        identifier: `reset-vault:${mockUser.id}`,
        value: 'expired_token',
        expiresAt: new Date(Date.now() - 1000), // expired
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await confirmResetMasterPassword('expired_token');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('expired');
      }
    });

    it('harus menolak confirmResetMasterPassword jika email pengguna belum terverifikasi', async () => {
      const unverifiedSession = {
        ...mockSession,
        user: { ...mockUser, emailVerified: false } as unknown as AuthUser,
      };
      vi.mocked(getServerSession).mockResolvedValueOnce(unverifiedSession);

      const res = await confirmResetMasterPassword('valid_token_123');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Email verification required');
      }
    });

    it('harus menolak confirmResetMasterPassword jika format token tidak valid atau karakter terlarang', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const invalidRes = await confirmResetMasterPassword('invalid token with spaces!');
      expect(invalidRes.success).toBe(false);
      if (!invalidRes.success) {
        expect(invalidRes.error).toBe('Invalid or missing reset token');
      }

      const emptyRes = await confirmResetMasterPassword('');
      expect(emptyRes.success).toBe(false);
      if (!emptyRes.success) {
        expect(emptyRes.error).toBe('Invalid or missing reset token');
      }
    });
  });

  describe('requestResetMasterPassword', () => {
    it('harus berhasil mengirim email reset master password dengan kata sandi akun yang benar', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: 'acc_123',
        accountId: 'acc_id_123',
        providerId: 'credential',
        userId: mockUser.id,
        password: 'hashed_ValidPassword123!',
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { verifyPassword } = await import('better-auth/crypto');
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      const res = await requestResetMasterPassword('ValidPassword123!');
      expect(res.success).toBe(true);
      expect(prisma.verification.deleteMany).toHaveBeenCalledWith({
        where: { identifier: `reset-vault:${mockUser.id}` },
      });
      expect(prisma.verification.create).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: 'Confirm Reset of Your Centinela Master Password',
        }),
      );
    });

    it('harus menolak requestResetMasterPassword jika kata sandi akun salah', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: 'acc_123',
        accountId: 'acc_id_123',
        providerId: 'credential',
        userId: mockUser.id,
        password: 'hashed_ValidPassword123!',
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { verifyPassword } = await import('better-auth/crypto');
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const res = await requestResetMasterPassword('WrongPassword123!');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Incorrect account password');
      }
    });

    it('harus membatasi rate limit / cooldown pada requestResetMasterPassword untuk cegah spam email', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.account.findFirst).mockResolvedValue({
        id: 'acc_123',
        accountId: 'acc_id_123',
        providerId: 'credential',
        userId: mockUser.id,
        password: 'hashed_ValidPassword123!',
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { verifyPassword } = await import('better-auth/crypto');
      vi.mocked(verifyPassword).mockResolvedValue(true);

      // Panggilan pertama sukses
      const firstRes = await requestResetMasterPassword('ValidPassword123!');
      expect(firstRes.success).toBe(true);

      // Panggilan kedua segera setelahnya harus ditolak oleh cooldown
      const secondRes = await requestResetMasterPassword('ValidPassword123!');
      expect(secondRes.success).toBe(false);
      if (!secondRes.success) {
        expect(secondRes.error).toContain('Too many requests');
      }
    });
  });
});
