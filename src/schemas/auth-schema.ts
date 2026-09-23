import * as z from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(1, 'Username cannot be empty')
  .max(12, { message: 'Username must be at most 12 characters' })
  .regex(/^\S+$/, { message: 'Username cannot contain spaces' })
  .regex(/^[a-z0-9_]+$/, {
    message: 'Username can only contain lowercase letters, numbers, and underscores (_)',
  });

export const emailSchema = z.string().trim().pipe(z.email('Invalid email format'));

export const nameSchema = z.string().trim().min(1, 'Name cannot be empty');

export const passwordSchema = z
  .string()
  .min(1, 'Password is required.')
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least 1 number');

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().trim().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const updateProfileDetailSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current account password'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password cannot be the same as your current password',
    path: ['newPassword'],
  });

export const withEmailSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changeEmailSchema = z.object({
  email: emailSchema,
  currentPassword: z.string().min(1, 'Account password is required'),
});
