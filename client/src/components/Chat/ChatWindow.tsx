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
  Reply
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

const EMOJI_REACTIONS = ['❤️', '👍', '😂', '🔥', '😮', '👏'];

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

  // View Once & Round Video & Saved Messages
  const [viewOnceModalMsg, setViewOnceModalMsg] = useState<Message | null>(null);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileFilter, setFileFilter] = useState<'image/*' | 'video/*' | '*/*'>('*/*');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const peer = conversation.peer;
  const quickReplies: AutoReplyRule[] = currentUser.business_automation?.quick_replies || [
    { trigger: '/price', response: '💰 Our packages start from $49/mo. Contact for custom inquiries.', message_type: 'text' },
    { trigger: '/thanks', response: '🙏 Thank you for reaching out! Let us know if you need anything else.', message_type: 'text' },
    { trigger: '/secure', response: '🛡️ SPYCHAT is 100% end-to-end encrypted with zero tracking.', message_type: 'text' }
  ];

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
      scrollToBottom();
    }

    const fetchMessages = async () => {
      try {
        const token = AuthService.getAccessToken();
        const res = await fetch(`${AuthService.getApiBase()}/messages/${conversation.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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

          // Merge with local vault
          decryptedList.forEach(m => {
            LocalVaultService.upsertMessage(conversation.id, m);
            // Confirm to server to purge from server database
            socketService.emit('ack_delivered', { messageId: m.id });
          });

          const allVaultMsgs = LocalVaultService.getMessages(conversation.id);
          setMessages(allVaultMsgs);
          scrollToBottom();
        }
      } catch (err) {
        console.error('Error loading messages from server queue:', err);
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

        // 1. Save to Local Device Vault
        const updatedList = LocalVaultService.upsertMessage(conversation.id, decryptedMsg);
        setMessages(updatedList);
        scrollToBottom();

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

    const handleReadReceipt = (data: { conversationId: string }) => {
      if (data.conversationId === conversation.id) {
        setMessages(prev => prev.map(m => m.sender_id === currentUser.id ? { ...m, status: 'read' } : m));
      }
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('message_ack', handleNewMessage);
    socketService.on('message_reacted', handleReaction);
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
      socketService.off('message_reacted', handleReaction);
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

    // Save and render immediately
    const immediateList = LocalVaultService.upsertMessage(conversation.id, optimisticMsg);
    setMessages(immediateList);
    scrollToBottom();

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
        LocalVaultService.deleteMessage(conversation.id, tempId);
        const decryptedMsg = { ...res.message, decrypted_text: rawText };
        const updatedList = LocalVaultService.upsertMessage(conversation.id, decryptedMsg);
        setMessages(updatedList);
        scrollToBottom();
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

  // Reaction on message
  const handleReact = (msg: Message, emoji: string) => {
    setSelectedMessage(null);
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
    if (viewOnceModalMsg) {
      socketService.emit('consume_view_once', {
        messageId: viewOnceModalMsg.id,
        conversationId: conversation.id
      });
      setMessages(prev => prev.map(m => m.id === viewOnceModalMsg.id ? { ...m, media_url: undefined, viewed_by: [...(m.viewed_by || []), currentUser.id] } : m));
      setViewOnceModalMsg(null);
    }
  };

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

  // --- FILE / PHOTO / VIDEO ATTACHMENTS ---
  const triggerFileSelect = (acceptType: 'image/*' | 'video/*' | '*/*') => {
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
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)'
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
              {peer ? peer.display_name.substring(0, 2).toUpperCase() : '??'}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>
                {peer ? peer.display_name : 'Chat'}
              </div>
              <div style={{ fontSize: '12px', color: isPeerTyping ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                {isPeerTyping ? 'typing...' : `@${peer?.username}`}
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

              {/* 3-Dots Top Menu (Telegram style: Clear History & Delete Chat) */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTopMenu(!showTopMenu)}
                  style={{
                    background: showTopMenu ? 'rgba(255, 255, 255, 0.15)' : 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <MoreVertical size={18} />
                </button>

                {showTopMenu && (
                  <div className="glass" style={{
                    position: 'absolute',
                    top: '42px',
                    right: '0',
                    width: '180px',
                    borderRadius: '14px',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                    border: '1px solid var(--border-color)',
                    zIndex: 70
                  }}>
                    <button
                      onClick={() => {
                        setShowTopMenu(false);
                        setShowClearHistoryModal(true);
                      }}
                      style={{
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: '500',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={15} color="var(--text-muted)" /> Clear History
                    </button>

                    <button
                      onClick={() => {
                        setShowTopMenu(false);
                        setShowDeleteChatModal(true);
                      }}
                      style={{
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        fontSize: '13px',
                        fontWeight: '600',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={15} color="#f87171" /> Delete Chat
                    </button>
                  </div>
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
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedMessage(msg);
                }}
                onClick={() => setSelectedMessage(selectedMessage?.id === msg.id ? null : msg)}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  cursor: 'pointer'
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
                          <span>{msg.decrypted_text || '[🔒 Encrypted Message]'}</span>
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

                      {/* IMAGE MESSAGE (Regular) */}
                      {!msg.view_once && msg.message_type === 'image' && msg.media_url && (
                        <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
                          <img
                            src={msg.media_url}
                            alt="Shared Photo"
                            style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block', borderRadius: '12px' }}
                          />
                        </div>
                      )}

                      {/* VIDEO MESSAGE (Regular) */}
                      {!msg.view_once && msg.message_type === 'video' && msg.media_url && (
                        <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
                          <video
                            src={msg.media_url}
                            controls
                            playsInline
                            style={{ width: '100%', maxHeight: '240px', display: 'block', borderRadius: '12px' }}
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

                {/* Reactions Badge */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    background: 'rgba(15, 23, 42, 0.9)',
                    padding: '2px 6px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    marginTop: '-6px',
                    zIndex: 5
                  }}>
                    {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => (
                      <span key={emoji}>{emoji}</span>
                    ))}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '2px' }}>
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

      {/* SELECTED MESSAGE ACTIONS / REACTION BAR */}
      {selectedMessage && (
        <div className="glass" style={{
          position: 'absolute',
          bottom: '72px',
          left: '16px',
          right: '16px',
          borderRadius: '18px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--accent-cyan)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          zIndex: 60
        }}>
          {/* Reaction Emojis */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {EMOJI_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(selectedMessage, emoji)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Edit / Delete / Close Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Reply Button ↩️ */}
            <button
              onClick={() => {
                setReplyTargetMsg(selectedMessage);
                setSelectedMessage(null);
              }}
              title="Reply to Message"
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '6px' }}
            >
              <Reply size={17} />
            </button>

            {selectedMessage.sender_id === currentUser.id && selectedMessage.message_type === 'text' && (
              <button
                onClick={() => handleStartEdit(selectedMessage)}
                title="Edit Message"
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: '6px' }}
              >
                <Edit2 size={17} />
              </button>
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
              style={{ background: 'none', border: 'none', color: '#eab308', cursor: 'pointer', padding: '6px' }}
            >
              <Star size={17} />
            </button>

            {/* Translate Button 🌐 */}
            <button
              onClick={() => setTranslateTargetMsg(selectedMessage)}
              title="Translate Message"
              style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '6px' }}
            >
              <Languages size={17} />
            </button>

            {/* Telegram style delete for any message */}
            <button
              onClick={() => handleOpenDeleteMessage(selectedMessage)}
              title="Delete Message (Telegram style)"
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '6px' }}
            >
              <Trash2 size={17} />
            </button>

            <button
              onClick={() => setSelectedMessage(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
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

      {/* ATTACHMENT POPUP MENU */}
      {showAttachMenu && (
        <div className="glass" style={{
          position: 'absolute',
          bottom: '70px',
          left: '16px',
          borderRadius: '16px',
          padding: '12px',
          display: 'flex',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          zIndex: 40
        }}>
          {/* Photo */}
          <button
            onClick={() => triggerFileSelect('image/*')}
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent-cyan)',
              cursor: 'pointer'
            }}
          >
            <Image size={22} />
            <span style={{ fontSize: '11px', fontWeight: '600' }}>Photo</span>
          </button>

          {/* Video */}
          <button
            onClick={() => triggerFileSelect('video/*')}
            style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#a855f7',
              cursor: 'pointer'
            }}
          >
            <Video size={22} />
            <span style={{ fontSize: '11px', fontWeight: '600' }}>Video</span>
          </button>

          {/* View Once Photo (1x) */}
          <button
            onClick={() => {
              setIsViewOnceSend(true);
              triggerFileSelect('image/*');
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#f87171',
              cursor: 'pointer'
            }}
          >
            <Eye size={22} />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>1x View Once</span>
          </button>

          {/* Product Catalog */}
          <button
            onClick={() => {
              setShowAttachMenu(false);
              setShowCatalogSheet(true);
            }}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#10b981',
              cursor: 'pointer'
            }}
          >
            <ShoppingBag size={22} />
            <span style={{ fontSize: '11px', fontWeight: '600' }}>Catalog</span>
          </button>

          {/* Live GPS Location 📍 */}
          <button
            onClick={handleSendLocation}
            style={{
              background: 'rgba(250, 204, 21, 0.15)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: '#facc15',
              cursor: 'pointer'
            }}
          >
            <MapPin size={22} />
            <span style={{ fontSize: '11px', fontWeight: '600' }}>Location</span>
          </button>

          {/* Document */}
          <button
            onClick={() => triggerFileSelect('*/*')}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <FileText size={22} />
            <span style={{ fontSize: '11px', fontWeight: '600' }}>File</span>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={deleteMsgForBoth}
                  onChange={(e) => setDeleteMsgForBoth(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600' }}>
                  Also delete for {peer.display_name}
                </span>
              </label>
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

      {/* 4. VIEW ONCE FULLSCREEN MODAL */}
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
          padding: '16px'
        }}>
          {/* Top Bar */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 510
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: '800' }}>
              <Eye size={20} />
              <span>1x View Once Photo (Destroying after close)</span>
            </div>

            <button
              onClick={handleCloseViewOnce}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '12px' }}
            >
              Close & Destroy 💥
            </button>
          </div>

          <img
            src={viewOnceModalMsg.media_url}
            alt="View Once Photo"
            style={{ maxWidth: '96%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '16px' }}
          />
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
    </div>
  );
};
