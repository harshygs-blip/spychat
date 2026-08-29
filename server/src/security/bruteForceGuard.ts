import crypto from 'crypto';

interface FailedAttemptRecord {
  attempts: number;
  lockedUntil?: number;
  lastAttemptAt: number;
}

// In-memory brute force protection tracking (IP & Email keys)
const attemptTracker = new Map<string, FailedAttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const WINDOW_DURATION_MS = 15 * 60 * 1000;  // 15 minutes rolling window

export class BruteForceGuard {
  /**
   * Generates a cryptographically secure 256-bit (32 bytes) random hex salt
   */
  public static generate256BitSalt(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Computes a 256-bit SHA-256 HMAC digest
   */
  public static compute256BitDigest(data: string, salt: string): string {
    return crypto.createHmac('sha256', salt).update(data).digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  public static constantTimeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Checks if an identifier (IP address or email) is currently locked out
   */
  public static checkLockout(identifier: string): { isLocked: boolean; remainingSeconds: number } {
    const record = attemptTracker.get(identifier.toLowerCase());
    if (!record) return { isLocked: false, remainingSeconds: 0 };

    const now = Date.now();

    // Check if lockout is active
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }

    // Reset if window has expired
    if (now - record.lastAttemptAt > WINDOW_DURATION_MS) {
      attemptTracker.delete(identifier.toLowerCase());
      return { isLocked: false, remainingSeconds: 0 };
    }

    return { isLocked: false, remainingSeconds: 0 };
  }

  /**
   * Records a failed login attempt. If attempts exceed threshold, locks the account.
   */
  public static recordFailure(identifier: string): { locked: boolean; remainingAttempts: number; lockoutSeconds: number } {
    const key = identifier.toLowerCase();
    const now = Date.now();
    const record = attemptTracker.get(key) || { attempts: 0, lastAttemptAt: now };

    record.attempts += 1;
    record.lastAttemptAt = now;

    if (record.attempts >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      attemptTracker.set(key, record);
      return {
        locked: true,
        remainingAttempts: 0,
        lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000)
      };
    }

    attemptTracker.set(key, record);
    return {
      locked: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS - record.attempts,
      lockoutSeconds: 0
    };
  }

  /**
   * Clears failure records upon successful login
   */
  public static recordSuccess(identifier: string): void {
    attemptTracker.delete(identifier.toLowerCase());
  }
}
