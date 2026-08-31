import { Router } from 'express';
import { getCallLogs, getTurnServers } from './callController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getCallLogs);
router.get('/turn-servers', requireAuth, getTurnServers);

export default router;
