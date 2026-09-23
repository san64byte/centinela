import { describe, it, expect } from 'vitest';
import { resetPasswordSchema, updatePasswordSchema } from '@/schemas/auth-schema';

describe('Auth Schema Validation', () => {
  describe('updatePasswordSchema', () => {
    it('harus menerima pergantian password jika password baru berbeda dan valid', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('harus menolak pergantian password jika password baru persis sama dengan password saat ini', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: 'SamePassword123!',
        newPassword: 'SamePassword123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((issue) => issue.message);
        expect(errorMessages).toContain('New password cannot be the same as your current password');
      }
    });

    it('harus menolak jika newPassword tidak memenuhi kriteria keamanan (kurang dari 8 karakter, dsb)', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: 'OldPassword123!',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('harus valid jika password dan confirmPassword cocok serta memenuhi kriteria', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('harus menolak jika password dan confirmPassword tidak cocok', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((issue) => issue.message);
        expect(errorMessages).toContain('Passwords do not match');
      }
    });

    it('harus menolak jika password tidak memenuhi kriteria minimum (misal tidak ada huruf kapital)', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'lowercase123!',
        confirmPassword: 'lowercase123!',
      });
      expect(result.success).toBe(false);
    });

    it('harus menolak jika confirmPassword kosong', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'ValidPassword123!',
        confirmPassword: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
