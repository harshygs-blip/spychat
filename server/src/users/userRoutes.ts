import { Router } from 'express';
import { searchUsers, getUserPublicProfile, updateProfile, changePassword } from './userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/search', requireAuth, searchUsers);
router.get('/:id', requireAuth, getUserPublicProfile);
router.put('/profile', requireAuth, updateProfile);
router.put('/change-password', requireAuth, changePassword);

export default router;
