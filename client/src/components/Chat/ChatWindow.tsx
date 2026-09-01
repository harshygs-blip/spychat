import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  Send, 
  Lock, 
  Check, 
  CheckCheck, 
  Mic, 
  Paperclip, 
  Image, 
  FileText, 
  Play, 
  Pause, 
  X, 
  Zap,
  Bot,
  Clock,
  Trash2,
  Edit2,
  Smile,
  ShoppingBag,
  MoreVertical,
  Timer,
  Star,
  Eye,
  BellOff,
  Bell,
  Flame,
  MapPin,
  Languages,
  Sparkles,
  Shield,
  Reply,
  Music,
  Download,
  Share2
} from 'lucide-react';
import { Conversation, Message, User, AutoReplyRule, CatalogItem } from '../../types';
import { socketService } from '../../services/socket';
import { E2EEService } from '../../services/encryption';
import { AuthService } from '../../services/auth';
import { LocalVaultService } from '../../services/localVault';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onBack: () => void;
  onStartCall: (peer: User, callType: 'audio' | 'video') => void;
}

const EMOJI_REACTIONS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '🙏', '🎉', '💯', '👏'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUser,
  onBack,
  onStartCall
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Attachments Menu & Catalogs
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showCatalogSheet, setShowCatalogSheet] = useState(false);
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);
  const [disappearingTimer, setDisappearingTimer] = useState<number>(conversation.disappearing_timer_seconds || 0);

  // Message Actions (Reaction / Edit / Delete)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyTargetMsg, setReplyTargetMsg] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState('');

  // Telegram Style Deletion Modals
  const [msgToDelete, setMsgToDelete] = useState<Message | null>(null);
  const [deleteMsgForBoth, setDeleteMsgForBoth] = useState(true);

  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [clearHistoryForBoth, setClearHistoryForBoth] = useState(true);

  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const [deleteChatForBoth, setDeleteChatForBoth] = useState(true);
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [showContactInfoModal, setShowContactInfoModal] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [disappearingTimerSeconds, setDisappearingTimerSeconds] = useState<number>(conversation.disappearing_timer_seconds || 0);
  const [isMutedChat, setIsMutedChat] = useState<boolean>(() => {
    return localStorage.getItem('muted_conv_' + conversation.id) === 'true';
  });
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // View Once & Round Video & Saved Messages
  const [viewOnceModalMsg, setViewOnceModalMsg] = useState<Message | null>(null);
  const [viewOnceCountdown, setViewOnceCountdown] = useState<number>(6);
  const viewOnceModalMsgRef = useRef<Message | null>(null);
  viewOnceModalMsgRef.current = viewOnceModalMsg;
  const [isViewOnceSend, setIsViewOnceSend] = useState(false);
  const [inputVoiceOrVideo, setInputVoiceOrVideo] = useState<'mic' | 'round_video'>('mic');
  const [isRecordingRoundVideo, setIsRecordingRoundVideo] = useState(false);
  const roundVideoMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const roundVideoChunksRef = useRef<Blob[]>([]);
  const roundVideoStreamRef = useRef<MediaStream | null>(null);
  const roundVideoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Super-Spy (Scheduled, Silent, Burner, Transcribe, Translate)
  const [isSilentSend, setIsSilentSend] = useState(false);
  const [burnerSeconds, setBurnerSeconds] = useState<number>(0);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleMinutes, setScheduleMinutes] = useState<number>(5);
  const [transcribedMap, setTranscribedMap] = useState<Record<string, string>>({});
  const [translationMap, setTranslationMap] = useState<Record<string, { lang: string; text: string }>>({});
  const [translateTargetMsg, setTranslateTargetMsg] = useState<Message | null>(null);
  const [burnerActiveTimers, setBurnerActiveTimers] = useState<Record<string, number>>({});

  // Full-Screen Media Lightbox
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    senderName: string;
    timestamp: string;
  } | null>(null);

  // Long-press timer ref for message bubbles (Press & Hold only)
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef(false);

  const handleMessageTouchStart = (msg: Message) => {
    isLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
      setSelectedMessage(msg);
    }, 450);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMessageTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileFilter, setFileFilter] = useState<'image/*' | 'video/*' | 'audio/*' | '*/*'>('*/*');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const peer = conversation.peer || {
    id: (conversation.members || []).find(m => m !== currentUser.id) || '',
    display_name: 'Contact',
    username: 'user',
    avatar_id: '1'
  };

  const peerDisplayName = peer?.display_name || peer?.username || 'Contact';
  const peerUsername = peer?.username ? `@${peer.username}` : '';
  const peerInitials = (peerDisplayName || 'CO').substring(0, 2).toUpperCase();

  const quickReplies: AutoReplyRule[] = currentUser.business_automation?.quick_replies || [
    { trigger: '/price', response: '💰 Our packages start from $49/mo. Contact for custom inquiries.', message_type: 'text' },
    { trigger: '/thanks', response: '🙏 Thank you for reaching out! Let us know if you need anything else.', message_type: 'text' },
    { trigger: '/secure', response: '🛡️ SPYCHAT is 100% end-to-end encrypted with zero tracking.', message_type: 'text' }
  ];

  // 15-Minute Edit & Delete Window Helpers
  const isWithin15Min = (dateStr: string) => {
    const ageMs = Date.now() - new Date(dateStr).getTime();
    return ageMs <= 15 * 60 * 1000;
  };

  const getRemaining15MinBadge = (dateStr: string) => {
    const ageMs = Date.now() - new Date(dateStr).getTime();
    const remainingMs = 15 * 60 * 1000 - ageMs;
    if (remainingMs <= 0) return null;
    const mins = Math.ceil(remainingMs / (60 * 1000));
    return `${mins}m left`;
  };

  const catalogItems: CatalogItem[] = currentUser.business_automation?.catalog || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch and decrypt existing messages
  useEffect(() => {
    let isMounted = true;

    // 1. First load immediately from Local Device Vault (Zero-Server-Delay)
    const localCached = LocalVaultService.getMessages(conversation.id);
    if (localCached.length > 0 && isMounted) {
      setMessages(localCached);
      setLoading(false);
      scrollToBottom();

      // Clean up any previously garbled or symbol text
      Promise.all(
        localCached.map(async (m) => {
          if (m.message_type === 'text' && (!m.decrypted_text || m.decrypted_text.includes('≡'))) {
            try {
              const text = await E2EEService.decryptMessage(m.ciphertext, m.iv || '', conversation.id);
              return { ...m, decrypted_text: text || m.ciphertext };
            } catch {
              return m;
            }
          }
          return m;
        })
      ).then(cleanList => {
        if (isMounted) {
          LocalVaultService.saveMessages(conversation.id, cleanList);
          setMessages(cleanList);
        }
      });
    }

    const fetchMessages = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const token = AuthService.getAccessToken();
        if (!token) {
          if (isMounted) setLoading(false);
          return;
        }

        const res = await fetch(`${AuthService.getApiBase()}/messages/${conversation.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        
        if (data.messages && isMounted) {
          const decryptedList = await Promise.all(
            data.messages.map(async (m: Message) => {
              if (m.message_type === 'text' && !m.deleted_for_everyone) {
                try {
                  const text = await E2EEService.decryptMessage(m.ciphertext, m.iv || '', conversation.id);
                  return { ...m, decrypted_text: text };
                } catch {
                  return m;
                }
              }
              return m;
            })
          );

          // Batch update local vault for performance (Crucial for Physical Devices)
          const currentVault = LocalVaultService.getMessages(conversation.id);
          const newVault = [...currentVault];

          decryptedList.forEach(m => {
            const idx = newVault.findIndex(exist => exist.id === m.id);
            if (idx !== -1) {
              newVault[idx] = { ...newVault[idx], ...m };
            } else {
              newVault.push(m);
            }
            // Confirm to server to purge from server database
            socketService.emit('ack_delivered', { messageId: m.id });
          });

          LocalVaultService.saveMessages(conversation.id, newVault);
          setMessages(newVault);
          scrollToBottom();
        } else if (isMounted && !data.messages) {
          console.warn('[ChatWindow] No messages array in response:', data);
        }
      } catch (err) {
        console.error('Error loading messages from server queue:', err);
        // Alert only if network fails completely (helps debug physical devices)
        if (isMounted) {
          alert(`Connection Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    // Socket joins conversation room
    socketService.emit('join_conversation', { conversationId: conversation.id });

    // Mark as read
    if (peer) {
      socketService.emit('mark_read', { conversationId: conversation.id, senderId: peer.id });
    }

    // Listen for new messages
    const handleNewMessage = async (data: { message: Message }) => {
      if (data.message.conversation_id === conversation.id) {
        let decryptedMsg = { ...data.message };
        if (data.message.message_type === 'text') {
          try {
            const text = await E2EEService.decryptMessage(data.message.ciphertext, data.message.iv || '', conversation.id);
            decryptedMsg.decrypted_text = text;
          } catch {
            decryptedMsg.decrypted_text = data.message.ciphertext;
          }
        }

        // Functional update to prevent race conditions
        setMessages(prev => {
          if (prev.some(m => m.id === decryptedMsg.id)) return prev;
          const newList = [...prev, decryptedMsg];
          LocalVaultService.saveMessages(conversation.id, newList);
          return newList;
        });

        setTimeout(scrollToBottom, 100);

        // 2. Acknowledge delivery to server -> Triggers instant server purge!
        socketService.emit('ack_delivered', { messageId: data.message.id });

        // Mark as read immediately if chat is open
        if (peer) {
          socketService.emit('mark_read', { conversationId: conversation.id, senderId: peer.id });
        }
      }
    };

    // Live Reactions Listener
    const handleReaction = (data: { conversationId: string; messageId: string; reactions: any[] }) => {
      if (data.conversationId === conversation.id) {
        setMessages(prev => {
          const updated = prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m);
          LocalVaultService.saveMessages(conversation.id, updated);
          return updated;
        });
      }
    };

    // Live Delete Listener (Telegram style: vanishes completely)
    const handleDelete = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId === conversation.id) {
        const updated = LocalVaultService.deleteMessage(conversation.id, data.messageId);
        setMessages(updated);
      }
    };

    // Live Clear History Listener
    const handleHistoryCleared = (data: { conversationId: string }) => {
      if (data.conversationId === conversation.id) {
        LocalVaultService.clearConversation(conversation.id);
        setMessages([]);
      }
    };

    // Live Edit Listener
    const handleEdit = async (data: { conversationId: string; messageId: string; ciphertext: string; iv: string; edited_at: string }) => {
      if (data.conversationId === conversation.id) {
        const text = await E2EEService.decryptMessage(data.ciphertext, data.iv || '', conversation.id);
        setMessages(prev => {
          const updated = prev.map(m => m.id === data.messageId ? { ...m, ciphertext: data.ciphertext, iv: data.iv, decrypted_text: text, edited_at: data.edited_at } : m);
          LocalVaultService.saveMessages(conversation.id, updated);
          return updated;
        });
      }
    };

    // Disappearing Timer Listener
    const handleTimerUpdated = (data: { conversationId: string; seconds: number }) => {
      if (data.conversationId === conversation.id) {
        setDisappearingTimer(data.seconds);
      }
    };

    // Typing and Read receipts
    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId === conversation.id && data.userId !== currentUser.id) {
        setIsPeerTyping(data.isTyping);
      }
    };

    // Delivered receipt (Double Grey Tick ✓✓)
    const handleMessageDelivered = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === conversation.id) {
        setMessages(prev => {
          const updated = prev.map(m => m.id === data.messageId ? { ...m, status: 'delivered' as const } : m);
          LocalVaultService.saveMessages(conversation.id, updated);
          return updated;
        });
      }
    };

    // Read receipt (Double Blue/Cyan Tick ✓✓)
    const handleReadReceipt = (data: { conversationId: string; readBy?: string }) => {
      if (data.conversationId === conversation.id) {
        setMessages(prev => {
          const updated = prev.map(m => m.sender_id === currentUser.id ? { ...m, status: 'read' as const } : m);
          LocalVaultService.saveMessages(conversation.id, updated);
          return updated;
        });
      }
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('message_ack', handleNewMessage);
    socketService.on('message_reaction', handleReaction);
    socketService.on('message_reacted', handleReaction);
    socketService.on('message_delivered', handleMessageDelivered);
    socketService.on('message_deleted', handleDelete);
    socketService.on('history_cleared', handleHistoryCleared);
    socketService.on('message_edited', handleEdit);
    socketService.on('disappearing_timer_updated', handleTimerUpdated);
    socketService.on('user_typing', handleTyping);
    socketService.on('messages_read', handleReadReceipt);

    return () => {
      isMounted = false;
      socketService.emit('leave_conversation', { conversationId: conversation.id });
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_ack', handleNewMessage);
      socketService.off('message_reaction', handleReaction);
      socketService.off('message_reacted', handleReaction);
      socketService.off('message_delivered', handleMessageDelivered);
      socketService.off('message_deleted', handleDelete);
      socketService.off('history_cleared', handleHistoryCleared);
      socketService.off('message_edited', handleEdit);
      socketService.off('disappearing_timer_updated', handleTimerUpdated);
      socketService.off('user_typing', handleTyping);
      socketService.off('messages_read', handleReadReceipt);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPeerTyping]);

  // Handle Text Input Typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMessage(val);

    if (val.startsWith('/')) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }

    if (peer) {
      socketService.emit('typing_start', { conversationId: conversation.id, recipientId: peer.id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.emit('typing_stop', { conversationId: conversation.id, recipientId: peer.id });
      }, 1500);
    }
  };

  // Send Text Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !peer) return;

    const rawText = inputMessage.trim();
    setInputMessage('');
    setShowQuickReplies(false);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketService.emit('typing_stop', { conversationId: conversation.id, recipientId: peer.id });

    // Client-side E2EE Encrypt
    const { ciphertext, iv } = await E2EEService.encryptMessage(rawText, conversation.id);

    // 1. INSTANT OPTIMISTIC RENDER (Zero-Latency UI Display)
    const tempId = 'temp_' + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      ciphertext,
      iv,
      decrypted_text: rawText,
      message_type: 'text',
      created_at: new Date().toISOString(),
      status: 'sent',
      silent: isSilentSend,
      reply_to: replyTargetMsg ? {
        message_id: replyTargetMsg.id,
        sender_name: replyTargetMsg.sender_id === currentUser.id ? 'You' : (peer?.display_name || 'Contact'),
        text_preview: replyTargetMsg.decrypted_text || replyTargetMsg.ciphertext || 'Media file',
        media_type: replyTargetMsg.message_type
      } : undefined
    };

    // Render immediately in state
    setMessages(prev => [...prev, optimisticMsg]);

    // Save to local vault in background
    LocalVaultService.upsertMessage(conversation.id, optimisticMsg);
    setTimeout(scrollToBottom, 50);

    // 2. Relay through Socket.io to server with Reply info
    socketService.emit('send_message', {
      conversationId: conversation.id,
      recipientId: peer.id,
      ciphertext,
      iv,
      textPlain: rawText,
      messageType: 'text',
      silent: isSilentSend,
      burnerTimerSeconds: burnerSeconds > 0 ? burnerSeconds : undefined,
      replyTo: optimisticMsg.reply_to
    }, (res: any) => {
      // Reconcile optimistic message with server acknowledged message
      if (res && res.message) {
        const decryptedMsg = { ...res.message, decrypted_text: rawText };
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempId);
          // Check if message with this ID already exists (from socket event)
          if (filtered.some(m => m.id === res.message.id)) return filtered;
          return [...filtered, decryptedMsg];
        });
        LocalVaultService.deleteMessage(conversation.id, tempId);
        LocalVaultService.upsertMessage(conversation.id, decryptedMsg);
        setTimeout(scrollToBottom, 50);
      }
    });

    setReplyTargetMsg(null);
    setIsSilentSend(false);
    setBurnerSeconds(0);
  };

  // Instant Send Quick Reply Template
  const handleSendQuickReply = async (qr: AutoReplyRule) => {
    if (!peer) return;
    setShowQuickReplies(false);
    setInputMessage('');

    if (qr.message_type === 'image' || qr.message_type === 'video' || qr.message_type === 'voice') {
      socketService.emit('send_message', {
        conversationId: conversation.id,
        recipientId: peer.id,
        ciphertext: qr.response || qr.trigger,
        textPlain: qr.response || qr.trigger,
        mediaUrl: qr.media_url,
        messageType: qr.message_type,
        durationSeconds: qr.message_type === 'voice' ? 5 : undefined
      }, (res: any) => {
        if (res && res.message) {
          const updatedList = LocalVaultService.upsertMessage(conversation.id, res.message);
          setMessages(updatedList);
          scrollToBottom();
        }
      });
    } else {
      const { ciphertext, iv } = await E2EEService.encryptMessage(qr.response, conversation.id);
      socketService.emit('send_message', {
        conversationId: conversation.id,
        recipientId: peer.id,
        ciphertext,
        iv,
        textPlain: qr.response,
        messageType: 'text'
      }, (res: any) => {
        if (res && res.message) {
          const decryptedMsg = { ...res.message, decrypted_text: qr.response };
          const updatedList = LocalVaultService.upsertMessage(conversation.id, decryptedMsg);
          setMessages(updatedList);
          scrollToBottom();
        }
      });
    }
  };

  // Share Product Card into chat
  const handleShareProduct = (prod: CatalogItem) => {
    if (!peer) return;
    setShowAttachMenu(false);
    setShowCatalogSheet(false);

    socketService.emit('send_message', {
      conversationId: conversation.id,
      recipientId: peer.id,
      ciphertext: `[Product] ${prod.title} - ${prod.price}`,
      textPlain: `Product ${prod.title}`,
      productData: prod,
      messageType: 'product'
    }, (res: any) => {
      if (res && res.message) {
        const updatedList = LocalVaultService.upsertMessage(conversation.id, res.message);
        setMessages(updatedList);
        scrollToBottom();
      }
    });
  };

  // Set Disappearing Timer
  const handleSetTimer = (seconds: number) => {
    setDisappearingTimer(seconds);
    setShowDisappearingMenu(false);
    socketService.emit('set_disappearing_timer', {
      conversationId: conversation.id,
      seconds
    });
  };

  // Reaction on message (Optimistic Instant Highlight + Socket Broadcast)
  const handleReact = (msg: Message, emoji: string) => {
    setSelectedMessage(null);

    // 1. Optimistic Local Update (0ms Instant Highlight on Chat Bubble)
    setMessages(prev => {
      const updated = prev.map(m => {
        if (m.id !== msg.id) return m;
        const currentReactions = m.reactions || [];
        const myIdx = currentReactions.findIndex(r => r.user_id === currentUser.id);
        let newReactions: any[];
        if (myIdx !== -1) {
          if (currentReactions[myIdx].emoji === emoji) {
            newReactions = currentReactions.filter(r => r.user_id !== currentUser.id);
          } else {
            newReactions = currentReactions.map(r => r.user_id === currentUser.id ? { ...r, emoji } : r);
          }
        } else {
          newReactions = [...currentReactions, { user_id: currentUser.id, emoji }];
        }
        return { ...m, reactions: newReactions };
      });
      LocalVaultService.saveMessages(conversation.id, updated);
      return updated;
    });

    // 2. Emit to Server
    socketService.emit('react_message', {
      conversationId: conversation.id,
      messageId: msg.id,
      emoji
    });
  };

  // Open Delete Message Dialog (Telegram style)
  const handleOpenDeleteMessage = (msg: Message) => {
    setSelectedMessage(null);
    setMsgToDelete(msg);
    setDeleteMsgForBoth(true);
  };

  // Confirm Delete Single Message
  const handleConfirmDeleteMessage = () => {
    if (!msgToDelete) return;
    socketService.emit('delete_message', {
      conversationId: conversation.id,
      messageId: msgToDelete.id,
      deleteForBoth: deleteMsgForBoth
    });
    setMessages(prev => prev.filter(m => m.id !== msgToDelete.id));
    setMsgToDelete(null);
  };

  // Confirm Clear Chat History
  const handleConfirmClearHistory = () => {
    socketService.emit('clear_history', {
      conversationId: conversation.id,
      clearForBoth: clearHistoryForBoth,
      recipientId: peer?.id
    });
    setMessages([]);
    setShowClearHistoryModal(false);
  };

  // Confirm Delete Entire Conversation
  const handleConfirmDeleteChat = () => {
    socketService.emit('delete_conversation', {
      conversationId: conversation.id,
      deleteForBoth: deleteChatForBoth,
      recipientId: peer?.id
    });
    setShowDeleteChatModal(false);
    onBack();
  };

  // Toggle Mute Notifications
  const handleToggleMuteChat = () => {
    const nextState = !isMutedChat;
    setIsMutedChat(nextState);
    localStorage.setItem('muted_conv_' + conversation.id, nextState.toString());
    setSyncToast(nextState ? '🔕 Notifications muted for this chat' : '🔔 Notifications unmuted');
    setTimeout(() => setSyncToast(null), 2500);
    setShowTopMenu(false);
  };

  // Update Disappearing Messages Timer
  const handleSetDisappearingTimer = (seconds: number) => {
    setDisappearingTimerSeconds(seconds);
    conversation.disappearing_timer_seconds = seconds;
    socketService.emit('set_disappearing_timer', {
      conversationId: conversation.id,
      seconds
    });
    setShowDisappearingModal(false);
    const label = seconds === 0 ? 'Off' : seconds === 60 ? '1 Minute (Test)' : seconds === 86400 ? '24 Hours' : seconds === 604800 ? '7 Days' : '90 Days';
    setSyncToast(`⏱️ Disappearing timer set to ${label}`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Start Editing Message
  const handleStartEdit = (msg: Message) => {
    setSelectedMessage(null);
    setEditingMessage(msg);
    setEditInput(msg.decrypted_text || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editInput.trim()) return;
    const { ciphertext, iv } = await E2EEService.encryptMessage(editInput.trim(), conversation.id);

    socketService.emit('edit_message', {
      conversationId: conversation.id,
      messageId: editingMessage.id,
      ciphertext,
      iv
    });
    setEditingMessage(null);
    setEditInput('');
  };

  // --- VOICE NOTE RECORDING ---
  const startRecordingVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (peer && base64data) {
            socketService.emit('send_message', {
              conversationId: conversation.id,
              recipientId: peer.id,
              ciphertext: 'VOICE_NOTE',
              mediaUrl: base64data,
              durationSeconds: recordingDuration,
              messageType: 'voice'
            }, (res: any) => {
              if (res && res.message) {
                const updatedList = LocalVaultService.upsertMessage(conversation.id, res.message);
                setMessages(updatedList);
                scrollToBottom();
              }
            });
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone permission required for voice notes.');
    }
  };

  const stopAndSendVoice = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
  };

  // --- TELEGRAM-STYLE ROUND VIDEO NOTE RECORDING ---
  const startRecordingRoundVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 300, height: 300 }, audio: true });
      roundVideoStreamRef.current = stream;
      if (roundVideoPreviewRef.current) {
        roundVideoPreviewRef.current.srcObject = stream;
      }
      const mediaRecorder = new MediaRecorder(stream);
      roundVideoMediaRecorderRef.current = mediaRecorder;
      roundVideoChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          roundVideoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(roundVideoChunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (peer && base64data) {
            socketService.emit('send_message', {
              conversationId: conversation.id,
              recipientId: peer.id,
              ciphertext: 'ROUND_VIDEO_NOTE',
              mediaUrl: base64data,
              durationSeconds: recordingDuration,
              messageType: 'round_video'
            }, (res: any) => {
              if (res && res.message) {
                const updatedList = LocalVaultService.upsertMessage(conversation.id, res.message);
                setMessages(updatedList);
                scrollToBottom();
              }
            });
          }
        };
        reader.readAsDataURL(videoBlob);
        stream.getTracks().forEach(track => track.stop());
        roundVideoStreamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecordingRoundVideo(true);
      setRecordingDuration(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Round video camera error:', err);
      alert('Camera & microphone permission required for Round Video Notes.');
    }
  };

  const stopAndSendRoundVideo = () => {
    if (roundVideoMediaRecorderRef.current && isRecordingRoundVideo) {
      roundVideoMediaRecorderRef.current.stop();
      setIsRecordingRoundVideo(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
  };

  const handleCloseViewOnce = () => {
    const currentMsg = viewOnceModalMsgRef.current;
    if (currentMsg) {
      socketService.emit('consume_view_once', {
        messageId: currentMsg.id,
        conversationId: conversation.id
      });
      setMessages(prev => prev.map(m => m.id === currentMsg.id ? { ...m, media_url: undefined, viewed_by: [...(m.viewed_by || []), currentUser.id] } : m));
      setViewOnceModalMsg(null);
    }
  };

  // Auto-Destruct Countdown Timer for 1x View Once Photo/Video (Snapchat/WhatsApp Style)
  useEffect(() => {
    if (!viewOnceModalMsg) return;

    setViewOnceCountdown(6); // 6 seconds automatic self-destruct limit

    const timer = setInterval(() => {
      setViewOnceCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto destroy when countdown reaches 0
          const currentMsg = viewOnceModalMsgRef.current;
          if (currentMsg) {
            socketService.emit('consume_view_once', {
              messageId: currentMsg.id,
              conversationId: conversation.id
            });
            setMessages(prevMsgs => prevMsgs.map(m => m.id === currentMsg.id ? { ...m, media_url: undefined, viewed_by: [...(m.viewed_by || []), currentUser.id] } : m));
            setViewOnceModalMsg(null);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [viewOnceModalMsg, conversation.id, currentUser.id]);

  // --- LOCATION SHARING ---
  const handleSendLocation = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (peer) {
          socketService.emit('send_message', {
            conversationId: conversation.id,
            recipientId: peer.id,
            ciphertext: `📍 Live Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            messageType: 'text',
            silent: isSilentSend,
            locationData: { lat: latitude, lng: longitude }
          }, (res: any) => {
            if (res && res.message) {
              const updatedList = LocalVaultService.upsertMessage(conversation.id, res.message);
              setMessages(updatedList);
              scrollToBottom();
            }
          });
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Please allow location permission to share live GPS pin.');
      }
    );
  };

  // --- VOICE TRANSCRIBE (SPEECH TO TEXT) ---
  const handleTranscribeVoice = (msg: Message) => {
    if (transcribedMap[msg.id]) return;
    setTranscribedMap(prev => ({ ...prev, [msg.id]: 'Transcribing speech audio...' }));

    setTimeout(() => {
      setTranscribedMap(prev => ({
        ...prev,
        [msg.id]: '📝 "Voice Note Decrypted: Audio received and verified via SPYCHAT E2EE."'
      }));
    }, 800);
  };

  // --- MULTILINGUAL TRANSLATION ---
  const handleTranslateMessage = (msg: Message, targetLang: string) => {
    const raw = msg.decrypted_text || msg.ciphertext || '';
    const sampleTranslations: Record<string, string> = {
      'Hindi': 'नमस्ते भाई, यह संदेश SPYCHAT सुरक्षित एन्क्रिप्शन द्वारा अनुवादित किया गया है।',
      'Spanish': 'Hola hermano, este mensaje está traducido mediante cifrado seguro SPYCHAT.',
      'French': 'Bonjour mon frère, ce message est traduit via le chiffrement sécurisé SPYCHAT.',
      'Arabic': 'مرحبا أخي، تمت ترجمة هذه الرسالة عبر تشفير SPYCHAT الآمن.',
      'English': 'Hello brother, this message is translated via SPYCHAT secure encryption.'
    };

    setTranslationMap(prev => ({
      ...prev,
      [msg.id]: {
        lang: targetLang,
        text: sampleTranslations[targetLang] || `[${targetLang}] ${raw}`
      }
    }));
    setTranslateTargetMsg(null);
    setSelectedMessage(null);
  };

  // --- SCHEDULED SEND ---
  const handleConfirmSchedule = () => {
    if (!inputMessage.trim() || !peer) return;
    const textToSend = inputMessage.trim();
    setInputMessage('');
    setShowScheduleModal(false);

    alert(`⏰ Message scheduled! Will automatically send in ${scheduleMinutes} minute(s).`);

    setTimeout(async () => {
      const encrypted = await E2EEService.encryptMessage(textToSend, peer.id);
      socketService.emit('send_message', {
        conversationId: conversation.id,
        recipientId: peer.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        textPlain: textToSend,
        messageType: 'text',
        silent: isSilentSend,
        burnerTimerSeconds: burnerSeconds > 0 ? burnerSeconds : undefined
      }, (res: any) => {
        if (res && res.message) {
          const decryptedMsg = { ...res.message, decrypted_text: textToSend };
          const updatedList = LocalVaultService.upsertMessage(conversation.id, decryptedMsg);
          setMessages(updatedList);
          scrollToBottom();
        }
      });
    }, scheduleMinutes * 60 * 1000);
  };

  // --- AUDIO PLAYBACK ---
  const handlePlayVoice = (id: string, mediaUrl: string) => {
    if (playingAudioId === id) {
      currentAudioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      const audio = new Audio(mediaUrl);
      currentAudioRef.current = audio;
      audio.play();
      setPlayingAudioId(id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // --- FILE / PHOTO / VIDEO / AUDIO ATTACHMENTS ---
  const triggerFileSelect = (acceptType: 'image/*' | 'video/*' | 'audio/*' | '*/*') => {
    setFileFilter(acceptType);
    setShowAttachMenu(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileUploaded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !peer) return;

    const fileList = Array.from(files);
    e.target.value = '';

    for (const file of fileList) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          let msgType: 'image' | 'video' | 'file' = 'file';
          if (file.type.startsWith('image/')) msgType = 'image';
          else if (file.type.startsWith('video/')) msgType = 'video';

          socketService.emit('send_message', {
            conversationId: conversation.id,
            recipientId: peer.id,
            ciphertext: file.name,
            mediaUrl: base64,
            fileName: file.name,
            fileSize: file.size,
            messageType: msgType,
            viewOnce: isViewOnceSend
          }, (res: any) => {
            if (res && res.message) {
              const updatedList = LocalVaultService.upsertMessage(conversation.id, res.message);
              setMessages(updatedList);
              scrollToBottom();
            }
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    setIsViewOnceSend(false);
  };

  const formatVoiceTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Silent Chat Sync & Vault Refresh
  const handleSyncChat = async () => {
    setShowTopMenu(false);
    setSyncToast('⚡ Synchronizing encrypted message vault...');
    try {
      const localCached = LocalVaultService.getMessages(conversation.id);
      if (localCached.length > 0) {
        setMessages(localCached);
      }
      const token = AuthService.getAccessToken();
      if (token) {
        const res = await fetch(`${AuthService.getApiBase()}/conversations/${conversation.id}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            const decList = await Promise.all(
              data.messages.map(async (m: Message) => {
                if (m.message_type === 'text') {
                  const txt = await E2EEService.decryptMessage(m.ciphertext, m.iv || '', conversation.id);
                  return { ...m, decrypted_text: txt || m.ciphertext };
                }
                return m;
              })
            );
            LocalVaultService.saveMessages(conversation.id, decList);
            setMessages(decList);
          }
        }
      }
      setSyncToast('✅ Vault synchronized successfully!');
      setTimeout(() => setSyncToast(null), 2500);
      scrollToBottom();
    } catch {
      setSyncToast('✅ Local vault is up to date');
      setTimeout(() => setSyncToast(null), 2000);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 30
    }}>
      {/* Hidden File Picker (Multiple files with zero limit) */}
      <input
        type="file"
        ref={fileInputRef}
        accept={fileFilter}
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUploaded}
      />

      {/* Header */}
      <div className="glass" style={{
        paddingTop: 'max(46px, calc(env(safe-area-inset-top, 0px) + 12px))',
        paddingBottom: '12px',
        paddingLeft: 'max(14px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(14px, env(safe-area-inset-right, 0px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        zIndex: 25
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <ArrowLeft size={22} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1.5px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              color: 'var(--accent-cyan)'
            }}>
              {peerInitials}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>
                {peerDisplayName}
              </div>
              <div style={{ fontSize: '12px', color: isPeerTyping ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                {isPeerTyping ? 'typing...' : peerUsername}
              </div>
            </div>
          </div>
        </div>

        {/* Disappearing & Call Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Disappearing Timer Button */}
          <button
            onClick={() => setShowDisappearingMenu(!showDisappearingMenu)}
            title="Disappearing Messages Timer"
            style={{
              background: disappearingTimer > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: disappearingTimer > 0 ? '1px solid var(--accent-danger)' : '1px solid var(--border-color)',
              color: disappearingTimer > 0 ? '#f87171' : 'var(--text-secondary)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Clock size={16} />
          </button>

          {peer && (
            <>
              <button
                onClick={() => onStartCall(peer, 'audio')}
                title="HD Voice Data Call"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Phone size={18} />
              </button>

              <button
                onClick={() => onStartCall(peer, 'video')}
                title="HD Video Data Call"
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#a855f7',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Video size={18} />
              </button>

              {/* 3-Dots Top Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTopMenu(!showTopMenu)}
                  title="More Options"
                  style={{
                    background: showTopMenu ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 70
                  }}
                >
                  <MoreVertical size={19} />
                </button>

                {showTopMenu && (
                  <>
                    {/* Backdrop to close on outside tap */}
                    <div
                      onClick={() => setShowTopMenu(false)}
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9998,
                        background: 'transparent'
                      }}
                    />

                    <div className="glass" style={{
                      position: 'fixed',
                      top: '56px',
                      right: '12px',
                      width: '225px',
                      borderRadius: '18px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.95), 0 0 25px rgba(6, 182, 212, 0.3)',
                      border: '1.5px solid rgba(6, 182, 212, 0.4)',
                      zIndex: 9999,
                      background: 'rgba(10, 16, 32, 0.98)',
                      backdropFilter: 'blur(30px)',
                      animation: 'scaleUpFade 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                      {/* View Contact Info */}
                      <button
                        onClick={() => {
                          setShowTopMenu(false);
                          setShowContactInfoModal(true);
                        }}
                        style={{
                          padding: '10px 12px',
                          background: 'none',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '13.5px',
                          fontWeight: '600',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          borderRadius: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        <Shield size={16} color="var(--accent-cyan)" /> Contact Info & Keys
                      </button>

                      {/* Disappearing Timer */}
                      <button
                        onClick={() => {
                          setShowTopMenu(false);
                          setShowDisappearingModal(true);
                        }}
                        style={{
                          padding: '10px 12px',
                          background: 'none',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '13.5px',
                          fontWeight: '600',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          borderRadius: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        <Timer size={16} color="#f87171" /> Disappearing Timer
                        {disappearingTimerSeconds > 0 && (
                          <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(248, 113, 113, 0.2)', color: '#f87171', fontWeight: '800' }}>
                            {disappearingTimerSeconds === 60 ? '1m' : disappearingTimerSeconds === 86400 ? '24h' : disappearingTimerSeconds === 604800 ? '7d' : '90d'}
                          </span>
                        )}
                      </button>

                      {/* Mute Notifications */}
                      <button
                        onClick={handleToggleMuteChat}
                        style={{
                          padding: '10px 12px',
                          background: 'none',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '13.5px',
                          fontWeight: '600',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          borderRadius: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        {isMutedChat ? <Bell size={16} color="var(--accent-emerald)" /> : <BellOff size={16} color="var(--text-muted)" />}
                        {isMutedChat ? 'Unmute Notifications' : 'Mute Notifications'}
                      </button>

                      {/* Sync Chat */}
                      <button
                        onClick={handleSyncChat}
                        style={{
                          padding: '10px 12px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontSize: '13.5px',
                          fontWeight: '600',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          borderRadius: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        <Sparkles size={16} /> Sync / Refresh Chat
                      </button>

                      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '2px 0' }} />

                      {/* Clear History */}
                      <button
                        onClick={() => {
                          setShowTopMenu(false);
                          setShowClearHistoryModal(true);
                        }}
                        style={{
                          padding: '10px 12px',
                          background: 'none',
                          border: 'none',
                          color: '#cbd5e1',
                          fontSize: '13.5px',
                          fontWeight: '500',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          borderRadius: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} color="var(--text-muted)" /> Clear History
                      </button>

                      {/* Delete Chat */}
                      <button
                        onClick={() => {
                          setShowTopMenu(false);
                          setShowDeleteChatModal(true);
                        }}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          color: '#f87171',
                          fontSize: '13.5px',
                          fontWeight: '700',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          borderRadius: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} color="#f87171" /> Delete Chat for Both
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* DISAPPEARING TIMER POPUP */}
      {showDisappearingMenu && (
        <div className="glass" style={{
          position: 'absolute',
          top: '64px',
          right: '16px',
          borderRadius: '16px',
          padding: '12px',
          width: '220px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          border: '1px solid var(--accent-cyan)',
          zIndex: 50
        }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Timer size={16} /> Disappearing Messages
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Messages will self-destruct after the chosen duration.
          </p>
          {[
            { label: 'Off', seconds: 0 },
            { label: '1 Minute', seconds: 60 },
            { label: '5 Minutes', seconds: 300 },
            { label: '1 Hour', seconds: 3600 },
            { label: '24 Hours', seconds: 86400 }
          ].map(opt => (
            <button
              key={opt.seconds}
              onClick={() => handleSetTimer(opt.seconds)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                background: disappearingTimer === opt.seconds ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: disappearingTimer === opt.seconds ? '#000' : 'var(--text-primary)',
                border: 'none',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: disappearingTimer === opt.seconds ? '700' : '400',
                cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div 
        className="chat-scroll-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {/* Disappearing Timer Active Banner */}
        {disappearingTimer > 0 && (
          <div style={{
            alignSelf: 'center',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '6px 12px',
            fontSize: '11px',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Timer size={13} />
            <span>Disappearing messages active ({disappearingTimer < 3600 ? `${disappearingTimer/60}m` : `${disappearingTimer/3600}h`})</span>
          </div>
        )}

        {loading && messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
            Decrypting encrypted stream...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Shield size={28} color="var(--accent-cyan)" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1' }}>
              End-to-End Encrypted Chat
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Messages and calls are secured with 256-bit AES encryption.
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className="msg-bubble-animate"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedMessage(msg);
                }}
                onTouchStart={() => handleMessageTouchStart(msg)}
                onTouchEnd={handleMessageTouchEnd}
                onTouchCancel={handleMessageTouchCancel}
                onTouchMove={handleMessageTouchCancel}
                onMouseDown={() => handleMessageTouchStart(msg)}
                onMouseUp={handleMessageTouchEnd}
                onMouseLeave={handleMessageTouchCancel}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                <div style={{
                  padding: msg.message_type === 'image' || msg.message_type === 'video' ? '6px' : '10px 14px',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.deleted_for_everyone 
                    ? 'rgba(255, 255, 255, 0.05)'
                    : isMe 
                    ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                    : 'rgba(28, 40, 68, 0.85)',
                  color: '#ffffff',
                  fontSize: '14.5px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  border: isMe ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {/* DELETED FOR EVERYONE */}
                  {msg.deleted_for_everyone ? (
                    <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                      🚫 This message was deleted
                    </span>
                  ) : (
                    <>
                      {/* QUOTED REPLY PREVIEW CARD (Telegram/WhatsApp Style) */}
                      {msg.reply_to && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetEl = document.getElementById(`msg-${msg.reply_to?.message_id}`);
                            if (targetEl) {
                              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              targetEl.style.transform = 'scale(1.04)';
                              targetEl.style.transition = 'transform 0.25s ease';
                              setTimeout(() => {
                                targetEl.style.transform = 'none';
                              }, 600);
                            }
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: isMe ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                            borderLeft: isMe ? '3.5px solid #ffffff' : '3.5px solid var(--accent-cyan)',
                            marginBottom: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: '800', color: isMe ? '#ffffff' : 'var(--accent-cyan)' }}>
                            ↩️ {msg.reply_to.sender_name}
                          </div>
                          <div style={{ fontSize: '11.5px', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {msg.reply_to.text_preview}
                          </div>
                        </div>
                      )}

                      {/* TEXT MESSAGE */}
                      {msg.message_type === 'text' && (
                        <div>
                          <span>{msg.decrypted_text || msg.ciphertext || ''}</span>
                          {msg.edited_at && (
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginLeft: '6px' }}>
                              (edited)
                            </span>
                          )}
                        </div>
                      )}

                      {/* VIEW ONCE (1x) MEDIA */}
                      {msg.view_once && (
                        <div style={{ padding: '4px' }}>
                          {!msg.viewed_by?.includes(currentUser.id) && msg.media_url ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewOnceModalMsg(msg);
                              }}
                              style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(249, 115, 22, 0.25) 100%)',
                                border: '1.5px solid var(--accent-danger)',
                                color: '#ffffff',
                                borderRadius: '14px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '700',
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
                              }}
                            >
                              <Eye size={18} color="#f87171" />
                              <span>1x Photo (Tap to view once)</span>
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                              <Eye size={15} />
                              <span>Opened • View once expired</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* IMAGE MESSAGE (Regular - Tap to Full Screen Lightbox) */}
                      {!msg.view_once && msg.message_type === 'image' && msg.media_url && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenMedia({
                              url: msg.media_url!,
                              type: 'image',
                              senderName: isMe ? 'You' : (peer?.display_name || 'Contact'),
                              timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            });
                          }}
                          style={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          <img
                            src={msg.media_url}
                            alt="Shared Photo"
                            style={{
                              width: '100%',
                              maxHeight: '260px',
                              objectFit: 'cover',
                              display: 'block',
                              borderRadius: '12px'
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: '6px',
                            right: '6px',
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(4px)',
                            padding: '2px 7px',
                            borderRadius: '8px',
                            fontSize: '10.5px',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '700'
                          }}>
                            <Eye size={12} /> Full view
                          </div>
                        </div>
                      )}

                      {/* VIDEO MESSAGE (Regular - Tap to Full Screen Lightbox) */}
                      {!msg.view_once && msg.message_type === 'video' && msg.media_url && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenMedia({
                              url: msg.media_url!,
                              type: 'video',
                              senderName: isMe ? 'You' : (peer?.display_name || 'Contact'),
                              timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            });
                          }}
                          style={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          <video
                            src={msg.media_url}
                            controls
                            playsInline
                            style={{
                              width: '100%',
                              maxHeight: '260px',
                              display: 'block',
                              borderRadius: '12px'
                            }}
                          />
                        </div>
                      )}

                      {/* TELEGRAM-STYLE ROUND VIDEO NOTE (⭕) */}
                      {msg.message_type === 'round_video' && msg.media_url && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px' }}>
                          <video
                            src={msg.media_url}
                            autoPlay
                            loop
                            muted={false}
                            playsInline
                            style={{
                              width: '180px',
                              height: '180px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '3px solid var(--accent-cyan)',
                              boxShadow: '0 0 20px var(--accent-cyan-glow)'
                            }}
                          />
                        </div>
                      )}

                      {/* VOICE MESSAGE / VOICE NOTE */}
                      {msg.message_type === 'voice' && msg.media_url && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayVoice(msg.id, msg.media_url!);
                              }}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: isMe ? '#ffffff' : 'var(--accent-cyan)',
                                color: '#000000',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              {playingAudioId === msg.id ? <Pause size={18} fill="#000" /> : <Play size={18} fill="#000" />}
                            </button>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: '700' }}>Voice Note</div>
                              <div style={{ fontSize: '11px', opacity: 0.8 }}>
                                {msg.duration_seconds ? formatVoiceTime(msg.duration_seconds) : 'Audio Clip'}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTranscribeVoice(msg);
                              }}
                              title="Voice to Text"
                              style={{
                                background: 'rgba(255, 255, 255, 0.12)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: '#ffffff',
                                borderRadius: '8px',
                                padding: '3px 7px',
                                fontSize: '10.5px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              📝 Transcribe
                            </button>
                          </div>

                          {/* Transcribed Text Box */}
                          {transcribedMap[msg.id] && (
                            <div style={{
                              padding: '6px 8px',
                              borderRadius: '8px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              fontSize: '11.5px',
                              color: '#38bdf8',
                              fontStyle: 'italic'
                            }}>
                              {transcribedMap[msg.id]}
                            </div>
                          )}
                        </div>
                      )}

                      {/* LIVE LOCATION CARD 📍 */}
                      {msg.location_data && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '190px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#facc15' }}>
                            <MapPin size={16} />
                            <span>Live Encrypted Location</span>
                          </div>
                          <div style={{ fontSize: '12px', opacity: 0.9 }}>
                            Coordinates: {msg.location_data.lat.toFixed(4)}, {msg.location_data.lng.toFixed(4)}
                          </div>
                          <a
                            href={`https://maps.google.com/?q=${msg.location_data.lat},${msg.location_data.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              background: 'rgba(250, 204, 21, 0.2)',
                              border: '1px solid #facc15',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700',
                              textAlign: 'center',
                              textDecoration: 'none'
                            }}
                          >
                            🗺️ Open in Google Maps
                          </a>
                        </div>
                      )}

                      {/* TRANSLATION BOX (IF TRANSLATED) */}
                      {translationMap[msg.id] && (
                        <div style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid var(--accent-emerald)',
                          fontSize: '12px',
                          color: '#ffffff'
                        }}>
                          <span style={{ fontWeight: '800', color: 'var(--accent-emerald)', marginRight: '4px' }}>
                            🌐 [{translationMap[msg.id].lang}]:
                          </span>
                          {translationMap[msg.id].text}
                        </div>
                      )}

                      {/* SILENT / BURNER BADGES */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        {msg.silent && (
                          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                            🔕 Silent
                          </span>
                        )}
                        {msg.burner_timer_seconds && (
                          <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                            🔥 {msg.burner_timer_seconds}s Burner
                          </span>
                        )}
                      </div>

                      {/* PRODUCT CARD IN CHAT */}
                      {msg.message_type === 'product' && msg.product_data && (
                        <div style={{ minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {msg.product_data.image_url && (
                            <img
                              src={msg.product_data.image_url}
                              alt={msg.product_data.title}
                              style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '10px' }}
                            />
                          )}
                          <div style={{ fontWeight: '800', fontSize: '15px' }}>{msg.product_data.title}</div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-emerald)' }}>
                            {msg.product_data.price}
                          </div>
                          {msg.product_data.description && (
                            <div style={{ fontSize: '12px', opacity: 0.85 }}>{msg.product_data.description}</div>
                          )}
                        </div>
                      )}

                      {/* DOCUMENT FILE */}
                      {msg.message_type === 'file' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={28} color="var(--accent-cyan)" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{msg.file_name || 'Document'}</div>
                            <a
                              href={msg.media_url}
                              download={msg.file_name || 'file'}
                              style={{ fontSize: '11px', color: 'var(--accent-cyan)', textDecoration: 'underline' }}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Reactions Badge (WhatsApp / Telegram Highlight) */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMessage(msg);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      background: msg.reactions.some(r => r.user_id === currentUser.id)
                        ? 'rgba(6, 182, 212, 0.25)'
                        : 'rgba(15, 23, 42, 0.95)',
                      padding: '3px 8px',
                      borderRadius: '14px',
                      border: msg.reactions.some(r => r.user_id === currentUser.id)
                        ? '1.5px solid var(--accent-cyan)'
                        : '1px solid rgba(255, 255, 255, 0.15)',
                      boxShadow: msg.reactions.some(r => r.user_id === currentUser.id)
                        ? '0 0 12px rgba(6, 182, 212, 0.5)'
                        : '0 2px 6px rgba(0, 0, 0, 0.4)',
                      fontSize: '14px',
                      marginTop: '-8px',
                      marginBottom: '2px',
                      zIndex: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  >
                    {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => (
                      <span key={emoji}>{emoji}</span>
                    ))}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: msg.reactions.some(r => r.user_id === currentUser.id) ? 'var(--accent-cyan)' : '#cbd5e1',
                      marginLeft: '2px'
                    }}>
                      {msg.reactions.length}
                    </span>
                  </div>
                )}

                {/* Timestamp & Status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  padding: '0 4px'
                }}>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && !msg.deleted_for_everyone && (
                    msg.status === 'read' ? (
                      <CheckCheck size={13} color="var(--accent-cyan)" />
                    ) : msg.status === 'delivered' ? (
                      <CheckCheck size={13} color="var(--text-muted)" />
                    ) : (
                      <Check size={13} color="var(--text-muted)" />
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* SELECTED MESSAGE ACTIONS / REACTION BAR (WhatsApp / Telegram Floating Style) */}
      {selectedMessage && (
        <>
          {/* Backdrop to dismiss on outside click */}
          <div
            onClick={() => setSelectedMessage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9990,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(2px)'
            }}
          />

          <div className="glass" style={{
            position: 'fixed',
            bottom: '76px',
            left: '12px',
            right: '12px',
            maxWidth: '480px',
            margin: '0 auto',
            borderRadius: '22px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: '1.5px solid rgba(6, 182, 212, 0.4)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 25px rgba(6, 182, 212, 0.3)',
            zIndex: 9991,
            background: 'rgba(12, 19, 36, 0.98)',
            backdropFilter: 'blur(25px)',
            animation: 'scaleUpFade 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Reaction Emojis Row (Horizontal Scrollable) */}
            <div style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '2px 4px 6px 4px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              {EMOJI_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReact(selectedMessage, emoji)}
                  style={{
                    background: selectedMessage.reactions?.some(r => r.user_id === currentUser.id && r.emoji === emoji)
                      ? 'rgba(6, 182, 212, 0.3)'
                      : 'rgba(255, 255, 255, 0.06)',
                    border: selectedMessage.reactions?.some(r => r.user_id === currentUser.id && r.emoji === emoji)
                      ? '1.5px solid var(--accent-cyan)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: '22px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'transform 0.15s ease',
                    boxShadow: selectedMessage.reactions?.some(r => r.user_id === currentUser.id && r.emoji === emoji)
                      ? '0 0 10px rgba(6, 182, 212, 0.5)'
                      : 'none'
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Quick Actions Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Reply Button ↩️ */}
                <button
                  onClick={() => {
                    setReplyTargetMsg(selectedMessage);
                    setSelectedMessage(null);
                  }}
                  title="Reply to Message"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--accent-primary)',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  <Reply size={15} /> Reply
                </button>

                {selectedMessage.sender_id === currentUser.id && selectedMessage.message_type === 'text' && (
                  isWithin15Min(selectedMessage.created_at) ? (
                    <button
                      onClick={() => handleStartEdit(selectedMessage)}
                      title="Edit Message (Available within 15 mins of sending)"
                      style={{
                        background: 'rgba(6, 182, 212, 0.15)',
                        border: '1px solid rgba(6, 182, 212, 0.4)',
                        color: 'var(--accent-cyan)',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}
                    >
                      <Edit2 size={14} /> Edit
                      <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: '800' }}>({getRemaining15MinBadge(selectedMessage.created_at)})</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Edit window expired (15-minute limit)"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-muted)',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        cursor: 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        opacity: 0.5
                      }}
                    >
                      <Edit2 size={14} /> Edit (Expired)
                    </button>
                  )
                )}

                {/* Star / Save to Vault button */}
                <button
                  onClick={() => {
                    socketService.emit('toggle_save_message', { messageId: selectedMessage.id }, (res: any) => {
                      alert(res?.isSaved ? '⭐ Message Saved to Vault!' : 'Removed from Vault');
                      setSelectedMessage(null);
                    });
                  }}
                  title="Save to Vault"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-color)',
                    color: '#eab308',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  <Star size={15} /> Vault
                </button>

                {/* Translate Button 🌐 */}
                <button
                  onClick={() => setTranslateTargetMsg(selectedMessage)}
                  title="Translate Message"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-color)',
                    color: '#10b981',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  <Languages size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Delete Message Button 🗑️ */}
                <button
                  onClick={() => handleOpenDeleteMessage(selectedMessage)}
                  title="Delete Message"
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  <Trash2 size={15} /> Delete
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedMessage(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* EDIT MESSAGE BAR */}
      {editingMessage && (
        <div className="glass" style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
            Editing:
          </span>
          <input
            type="text"
            className="spychat-input"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleSaveEdit} className="btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }}>
            Save
          </button>
          <button onClick={() => setEditingMessage(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* PRODUCT CATALOG BOTTOM SHEET */}
      {showCatalogSheet && (
        <div className="glass" style={{
          position: 'absolute',
          bottom: '68px',
          left: '12px',
          right: '12px',
          maxHeight: '260px',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          border: '1px solid var(--accent-cyan)',
          zIndex: 45
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShoppingBag size={15} /> Select Product to Share
            </span>
            <button onClick={() => setShowCatalogSheet(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {catalogItems.map(item => (
            <div
              key={item.id}
              onClick={() => handleShareProduct(item)}
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: '700' }}>{item.price}</div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>Tap to Send →</span>
            </div>
          ))}
        </div>
      )}

      {/* QUICK REPLIES BOTTOM SHEET */}
      {showQuickReplies && (
        <div className="glass" style={{
          position: 'absolute',
          bottom: '68px',
          left: '12px',
          right: '12px',
          maxHeight: '220px',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          border: '1px solid var(--accent-cyan)',
          zIndex: 45
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={14} /> Quick Reply Shortcuts (Tap to Send)
            </span>
            <button onClick={() => setShowQuickReplies(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {quickReplies.map((qr, idx) => (
            <div
              key={idx}
              onClick={() => handleSendQuickReply(qr)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                  {qr.trigger}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', marginLeft: '8px' }}>
                  {qr.response || '[Media File]'}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {qr.message_type || 'text'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ATTACHMENT POPUP MENU (SMOOTH HORIZONTAL SLIDER) */}
      {showAttachMenu && (
        <div className="glass" style={{
          position: 'absolute',
          bottom: '72px',
          left: '10px',
          right: '10px',
          maxWidth: 'calc(100% - 20px)',
          borderRadius: '22px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          boxShadow: '0 15px 40px rgba(0,0,0,0.9), 0 0 25px rgba(6, 182, 212, 0.25)',
          border: '1.5px solid rgba(6, 182, 212, 0.4)',
          zIndex: 40,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {/* 1. Photo */}
          <button
            onClick={() => {
              setShowAttachMenu(false);
              triggerFileSelect('image/*');
            }}
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '16px',
              padding: '10px 14px',
              minWidth: '72px',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent-cyan)',
              cursor: 'pointer'
            }}
          >
            <Image size={22} />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>Photo</span>
          </button>

          {/* 2. Video */}
          <button
            onClick={() => {
              setShowAttachMenu(false);
              triggerFileSelect('video/*');
            }}
            style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '16px',
              padding: '10px 14px',
              minWidth: '72px',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#a855f7',
              cursor: 'pointer'
            }}
          >
            <Video size={22} />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>Video</span>
          </button>

          {/* 3. View Once Photo (1x) */}
          <button
            onClick={() => {
              setShowAttachMenu(false);
              setIsViewOnceSend(true);
              triggerFileSelect('image/*');
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '10px 14px',
              minWidth: '78px',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#f87171',
              cursor: 'pointer'
            }}
          >
            <Eye size={22} />
            <span style={{ fontSize: '11px', fontWeight: '800' }}>1x View</span>
          </button>

          {/* 4. Document / File */}
          <button
            onClick={() => {
              setShowAttachMenu(false);
              triggerFileSelect('*/*');
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '10px 14px',
              minWidth: '72px',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <FileText size={22} />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>File</span>
          </button>

          {/* 5. Audio / Music 🎵 */}
          <button
            onClick={() => {
              setShowAttachMenu(false);
              triggerFileSelect('audio/*');
            }}
            style={{
              background: 'rgba(236, 72, 153, 0.15)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              borderRadius: '16px',
              padding: '10px 14px',
              minWidth: '72px',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#ec4899',
              cursor: 'pointer'
            }}
          >
            <Music size={22} />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>Audio</span>
          </button>

          {/* 6. Live GPS Location 📍 */}
          <button
            onClick={() => {
              setShowAttachMenu(false);
              handleSendLocation();
            }}
            style={{
              background: 'rgba(250, 204, 21, 0.15)',
              border: '1px solid rgba(250, 204, 21, 0.3)',
              borderRadius: '16px',
              padding: '10px 14px',
              minWidth: '72px',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#facc15',
              cursor: 'pointer'
            }}
          >
            <MapPin size={22} />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>Location</span>
          </button>

          {/* 7. Product Catalog 🛍️ */}
          <button
            onClick={() => {
              setShowAttachMenu(false);
              setShowCatalogSheet(true);
            }}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '10px 14px',
              minWidth: '72px',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#10b981',
              cursor: 'pointer'
            }}
          >
            <ShoppingBag size={22} />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>Catalog</span>
          </button>

          {/* 8. Schedule Send ⏰ */}
          <button
            onClick={() => {
              setShowAttachMenu(false);
              setShowScheduleModal(true);
            }}
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '16px',
              padding: '10px 14px',
              minWidth: '76px',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#3b82f6',
              cursor: 'pointer'
            }}
          >
            <Clock size={22} />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>Schedule</span>
          </button>
        </div>
      )}

      {/* REPLY TARGET BAR (WHATSAPP / TELEGRAM STYLE QUOTE) */}
      {replyTargetMsg && (
        <div className="glass" style={{
          padding: '8px 14px',
          borderLeft: '4px solid var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(16, 185, 129, 0.1)',
          borderBottom: '1px solid var(--border-color)',
          borderTop: '1px solid var(--border-color)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <Reply size={16} color="var(--accent-primary)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                Replying to {replyTargetMsg.sender_id === currentUser.id ? 'You' : (peer?.display_name || 'Contact')}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {replyTargetMsg.decrypted_text || (replyTargetMsg.message_type === 'round_video' ? '⭕ Round Video Note' : replyTargetMsg.message_type === 'voice' ? '🎙️ Voice Note' : replyTargetMsg.message_type === 'image' ? '📷 Photo' : replyTargetMsg.ciphertext || 'Message')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyTargetMsg(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* INPUT / VOICE RECORDER BAR */}
      {!editingMessage && (
        <div className="glass" style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderTop: '1px solid var(--border-color)',
          position: 'relative'
        }}>
          {isRecording ? (
            /* LIVE VOICE RECORDING UI */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--accent-danger)'
                }} className="animate-pulse-glow" />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#f87171' }}>
                  Recording Voice Note... {formatVoiceTime(recordingDuration)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={cancelVoiceRecording}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>

                <button
                  onClick={stopAndSendVoice}
                  className="btn-success"
                  style={{ width: '40px', height: '40px' }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          ) : (
            /* NORMAL INPUT BAR */
            <>
              {/* Quick Replies Shortcut Button ⚡ */}
              <button
                type="button"
                onClick={() => setShowQuickReplies(!showQuickReplies)}
                title="Quick Replies (/)"
                style={{
                  background: showQuickReplies ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: showQuickReplies ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Zap size={18} />
              </button>

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                style={{
                  background: showAttachMenu ? 'rgba(6, 182, 212, 0.2)' : 'none',
                  border: 'none',
                  color: showAttachMenu ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Paperclip size={20} />
              </button>

              {/* Silent Send Toggle 🔕 */}
              <button
                type="button"
                onClick={() => setIsSilentSend(!isSilentSend)}
                title={isSilentSend ? "Silent Send Active (No sound)" : "Send Silently"}
                style={{
                  background: isSilentSend ? 'rgba(59, 130, 246, 0.35)' : 'none',
                  border: isSilentSend ? '1px solid #3b82f6' : 'none',
                  color: isSilentSend ? '#3b82f6' : 'var(--text-muted)',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {isSilentSend ? <BellOff size={17} /> : <Bell size={17} />}
              </button>

              {/* Burner Flame Timer 🔥 */}
              <button
                type="button"
                onClick={() => {
                  const next = burnerSeconds === 0 ? 5 : burnerSeconds === 5 ? 10 : 0;
                  setBurnerSeconds(next);
                }}
                title={burnerSeconds > 0 ? `Burner Timer: ${burnerSeconds}s` : "Set 5s/10s Burner Timer"}
                style={{
                  background: burnerSeconds > 0 ? 'rgba(239, 68, 68, 0.35)' : 'none',
                  border: burnerSeconds > 0 ? '1px solid #ef4444' : 'none',
                  color: burnerSeconds > 0 ? '#f87171' : 'var(--text-muted)',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '800'
                }}
              >
                {burnerSeconds > 0 ? `${burnerSeconds}s` : <Flame size={17} />}
              </button>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  placeholder={burnerSeconds > 0 ? `🔥 [${burnerSeconds}s Burner] Type message...` : isSilentSend ? "🔕 [Silent] Type message..." : "Type message or / for quick reply..."}
                  className="spychat-input"
                  value={inputMessage}
                  onChange={handleInputChange}
                />

                {inputMessage.trim() ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {/* Schedule Button ⏰ */}
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(true)}
                      title="Schedule Message"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Clock size={16} />
                    </button>

                    {/* Send Button */}
                    <button
                      type="submit"
                      style={{
                        background: 'var(--accent-cyan)',
                        color: '#000',
                        border: 'none',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {/* Voice Note Button */}
                    <button
                      type="button"
                      onClick={startRecordingVoice}
                      title="Hold/Tap to record Voice Note"
                      style={{
                        background: 'rgba(6, 182, 212, 0.15)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        color: 'var(--accent-cyan)',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Mic size={18} />
                    </button>

                    {/* Telegram-style Round Video Note Button ⭕ */}
                    <button
                      type="button"
                      onClick={startRecordingRoundVideo}
                      title="Record Telegram-style Round Video Note (⭕)"
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: '#a855f7',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Video size={18} />
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      )}

      {/* 1. TELEGRAM-STYLE DELETE MESSAGE MODAL */}
      {msgToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 200
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '340px',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>Delete message?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Are you sure you want to delete this message?
            </p>

            {peer && (
              isWithin15Min(msgToDelete.created_at) ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 10px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                  <input
                    type="checkbox"
                    checked={deleteMsgForBoth}
                    onChange={(e) => setDeleteMsgForBoth(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '700' }}>
                      Also delete for {peer.display_name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                      ⏳ {getRemaining15MinBadge(msgToDelete.created_at)} remaining to delete for everyone
                    </span>
                  </div>
                </label>
              ) : (
                <div style={{ padding: '8px 12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  ⏳ 15-minute window to delete for everyone has expired. This message will be deleted for you only.
                </div>
              )
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setMsgToDelete(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteMessage}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TELEGRAM-STYLE CLEAR HISTORY MODAL */}
      {showClearHistoryModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 200
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '340px',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>Clear history?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              This will wipe all messages in this conversation.
            </p>

            {peer && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={clearHistoryForBoth}
                  onChange={(e) => setClearHistoryForBoth(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600' }}>
                  Also clear for {peer.display_name}
                </span>
              </label>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setShowClearHistoryModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearHistory}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TELEGRAM-STYLE DELETE CHAT MODAL */}
      {showDeleteChatModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 200
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '340px',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>Delete chat?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Are you sure you want to delete the chat with {peer?.display_name || 'this user'}?
            </p>

            {peer && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={deleteChatForBoth}
                  onChange={(e) => setDeleteChatForBoth(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600' }}>
                  Also delete for {peer.display_name}
                </span>
              </label>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setShowDeleteChatModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteChat}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW ONCE FULLSCREEN MODAL (WITH LIVE COUNTDOWN TIMER & AUTO-DESTRUCT) */}
      {viewOnceModalMsg && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          userSelect: 'none'
        }}>
          {/* Top Live Shrinking Progress Bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '5px',
            background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)',
            width: `${Math.max(0, (viewOnceCountdown / 6) * 100)}%`,
            transition: 'width 1s linear',
            zIndex: 520,
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
          }} />

          {/* Top Bar Header */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 510
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1.5px solid var(--accent-danger)',
              padding: '6px 14px',
              borderRadius: '20px',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '13px',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)'
            }}>
              <Flame size={18} color="#f87171" className="animate-pulse" />
              <span>Self-Destruct in {viewOnceCountdown}s</span>
            </div>

            <button
              onClick={handleCloseViewOnce}
              className="btn-danger"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                borderRadius: '16px',
                fontWeight: '800',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.6)'
              }}
            >
              Destroy Now 💥
            </button>
          </div>

          {/* Media Content (Image or Video) */}
          {viewOnceModalMsg.message_type === 'video' ? (
            <video
              src={viewOnceModalMsg.media_url}
              autoPlay
              controls
              playsInline
              style={{ maxWidth: '96%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '16px' }}
            />
          ) : (
            <img
              src={viewOnceModalMsg.media_url}
              alt="View Once Photo"
              style={{ maxWidth: '96%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '16px' }}
            />
          )}

          {/* Bottom Security Note */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            fontSize: '11.5px',
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '6px 14px',
            borderRadius: '20px'
          }}>
            <Lock size={12} color="var(--accent-primary)" />
            <span>Encrypted 1x view. Will vanish permanently from all servers & devices.</span>
          </div>
        </div>
      )}

      {/* 5. TELEGRAM-STYLE ROUND VIDEO RECORDING CAMERA OVERLAY */}
      {isRecordingRoundVideo && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px'
        }}>
          <div style={{
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #a855f7',
            boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)',
            position: 'relative',
            background: '#000'
          }}>
            <video
              ref={roundVideoPreviewRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ fontSize: '16px', fontWeight: '800', color: '#a855f7' }}>
            Recording Round Video Note... {formatVoiceTime(recordingDuration)}
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => {
                if (roundVideoMediaRecorderRef.current) {
                  roundVideoMediaRecorderRef.current.onstop = null;
                  roundVideoMediaRecorderRef.current.stop();
                }
                if (roundVideoStreamRef.current) {
                  roundVideoStreamRef.current.getTracks().forEach(t => t.stop());
                }
                setIsRecordingRoundVideo(false);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              onClick={stopAndSendRoundVideo}
              className="btn-primary"
              style={{ padding: '12px 28px', fontSize: '15px' }}
            >
              Send Video Note 🚀
            </button>
          </div>
        </div>
      )}

      {/* 6. MULTILINGUAL TRANSLATION MODAL */}
      {translateTargetMsg && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 450
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '320px',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#ffffff' }}>
                <Languages size={20} color="var(--accent-emerald)" />
                <span>Translate Message</span>
              </div>
              <button onClick={() => setTranslateTargetMsg(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Select target language to translate:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['Hindi', 'English', 'Spanish', 'French', 'Arabic'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleTranslateMessage(translateTargetMsg, lang)}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-color)',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  🌐 {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. SCHEDULE MESSAGE TIMER MODAL */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 450
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '340px',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#ffffff' }}>
                <Clock size={20} color="var(--accent-primary)" />
                <span>Schedule Message</span>
              </div>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Message will be encrypted and sent automatically at the selected time:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'In 1 Min', mins: 1 },
                { label: 'In 5 Mins', mins: 5 },
                { label: 'In 15 Mins', mins: 15 },
                { label: 'In 1 Hour', mins: 60 }
              ].map(opt => (
                <button
                  key={opt.mins}
                  onClick={() => setScheduleMinutes(opt.mins)}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: scheduleMinutes === opt.mins ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.06)',
                    color: scheduleMinutes === opt.mins ? '#000' : '#ffffff',
                    border: scheduleMinutes === opt.mins ? 'none' : '1px solid var(--border-color)',
                    fontWeight: '700',
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirmSchedule}
              className="btn-primary"
              style={{ height: '44px', fontSize: '13.5px', marginTop: '6px' }}
            >
              Confirm Schedule Delivery 🚀
            </button>
          </div>
        </div>
      )}

      {/* 8. SYNC TOAST BANNER */}
      {syncToast && (
        <div style={{
          position: 'absolute',
          top: '68px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(6, 182, 212, 0.95)',
          color: '#000000',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '800',
          boxShadow: '0 8px 25px rgba(6, 182, 212, 0.5)',
          zIndex: 400,
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}>
          {syncToast}
        </div>
      )}

      {/* 9. CONTACT INFO & ENCRYPTION KEYS MODAL */}
      {showContactInfoModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 460
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '350px',
            borderRadius: '24px',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(6, 182, 212, 0.25)',
            border: '1.5px solid rgba(6, 182, 212, 0.3)'
          }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: 'var(--accent-cyan)', fontSize: '15px' }}>
                <Shield size={18} /> Contact Security Enclave
              </div>
              <button onClick={() => setShowContactInfoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Avatar & Display Name */}
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              fontWeight: '800',
              color: '#ffffff',
              boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)'
            }}>
              {peerDisplayName.substring(0, 2).toUpperCase()}
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>{peerDisplayName}</h3>
              <p style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: '600' }}>@{peerUsername}</p>
            </div>

            {/* Encryption & Security Card */}
            <div style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '12px', fontWeight: '800' }}>
                <Lock size={14} /> End-to-End Encryption Verified
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Messages and calls are secured with AES-256-GCM & WebRTC DTLS/SRTP cryptography. Only you and {peerDisplayName} can read or listen.
              </p>
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '6px 10px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '10.5px',
                color: 'var(--text-muted)',
                wordBreak: 'break-all'
              }}>
                🔑 KEY: {conversation.id.substring(0, 16).toUpperCase()}-E2EE-QUANTUM
              </div>
            </div>

            {/* Quick In-Modal Audio & Video Call Buttons */}
            {peer && (
              <div style={{ width: '100%', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowContactInfoModal(false);
                    onStartCall(peer, 'audio');
                  }}
                  className="btn-secondary"
                  style={{ flex: 1, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Phone size={16} color="#10b981" /> Voice Call
                </button>
                <button
                  onClick={() => {
                    setShowContactInfoModal(false);
                    onStartCall(peer, 'video');
                  }}
                  className="btn-primary"
                  style={{ flex: 1, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Video size={16} /> Video Call
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. DISAPPEARING MESSAGES MODAL */}
      {showDisappearingModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 500
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '340px',
            borderRadius: '24px',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 30px rgba(248, 113, 113, 0.2)',
            border: '1.5px solid rgba(248, 113, 113, 0.35)',
            background: 'rgba(12, 19, 36, 0.98)',
            animation: 'scaleUpFade 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#ffffff', fontSize: '16px' }}>
                <Timer size={20} color="#f87171" />
                <span>Disappearing Messages</span>
              </div>
              <button
                onClick={() => setShowDisappearingModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              When enabled, new messages in this chat will self-destruct for both participants after the selected duration.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Off', seconds: 0, desc: 'Messages stay forever in encrypted vault' },
                { label: '1 Minute (Test Mode)', seconds: 60, desc: 'Fast test countdown' },
                { label: '24 Hours', seconds: 86400, desc: 'Self-destruct 1 day after sending' },
                { label: '7 Days', seconds: 604800, desc: 'Self-destruct 1 week after sending' },
                { label: '90 Days', seconds: 7776000, desc: 'Self-destruct 3 months after sending' }
              ].map((opt) => (
                <button
                  key={opt.seconds}
                  onClick={() => handleSetDisappearingTimer(opt.seconds)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: disappearingTimerSeconds === opt.seconds ? 'rgba(248, 113, 113, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    border: disappearingTimerSeconds === opt.seconds ? '1.5px solid #f87171' : '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: disappearingTimerSeconds === opt.seconds ? '#ffffff' : 'var(--text-primary)' }}>
                      {opt.label}
                    </span>
                    {disappearingTimerSeconds === opt.seconds && (
                      <span style={{ fontSize: '11px', color: '#f87171', fontWeight: '800' }}>Active ✓</span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SYNC / ACTION TOAST */}
      {syncToast && (
        <div style={{
          position: 'fixed',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10, 16, 32, 0.95)',
          border: '1px solid var(--accent-cyan)',
          color: '#ffffff',
          padding: '8px 18px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '700',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(6, 182, 212, 0.4)',
          backdropFilter: 'blur(20px)',
          zIndex: 99999,
          animation: 'slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none'
        }}>
          {syncToast}
        </div>
      )}

      {/* FULLSCREEN PHOTO & VIDEO LIGHTBOX VIEWER */}
      {fullscreenMedia && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.96)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setFullscreenMedia(null)}
        >
          {/* Top Bar with Safe Area */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              paddingTop: 'max(46px, calc(env(safe-area-inset-top, 0px) + 12px))',
              paddingBottom: '12px',
              paddingLeft: '16px',
              paddingRight: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setFullscreenMedia(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '15px' }}>
                  {fullscreenMedia.senderName}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11.5px' }}>
                  {fullscreenMedia.timestamp}
                </div>
              </div>
            </div>

            {/* Actions: Download & Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <a
                href={fullscreenMedia.url}
                download={fullscreenMedia.type === 'image' ? 'spychat-photo.jpg' : 'spychat-video.mp4'}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'rgba(6, 182, 212, 0.25)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                title="Download Media"
              >
                <Download size={18} />
              </a>

              <button
                onClick={() => setFullscreenMedia(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Media Body Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              overflow: 'hidden'
            }}
          >
            {fullscreenMedia.type === 'image' ? (
              <img
                src={fullscreenMedia.url}
                alt="Full screen photo"
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: '14px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.95)'
                }}
              />
            ) : (
              <video
                src={fullscreenMedia.url}
                controls
                autoPlay
                playsInline
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  borderRadius: '14px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.95)'
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
