import { VaultItem as PrismaVaultItem } from '@/lib/generated/prisma/client';

export type CredentialType = 'PASSWORD' | 'PIN';
export type VaultItemType = 'ACCOUNT' | 'NOTE';

// Credential History
export interface CredentialHistoryEntry {
  type: CredentialType;
  value: string;
  changedAt: string;
}

// Base payload for common fields
export interface BaseVaultPayload {
  title: string;
  url?: string;
}

// Type ACCOUNT (Flattened)
export interface AccountVaultPayload extends BaseVaultPayload {
  type: 'ACCOUNT';
  email?: string;
  username?: string;
  phone?: string;
  password?: string;
  pin?: string;
  notes?: string;
  credentialHistory?: CredentialHistoryEntry[];
}

// Type NOTE (Flattened)
export interface NoteVaultPayload extends BaseVaultPayload {
  type: 'NOTE';
  content: string;
}

// Discriminated union of payload encrypted into AES-GCM ciphertext (Zero-Knowledge)
export type EncryptedVaultPayload = AccountVaultPayload | NoteVaultPayload;

// Metadata stored in plaintext in the database
export interface VaultItemMetadata {
  pinned: boolean;
}

// Type gabungan metadata Prisma terdekripsi + payload flat
export type DecryptedVaultItem = Omit<PrismaVaultItem, 'ciphertext' | 'iv'> & EncryptedVaultPayload;

// Draft form input sebelum disimpan
export type VaultItemFormInput = VaultItemMetadata & EncryptedVaultPayload;
