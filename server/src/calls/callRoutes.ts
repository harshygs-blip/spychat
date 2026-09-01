import { Router } from 'express';
import { getCallLogs, getTurnServers, deleteCallLog, clearCallLogs } from './callController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getCallLogs);
router.get('/turn-servers', requireAuth, getTurnServers);
router.delete('/:callId', requireAuth, deleteCallLog);
router.delete('/', requireAuth, clearCallLogs);

export default router;
