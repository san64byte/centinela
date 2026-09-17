import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createEncryptedVaultItem,
  updateEncryptedVaultItem,
  deleteVaultItem,
  toggleVaultItemPin,
} from '@/actions/vault.action';
import { saveEncryptedVaultKey } from '@/actions/setup-vault.action';
import { updateMasterPassword, resetMasterPassword } from '@/actions/settings.action';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';
import { Session, User as AuthUser } from '@/lib/auth';
import { VaultItem } from '@/lib/generated/prisma/client';

vi.mock('@/lib/get-session', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('better-auth/crypto', () => ({
  verifyPassword: vi.fn().mockResolvedValue(true),
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
  });

  describe('createEncryptedVaultItem', () => {
    it('harus berhasil membuat vault item terenkripsi jika user terautentikasi', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.vaultItem.create).mockResolvedValueOnce({
        id: 'item_abc',
        userId: mockUser.id,
        title: 'Netflix Account',
        ciphertext: 'base64ciphertext',
        iv: 'base64iv',
        type: 'ACCOUNT',
        pinned: false,
        url: null,
        encVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as VaultItem);

      const res = await createEncryptedVaultItem({
        title: 'Netflix Account',
        ciphertext: 'base64ciphertext',
        iv: 'base64iv',
        type: 'ACCOUNT',
        pinned: false,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe('item_abc');
      }
      expect(prisma.vaultItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          title: 'Netflix Account',
        }),
      });
    });

    it('harus menolak jika user tidak memiliki session (Unauthorized)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const res = await createEncryptedVaultItem({
        title: 'Netflix Account',
        ciphertext: 'base64ciphertext',
        iv: 'base64iv',
        type: 'ACCOUNT',
        pinned: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Unauthorized');
      }
    });

    it('harus menolak jika payload tidak valid (title kosong)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      const res = await createEncryptedVaultItem({
        title: '',
        ciphertext: 'base64ciphertext',
        iv: 'base64iv',
        type: 'ACCOUNT',
        pinned: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Invalid vault item payload');
      }
    });
  });

  describe('updateEncryptedVaultItem', () => {
    it('harus berhasil memperbarui item milik user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.vaultItem.updateMany).mockResolvedValueOnce({ count: 1 });

      const res = await updateEncryptedVaultItem('item_abc', {
        title: 'Netflix Premium',
        ciphertext: 'newCiphertext',
        iv: 'newIv',
        type: 'ACCOUNT',
        pinned: true,
      });

      expect(res.success).toBe(true);
      expect(prisma.vaultItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item_abc', userId: mockUser.id },
        data: expect.objectContaining({
          title: 'Netflix Premium',
          pinned: true,
        }),
      });
    });

    it('harus mengembalikan error jika item tidak ditemukan atau bukan milik user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.vaultItem.updateMany).mockResolvedValueOnce({ count: 0 });

      const res = await updateEncryptedVaultItem('nonexistent_id', {
        title: 'Updated Title',
        ciphertext: 'cipher',
        iv: 'iv',
        type: 'ACCOUNT',
        pinned: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('not found');
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

      const res = await saveEncryptedVaultKey('wrappedKey123', 'iv123');
      expect(res.success).toBe(true);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: mockUser.id, encryptedVaultKey: null },
        data: {
          encryptedVaultKey: 'wrappedKey123',
          encryptedVaultKeyIv: 'iv123',
        },
      });
    });

    it('harus berhasil mengubah master password key di user settings dan merevoke sesi lain', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([
        {} as unknown as never,
        { count: 2 } as unknown as never,
      ]);

      const res = await updateMasterPassword('newWrappedKey456', 'newIv456');
      expect(res.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('harus mereset master password dan menghapus seluruh isi vault setelah verifikasi password', async () => {
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

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([
        { count: 5 } as unknown as never,
        mockUser as unknown as never,
      ]);

      const res = await resetMasterPassword('correctPassword123!');
      expect(res.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
