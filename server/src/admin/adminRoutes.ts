import { Router } from 'express';
import { 
  verifyAdminAccess, 
  getAdminStats, 
  getAllUsers, 
  banUser, 
  unbanUser, 
  deleteUser, 
  clearUserContacts,
  getBannedIps, 
  banIp, 
  unbanIp, 
  getBlacklistedPhones, 
  blacklistPhone, 
  unblacklistPhone 
} from './adminController';

const router = Router();

// Protect all admin endpoints with Admin Key Verification
router.use(verifyAdminAccess);

// Telemetry & Metrics
router.get('/stats', getAdminStats);

// User Directory Management
router.get('/users', getAllUsers);
router.post('/ban-user', banUser);
router.post('/unban-user', unbanUser);
router.post('/delete-user', deleteUser);
router.post('/clear-user-contacts', clearUserContacts);

// IP Ban & Firewall
router.get('/banned-ips', getBannedIps);
router.post('/ban-ip', banIp);
router.post('/unban-ip', unbanIp);

// Phone Blacklist
router.get('/blacklisted-phones', getBlacklistedPhones);
router.post('/blacklist-phone', blacklistPhone);
router.post('/unblacklist-phone', unblacklistPhone);

export default router;
