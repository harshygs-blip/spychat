import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../security/jwt';
import { db } from '../database/db';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload || !payload.sub) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired access token' });
    return;
  }

  const user = db.findUserById(payload.sub);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: User not found' });
    return;
  }

  if (user.is_banned) {
    res.status(403).json({ 
      error: `Account Suspended: ${user.ban_reason || 'Your account has been banned by Administrator.'}`,
      is_banned: true 
    });
    return;
  }

  req.userId = payload.sub;
  next();
}
