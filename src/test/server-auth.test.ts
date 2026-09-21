import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requireAuthUser,
  verifyMasterPasswordProof,
  verifyUserAccountPassword,
} from '@/lib/server-auth';

import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';
import { Session, User as AuthUser } from '@/lib/auth';

vi.mock('@/lib/get-session', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('better-auth/crypto', () => ({
  verifyPassword: vi
    .fn()
    .mockImplementation(async ({ hash, password }: { hash: string; password: string }) => {
      return hash === `hashed_${password}` || hash === password;
    }),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    account: {
      findFirst: vi.fn(),
    },
  },
}));

describe('Server Auth Helper Functions', () => {
  const mockUser = {
    id: 'usr_abc',
    email: 'user@example.com',
    name: 'Test User',
    emailVerified: true,
  } as unknown as AuthUser;

  const mockSession = {
    user: mockUser,
    session: {
      id: 'sess_abc',
      userId: 'usr_abc',
    },
  } as unknown as Session;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuthUser', () => {
    it('mengembalikan error Unauthorized jika session tidak ditemukan', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const res = await requireAuthUser();
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Unauthorized');
      }
    });

    it('mengembalikan error Email verification required jika email belum diverifikasi secara default', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        ...mockSession,
        user: { ...mockUser, emailVerified: false } as unknown as AuthUser,
      });

      const res = await requireAuthUser();
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Email verification required');
      }
    });

    it('mengizinkan akses jika requireEmailVerified: false meskipun email belum diverifikasi', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        ...mockSession,
        user: { ...mockUser, emailVerified: false } as unknown as AuthUser,
      });

      const res = await requireAuthUser({ requireEmailVerified: false });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.user.id).toBe('usr_abc');
      }
    });

    it('mengembalikan user dan session jika terautentikasi dan email terverifikasi', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

      const res = await requireAuthUser();
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.user.id).toBe('usr_abc');
        expect(res.session.id).toBe('sess_abc');
      }
    });
  });

  describe('verifyUserAccountPassword', () => {
    it('menolak jika account password kosong', async () => {
      const res = await verifyUserAccountPassword('usr_abc', '');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Account password is required');
      }
    });

    it('menggunakan custom message jika password kosong dan custom message diberikan', async () => {
      const res = await verifyUserAccountPassword('usr_abc', '', 'Custom required message');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Custom required message');
      }
    });

    it('menolak jika akun kredensial tidak ditemukan', async () => {
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce(null);

      const res = await verifyUserAccountPassword('usr_abc', 'password123');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Account credential record not found');
      }
    });

    it('menolak jika akun kredensial tidak memiliki password hash', async () => {
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        password: null,
      } as unknown as never);

      const res = await verifyUserAccountPassword('usr_abc', 'password123');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Account credential record not found');
      }
    });

    it('menolak jika password salah', async () => {
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        password: 'hashed_password',
      } as unknown as never);

      const { verifyPassword } = await import('better-auth/crypto');
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const res = await verifyUserAccountPassword('usr_abc', 'wrongPassword');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Incorrect account password');
      }
    });

    it('berhasil jika password cocok', async () => {
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        password: 'hashed_password',
      } as unknown as never);

      const { verifyPassword } = await import('better-auth/crypto');
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      const res = await verifyUserAccountPassword('usr_abc', 'correctPassword');
      expect(res.success).toBe(true);
    });
  });

  describe('verifyMasterPasswordProof', () => {
    it('mengembalikan false jika authProof null, undefined, atau string kosong', async () => {
      expect(await verifyMasterPasswordProof(undefined, 'storedVerifier')).toBe(false);
      expect(await verifyMasterPasswordProof(null, 'storedVerifier')).toBe(false);
      expect(await verifyMasterPasswordProof('', 'storedVerifier')).toBe(false);
    });

    it('memvalidasi proof yang cocok dengan stored verifier', async () => {
      const cryptoNode = await import('node:crypto');
      const authBits = Buffer.from('mySecretProof123');
      const authProof = authBits.toString('base64');
      const storedVerifier = cryptoNode.createHash('sha256').update(authBits).digest('base64');

      expect(await verifyMasterPasswordProof(authProof, storedVerifier)).toBe(true);
    });

    it('menolak proof yang salah', async () => {
      const cryptoNode = await import('node:crypto');
      const authBits = Buffer.from('mySecretProof123');
      const storedVerifier = cryptoNode.createHash('sha256').update(authBits).digest('base64');

      const wrongProof = Buffer.from('wrongSecretProof').toString('base64');
      expect(await verifyMasterPasswordProof(wrongProof, storedVerifier)).toBe(false);
    });
  });
});
