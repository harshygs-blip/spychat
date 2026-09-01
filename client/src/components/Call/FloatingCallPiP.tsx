import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  PhoneOff, 
  Mic, 
  MicOff, 
  MessageSquare, 
  Lock,
  PictureInPicture,
  Minimize2
} from 'lucide-react';
import { ActiveCall, User } from '../../types';
import { webrtcService } from '../../services/webrtc';

interface FloatingCallPiPProps {
  activeCall: ActiveCall;
  onMaximize: () => void;
  onEndCall: () => void;
  onOpenChat: (user: User) => void;
}

export const FloatingCallPiP: React.FC<FloatingCallPiPProps> = ({
  activeCall,
  onMaximize,
  onEndCall,
  onOpenChat
}) => {
  const { peerUser, callType, state } = activeCall;
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [sizeMode, setSizeMode] = useState<'normal' | 'large'>('normal');
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: window.innerWidth - 145,
    y: window.innerHeight - 260
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({ startX: 0, startY: 0, initX: 0, initY: 0 });
  const hasMovedRef = useRef(false);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Duration Timer
  useEffect(() => {
    let interval: any = null;
    if (state === 'CONNECTED') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state]);

  // Hook up video and audio elements in PiP
  useEffect(() => {
    const attachStreams = () => {
      const remote = webrtcService.getRemoteStream();
      if (remote) {
        if (remoteVideoRef.current && callType === 'video') {
          remoteVideoRef.current.srcObject = remote;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remote;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.play().catch(() => {});
        }
      }

      const local = webrtcService.getLocalStream();
      if (local && localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = local;
        localVideoRef.current.play().catch(() => {});
      }
    };

    attachStreams();

    webrtcService.onRemoteStreamCallback = () => {
      attachStreams();
    };

    return () => {
      // keep stream alive
    };
  }, [callType]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initX: position.x,
      initY: position.y
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.startX;
    const dy = touch.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMovedRef.current = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - (sizeMode === 'large' ? 175 : 135), dragStartRef.current.initX + dx));
    const newY = Math.max(70, Math.min(window.innerHeight - (sizeMode === 'large' ? 245 : 195), dragStartRef.current.initY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const handleToggleMute = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const next = !isMuted;
    webrtcService.toggleMute(next);
    setIsMuted(next);
  };

  const handleRequestNativePiP = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (remoteVideoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await remoteVideoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.warn('Native PiP Error:', err);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const width = sizeMode === 'large' ? 170 : 130;
  const height = sizeMode === 'large' ? 240 : 185;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '20px',
        background: '#070c1a',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85), 0 0 20px rgba(6, 182, 212, 0.35)',
        border: '2px solid var(--accent-cyan)',
        zIndex: 95,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        transition: isDraggingRef.current ? 'none' : 'transform 0.15s ease, width 0.2s ease, height 0.2s ease'
      }}
    >
      {/* Audio element fallback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* VIDEO STREAMS (IF VIDEO CALL) */}
      {callType === 'video' ? (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              background: '#040812'
            }}
          />
          {/* Local PIP Preview inside floating window */}
          <div style={{
            position: 'absolute',
            bottom: '48px',
            right: '8px',
            width: '36px',
            height: '50px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1.5px solid rgba(255, 255, 255, 0.6)',
            zIndex: 4,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6)'
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)'
              }}
            />
          </div>
        </div>
      ) : (
        /* AUDIO CALL MINI GRAPHIC */
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          gap: '8px',
          padding: '10px'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '800',
            color: '#fff',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
          }}>
            {peerUser.display_name.substring(0, 2).toUpperCase()}
          </div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
            {peerUser.display_name}
          </span>
        </div>
      )}

      {/* TOP FLOATING OVERLAY BAR */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.75) 0%, transparent 100%)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '2px 6px',
          borderRadius: '10px',
          color: '#34d399',
          fontSize: '10px',
          fontWeight: '700'
        }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{formatDuration(duration)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Resize toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSizeMode(prev => prev === 'normal' ? 'large' : 'normal');
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer'
            }}
            title="Resize PiP"
          >
            {sizeMode === 'normal' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>

          {/* Maximize to full screen */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }}
            style={{
              background: 'rgba(6, 182, 212, 0.4)',
              border: 'none',
              borderRadius: '8px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer'
            }}
            title="Fullscreen Call"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* BOTTOM FLOATING CONTROLS */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '6px 8px 8px 8px',
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 100%)'
      }}>
        {/* Quick Chat with Peer */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenChat(peerUser);
          }}
          style={{
            background: 'rgba(59, 130, 246, 0.8)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
          }}
          title="Open Chat"
        >
          <MessageSquare size={13} />
        </button>

        {/* Quick Mute Toggle */}
        <button
          onClick={handleToggleMute}
          style={{
            background: isMuted ? 'rgba(239, 68, 68, 0.85)' : 'rgba(255, 255, 255, 0.25)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer'
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
        </button>

        {/* End Call Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEndCall();
          }}
          style={{
            background: 'rgba(239, 68, 68, 0.95)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)'
          }}
          title="End Call"
        >
          <PhoneOff size={13} />
        </button>
      </div>
    </div>
  );
};
