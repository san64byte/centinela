import { VaultItem as PrismaVaultItem } from '@/lib/generated/prisma/client';

export type CredentialType = 'PASSWORD' | 'PIN';
export type VaultItemType = 'ACCOUNT' | 'NOTE';

// Credential History
export interface CredentialHistoryEntry {
  type: CredentialType;
  value: string;
  changedAt: string;
}

// Type ACCOUNT
export interface AccountData {
  email?: string;
  username?: string;
  phone?: string;
  password?: string;
  pin?: string;
  notes?: string;

  credentialHistory?: CredentialHistoryEntry[];
}

// Type NOTE
export interface NoteData {
  content: string;
}

export type VaultItemData =
  | { type: 'ACCOUNT'; data: AccountData }
  | { type: 'NOTE'; data: NoteData };

// Metadata Vault
export interface VaultItemMetadata {
  title: string;
  url?: string;
  pinned: boolean;
}

// type gabungan metadata + vault
export type DecryptedVaultItem = Omit<PrismaVaultItem, 'ciphertext' | 'iv' | 'type'> &
  VaultItemData;

// Draft form input sebelum disimpan (belum ada id/timestamp/credentialHistory)
export type VaultItemFormInput = VaultItemMetadata & VaultItemData;
