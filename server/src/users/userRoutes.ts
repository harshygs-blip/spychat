import { Router } from 'express';
import { searchUsers, getUserPublicProfile, updateProfile } from './userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/search', requireAuth, searchUsers);
router.get('/:id', requireAuth, getUserPublicProfile);
router.put('/profile', requireAuth, updateProfile);

export default router;
