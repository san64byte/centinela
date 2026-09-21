import { getServerSession } from '@/lib/get-session';
import prisma from '@/lib/prisma';
import { verifyPassword } from 'better-auth/crypto';
import { SessionRecord, User } from '@/lib/auth';
import { ActionResponse } from '@/types/action-type';
import nodeCrypto from 'node:crypto';

export type RequireAuthOptions = {
  /**
   * Whether to require that the user's email is verified.
   * Defaults to `true`.
   */
  requireEmailVerified?: boolean;
};

export type RequireAuthResult =
  | {
      success: true;
      user: User;
      session: SessionRecord;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Validates the authenticated user session for server actions.
 * By default requires verified email unless `requireEmailVerified: false`.
 */
export async function requireAuthUser(
  options: RequireAuthOptions = {},
): Promise<RequireAuthResult> {
  const { requireEmailVerified = true } = options;
  const session = await getServerSession();

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (requireEmailVerified && !session.user.emailVerified) {
    return { success: false, error: 'Email verification required' };
  }

  return {
    success: true,
    user: session.user,
    session: session.session,
  };
}

/**
 * Verifies that the given password matches the user's account password.
 * Queries the credential account record and checks the password hash.
 */
export async function verifyUserAccountPassword(
  userId: string,
  accountPassword: string,
  customEmptyMessage?: string,
): Promise<ActionResponse> {
  if (!accountPassword || typeof accountPassword !== 'string') {
    return { success: false, error: customEmptyMessage || 'Account password is required' };
  }

  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: 'credential',
    },
  });

  if (!account?.password) {
    return { success: false, error: 'Account credential record not found' };
  }

  const isPasswordValid = await verifyPassword({
    hash: account.password,
    password: accountPassword,
  });

  if (!isPasswordValid) {
    return { success: false, error: 'Incorrect account password' };
  }

  return { success: true };
}

/**
 * Verifies that the client's authProof matches the stored vaultVerifier.
 * Supports slow-hashed verifiers (scrypt/bcrypt) with fallback to constant-time comparison.
 */
export async function verifyMasterPasswordProof(
  authProof: string | undefined | null,
  storedVerifier: string,
): Promise<boolean> {
  if (!authProof || !storedVerifier) return false;

  try {
    const authBits = Buffer.from(authProof, 'base64');
    const computedVerifier = nodeCrypto.createHash('sha256').update(authBits).digest('base64');

    try {
      const isValid = await verifyPassword({
        hash: storedVerifier,
        password: computedVerifier,
      });
      if (isValid) return true;
    } catch {
      // Fallback for legacy format
    }

    const computedBuf = Buffer.from(computedVerifier);
    const storedBuf = Buffer.from(storedVerifier);

    return (
      computedBuf.length === storedBuf.length && nodeCrypto.timingSafeEqual(computedBuf, storedBuf)
    );
  } catch {
    return false;
  }
}
