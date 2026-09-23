import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkPasswordRateLimit,
  recordFailedPasswordAttempt,
  resetPasswordRateLimit,
  checkEmailVerificationCooldown,
  createBetterAuthRateLimitStorage,
  resetAllRateLimits,
  inMemoryStore,
} from '@/lib/rate-limit';

describe('Rate Limiter Core Module', () => {
  beforeEach(() => {
    resetAllRateLimits();
  });

  describe('checkPasswordRateLimit (TEMUAN 2: Re-Authentication Brute-Force)', () => {
    it('mengizinkan verifikasi password jika belum mencapai 5 kali kegagalan', async () => {
      const userId = 'usr_rate_limit_1';

      for (let i = 0; i < 4; i++) {
        await recordFailedPasswordAttempt(userId);
        const result = await checkPasswordRateLimit(userId);
        expect(result.success).toBe(true);
      }
    });

    it('menolak percobaan setelah 5 kali kegagalan dengan pesan lockout dan retryAfter', async () => {
      const userId = 'usr_rate_limit_2';

      for (let i = 0; i < 5; i++) {
        await recordFailedPasswordAttempt(userId);
      }

      const blockedResult = await checkPasswordRateLimit(userId);
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.error).toBe('Too many attempts. Please try again in 10 minutes.');
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });

    it('mereset counter kegagalan saat resetPasswordRateLimit dipanggil', async () => {
      const userId = 'usr_rate_limit_reset';

      for (let i = 0; i < 4; i++) {
        await recordFailedPasswordAttempt(userId);
      }

      // Berhasil login / verifikasi -> reset counter
      await resetPasswordRateLimit(userId);

      // Harusnya bisa melakukan percobaan lagi tanpa terblokir
      for (let i = 0; i < 4; i++) {
        await recordFailedPasswordAttempt(userId);
        const res = await checkPasswordRateLimit(userId);
        expect(res.success).toBe(true);
      }
    });

    it('memisahkan counter antar user yang berbeda', async () => {
      const userA = 'usr_alice';
      const userB = 'usr_bob';

      // Alice gagal 5 kali berturut-turut
      for (let i = 0; i < 5; i++) {
        await recordFailedPasswordAttempt(userA);
      }
      const aliceBlocked = await checkPasswordRateLimit(userA);
      expect(aliceBlocked.success).toBe(false);

      // Bob tetap dapat melakukan percobaan
      const bobResult = await checkPasswordRateLimit(userB);
      expect(bobResult.success).toBe(true);
    });
  });

  describe('checkEmailVerificationCooldown (TEMUAN 8: Email Resend Cooldown)', () => {
    it('mengizinkan request pertama pengiriman email', async () => {
      const email = 'victim@example.com';
      const result = await checkEmailVerificationCooldown(email);
      expect(result.success).toBe(true);
    });

    it('memblokir pengiriman kedua dalam jeda 60 detik dengan pesan cooldown', async () => {
      const email = 'victim@example.com';
      await checkEmailVerificationCooldown(email);

      const blockedResult = await checkEmailVerificationCooldown(email);
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.error).toBe(
        'Too many requests. Please wait a moment before requesting another verification email.',
      );
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });

    it('melakukan normalisasi email (case-insensitive dan trim)', async () => {
      await checkEmailVerificationCooldown('User.Test@Example.Com ');

      // Request berikutnya dengan variasi huruf besar/kecil harus tetap diblokir
      const blockedResult = await checkEmailVerificationCooldown('  user.test@example.com');
      expect(blockedResult.success).toBe(false);
    });
  });

  describe('createBetterAuthRateLimitStorage (TEMUAN 4 & TEMUAN 9)', () => {
    it('mengimplementasikan consume handler yang membatasi request sesuai aturan window & max', async () => {
      const storage = createBetterAuthRateLimitStorage();
      expect(storage.consume).toBeDefined();

      if (!storage.consume) return;

      const rule = { window: 60, max: 3 };
      const key = '127.0.0.1:/is-username-available';

      // 3 request pertama diizinkan
      for (let i = 0; i < 3; i++) {
        const res = await storage.consume(key, rule);
        expect(res.allowed).toBe(true);
        expect(res.retryAfter).toBeNull();
      }

      // Request ke-4 ditolak
      const blocked = await storage.consume(key, rule);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('InMemorySlidingWindowStore', () => {
    it('menghitung retryAfter dengan benar dan membersihkan timestamp kedaluwarsa', () => {
      const res1 = inMemoryStore.consume('test-key', 60, 2);
      expect(res1.allowed).toBe(true);

      const res2 = inMemoryStore.consume('test-key', 60, 2);
      expect(res2.allowed).toBe(true);

      const res3 = inMemoryStore.consume('test-key', 60, 2);
      expect(res3.allowed).toBe(false);
      expect(res3.retryAfter).toBeGreaterThanOrEqual(1);
    });
  });
});
