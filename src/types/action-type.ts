/**
 * Standar respon untuk Server Actions di seluruh aplikasi.
 *
 * Menggunakan discriminated union dengan flag `success: boolean`:
 * - Jika `success: true`: operasi berhasil (opsional membawa `data`)
 * - Jika `success: false`: operasi gagal dan selalu membawa pesan `error: string`
 */

export type ActionSuccess<T = void> = T extends void
  ? { success: true; error?: never }
  : { success: true; data: T; error?: never };

export type ActionError = {
  success: false;
  error: string;
  data?: never;
};

export type ActionResponse<T = void> = ActionSuccess<T> | ActionError;
