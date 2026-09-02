import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';

// --- SEARCH USERS (Strict 3+ Char Search, Zero Suggestions) ---
export function searchUsers(req: AuthenticatedRequest, res: Response): void {
  try {
    const rawQuery = (req.query.q as string || '').trim().replace(/^@+/, '').toLowerCase();
    
    // Privacy protection: Do NOT return all users as suggestions without typing
    if (!rawQuery || rawQuery.length < 3) {
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

  if (body.avatar_url !== undefined || body.avatarUrl !== undefined) {
    updates.avatar_url = body.avatar_url !== undefined ? body.avatar_url : body.avatarUrl;
  }

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
      avatar_url: updated.avatar_url,
      email: updated.email,
      privacy: updated.privacy,
      app_pin: updated.app_pin,
      business_automation: updated.business_automation
    }
  });
}

// --- CHANGE PASSWORD ---
export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const currentPassword = (req.body.currentPassword || req.body.current_password || '').toString();
    const newPassword = (req.body.newPassword || req.body.new_password || '').toString();

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long' });
      return;
    }

    const user = db.findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Current password does not match. Please verify your current password.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    db.updateUser(user.id, { password_hash: passwordHash });

    res.json({ message: 'Password changed successfully! 🔐' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error while changing password' });
  }
}

// --- SYNC CONTACTS BACKUP (User-Initiated Cloud Address Book Backup) ---
export function syncContactsBackup(req: AuthenticatedRequest, res: Response): void {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) {
      res.status(400).json({ error: 'contacts array is required' });
      return;
    }

    const user = db.findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const backedUpAt = new Date().toISOString();
    const formattedContacts = contacts.map((c: any) => ({
      name: String(c.name || 'Unnamed').substring(0, 100),
      phoneNumber: String(c.phoneNumber || '').substring(0, 30),
      backedUpAt
    }));

    db.updateUser(user.id, { backed_up_contacts: formattedContacts });
    console.log(`[Contacts Backup] User @${user.username} synced ${formattedContacts.length} contacts.`);

    res.json({
      success: true,
      message: `Backed up ${formattedContacts.length} contacts successfully.`,
      count: formattedContacts.length,
      backedUpAt
    });
  } catch (err: any) {
    console.error('Sync contacts backup error:', err);
    res.status(500).json({ error: 'Failed to sync contacts backup', details: err.message });
  }
}

// --- GET BACKED UP CONTACTS ---
export function getContactsBackup(req: AuthenticatedRequest, res: Response): void {
  try {
    const user = db.findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      contacts: user.backed_up_contacts || []
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get backed up contacts', details: err.message });
  }
}
