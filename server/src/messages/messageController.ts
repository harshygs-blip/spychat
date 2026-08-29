import { Response } from 'express';
import { db, Message } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

export function getMessages(req: AuthenticatedRequest, res: Response): void {
  const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const messages = db.getMessages(conversationId);
  res.json({ messages });
}

export function sendMessage(req: AuthenticatedRequest, res: Response): void {
  const { conversationId, ciphertext, iv, messageType } = req.body;

  if (!conversationId || !ciphertext) {
    res.status(400).json({ error: 'conversationId and ciphertext are required' });
    return;
  }

  const newMsg: Message = {
    id: 'msg_' + uuidv4(),
    conversation_id: conversationId,
    sender_id: req.userId!,
    ciphertext,
    iv: iv || '',
    message_type: messageType || 'text',
    created_at: new Date().toISOString(),
    status: 'sent'
  };

  db.createMessage(newMsg);
  res.status(201).json({ message: newMsg });
}

export function markAsRead(req: AuthenticatedRequest, res: Response): void {
  const conversationId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  db.markMessagesAsRead(conversationId, req.userId!);
  res.json({ success: true });
}
