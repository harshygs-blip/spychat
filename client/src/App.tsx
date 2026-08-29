import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthService } from './services/auth';
import { socketService } from './services/socket';
import { webrtcService } from './services/webrtc';
import { E2EEService } from './services/encryption';
import { User, Conversation, ActiveCall } from './types';
import { TopHeader } from './components/Navigation/TopHeader';
import { BottomNav } from './components/Navigation/BottomNav';
import { AuthModal } from './components/Auth/AuthModal';
import { ChatList } from './components/Chat/ChatList';
import { ChatWindow } from './components/Chat/ChatWindow';
import { UserSearchModal } from './components/Chat/UserSearchModal';
import { CallModal } from './components/Call/CallModal';
import { IncomingCallModal } from './components/Call/IncomingCallModal';
import { CallLogs } from './components/Call/CallLogs';
import { BusinessAutomationModal } from './components/Business/BusinessAutomationModal';
import { UnifiedSettingsModal } from './components/Settings/UnifiedSettingsModal';
import { AppLockModal } from './components/Security/AppLockModal';
import { ThemePickerModal, ThemeType } from './components/Settings/ThemePickerModal';
import { SpytusModal } from './components/Spytus/SpytusModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'spytus' | 'calls' | 'business' | 'settings'>('chats');
  
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

  // Load User on Start
  useEffect(() => {
    const init = async () => {
      try {
        const me = await AuthService.getMe();
        if (me) {
          setCurrentUser(me);
          if (me.app_pin) {
            setIsLocked(true);
          }
        }
      } catch (err) {
        console.error('Init auth error:', err);
      } finally {
        setLoadingUser(false);
      }
    };
    init();
  }, []);

  // Socket & Calling event listeners
  useEffect(() => {
    if (!currentUser) return;

    socketService.connect();
    reloadConversations();

    // Listen for new messages globally in App to update chat list live
    const handleGlobalNewMessage = async (data: { message: any }) => {
      const msg = data.message;
      if (!msg) return;

      let decText = msg.ciphertext;
      if (msg.message_type === 'text') {
        decText = await E2EEService.decryptMessage(msg.ciphertext, msg.iv || '', msg.conversation_id);
      }

      setConversations(prev => {
        const exists = prev.find(c => c.id === msg.conversation_id);
        if (exists) {
          const isCurrentlyInThisChat = activeConversation && activeConversation.id === msg.conversation_id;
          const updatedConv: Conversation = {
            ...exists,
            updated_at: msg.created_at,
            last_message: { ...msg, decrypted_text: decText },
            unread_count: isCurrentlyInThisChat ? 0 : ((exists.unread_count || 0) + (msg.sender_id !== currentUser.id ? 1 : 0))
          };
          // Move to top of chat list
          return [updatedConv, ...prev.filter(c => c.id !== msg.conversation_id)];
        } else {
          // If brand new conversation, reload list from server
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
    }
  };

  // Handle accepting incoming call
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      stopRingtone();
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

  const handleLogout = () => {
    AuthService.clearSession();
    socketService.disconnect();
    setCurrentUser(null);
    setActiveConversation(null);
    setActiveCall(null);
  };

  const totalUnreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (loadingUser) {
    return (
      <div style={{
        height: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent-primary)',
        fontWeight: '700'
      }}>
        Initializing SPYCHAT Secure Enclave...
      </div>
    );
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
      />

      {/* Main Tab Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'chats' && (
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
        )}

        {activeTab === 'spytus' && (
          <SpytusModal
            currentUser={currentUser}
            onOpenChatWithPeer={(peerId, replyText) => {
              const userObj = { id: peerId, username: 'contact', display_name: 'Contact', avatar_id: '1' } as any;
              handleSelectUserFromSearch(userObj, 'chat');
            }}
          />
        )}

        {activeTab === 'calls' && (
          <CallLogs onStartCall={(peer, type) => handleStartCall(peer, type)} />
        )}

        {activeTab === 'business' && (
          <BusinessAutomationModal
            currentUser={currentUser}
            onUpdate={(u) => setCurrentUser(u)}
          />
        )}

        {activeTab === 'settings' && (
          <UnifiedSettingsModal
            currentUser={currentUser}
            currentTheme={currentTheme}
            onSelectTheme={applyTheme}
            onUpdateUser={(u) => setCurrentUser(u)}
            onLogout={handleLogout}
            onNavigateToBusiness={() => setActiveTab('business')}
          />
        )}
      </main>

      {/* Bottom Navigation (4 Clean Tabs) */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        unreadChatCount={totalUnreadCount}
      />

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

      {/* ACTIVE CALL MODAL OVERLAY */}
      {activeCall && (
        <CallModal
          activeCall={activeCall}
          onEndCall={handleEndActiveCall}
        />
      )}

      {/* APP PASSCODE VAULT LOCK */}
      {isLocked && currentUser.app_pin && (
        <AppLockModal
          correctPin={currentUser.app_pin}
          onUnlock={() => setIsLocked(false)}
        />
      )}
    </div>
  );
};
export default App;
