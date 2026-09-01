import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthService } from './services/auth';
import { socketService } from './services/socket';
import { webrtcService } from './services/webrtc';
import { E2EEService } from './services/encryption';
import { User, Conversation, ActiveCall, Message } from './types';
import { TopHeader } from './components/Navigation/TopHeader';
import { BottomNav } from './components/Navigation/BottomNav';
import { AuthModal } from './components/Auth/AuthModal';
import { ChatList } from './components/Chat/ChatList';
import { ChatWindow } from './components/Chat/ChatWindow';
import { UserSearchModal } from './components/Chat/UserSearchModal';
import { CallModal } from './components/Call/CallModal';
import { FloatingCallPiP } from './components/Call/FloatingCallPiP';
import { IncomingCallModal } from './components/Call/IncomingCallModal';
import { CallLogs } from './components/Call/CallLogs';
import { BusinessAutomationModal } from './components/Business/BusinessAutomationModal';
import { UnifiedSettingsModal } from './components/Settings/UnifiedSettingsModal';
import { AppLockModal } from './components/Security/AppLockModal';
import { ThemePickerModal, ThemeType } from './components/Settings/ThemePickerModal';
import { SpytusModal } from './components/Spytus/SpytusModal';
import { NotificationService } from './services/notifications';
import { PermissionModal } from './components/Common/PermissionModal';
import { LocalVaultService } from './services/localVault';
import { ShareAppModal } from './components/Settings/ShareAppModal';
import { SplashScreen } from './components/Common/SplashScreen';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showShareAppModal, setShowShareAppModal] = useState(false);
  const MAIN_TABS = ['chats', 'spytus', 'calls', 'business', 'settings'] as const;
  type TabType = typeof MAIN_TABS[number];

  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const tabSliderRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);

  // Smooth scroll slider when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const index = MAIN_TABS.indexOf(tab);
    if (tabSliderRef.current && index !== -1) {
      isProgrammaticScrollRef.current = true;
      const width = tabSliderRef.current.clientWidth;
      tabSliderRef.current.scrollTo({
        left: index * width,
        behavior: 'smooth'
      });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 350);
    }
  };

  // Sync active tab on manual finger swipe
  const handleSliderScroll = () => {
    if (isProgrammaticScrollRef.current || !tabSliderRef.current) return;
    const { scrollLeft, clientWidth } = tabSliderRef.current;
    if (clientWidth === 0) return;
    const index = Math.round(scrollLeft / clientWidth);
    if (index >= 0 && index < MAIN_TABS.length) {
      const newTab = MAIN_TABS[index];
      if (newTab !== activeTab) {
        setActiveTab(newTab);
      }
    }
  };
  
  // Theme State
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('spychat_theme') as ThemeType) || 'cyber-dual';
  });
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isFirstTimeTheme, setIsFirstTimeTheme] = useState(false);

  // Apply theme to HTML
  const applyTheme = (theme: ThemeType) => {
    setCurrentTheme(theme);
    localStorage.setItem('spychat_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (!localStorage.getItem('spychat_theme_chosen')) {
      setIsFirstTimeTheme(true);
      setShowThemeModal(true);
    }
  }, []);

  const handleCloseThemeModal = () => {
    setShowThemeModal(false);
    setIsFirstTimeTheme(false);
    localStorage.setItem('spychat_theme_chosen', 'true');
  };

  // Conversations State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  // Search Modal State
  const [showSearch, setShowSearch] = useState(false);

  // In-App Message Banner Notification
  const [inAppBanner, setInAppBanner] = useState<{
    senderName: string;
    textPreview: string;
    conversationId: string;
    avatarId?: string;
  } | null>(null);

  const playMessageChime = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Ringtone Audio Ref
  const ringtoneAudioRef = useRef<{ stop: () => void } | null>(null);

  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      ringtoneAudioRef.current = {
        stop: () => {
          try {
            osc1.stop();
            osc2.stop();
            ctx.close();
          } catch {}
        }
      };
    } catch (err) {
      console.error('Ringtone error:', err);
    }
  };

  const stopRingtone = () => {
    if (ringtoneAudioRef.current) {
      ringtoneAudioRef.current.stop();
      ringtoneAudioRef.current = null;
    }
  };

  // Calling States
  const [incomingCall, setIncomingCall] = useState<{
    caller: User;
    callType: 'audio' | 'video';
    offer: any;
  } | null>(null);

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);

  // Function to reload conversations from server and decrypt latest message
  const reloadConversations = useCallback(async () => {
    try {
      const token = AuthService.getAccessToken();
      if (!token) return;
      const res = await fetch(`${AuthService.getApiBase()}/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.conversations) {
        const decryptedConvs = await Promise.all(
          data.conversations.map(async (conv: Conversation) => {
            if (conv.last_message && conv.last_message.message_type === 'text') {
              const decText = await E2EEService.decryptMessage(
                conv.last_message.ciphertext,
                conv.last_message.iv || '',
                conv.id
              );
              return {
                ...conv,
                last_message: { ...conv.last_message, decrypted_text: decText }
              };
            }
            return conv;
          })
        );
        setConversations(decryptedConvs);
      }
    } catch (err) {
      console.error('Error reloading conversations:', err);
    }
  }, []);

  // Load User on Start with Splash Transition
  useEffect(() => {
    const init = async () => {
      const startTime = Date.now();
      try {
        NotificationService.initServiceWorker();
        const me = await AuthService.getMe();
        if (me) {
          setCurrentUser(me);
          if (me.app_pin && sessionStorage.getItem('spychat_unlocked') !== 'true') {
            setIsLocked(true);
          }
          if (!localStorage.getItem('spychat_permissions_prompted')) {
            setShowPermissionModal(true);
          }
        }
      } catch (err) {
        console.error('Init auth error:', err);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1100 - elapsed);
        setTimeout(() => {
          setLoadingUser(false);
        }, remaining);
      }
    };
    init();
  }, []);

  // Socket & Calling event listeners
  useEffect(() => {
    if (!currentUser) return;

    socketService.connect();
    reloadConversations();

    // Listen for new messages globally in App to update chat list live & trigger in-app notification
    const handleGlobalNewMessage = async (data: { message: any }) => {
      const msg = data.message;
      if (!msg) return;

      let decText = msg.ciphertext;
      if (msg.message_type === 'text') {
        decText = await E2EEService.decryptMessage(msg.ciphertext, msg.iv || '', msg.conversation_id);
      } else if (msg.message_type === 'image') {
        decText = '📷 Photo';
      } else if (msg.message_type === 'video') {
        decText = '🎥 Video';
      } else if (msg.message_type === 'voice') {
        decText = '🎙️ Voice message';
      } else if (msg.message_type === 'round_video') {
        decText = '⭕ Video Note';
      }

      // Save immediately to local device vault so message is NEVER lost when outside chat
      const fullMsg: Message = {
        ...msg,
        decrypted_text: decText
      };
      LocalVaultService.upsertMessage(msg.conversation_id, fullMsg);

      // Check if message is from contact (not self)
      const isFromOther = msg.sender_id !== currentUser.id;
      const isCurrentlyInThisChat = activeConversation && activeConversation.id === msg.conversation_id;

      if (isFromOther) {
        // Play notification chime & vibrate
        playMessageChime();

        // Trigger system native notification (Works even when phone is locked or app is in background)
        const senderName = data.message.sender_name || 'SPYCHAT';
        NotificationService.sendSystemNotification(senderName, decText || 'New secure message', msg.conversation_id);

        // If not in this exact chat, show sleek In-App Notification Banner
        if (!isCurrentlyInThisChat) {
          setInAppBanner({
            senderName,
            textPreview: decText || 'New secure message',
            conversationId: msg.conversation_id
          });
          setTimeout(() => {
            setInAppBanner(prev => prev && prev.conversationId === msg.conversation_id ? null : prev);
          }, 4500);
        }
      }

      setConversations(prev => {
        const exists = prev.find(c => c.id === msg.conversation_id);
        if (exists) {
          const updatedConv: Conversation = {
            ...exists,
            updated_at: msg.created_at,
            last_message: { ...msg, decrypted_text: decText },
            unread_count: isCurrentlyInThisChat ? 0 : ((exists.unread_count || 0) + (isFromOther ? 1 : 0))
          };
          // Move to very top of list
          return [updatedConv, ...prev.filter(c => c.id !== msg.conversation_id)];
        } else {
          // If brand new conversation from a new contact, reload entire list immediately
          reloadConversations();
          return prev;
        }
      });
    };

    // Listen for conversation deleted (Telegram style)
    const handleConversationDeleted = (data: { conversationId: string }) => {
      setConversations(prev => prev.filter(c => c.id !== data.conversationId));
      setActiveConversation(prev => prev && prev.id === data.conversationId ? null : prev);
    };

    socketService.on('new_message', handleGlobalNewMessage);
    socketService.on('message_ack', handleGlobalNewMessage);
    socketService.on('conversation_deleted', handleConversationDeleted);

    // Listen for incoming call
    const handleIncomingCall = (data: {
      callerId: string;
      callerUsername: string;
      callerDisplayName: string;
      callerAvatarId: string;
      callType: 'audio' | 'video';
      offer: any;
    }) => {
      console.log('[Incoming Call]:', data);
      startRingtone();
      NotificationService.sendSystemNotification(
        `📞 Incoming ${data.callType === 'video' ? 'Video' : 'Audio'} Call`,
        `${data.callerDisplayName || data.callerUsername} is calling you...`
      );
      setIncomingCall({
        caller: {
          id: data.callerId,
          username: data.callerUsername,
          display_name: data.callerDisplayName,
          avatar_id: data.callerAvatarId
        },
        callType: data.callType,
        offer: data.offer
      });
    };

    // Listen for call accepted by recipient
    const handleCallAccepted = async (data: { receiverId: string; answer: any }) => {
      console.log('[Call Accepted by peer]:', data);
      stopRingtone();
      await webrtcService.handleAnswer(data.answer);
      setActiveCall(prev => prev ? { ...prev, state: 'CONNECTED', startTime: Date.now() } : null);
    };

    // Listen for call rejected/declined
    const handleCallRejected = () => {
      stopRingtone();
      alert('Call was declined or user is busy.');
      webrtcService.endCall();
      setActiveCall(null);
    };

    // Listen for ICE candidates
    const handleIceCandidate = async (data: { senderId: string; candidate: any }) => {
      await webrtcService.addIceCandidate(data.candidate);
    };

    // Listen for call ended
    const handleCallEnded = () => {
      stopRingtone();
      webrtcService.endCall();
      setActiveCall(null);
      setIncomingCall(null);
    };

    // Listen for call cancelled by caller before answered
    const handleCallCancelled = () => {
      stopRingtone();
      setIncomingCall(null);
    };

    socketService.on('incoming_call', handleIncomingCall);
    socketService.on('call_accepted', handleCallAccepted);
    socketService.on('call_rejected', handleCallRejected);
    socketService.on('call_busy', handleCallRejected);
    socketService.on('ice_candidate', handleIceCandidate);
    socketService.on('call_ended', handleCallEnded);
    socketService.on('call_cancelled', handleCallCancelled);

    return () => {
      stopRingtone();
      socketService.off('new_message', handleGlobalNewMessage);
      socketService.off('message_ack', handleGlobalNewMessage);
      socketService.off('conversation_deleted', handleConversationDeleted);
      socketService.off('incoming_call', handleIncomingCall);
      socketService.off('call_accepted', handleCallAccepted);
      socketService.off('call_rejected', handleCallRejected);
      socketService.off('call_busy', handleCallRejected);
      socketService.off('ice_candidate', handleIceCandidate);
      socketService.off('call_ended', handleCallEnded);
      socketService.off('call_cancelled', handleCallCancelled);
    };
  }, [currentUser, activeConversation, reloadConversations]);

  // Handle starting outgoing call
  const handleStartCall = async (peer: User, callType: 'audio' | 'video') => {
    try {
      setIsCallMinimized(false);
      setActiveCall({
        peerUser: peer,
        callType,
        isCaller: true,
        state: 'CALLING'
      });

      const offer = await webrtcService.startCall(peer.id, callType);

      socketService.emit('call_user', {
        recipientId: peer.id,
        callType,
        offer
      });
    } catch (err: any) {
      console.error('Call failed to start:', err);
      alert(`Could not start call: ${err.message || 'Camera/Microphone permission denied'}`);
      setActiveCall(null);
      setIsCallMinimized(false);
    }
  };

  // Handle accepting incoming call
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      stopRingtone();
      setIsCallMinimized(false);
      const { caller, callType, offer } = incomingCall;
      setActiveCall({
        peerUser: caller,
        callType,
        isCaller: false,
        state: 'CONNECTED',
        startTime: Date.now()
      });

      const answer = await webrtcService.answerCall(caller.id, offer, callType);

      socketService.emit('call_accepted', {
        callerId: caller.id,
        answer
      });

      setIncomingCall(null);
    } catch (err: any) {
      console.error('Error accepting call:', err);
      alert('Failed to connect call: ' + err.message);
      handleDeclineIncomingCall();
    }
  };

  // Handle declining incoming call
  const handleDeclineIncomingCall = () => {
    stopRingtone();
    if (incomingCall) {
      socketService.emit('call_rejected', { callerId: incomingCall.caller.id });
      setIncomingCall(null);
    }
  };

  // Handle ending active call
  const handleEndActiveCall = () => {
    stopRingtone();
    if (activeCall) {
      const durationSecs = activeCall.startTime ? Math.floor((Date.now() - activeCall.startTime) / 1000) : 0;
      socketService.emit('end_call', {
        targetUserId: activeCall.peerUser.id,
        durationSeconds: durationSecs,
        callType: activeCall.callType
      });
      webrtcService.endCall();
      setActiveCall(null);
      setIsCallMinimized(false);
    }
  };

  // Quick Chat with the person currently on Call (minimizes call into floating PiP)
  const handleOpenChatWithCallPeer = async (peer: User) => {
    setIsCallMinimized(true);
    try {
      const token = AuthService.getAccessToken();
      const res = await fetch(`${AuthService.getApiBase()}/conversations/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ peerId: peer.id })
      });
      const data = await res.json();
      if (data.conversation) {
        setConversations(prev => {
          if (prev.some(c => c.id === data.conversation.id)) return prev;
          return [data.conversation, ...prev];
        });
        setActiveConversation(data.conversation);
      }
    } catch (err) {
      console.error('Error opening chat with call peer:', err);
    }
  };

  // Start chat with peer user
  const handleSelectUserFromSearch = async (user: User, action: 'chat' | 'audio' | 'video') => {
    setShowSearch(false);

    try {
      const token = AuthService.getAccessToken();
      const res = await fetch(`${AuthService.getApiBase()}/conversations/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ peerId: user.id })
      });
      const data = await res.json();
      if (data.conversation) {
        setConversations(prev => {
          if (prev.some(c => c.id === data.conversation.id)) return prev;
          return [data.conversation, ...prev];
        });

        if (action === 'chat') {
          setActiveConversation(data.conversation);
        } else {
          handleStartCall(user, action);
        }
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  // Handle Android Native Hardware / Gesture Back Button & Web PopState
  useEffect(() => {
    const handleBackButtonAction = () => {
      // 1. If active call is in progress, do not exit accidentally
      if (activeCall) {
        return;
      }

      // 2. If incoming call modal is ringing, decline call on back press
      if (incomingCall) {
        handleDeclineIncomingCall();
        return;
      }

      // 3. If Share APK modal is open, close it
      if (showShareAppModal) {
        setShowShareAppModal(false);
        return;
      }

      // 4. If Theme Picker modal is open, close it
      if (showThemeModal) {
        setShowThemeModal(false);
        return;
      }

      // 5. If User Search modal is open, close it
      if (showSearch) {
        setShowSearch(false);
        return;
      }

      // 6. If Permission modal is open, close it
      if (showPermissionModal) {
        setShowPermissionModal(false);
        return;
      }

      // 7. If ChatWindow is open, go back to chat list
      if (activeConversation) {
        setActiveConversation(null);
        reloadConversations();
        return;
      }

      // 8. If on another tab (e.g. Spytus, Calls, Business, Settings), switch back to 'chats'
      if (activeTab !== 'chats') {
        handleTabChange('chats');
        return;
      }

      // 9. If on chats tab with nothing open on Android Native, exit
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.exitApp();
      }
    };

    let backListener: any = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', () => {
        handleBackButtonAction();
      }).then(handle => {
        backListener = handle;
      });
    }

    // Also support browser back button via popstate
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleBackButtonAction();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (backListener) {
        backListener.remove();
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    activeCall,
    incomingCall,
    showShareAppModal,
    showThemeModal,
    showSearch,
    showPermissionModal,
    activeConversation,
    activeTab,
    reloadConversations
  ]);

  const handleLogout = () => {
    AuthService.clearSession();
    socketService.disconnect();
    setCurrentUser(null);
    setActiveConversation(null);
    setActiveCall(null);
  };

  const totalUnreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (loadingUser) {
    return <SplashScreen statusText="Initializing SPYCHAT Quantum Enclave..." />;
  }

  if (!currentUser) {
    return <AuthModal onSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <TopHeader
        currentUser={currentUser}
        activeTab={activeTab}
        onOpenSearch={() => setShowSearch(true)}
        onOpenTheme={() => setShowThemeModal(true)}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenShareApp={() => setShowShareAppModal(true)}
      />

      {/* Main Tab Content - Horizontal Swipe Slider (iPhone WhatsApp Style) */}
      <main
        ref={tabSliderRef}
        onScroll={handleSliderScroll}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          position: 'relative',
          width: '100%',
          height: '100%'
        }}
      >
        {/* Panel 1: Chats */}
        <div style={{
          width: '100%',
          minWidth: '100%',
          maxWidth: '100%',
          height: '100%',
          scrollSnapAlign: 'start',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <ChatList
            conversations={conversations}
            onSelectConversation={(conv) => {
              setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
              setActiveConversation(conv);
            }}
            onOpenSearch={() => setShowSearch(true)}
            onDeleteConversation={(convId) => {
              setConversations(prev => prev.filter(c => c.id !== convId));
            }}
          />
        </div>

        {/* Panel 2: Spytus */}
        <div style={{
          width: '100%',
          minWidth: '100%',
          maxWidth: '100%',
          height: '100%',
          scrollSnapAlign: 'start',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <SpytusModal
            currentUser={currentUser}
            onOpenChatWithPeer={(peerId) => {
              const userObj = { id: peerId, username: 'contact', display_name: 'Contact', avatar_id: '1' } as any;
              handleSelectUserFromSearch(userObj, 'chat');
            }}
          />
        </div>

        {/* Panel 3: Calls */}
        <div style={{
          width: '100%',
          minWidth: '100%',
          maxWidth: '100%',
          height: '100%',
          scrollSnapAlign: 'start',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <CallLogs onStartCall={(peer, type) => handleStartCall(peer, type)} />
        </div>

        {/* Panel 4: Business */}
        <div style={{
          width: '100%',
          minWidth: '100%',
          maxWidth: '100%',
          height: '100%',
          scrollSnapAlign: 'start',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <BusinessAutomationModal
            currentUser={currentUser}
            onUpdate={(u) => setCurrentUser(u)}
          />
        </div>

        {/* Panel 5: Settings */}
        <div style={{
          width: '100%',
          minWidth: '100%',
          maxWidth: '100%',
          height: '100%',
          scrollSnapAlign: 'start',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <UnifiedSettingsModal
            currentUser={currentUser}
            currentTheme={currentTheme}
            onSelectTheme={applyTheme}
            onUpdateUser={(u) => setCurrentUser(u)}
            onLogout={handleLogout}
            onNavigateToBusiness={() => handleTabChange('business')}
            onOpenShareApp={() => setShowShareAppModal(true)}
          />
        </div>
      </main>

      {/* Bottom Navigation with Synced Slider */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => handleTabChange(tab)}
        unreadChatCount={totalUnreadCount}
      />

      {/* SHARE APP / DIRECT APK DOWNLOAD MODAL 📲 */}
      {showShareAppModal && (
        <ShareAppModal onClose={() => setShowShareAppModal(false)} />
      )}

      {/* THEME PICKER MODAL */}
      {showThemeModal && (
        <ThemePickerModal
          currentTheme={currentTheme}
          onSelectTheme={applyTheme}
          onClose={handleCloseThemeModal}
          isFirstTime={isFirstTimeTheme}
        />
      )}

      {/* ACTIVE CHAT WINDOW OVERLAY */}
      {activeConversation && (
        <ChatWindow
          conversation={activeConversation}
          currentUser={currentUser}
          onBack={() => {
            setActiveConversation(null);
            reloadConversations();
          }}
          onStartCall={(peer, type) => handleStartCall(peer, type)}
        />
      )}

      {/* USER SEARCH MODAL */}
      {showSearch && (
        <UserSearchModal
          onClose={() => setShowSearch(false)}
          onSelectUser={handleSelectUserFromSearch}
        />
      )}

      {/* INCOMING CALL MODAL OVERLAY */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          callType={incomingCall.callType}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* ACTIVE CALL MODAL OVERLAY (FULLSCREEN) */}
      {activeCall && !isCallMinimized && (
        <CallModal
          activeCall={activeCall}
          onEndCall={handleEndActiveCall}
          onMinimize={() => setIsCallMinimized(true)}
          onOpenChat={handleOpenChatWithCallPeer}
        />
      )}

      {/* FLOATING PICTURE-IN-PICTURE MINI CALL WINDOW (WHATSAPP/TELEGRAM STYLE) */}
      {activeCall && isCallMinimized && (
        <FloatingCallPiP
          activeCall={activeCall}
          onMaximize={() => setIsCallMinimized(false)}
          onEndCall={handleEndActiveCall}
          onOpenChat={handleOpenChatWithCallPeer}
        />
      )}

      {/* IN-APP TOAST NOTIFICATION BANNER (Instant Alert for New Messages) */}
      {inAppBanner && (
        <div
          onClick={async () => {
            const targetConv = conversations.find(c => c.id === inAppBanner.conversationId);
            if (targetConv) {
              setActiveConversation(targetConv);
            } else {
              await reloadConversations();
              const refreshed = conversations.find(c => c.id === inAppBanner.conversationId);
              if (refreshed) setActiveConversation(refreshed);
            }
            setInAppBanner(null);
          }}
          style={{
            position: 'fixed',
            top: '14px',
            left: '14px',
            right: '14px',
            zIndex: 9999,
            background: 'rgba(10, 18, 36, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1.5px solid var(--accent-cyan)',
            borderRadius: '18px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 25px rgba(6, 182, 212, 0.35)',
            cursor: 'pointer',
            animation: 'slideDownFade 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '15px',
            color: '#000',
            flexShrink: 0
          }}>
            {inAppBanner.senderName.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--accent-cyan)' }}>
                {inAppBanner.senderName}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Now • Tap to reply</span>
            </div>
            <div style={{
              fontSize: '13px',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: '2px'
            }}>
              {inAppBanner.textPreview}
            </div>
          </div>
        </div>
      )}

      {/* APP PASSCODE VAULT LOCK */}
      {isLocked && currentUser.app_pin && (
        <AppLockModal
          correctPin={currentUser.app_pin}
          onUnlock={() => {
            sessionStorage.setItem('spychat_unlocked', 'true');
            setIsLocked(false);
          }}
        />
      )}

      {/* FIRST TIME PERMISSION REQUEST MODAL */}
      {showPermissionModal && (
        <PermissionModal onClose={() => setShowPermissionModal(false)} />
      )}
    </div>
  );
};
export default App;
