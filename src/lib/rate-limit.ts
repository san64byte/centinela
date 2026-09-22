import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  retryAfter?: number;
  error?: string;
}

export interface BetterAuthRateLimitData {
  key: string;
  count: number;
  lastRequest: number;
}

export interface BetterAuthRateLimitStorage {
  get: (key: string) => Promise<BetterAuthRateLimitData | null>;
  set: (key: string, value: BetterAuthRateLimitData, update?: boolean) => Promise<void>;
  consume?: (
    key: string,
    rule: { window: number; max: number },
  ) => Promise<{
    allowed: boolean;
    retryAfter: number | null;
  }>;
}

/**
 * In-memory sliding window store used as fallback when Upstash Redis
 * credentials are not configured (e.g., in local development or test suite).
 */
class InMemorySlidingWindowStore {
  private store = new Map<string, number[]>();
  private entryStore = new Map<string, BetterAuthRateLimitData>();

  getEntry(key: string): BetterAuthRateLimitData | null {
    return this.entryStore.get(key) || null;
  }

  setEntry(key: string, value: BetterAuthRateLimitData): void {
    this.entryStore.set(key, value);
  }

  consume(
    key: string,
    windowSeconds: number,
    maxRequests: number,
  ): { allowed: boolean; retryAfter: number | null } {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Prune stale keys if memory store grows large
    if (this.store.size > 1000) {
      for (const [k, tsList] of this.store.entries()) {
        const active = tsList.filter((ts) => ts > windowStart);
        if (active.length === 0) {
          this.store.delete(k);
        } else {
          this.store.set(k, active);
        }
      }
    }

    const timestamps = (this.store.get(key) || []).filter((ts) => ts > windowStart);

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
      this.store.set(key, timestamps);
      return { allowed: false, retryAfter };
    }

    timestamps.push(now);
    this.store.set(key, timestamps);
    return { allowed: true, retryAfter: null };
  }

  reset(key?: string): void {
    if (key) {
      this.store.delete(key);
      this.entryStore.delete(key);
    } else {
      this.store.clear();
      this.entryStore.clear();
    }
  }
}

export const inMemoryStore = new InMemorySlidingWindowStore();

function getRedisClient(): Redis | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return new Redis({ url, token });
    } catch (err) {
      console.warn('Failed to initialize Upstash Redis client, using in-memory store:', err);
      return null;
    }
  }

  return null;
}

const redisClient = getRedisClient();

let passwordLimiter: Ratelimit | null = null;
let emailLimiter: Ratelimit | null = null;

if (redisClient) {
  passwordLimiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(5, '10 m'), // 5 percobaan per 10 menit
    prefix: 'centinela:rl:verify-pwd',
    ephemeralCache: new Map(),
    timeout: 2000,
  });

  emailLimiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(1, '60 s'), // 1 email per 60 detik
    prefix: 'centinela:rl:verify-email',
    ephemeralCache: new Map(),
    timeout: 2000,
  });
}

/**
 * Checks rate limiting for account password verification / re-authentication.
 * Limits users to 5 attempts per 10 minutes.
 * Addresses TEMUAN 2 from SECURITY_AUDIT.md.
 */
export async function checkPasswordRateLimit(userId: string): Promise<RateLimitResult> {
  const key = `verify-pwd:${userId}`;

  if (passwordLimiter) {
    try {
      const result = await passwordLimiter.limit(key);
      if (!result.success) {
        const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        return {
          success: false,
          retryAfter: retryAfterSeconds,
          error: 'Too many attempts. Please try again in 10 minutes.',
        };
      }
      return { success: true };
    } catch (err) {
      console.warn(
        'Upstash rate limiter error for password verification, falling back to memory:',
        err,
      );
    }
  }

  // Fallback to in-memory sliding window
  const memoryResult = inMemoryStore.consume(key, 600, 5);
  if (!memoryResult.allowed) {
    return {
      success: false,
      retryAfter: memoryResult.retryAfter ?? 600,
      error: 'Too many attempts. Please try again in 10 minutes.',
    };
  }

  return { success: true };
}

/**
 * Checks server-side rate limiting / cooldown for verification email sending.
 * Limits to 1 email per 60 seconds per target email address.
 * Addresses TEMUAN 8 from SECURITY_AUDIT.md.
 */
export async function checkEmailVerificationCooldown(email: string): Promise<RateLimitResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const key = `verify-email:${normalizedEmail}`;

  if (emailLimiter) {
    try {
      const result = await emailLimiter.limit(key);
      if (!result.success) {
        const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        return {
          success: false,
          retryAfter: retryAfterSeconds,
          error:
            'Too many requests. Please wait a moment before requesting another verification email.',
        };
      }
      return { success: true };
    } catch (err) {
      console.warn('Upstash rate limiter error for email cooldown, falling back to memory:', err);
    }
  }

  // Fallback to in-memory sliding window
  const memoryResult = inMemoryStore.consume(key, 60, 1);
  if (!memoryResult.allowed) {
    return {
      success: false,
      retryAfter: memoryResult.retryAfter ?? 60,
      error:
        'Too many requests. Please wait a moment before requesting another verification email.',
    };
  }

  return { success: true };
}

/**
 * Custom rate limit storage provider for Better Auth.
 * Bridges Better Auth rate limiting to Upstash Redis (atomic sliding counter) with in-memory fallback.
 * Addresses TEMUAN 4 from SECURITY_AUDIT.md.
 */
export function createBetterAuthRateLimitStorage(): BetterAuthRateLimitStorage {
  return {
    get: async (key: string) => {
      if (redisClient) {
        try {
          const raw = await redisClient.get<string | BetterAuthRateLimitData>(
            `centinela:ba-entry:${key}`,
          );
          if (!raw) return null;
          if (typeof raw === 'string') {
            return JSON.parse(raw) as BetterAuthRateLimitData;
          }
          return raw;
        } catch {
          // ignore
        }
      }
      return inMemoryStore.getEntry(key);
    },
    set: async (key: string, value: BetterAuthRateLimitData) => {
      if (redisClient) {
        try {
          await redisClient.set(`centinela:ba-entry:${key}`, JSON.stringify(value), { ex: 3600 });
          return;
        } catch {
          // ignore
        }
      }
      inMemoryStore.setEntry(key, value);
    },
    consume: async (key: string, rule: { window: number; max: number }) => {
      if (redisClient) {
        try {
          const fullKey = `centinela:ba-rl:${key}`;
          const pipeline = redisClient.pipeline();
          pipeline.incr(fullKey);
          pipeline.ttl(fullKey);
          const [currentCount, currentTtl] = (await pipeline.exec()) as [number, number];

          // If key is newly created, set TTL to window duration
          if (currentTtl === -1 || currentCount === 1) {
            await redisClient.expire(fullKey, rule.window);
          }

          if (currentCount > rule.max) {
            const retryAfter = currentTtl > 0 ? currentTtl : rule.window;
            return {
              allowed: false,
              retryAfter,
            };
          }

          return {
            allowed: true,
            retryAfter: null,
          };
        } catch (err) {
          console.warn(
            'Upstash rate limiter error in Better Auth storage, falling back to memory:',
            err,
          );
        }
      }

      return inMemoryStore.consume(key, rule.window, rule.max);
    },
  };
}

/**
 * Resets all rate limit counters (useful for unit tests).
 */
export function resetAllRateLimits(): void {
  inMemoryStore.reset();
}
