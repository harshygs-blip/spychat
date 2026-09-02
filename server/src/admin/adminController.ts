import { Request, Response } from 'express';
import os from 'os';
import { db } from '../database/db';
import { kickUserImmediately, kickIpImmediately } from '../socket/socketHandler';

export const ADMIN_MASTER_KEY = (process.env.ADMIN_MASTER_KEY || 'shivambhatt@admin').trim().toLowerCase();

// Admin Auth Middleware Check (Case-Insensitive: works with CAPS or small letters)
export function verifyAdminAccess(req: Request, res: Response, next: Function) {
  const adminKey = ((req.headers['x-admin-key'] as string) || (req.query.adminKey as string) || '').trim().toLowerCase();
  if (adminKey !== ADMIN_MASTER_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Master Key' });
  }
  next();
}

// 1. Get Admin Telemetry & Statistics
export function getAdminStats(req: Request, res: Response) {
  try {
    const stats = db.getAdminTelemetry();
    const serverUptimeSeconds = process.uptime();
    const memUsage = process.memoryUsage();

    res.json({
      success: true,
      stats: {
        ...stats,
        uptime_seconds: Math.floor(serverUptimeSeconds),
        uptime_formatted: `${Math.floor(serverUptimeSeconds / 3600)}h ${Math.floor((serverUptimeSeconds % 3600) / 60)}m`,
        memory_used_mb: (memUsage.heapUsed / (1024 * 1024)).toFixed(2),
        system_free_mem_mb: (os.freemem() / (1024 * 1024)).toFixed(2),
        system_total_mem_mb: (os.totalmem() / (1024 * 1024)).toFixed(2),
        cpu_count: os.cpus().length,
        os_platform: os.platform()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve admin telemetry', details: err.message });
  }
}

// 2. Get All Registered Users with Full IP & Device Info
export function getAllUsers(req: Request, res: Response) {
  try {
    const users = db.getAllUsersAdmin().map(u => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      email: u.email,
      phone_number: u.phone_number || '',
      last_ip: u.last_ip || '127.0.0.1',
      registration_ip: u.registration_ip || '127.0.0.1',
      device_info: u.device_info || 'Unknown Device',
      is_banned: !!u.is_banned,
      ban_reason: u.ban_reason || '',
      banned_at: u.banned_at || '',
      avatar_id: u.avatar_id,
      created_at: u.created_at,
      last_seen: u.last_seen,
      backed_up_contacts: u.backed_up_contacts || []
    }));

    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
}

// 3. Ban User
export function banUser(req: Request, res: Response) {
  try {
    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const banReason = reason || 'Banned by Super Admin';
    const ok = db.banUser(userId, banReason);
    if (!ok) return res.status(404).json({ error: 'User not found' });

    // Instantly disconnect socket and force logout in real-time
    kickUserImmediately(userId, banReason);

    res.json({ success: true, message: `User ${userId} banned successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to ban user', details: err.message });
  }
}

// 4. Unban User
export function unbanUser(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const ok = db.unbanUser(userId);
    if (!ok) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, message: `User ${userId} unbanned successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to unban user', details: err.message });
  }
}

// 5. Delete User Permanently
export function deleteUser(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    // Immediately kick user before deletion
    kickUserImmediately(userId, 'Your account has been deleted by Administrator.');

    const ok = db.deleteUserAdmin(userId);
    if (!ok) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, message: `User ${userId} permanently removed.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
}

// 6. IP Banning & Management
export function getBannedIps(req: Request, res: Response) {
  res.json({ success: true, banned_ips: db.getBannedIps() });
}

export function banIp(req: Request, res: Response) {
  const { ip } = req.body;
  if (!ip || !ip.trim()) return res.status(400).json({ error: 'Valid IP address required' });

  const cleanIp = ip.trim();
  db.banIp(cleanIp);

  // Instantly kick any connected sockets matching this IP
  kickIpImmediately(cleanIp, 'Your IP address has been blacklisted by Administrator.');

  res.json({ success: true, message: `IP ${cleanIp} added to firewall ban list.`, banned_ips: db.getBannedIps() });
}

export function unbanIp(req: Request, res: Response) {
  const { ip } = req.body;
  if (!ip || !ip.trim()) return res.status(400).json({ error: 'Valid IP address required' });

  db.unbanIp(ip.trim());
  res.json({ success: true, message: `IP ${ip} removed from ban list.`, banned_ips: db.getBannedIps() });
}

// 7. Phone Number Blacklist
export function getBlacklistedPhones(req: Request, res: Response) {
  res.json({ success: true, blacklisted_phones: db.getBlacklistedPhones() });
}

export function blacklistPhone(req: Request, res: Response) {
  const { phone } = req.body;
  if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number required' });

  db.blacklistPhone(phone.trim());
  res.json({ success: true, message: `Phone ${phone} blacklisted from registration.`, blacklisted_phones: db.getBlacklistedPhones() });
}

export function unblacklistPhone(req: Request, res: Response) {
  const { phone } = req.body;
  if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number required' });

  db.unblacklistPhone(phone.trim());
  res.json({ success: true, message: `Phone ${phone} removed from blacklist.`, blacklisted_phones: db.getBlacklistedPhones() });
}
