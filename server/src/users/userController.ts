import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';

// --- SEARCH USERS (Strict Privacy: Exact / Prefix Tag Match Only) ---
export function searchUsers(req: AuthenticatedRequest, res: Response): void {
  try {
    const rawQuery = (req.query.q as string || '').trim().replace(/^@+/, '').toLowerCase();
    
    // Privacy-First: Never dump all users! Require typed username tag
    if (!rawQuery || rawQuery.length < 2) {
      res.json({ users: [] });
      return;
    }

    const results = db.searchUsers(rawQuery, req.userId);
    res.json({ users: results });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users', users: [] });
  }
}

// --- GET USER PUBLIC PROFILE ---
export function getUserPublicProfile(req: AuthenticatedRequest, res: Response): void {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = db.findUserById(targetId);

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
      public_key: user.public_key,
      last_seen: user.privacy.last_seen_visibility === 'nobody' ? '' : user.last_seen,
      created_at: user.created_at
    }
  });
}

// --- UPDATE PROFILE ---
export function updateProfile(req: AuthenticatedRequest, res: Response): void {
  const body = req.body || {};
  const updates: any = {};

  const username = body.username;
  if (username) {
    const cleanUsername = username.trim().replace(/^@+/, '').toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 25) {
      res.status(400).json({ error: 'Username must be between 3 and 25 characters' });
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores (_)' });
      return;
    }
    const existing = db.findUserByUsername(cleanUsername);
    if (existing && existing.id !== req.userId!) {
      res.status(409).json({ error: `Username @${cleanUsername} is already taken. Please choose another username.` });
      return;
    }
    updates.username = cleanUsername;
  }

  const displayName = body.display_name || body.displayName;
  if (displayName) updates.display_name = displayName.trim();

  const avatarId = body.avatar_id || body.avatarId;
  if (avatarId) updates.avatar_id = avatarId;

  const publicKey = body.public_key || body.publicKey;
  if (publicKey) updates.public_key = publicKey;

  if (body.privacy) updates.privacy = body.privacy;

  if (body.app_pin !== undefined || body.appPin !== undefined) {
    updates.app_pin = body.app_pin !== undefined ? body.app_pin : body.appPin;
  }

  const businessAuto = body.business_automation || body.businessAutomation;
  if (businessAuto !== undefined) updates.business_automation = businessAuto;

  const updated = db.updateUser(req.userId!, updates);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: updated.id,
      username: updated.username,
      display_name: updated.display_name,
      avatar_id: updated.avatar_id,
      email: updated.email,
      privacy: updated.privacy,
      app_pin: updated.app_pin,
      business_automation: updated.business_automation
    }
  });
}
