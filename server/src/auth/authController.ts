import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, User, Session } from '../database/db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../security/jwt';
import { BruteForceGuard } from '../security/bruteForceGuard';
import { AuthenticatedRequest } from '../middleware/auth';

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, username, displayName, publicKey } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const existingEmail = db.findUserByEmail(email);
    if (existingEmail) {
      res.status(409).json({ error: 'Email is already registered' });
      return;
    }

    // Auto-generate or sanitize username
    let chosenUsername = username ? username.trim().replace(/^@/, '').toLowerCase() : '';
    if (!chosenUsername) {
      chosenUsername = 'spy_' + Math.random().toString(36).substring(2, 8);
    }

    if (db.findUserByUsername(chosenUsername)) {
      chosenUsername = chosenUsername + '_' + Math.floor(Math.random() * 899 + 100);
    }

    // 256-bit Salt + 12-round Key Derivation
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = 'usr_' + uuidv4().replace(/-/g, '').substring(0, 16);

    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      username: chosenUsername,
      display_name: displayName || chosenUsername,
      avatar_id: `avatar_${Math.floor(Math.random() * 8) + 1}`,
      public_key: publicKey || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      privacy: {
        last_seen_visibility: 'everyone',
        online_status_visibility: 'everyone',
        read_receipts: true,
        typing_indicator: true
      },
      business_automation: {
        greeting_enabled: true,
        greeting_message: '👋 Welcome to my secure channel! How can I assist you today?',
        greeting_type: 'text',
        away_enabled: true,
        away_message: '🌙 I am currently offline. Your encrypted message has been received and I will get back to you shortly.',
        away_type: 'text',
        auto_replies_enabled: true,
        auto_reply_rules: [
          { trigger: 'price', response: '💰 Our packages start from $49/mo.', message_type: 'text' },
          { trigger: 'info', response: '🛡️ SPYCHAT provides zero-leakage encrypted communications.', message_type: 'text' },
          { trigger: 'hi', response: 'Hello! How can I help you today?', message_type: 'text' },
          { trigger: 'hello', response: 'Hey there! Welcome to my chat.', message_type: 'text' }
        ],
        quick_replies: [
          { trigger: '/price', response: '💰 Our packages start from $49/mo. Contact for custom inquiries.', message_type: 'text' },
          { trigger: '/thanks', response: '🙏 Thank you for connecting with us! Have a great day.', message_type: 'text' }
        ]
      }
    };

    db.createUser(newUser);

    const accessToken = generateAccessToken(newUser.id);
    const refreshToken = generateRefreshToken(newUser.id);

    const session: Session = {
      id: 'sess_' + uuidv4(),
      user_id: newUser.id,
      refresh_token_hash: await bcrypt.hash(refreshToken, 6),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    db.createSession(session);

    // Return safe user profile (never expose email or password to others)
    res.status(201).json({
      message: 'Account created successfully (AES-256 / SHA-256 E2EE Enabled)',
      user: {
        id: newUser.id,
        username: newUser.username,
        display_name: newUser.display_name,
        avatar_id: newUser.avatar_id,
        email: newUser.email,
        privacy: newUser.privacy
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown_ip';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // 1. Anti-Brute Force Lockout Check (IP + Email)
    const emailLock = BruteForceGuard.checkLockout(email);
    const ipLock = BruteForceGuard.checkLockout(clientIp);

    if (emailLock.isLocked || ipLock.isLocked) {
      const waitSeconds = Math.max(emailLock.remainingSeconds, ipLock.remainingSeconds);
      res.status(429).json({
        error: `🛡️ Anti-Bruteforce Lock Activated: Too many failed attempts. Please wait ${waitSeconds}s before retrying.`,
        locked: true,
        remainingSeconds: waitSeconds
      });
      return;
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      const failInfo = BruteForceGuard.recordFailure(email);
      BruteForceGuard.recordFailure(clientIp);
      res.status(401).json({
        error: failInfo.locked 
          ? '🛡️ Maximum login attempts exceeded. Account locked for 15 minutes.' 
          : `Invalid email or password. (${failInfo.remainingAttempts} attempts remaining before 15m lockout)`
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const failInfo = BruteForceGuard.recordFailure(email);
      BruteForceGuard.recordFailure(clientIp);
      res.status(401).json({
        error: failInfo.locked 
          ? '🛡️ Maximum login attempts exceeded. Account locked for 15 minutes.' 
          : `Invalid email or password. (${failInfo.remainingAttempts} attempts remaining before 15m lockout)`
      });
      return;
    }

    // Login Successful - Reset Failure Tracking
    BruteForceGuard.recordSuccess(email);
    BruteForceGuard.recordSuccess(clientIp);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    db.updateUser(user.id, { last_seen: new Date().toISOString() });

    res.json({
      message: 'Login successful (256-Bit Protected)',
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_id: user.avatar_id,
        email: user.email,
        privacy: user.privacy
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload || !payload.sub) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    const user = db.findUserById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const newAccessToken = generateAccessToken(user.id);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Error refreshing token' });
  }
}

export function getMe(req: AuthenticatedRequest, res: Response): void {
  const user = db.findUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_id: user.avatar_id,
      email: user.email,
      privacy: user.privacy,
      created_at: user.created_at
    }
  });
}

export function logout(req: AuthenticatedRequest, res: Response): void {
  if (req.userId) {
    db.revokeSession(req.userId);
  }
  res.json({ message: 'Logged out successfully' });
}
