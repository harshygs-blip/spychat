import { Router } from 'express';
import { getConversations, startOrGetDirectConversation } from './conversationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getConversations);
router.post('/direct', requireAuth, startOrGetDirectConversation);

export default router;
