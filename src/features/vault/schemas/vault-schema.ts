import { VaultItemFormInput } from '../types/vault-type';
import * as z from 'zod';

const phonePattern = /^[0-9+()\- ]+$/;
const pinPattern = /^\d{4,12}$/;

export const masterPasswordSchema = z
  .string()
  .min(8, 'Master password must be at least 8 characters');

export const accountDataSchema = z
  .object({
    email: z.string().trim().pipe(z.email('Invalid email format')).optional().or(z.literal('')),
    username: z.string().trim().optional(),
    phone: z
      .string()
      .trim()
      .regex(phonePattern, 'Invalid phone number format')
      .optional()
      .or(z.literal('')),

    password: z.string().optional(),
    pin: z.string().regex(pinPattern, 'PIN must be 4-12 digits').optional().or(z.literal('')),

    notes: z.string().trim().max(2000, 'Notes must be at most 2,000 characters').optional(),
  })
  .superRefine((data, ctx) => {
    const hasIdentifier = Boolean(data.email || data.username || data.phone);
    if (!hasIdentifier) {
      const message = 'Please provide at least one: email, username, or phone number';
      ctx.addIssue({ code: 'custom', message, path: ['email'] });
      ctx.addIssue({ code: 'custom', message, path: ['username'] });
      ctx.addIssue({ code: 'custom', message, path: ['phone'] });
    }

    const hasCredential = Boolean(data.password || data.pin);
    if (!hasCredential) {
      const message = 'Please provide at least one: password or PIN';
      ctx.addIssue({ code: 'custom', message, path: ['password'] });
      ctx.addIssue({ code: 'custom', message, path: ['pin'] });
    }
  });

export const noteDataSchema = z.object({
  content: z
    .string()
    .trim()
    .max(10_000, 'Notes must be at most 10,000 characters')
    .refine((val) => val.length > 0, {
      error: 'Note content cannot be empty',
    }),
});

export const metadataSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(100, 'Maximum 100 characters'),
  url: z.string().trim().pipe(z.url('Invalid URL format')).optional().or(z.literal('')),
  pinned: z.boolean(),
});

export const vaultItemFormSchema = z.discriminatedUnion('type', [
  metadataSchema.extend({
    type: z.literal('ACCOUNT'),
    data: accountDataSchema,
  }),
  metadataSchema.extend({
    type: z.literal('NOTE'),
    data: noteDataSchema,
  }),
]);

export const setupMasterPasswordSchema = z
  .object({
    masterPassword: masterPasswordSchema,
    confirmMasterPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.masterPassword === data.confirmMasterPassword, {
    error: 'Passwords do not match',
    path: ['confirmMasterPassword'],
  });

export const unlockVaultSchema = z.object({
  masterPassword: masterPasswordSchema,
});

export const updateMasterPasswordSchema = z.object({
  currentMasterPassword: z.string().min(1, 'Enter your current master password'),
  newMasterPassword: masterPasswordSchema,
});

type _SchemaMatchesType =
  z.infer<typeof vaultItemFormSchema> extends VaultItemFormInput
    ? VaultItemFormInput extends z.infer<typeof vaultItemFormSchema>
      ? true
      : false
    : false;

const _typeCheck: _SchemaMatchesType = true;
void _typeCheck;

export type VaultItemFormSchema = z.infer<typeof vaultItemFormSchema>;
