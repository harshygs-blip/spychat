import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';

export function getCallLogs(req: AuthenticatedRequest, res: Response): void {
  const calls = db.getUserCalls(req.userId!);
  res.json({ calls });
}
