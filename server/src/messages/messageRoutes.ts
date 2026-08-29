import { Router } from 'express';
import { getMessages, sendMessage, markAsRead } from './messageController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/:conversationId', requireAuth, getMessages);
router.post('/send', requireAuth, sendMessage);
router.post('/:conversationId/read', requireAuth, markAsRead);

export default router;
