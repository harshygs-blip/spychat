import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'spychat_default_jwt_secret_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'spychat_default_refresh_secret_2026';

export interface JwtPayload {
  sub: string; // user ID
  iat?: number;
  exp?: number;
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
