import { Response } from 'express';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';

export function getConversations(req: AuthenticatedRequest, res: Response): void {
  const conversations = db.getUserConversations(req.userId!);
  res.json({ conversations });
}

export function startOrGetDirectConversation(req: AuthenticatedRequest, res: Response): void {
  const { peerId } = req.body;
  if (!peerId) {
    res.status(400).json({ error: 'peerId is required' });
    return;
  }

  const peer = db.findUserById(peerId);
  if (!peer) {
    res.status(404).json({ error: 'Peer user not found' });
    return;
  }

  const conv = db.findOrCreateDirectConversation(req.userId!, peerId);
  res.json({
    conversation: {
      ...conv,
      peer: {
        id: peer.id,
        username: peer.username,
        display_name: peer.display_name,
        avatar_id: peer.avatar_id,
        public_key: peer.public_key,
        last_seen: peer.privacy.last_seen_visibility === 'nobody' ? '' : peer.last_seen
      }
    }
  });
}
