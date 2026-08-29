import { Router } from 'express';
import { getCallLogs } from './callController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getCallLogs);

export default router;
