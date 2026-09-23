import { VaultItemFormInput } from '@/types/vault-type';
import * as z from 'zod';

const phonePattern = /^[0-9+()\- ]+$/;
const pinPattern = /^\d{4,12}$/;

export const masterPasswordSchema = z
  .string()
  .min(12, 'Master password must be at least 12 characters')
  .regex(/[A-Z]/, 'Master password must contain at least 1 uppercase letter')
  .regex(/[a-z]/, 'Master password must contain at least 1 lowercase letter')
  .regex(/[0-9]/, 'Master password must contain at least 1 number')
  .regex(/[^A-Za-z0-9]/, 'Master password must contain at least 1 special character');

export const credentialHistoryEntrySchema = z.object({
  type: z.enum(['PASSWORD', 'PIN']),
  value: z.string(),
  changedAt: z.string(),
});

export const metadataSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(100, 'Maximum 100 characters'),
  url: z.string().trim().pipe(z.url('Invalid URL format')).optional().or(z.literal('')),
  pinned: z.boolean(),
});

export const accountVaultItemSchema = metadataSchema
  .extend({
    type: z.literal('ACCOUNT'),
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
    credentialHistory: z.array(credentialHistoryEntrySchema).optional(),
  })
  .superRefine((data, ctx) => {
    const hasIdentifier = Boolean(data.email || data.username || data.phone);
    if (!hasIdentifier) {
      const message = 'Please provide at least one identifier: email, username/ID, or phone number';
      ctx.addIssue({ code: 'custom', message, path: ['email'] });
      ctx.addIssue({ code: 'custom', message, path: ['username'] });
      ctx.addIssue({ code: 'custom', message, path: ['phone'] });
    }
  });

export const noteVaultItemSchema = metadataSchema.extend({
  type: z.literal('NOTE'),
  content: z
    .string()
    .trim()
    .max(10_000, 'Notes must be at most 10,000 characters')
    .refine((val) => val.length > 0, {
      message: 'Note content cannot be empty',
    }),
});

export const vaultItemFormSchema = z.discriminatedUnion('type', [
  accountVaultItemSchema,
  noteVaultItemSchema,
]);

export const setupMasterPasswordSchema = z
  .object({
    masterPassword: masterPasswordSchema,
    confirmMasterPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.masterPassword === data.confirmMasterPassword, {
    message: 'Passwords do not match',
    path: ['confirmMasterPassword'],
  });

export const unlockVaultSchema = z.object({
  masterPassword: z.string().min(1, 'Master password is required'),
});

export const updateMasterPasswordSchema = z
  .object({
    accountPassword: z.string().min(1, 'Enter your account password'),
    currentMasterPassword: z.string().min(1, 'Enter your current master password'),
    newMasterPassword: masterPasswordSchema,
  })
  .refine((data) => data.newMasterPassword !== data.accountPassword, {
    message: 'Master password cannot be the same as your account login password',
    path: ['newMasterPassword'],
  })
  .refine((data) => data.newMasterPassword !== data.currentMasterPassword, {
    message: 'New master password must be different from current master password',
    path: ['newMasterPassword'],
  });

type _SchemaMatchesType =
  z.infer<typeof vaultItemFormSchema> extends VaultItemFormInput
    ? VaultItemFormInput extends z.infer<typeof vaultItemFormSchema>
      ? true
      : false
    : false;

const _typeCheck: _SchemaMatchesType = true;
void _typeCheck;
