import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../security/jwt';
import { db, Message, CallLog } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// In-memory active sockets map: userId -> Set<socketId>
const userSockets = new Map<string, Set<string>>();

export function setupSocketHandler(io: Server): void {
  // Authentication middleware for Socket.io
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token as string;
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    const payload = verifyAccessToken(token);
    if (!payload || !payload.sub) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    const user = db.findUserById(payload.sub);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user.id;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    
    // Register socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's personal room for direct targeting
    socket.join(`user_${userId}`);

    // Update last seen and broadcast online status if allowed
    const currentUser = db.findUserById(userId);
    if (currentUser) {
      db.updateUser(userId, { last_seen: new Date().toISOString() });
      if (currentUser.privacy.online_status_visibility !== 'nobody') {
        io.emit('user_presence', { userId, status: 'online', last_seen: currentUser.last_seen });
      }
    }

    console.log(`[SPYCHAT Socket] User connected: ${userId} (Socket: ${socket.id})`);

    // --- WHATSAPP-STYLE STORE-AND-FORWARD: DELIVER QUEUED OFFLINE MESSAGES & PURGE FROM SERVER ---
    const pending = db.getPendingUndeliveredMessages(userId);
    if (pending.length > 0) {
      console.log(`[Zero-Knowledge Relay] Delivering ${pending.length} queued offline messages to ${userId} and purging from server`);
      pending.forEach(msg => {
        socket.emit('new_message', { message: { ...msg, status: 'delivered' } });
        io.to(`user_${msg.sender_id}`).emit('messages_delivered', { messageIds: [msg.id], conversationId: msg.conversation_id });
        // Immediately wipe message from server database
        db.purgeDeliveredMessage(msg.id);
      });
    }

    // --- CONVERSATION & CHAT EVENTS ---
    socket.on('join_conversation', ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.join(`conv_${conversationId}`);
      }
    });

    socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
      }
    });

    // Disappearing timer setting
    socket.on('set_disappearing_timer', ({ conversationId, seconds }: { conversationId: string; seconds: number }) => {
      db.updateConversation(conversationId, { disappearing_timer_seconds: seconds });
      io.to(`conv_${conversationId}`).emit('disappearing_timer_updated', { conversationId, seconds });
    });

    // Message Reactions
    socket.on('react_message', ({ conversationId, messageId, emoji }: { conversationId: string; messageId: string; emoji: string }) => {
      const updatedMsg = db.addMessageReaction(messageId, userId, emoji);
      if (updatedMsg) {
        io.to(`conv_${conversationId}`).emit('message_reacted', {
          conversationId,
          messageId,
          reactions: updatedMsg.reactions
        });
      }
    });

    // Acknowledge Receipt: Immediate Server Purge
    socket.on('ack_delivered', ({ messageId }: { messageId: string }) => {
      if (messageId) {
        db.purgeDeliveredMessage(messageId);
      }
    });

    // Delete Message (Telegram Style: For Me or For Both)
    socket.on('delete_message', ({ conversationId, messageId, deleteForBoth }: { conversationId: string; messageId: string; deleteForBoth?: boolean }) => {
      if (deleteForBoth !== false) {
        db.deleteMessageCompletely(messageId);
        io.to(`conv_${conversationId}`).emit('message_deleted', {
          conversationId,
          messageId
        });
      } else {
        // Only for current user
        socket.emit('message_deleted', {
          conversationId,
          messageId
        });
      }
    });

    // Delete Entire Conversation (Telegram Style: In Chat List & Inside Chat)
    socket.on('delete_conversation', ({ conversationId, deleteForBoth, recipientId }: { conversationId: string; deleteForBoth: boolean; recipientId?: string }) => {
      db.deleteConversation(conversationId, deleteForBoth, userId);

      // Notify current user
      socket.emit('conversation_deleted', { conversationId });

      // Notify peer user if deleteForBoth
      if (deleteForBoth && recipientId) {
        io.to(`user_${recipientId}`).emit('conversation_deleted', { conversationId });
      }
    });

    // Clear Chat History (Telegram Style)
    socket.on('clear_history', ({ conversationId, clearForBoth, recipientId }: { conversationId: string; clearForBoth: boolean; recipientId?: string }) => {
      if (clearForBoth) {
        db.clearConversationHistory(conversationId);
        io.to(`conv_${conversationId}`).emit('history_cleared', { conversationId });
      } else {
        socket.emit('history_cleared', { conversationId });
      }
    });

    // Edit Message
    socket.on('edit_message', ({ conversationId, messageId, ciphertext, iv }: { conversationId: string; messageId: string; ciphertext: string; iv?: string }) => {
      const updatedMsg = db.editMessage(messageId, ciphertext, iv);
      if (updatedMsg) {
        io.to(`conv_${conversationId}`).emit('message_edited', {
          conversationId,
          messageId,
          ciphertext: updatedMsg.ciphertext,
          iv: updatedMsg.iv,
          edited_at: updatedMsg.edited_at
        });
      }
    });

    socket.on('send_message', async (data: { 
      conversationId: string; 
      recipientId: string; 
      ciphertext: string; 
      iv?: string; 
      textPlain?: string;
      messageType?: 'text' | 'image' | 'video' | 'voice' | 'file' | 'product' | 'round_video';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: number;
      durationSeconds?: number;
      productData?: any;
      viewOnce?: boolean;
      silent?: boolean;
      burnerTimerSeconds?: number;
      locationData?: { lat: number; lng: number; address?: string };
      replyTo?: any;
    }, callback?: (res: any) => void) => {
      try {
        const { conversationId, recipientId, ciphertext, iv, textPlain, messageType, mediaUrl, fileName, fileSize, durationSeconds, productData, viewOnce, silent, burnerTimerSeconds, locationData, replyTo } = data;

        // Check if conversation has disappearing timer
        const convList = db.getUserConversations(userId);
        const curConv = convList.find(c => c.id === conversationId);
        let expiresAt: string | undefined = undefined;
        if (curConv && curConv.disappearing_timer_seconds && curConv.disappearing_timer_seconds > 0) {
          expiresAt = new Date(Date.now() + curConv.disappearing_timer_seconds * 1000).toISOString();
        }

        const newMsg: Message = {
          id: 'msg_' + uuidv4(),
          conversation_id: conversationId,
          sender_id: userId,
          ciphertext,
          iv: iv || '',
          message_type: messageType || 'text',
          media_url: mediaUrl,
          file_name: fileName,
          file_size: fileSize,
          duration_seconds: durationSeconds,
          product_data: productData,
          reply_to: replyTo,
          view_once: viewOnce,
          silent: silent,
          burner_timer_seconds: burnerTimerSeconds,
          location_data: locationData,
          viewed_by: [],
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          status: 'sent'
        };

        db.createMessage(newMsg);
        db.autoSaveChatContact(userId, recipientId);

        const isRecipientOnline = userSockets.has(recipientId) && userSockets.get(recipientId)!.size > 0;

        // Emit to recipient personal room AND conversation room
        io.to(`user_${recipientId}`).emit('new_message', { message: newMsg });
        io.to(`conv_${conversationId}`).emit('new_message', { message: newMsg });

        // Emit to sender for sync
        socket.emit('message_ack', { message: newMsg });

        if (callback) callback({ success: true, message: newMsg });

        // --- AUTOMATED TRIGGER LOGIC (WhatsApp Business Greeting, Away, Auto-Reply) ---
        const recipientUser = db.findUserById(recipientId);
        if (recipientUser && recipientUser.business_automation) {
          const auto = recipientUser.business_automation;
          const convMessages = db.getMessages(conversationId);
          // Check if this is one of the initial messages
          const userSentCount = convMessages.filter(m => m.sender_id === userId).length;
          const isFirstMessage = userSentCount <= 1;

          const rawSearchText = (textPlain || '').toLowerCase().trim();

          const sendBotResponse = (text: string, mediaUrl?: string, msgType: 'text' | 'image' | 'video' | 'voice' = 'text', delayMs = 500) => {
            setTimeout(() => {
              const botMsg: Message = {
                id: 'msg_' + uuidv4(),
                conversation_id: conversationId,
                sender_id: recipientId,
                ciphertext: Buffer.from(text || 'Auto Reply', 'utf-8').toString('base64'),
                iv: '',
                message_type: msgType,
                media_url: mediaUrl,
                duration_seconds: msgType === 'voice' ? 5 : undefined,
                created_at: new Date().toISOString(),
                status: 'delivered'
              };
              db.createMessage(botMsg);
              io.to(`user_${userId}`).emit('new_message', { message: botMsg });
              io.to(`user_${recipientId}`).emit('new_message', { message: botMsg });
            }, delayMs);
          };

          let replied = false;

          // 1. Check Keyword Auto-Replies First
          if (auto.auto_replies_enabled && auto.auto_reply_rules && auto.auto_reply_rules.length > 0) {
            for (const rule of auto.auto_reply_rules) {
              const trig = (rule.trigger || '').toLowerCase().trim();
              if (trig && (rawSearchText.includes(trig) || trig === '*')) {
                sendBotResponse(rule.response, rule.media_url, rule.message_type || 'text', 400);
                replied = true;
                break;
              }
            }
          }

          // 2. Greeting Message (If first message and not already answered by keyword)
          if (!replied && isFirstMessage && auto.greeting_enabled && (auto.greeting_message || auto.greeting_media_url)) {
            sendBotResponse(auto.greeting_message, auto.greeting_media_url, auto.greeting_type || 'text', 500);
            replied = true;
          }

          // 3. Away Message (If recipient is offline or away mode is enabled and no reply sent yet)
          if (!replied && auto.away_enabled && (!isRecipientOnline || auto.away_enabled) && (auto.away_message || auto.away_media_url)) {
            sendBotResponse(auto.away_message, auto.away_media_url, auto.away_type || 'text', 700);
          }
        }
      } catch (err) {
        console.error('Error sending message:', err);
        if (callback) callback({ success: false, error: 'Failed to send message' });
      }
    });

    socket.on('typing_start', ({ conversationId, recipientId }: { conversationId: string; recipientId: string }) => {
      io.to(`user_${recipientId}`).emit('user_typing', { conversationId, userId, isTyping: true });
    });

    socket.on('typing_stop', ({ conversationId, recipientId }: { conversationId: string; recipientId: string }) => {
      io.to(`user_${recipientId}`).emit('user_typing', { conversationId, userId, isTyping: false });
    });

    socket.on('mark_read', ({ conversationId, senderId }: { conversationId: string; senderId: string }) => {
      db.markMessagesAsRead(conversationId, userId);
      io.to(`user_${senderId}`).emit('messages_read', { conversationId, readBy: userId });
    });

    // --- WEBRTC AUDIO & VIDEO CALLING SIGNALING ---

    // 1. Caller initiates call (sends SDP Offer)
    socket.on('call_user', (data: {
      recipientId: string;
      callType: 'audio' | 'video';
      offer: any;
    }) => {
      const { recipientId, callType, offer } = data;
      const caller = db.findUserById(userId);

      console.log(`[Call Offer] From ${userId} to ${recipientId} (${callType})`);

      if (!caller) return;

      const isRecipientOnline = userSockets.has(recipientId) && userSockets.get(recipientId)!.size > 0;

      if (!isRecipientOnline) {
        // Record missed call
        const missedLog: CallLog = {
          id: 'call_' + uuidv4(),
          caller_id: userId,
          receiver_id: recipientId,
          type: callType,
          status: 'missed',
          duration_seconds: 0,
          created_at: new Date().toISOString()
        };
        db.createCallLog(missedLog);

        socket.emit('call_failed', { reason: 'User is currently offline' });
        return;
      }

      // Send incoming call alert to recipient with caller public profile
      io.to(`user_${recipientId}`).emit('incoming_call', {
        callerId: userId,
        callerUsername: caller.username,
        callerDisplayName: caller.display_name,
        callerAvatarId: caller.avatar_id,
        callType,
        offer
      });
    });

    // 2. Receiver answers call (sends SDP Answer)
    socket.on('call_accepted', (data: {
      callerId: string;
      answer: any;
    }) => {
      const { callerId, answer } = data;
      console.log(`[Call Accepted] By ${userId} from caller ${callerId}`);
      io.to(`user_${callerId}`).emit('call_accepted', {
        receiverId: userId,
        answer
      });
    });

    // 3. Receiver rejects call
    socket.on('call_rejected', (data: { callerId: string; reason?: string }) => {
      const { callerId, reason } = data;
      console.log(`[Call Rejected] By ${userId} from caller ${callerId}`);
      
      const declLog: CallLog = {
        id: 'call_' + uuidv4(),
        caller_id: callerId,
        receiver_id: userId,
        type: 'audio',
        status: 'declined',
        duration_seconds: 0,
        created_at: new Date().toISOString()
      };
      db.createCallLog(declLog);

      io.to(`user_${callerId}`).emit('call_rejected', {
        receiverId: userId,
        reason: reason || 'Call declined'
      });
    });

    // 4. Receiver is busy
    socket.on('call_busy', (data: { callerId: string }) => {
      const { callerId } = data;
      io.to(`user_${callerId}`).emit('call_busy', {
        receiverId: userId
      });
    });

    // 5. Caller cancels call before answered
    socket.on('call_cancelled', (data: { recipientId: string }) => {
      const { recipientId } = data;
      io.to(`user_${recipientId}`).emit('call_cancelled', {
        callerId: userId
      });
    });

    // 6. WebRTC ICE Candidate exchange
    socket.on('ice_candidate', (data: {
      targetUserId: string;
      candidate: any;
    }) => {
      const { targetUserId, candidate } = data;
      io.to(`user_${targetUserId}`).emit('ice_candidate', {
        senderId: userId,
        candidate
      });
    });

    // 7. Call Ended by either party
    socket.on('end_call', (data: {
      targetUserId: string;
      durationSeconds?: number;
      callType?: 'audio' | 'video';
    }) => {
      const { targetUserId, durationSeconds, callType } = data;
      console.log(`[Call Ended] Between ${userId} and ${targetUserId}`);

      if (targetUserId) {
        io.to(`user_${targetUserId}`).emit('call_ended', {
          endedBy: userId
        });

        // Log completed call
        const completedLog: CallLog = {
          id: 'call_' + uuidv4(),
          caller_id: userId,
          receiver_id: targetUserId,
          type: callType || 'audio',
          status: 'completed',
          duration_seconds: durationSeconds || 0,
          created_at: new Date().toISOString()
        };
        db.createCallLog(completedLog);
      }
    });

    // --- VIEW-ONCE SELF-DESTRUCTING CONSUME ---
    socket.on('consume_view_once', ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const consumedMsg = db.markViewOnceConsumed(messageId, userId);
      if (consumedMsg) {
        io.to(`conv_${conversationId}`).emit('view_once_consumed', {
          conversationId,
          messageId
        });
      }
    });

    // --- SAVED MESSAGES VAULT ---
    socket.on('toggle_save_message', ({ messageId }: { messageId: string }, callback?: (res: any) => void) => {
      const isSaved = db.toggleSaveMessage(userId, messageId);
      if (callback) callback({ success: true, isSaved });
    });

    socket.on('get_saved_messages', (callback?: (res: any) => void) => {
      const saved = db.getSavedMessages(userId);
      if (callback) callback({ success: true, savedMessages: saved });
    });

    // --- SPYTUS 24-HOUR STORIES ---
    socket.on('post_spytus', (data: {
      mediaType: 'image' | 'video' | 'text';
      mediaUrl?: string;
      textContent?: string;
      backgroundGradient?: string;
      caption?: string;
      privacyType?: 'all' | 'contacts' | 'whitelist' | 'blacklist';
      privacyUsers?: string[];
    }, callback?: (res: any) => void) => {
      const storyId = 'spytus_' + uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const story = db.createSpytusStory({
        id: storyId,
        user_id: userId,
        media_type: data.mediaType,
        media_url: data.mediaUrl,
        text_content: data.textContent,
        background_gradient: data.backgroundGradient,
        caption: data.caption,
        privacy_type: data.privacyType || 'contacts',
        privacy_users: data.privacyUsers || [],
        viewers: [],
        created_at: new Date().toISOString(),
        expires_at: expiresAt
      });

      const user = db.findUserById(userId);
      const storyPayload = {
        ...story,
        user: user ? {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_id: user.avatar_id
        } : undefined
      };

      io.emit('new_spytus', { story: storyPayload });
      if (callback) callback({ success: true, story: storyPayload });
    });

    socket.on('get_spytus_stories', (callback?: (res: any) => void) => {
      const stories = db.getActiveSpytusStories(userId);
      if (callback) callback({ success: true, stories });
    });

    socket.on('view_spytus', ({ storyId }: { storyId: string }) => {
      db.viewSpytusStory(storyId, userId);
      io.emit('spytus_viewed', { storyId, viewerId: userId });
    });

    socket.on('delete_spytus', ({ storyId }: { storyId: string }, callback?: (res: any) => void) => {
      db.deleteSpytusStory(storyId, userId);
      io.emit('spytus_deleted', { storyId });
      if (callback) callback({ success: true });
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          const now = new Date().toISOString();
          db.updateUser(userId, { last_seen: now });
          io.emit('user_presence', { userId, status: 'offline', last_seen: now });
        }
      }
      console.log(`[SPYCHAT Socket] User disconnected: ${userId} (Socket: ${socket.id})`);
    });
  });
}
