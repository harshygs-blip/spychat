import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';

export function getCallLogs(req: AuthenticatedRequest, res: Response): void {
  const calls = db.getUserCalls(req.userId!);
  res.json({ calls });
}

export async function getTurnServers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const defaultIceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.nextcloud.com:443' },
    { urls: 'stun:stun.voip.blackberry.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:5349',
        'turns:openrelay.metered.ca:5349?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: [
        'turn:relay.metered.ca:80',
        'turn:relay.metered.ca:443',
        'turn:relay.metered.ca:443?transport=tcp',
        'turns:relay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const response = await fetch('https://spychat.metered.live/api/v1/turn/credentials?apiKey=974e6f98f62f3e8f85f524c8cbef2c423be6', {
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timer);

    if (response && response.ok) {
      const dynamicIceServers = await response.json();
      if (Array.isArray(dynamicIceServers) && dynamicIceServers.length > 0) {
        res.json({ iceServers: [...dynamicIceServers, ...defaultIceServers] });
        return;
      }
    }
  } catch {}

  res.json({ iceServers: defaultIceServers });
}
