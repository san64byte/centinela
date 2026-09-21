import { describe, it, expect } from 'vitest';
import {
  calculatePasswordStrength,
  STRENGTH_LABELS,
  STRENGTH_COLORS,
} from '@/components/password-strength-meter';

describe('Password Strength Utility', () => {
  it('mengembalikan 0 untuk password kosong', () => {
    expect(calculatePasswordStrength('')).toBe(0);
  });

  it('menghitung skor 1 untuk password pendek satu jenis karakter', () => {
    // Kurang dari 8 karakter, hanya angka
    expect(calculatePasswordStrength('12345')).toBe(1);
  });

  it('menghitung skor untuk kriteria kombinasi', () => {
    // 8 karakter angka saja: len>=8 (1) + digit (1) = 2
    expect(calculatePasswordStrength('12345678')).toBe(2);

    // 8 karakter huruf besar + kecil: len>=8 (1) + mixed-case (1) = 2
    expect(calculatePasswordStrength('Abcdefgh')).toBe(2);

    // 8 karakter mixed-case + digit: len>=8 (1) + mixed-case (1) + digit (1) = 3
    expect(calculatePasswordStrength('Abcdefg1')).toBe(3);

    // 8 karakter mixed-case + digit + symbol: len>=8 (1) + mixed-case (1) + digit (1) + symbol (1) = 4
    expect(calculatePasswordStrength('Abcdef1!')).toBe(4);

    // 12+ karakter mixed-case + digit + symbol: len>=8 (1) + len>=12 (1) + mixed-case (1) + digit (1) + symbol (1) = 5
    expect(calculatePasswordStrength('Abcdef12345!')).toBe(5);
  });

  it('memiliki 5 label dan 5 warna yang terdefinisi dengan tepat', () => {
    expect(STRENGTH_LABELS).toHaveLength(5);
    expect(STRENGTH_COLORS).toHaveLength(5);
    expect(STRENGTH_LABELS[4]).toBe('Very Strong');
    expect(STRENGTH_COLORS[4]).toBe('bg-emerald-500');
  });
});
