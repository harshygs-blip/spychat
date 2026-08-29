import { Router } from 'express';
import { signup, login, refresh, getMe, logout } from './authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
