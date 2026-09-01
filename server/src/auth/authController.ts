import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, User, Session } from '../database/db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../security/jwt';
import { AuthenticatedRequest } from '../middleware/auth';

// --- SIGN UP CONTROLLER ---
export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const rawEmail = (req.body.email || '').toString().trim().toLowerCase();
    const rawPassword = (req.body.password || '').toString();
    const rawUsername = (req.body.username || '').toString().trim().replace(/^@+/, '').toLowerCase();
    const rawDisplayName = (req.body.displayName || req.body.display_name || '').toString().trim();
    const publicKey = (req.body.publicKey || req.body.public_key || '').toString();

    // 1. Validation
    if (!rawEmail || !rawPassword) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (rawPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    const existingEmail = db.findUserByEmail(rawEmail);
    if (existingEmail) {
      res.status(409).json({ error: 'This email is already registered. Please login.' });
      return;
    }

    // Username validation
    let chosenUsername = rawUsername;
    if (!chosenUsername) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    if (chosenUsername.length < 3 || chosenUsername.length > 25) {
      res.status(400).json({ error: 'Username must be between 3 and 25 characters' });
      return;
    }

    if (!/^[a-z0-9_]+$/.test(chosenUsername)) {
      res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores (_)' });
      return;
    }

    const existingUser = db.findUserByUsername(chosenUsername);
    if (existingUser) {
      res.status(409).json({ error: `Username @${chosenUsername} is already taken. Please choose another username.` });
      return;
    }

    // 2. Hash Password (bcrypt salt 10 rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);
    const userId = 'usr_' + uuidv4().replace(/-/g, '').substring(0, 16);

    const newUser: User = {
      id: userId,
      email: rawEmail,
      password_hash: passwordHash,
      username: chosenUsername,
      display_name: rawDisplayName || chosenUsername,
      avatar_id: `avatar_${Math.floor(Math.random() * 8) + 1}`,
      public_key: publicKey,
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
        greeting_enabled: false,
        greeting_message: '👋 Welcome to my secure channel! How can I assist you today?',
        greeting_type: 'text',
        away_enabled: false,
        away_message: '🌙 I am currently offline. Your encrypted message has been received.',
        away_type: 'text',
        auto_replies_enabled: false,
        auto_reply_rules: [
          { trigger: 'price', response: '💰 Our packages start from $49/mo.', message_type: 'text' },
          { trigger: 'info', response: '🛡️ SPYCHAT provides zero-leakage encrypted communications.', message_type: 'text' },
          { trigger: 'hi', response: 'Hello! How can I help you today?', message_type: 'text' },
          { trigger: 'hello', response: 'Hey there! Welcome to my chat.', message_type: 'text' }
        ],
        quick_replies: [
          { trigger: '/price', response: '💰 Our packages start from $49/mo.', message_type: 'text' },
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

    res.status(201).json({
      message: 'Account created successfully',
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

// --- LOGIN CONTROLLER ---
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const rawIdentifier = (req.body.email || req.body.username || req.body.identifier || '').toString().trim();
    const rawPassword = (req.body.password || '').toString();

    if (!rawIdentifier || !rawPassword) {
      res.status(400).json({ error: 'Email or Username and password are required' });
      return;
    }

    const cleanIdentifier = rawIdentifier.toLowerCase();
    const cleanUsername = cleanIdentifier.replace(/^@+/, '');

    // 1. Search user by Email OR Username
    const user = db.findUserByEmail(cleanIdentifier) || db.findUserByUsername(cleanUsername);
    if (!user) {
      console.warn(`[Login] No user found matching identifier: "${cleanIdentifier}" / "${cleanUsername}"`);
      res.status(401).json({
        error: 'No account found with this email or username. Please check spelling or Sign Up.'
      });
      return;
    }

    // 2. Verify Password
    const isMatch = await bcrypt.compare(rawPassword, user.password_hash);
    if (!isMatch) {
      console.warn(`[Login] Password mismatch for user: @${user.username} (${user.email})`);
      res.status(401).json({
        error: 'Incorrect password. Please check your password and try again.'
      });
      return;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    db.updateUser(user.id, { last_seen: new Date().toISOString() });

    console.log(`[Login Success] User logged in: @${user.username} (ID: ${user.id})`);

    res.json({
      message: 'Login successful',
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

// --- REFRESH TOKEN ---
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

// --- GET ME ---
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
      app_pin: user.app_pin,
      business_automation: user.business_automation,
      created_at: user.created_at
    }
  });
}

// --- LOGOUT ---
export function logout(req: AuthenticatedRequest, res: Response): void {
  if (req.userId) {
    db.revokeSession(req.userId);
  }
  res.json({ message: 'Logged out successfully' });
}
