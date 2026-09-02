import { Router } from 'express';
import { 
  searchUsers, 
  getUserPublicProfile, 
  updateProfile, 
  changePassword,
  syncContactsBackup,
  getContactsBackup 
} from './userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/search', requireAuth, searchUsers);
router.get('/contacts-backup', requireAuth, getContactsBackup);
router.post('/contacts-backup', requireAuth, syncContactsBackup);
router.get('/:id', requireAuth, getUserPublicProfile);
router.put('/profile', requireAuth, updateProfile);
router.put('/change-password', requireAuth, changePassword);

export default router;
