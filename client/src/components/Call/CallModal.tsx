import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  SwitchCamera, 
  Volume2, 
  Lock,
  Wifi,
  ChevronDown,
  MessageSquare,
  PictureInPicture,
  Minimize2
} from 'lucide-react';
import { ActiveCall, User } from '../../types';
import { webrtcService } from '../../services/webrtc';

interface CallModalProps {
  activeCall: ActiveCall;
  onEndCall: () => void;
  onMinimize?: () => void;
  onOpenChat?: (user: User) => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  activeCall,
  onEndCall,
  onMinimize,
  onOpenChat
}) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [remoteStreamAvailable, setRemoteStreamAvailable] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<'normal' | 'robot' | 'deep' | 'radio'>('normal');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const { peerUser, callType, state } = activeCall;

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

  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');

  // Hook up WebRTC Streams & Connection State
  useEffect(() => {
    const handleRemoteStream = (stream: MediaStream) => {
      const tracks = stream.getTracks();
      console.log('[CallModal] Attaching remote stream tracks:', tracks.map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
      setRemoteStreamAvailable(tracks.length > 0);

      // Always feed audio to remoteAudioRef
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch(e => console.warn('[CallModal] Audio element play error:', e));
      }

      // Feed to remoteVideoRef if video call
      if (remoteVideoRef.current && callType === 'video') {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.play().catch(e => console.warn('[CallModal] Video element play error:', e));
      }
    };

    const handleConnectionState = (st: RTCPeerConnectionState) => {
      console.log('[CallModal] Live Connection State:', st);
      if (st === 'connected') setConnectionStatus('Connected (P2P E2EE)');
      else if (st === 'connecting') setConnectionStatus('Connecting P2P Route...');
      else if (st === 'failed') setConnectionStatus('Reconnecting via Relay...');
      else if (st === 'disconnected') setConnectionStatus('Disconnected');
    };

    webrtcService.onRemoteStreamCallback = handleRemoteStream;
    webrtcService.onConnectionStateCallback = handleConnectionState;

    // If remote stream is already connected
    const existingRemote = webrtcService.getRemoteStream();
    if (existingRemote && existingRemote.getTracks().length > 0) {
      handleRemoteStream(existingRemote);
    }

    // Attach local stream preview without stopping tracks
    const attachLocalPreview = async () => {
      const localMedia = webrtcService.getLocalStream() || await webrtcService.getLocalMedia(callType);
      if (localVideoRef.current && callType === 'video' && localMedia) {
        localVideoRef.current.srcObject = localMedia;
        localVideoRef.current.play().catch(() => {});
      }
    };

    attachLocalPreview();

    return () => {
      webrtcService.onRemoteStreamCallback = null;
      webrtcService.onConnectionStateCallback = null;
    };
  }, [callType]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    webrtcService.toggleMute(nextMuted);
    setIsMuted(nextMuted);
  };

  const handleToggleVideo = () => {
    const nextDisabled = !isVideoDisabled;
    webrtcService.toggleVideo(!nextDisabled);
    setIsVideoDisabled(nextDisabled);
  };

  const handleFlipCamera = async () => {
    const newStream = await webrtcService.flipCamera();
    if (newStream && localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }
  };

  const handleNativePiP = async () => {
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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#040711',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      zIndex: 90,
      overflow: 'hidden'
    }}>
      {/* Hidden audio element for WebRTC audio track */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* TOP FLOATING ACTION BAR: MINIMIZE (PIP) & NATIVE PIP */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 35
      }}>
        {/* Minimize into Floating PiP Button */}
        <button
          onClick={onMinimize}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '16px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
          }}
          title="Minimize & Chat (PiP)"
        >
          <ChevronDown size={24} />
        </button>

        {/* Pop-out to OS Native Floating Video (PiP) */}
        {callType === 'video' && document.pictureInPictureEnabled && (
          <button
            onClick={handleNativePiP}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '16px',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
            }}
            title="Pop-out Floating Window (OS PiP)"
          >
            <PictureInPicture size={20} />
          </button>
        )}
      </div>

      {/* VIDEO CONTAINER (If video call) */}
      {callType === 'video' ? (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* Remote Video Stream (Main Ultra-HD Video) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'contrast(1.03) brightness(1.02) saturate(1.06)',
              background: '#040812'
            }}
          />

          {/* Local Video Stream (Picture in Picture) */}
          <div style={{
            position: 'absolute',
            top: '70px',
            right: '16px',
            width: '115px',
            height: '165px',
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: '0 8px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(6, 182, 212, 0.35)',
            border: '2px solid var(--accent-cyan)',
            zIndex: 10,
            background: '#0f172a'
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
                transform: 'scaleX(-1)', // Natural selfie mirror
                filter: 'contrast(1.03) brightness(1.02) saturate(1.06)'
              }}
            />
          </div>
        </div>
      ) : (
        /* AUDIO CALL BACKGROUND WITH VISUALIZER */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {state === 'CONNECTED' && <div className="ripple-circle" />}
          <div style={{
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 50px rgba(6, 182, 212, 0.4)',
            zIndex: 2
          }}>
            <span style={{ fontSize: '48px', fontWeight: '800', color: '#ffffff' }}>
              {peerUser.display_name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* TOP OVERLAY HEADER */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        padding: '24px 20px',
        background: 'linear-gradient(to bottom, rgba(4, 7, 17, 0.85) 0%, transparent 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: 'var(--accent-cyan)',
            fontSize: '11px',
            fontWeight: '700'
          }}>
            <Lock size={12} /> E2EE WebRTC
          </div>

          {callType === 'video' && (
            <div style={{
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '11px',
              fontWeight: '800'
            }}>
              ✨ 1080P 60FPS
            </div>
          )}
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff' }}>
          {peerUser.display_name}
        </h2>

        <div style={{
          fontSize: '14px',
          color: state === 'CONNECTED' ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {state === 'CONNECTED' ? (
            <>
              <Wifi size={14} />
              <span>{formatDuration(duration)}</span>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: connectionStatus.includes('Connected') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                color: connectionStatus.includes('Connected') ? '#34d399' : 'var(--accent-cyan)',
                fontWeight: '700',
                border: '1px solid currentColor'
              }}>
                {connectionStatus}
              </span>
            </>
          ) : (
            <span className="animate-pulse-glow" style={{ padding: '2px 8px', borderRadius: '8px' }}>
              {state === 'CALLING' ? 'Calling...' : state === 'RINGING' ? 'Ringing...' : 'Connecting...'}
            </span>
          )}
        </div>

        {/* VOICE CHANGER / SCRAMBLER BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          marginTop: '6px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)' }}>
            🎙️ Voice:
          </span>
          {(['normal', 'robot', 'deep', 'radio'] as const).map((eff) => (
            <button
              key={eff}
              onClick={() => {
                setSelectedEffect(eff);
                webrtcService.applyLiveVoiceEffect(eff);
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                background: selectedEffect === eff ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.06)',
                color: selectedEffect === eff ? '#000' : 'var(--text-primary)',
                border: 'none',
                fontSize: '11px',
                fontWeight: selectedEffect === eff ? '800' : '500',
                cursor: 'pointer'
              }}
            >
              {eff === 'normal' ? 'Natural' : eff === 'robot' ? '🤖 Robot' : eff === 'deep' ? '🕵️ Deep' : '📻 Radio'}
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM IN-CALL CONTROLS BAR */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        padding: '16px 20px 36px 20px',
        background: 'linear-gradient(to top, rgba(4, 7, 17, 0.95) 0%, rgba(4, 7, 17, 0.6) 70%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        {/* Mute Mic */}
        <button
          onClick={handleToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.12)',
            border: isMuted ? '1px solid var(--accent-danger)' : '1px solid var(--border-color)',
            color: isMuted ? '#f87171' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* Video Toggle (If video call) */}
        {callType === 'video' && (
          <button
            onClick={handleToggleVideo}
            title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: isVideoDisabled ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.12)',
              border: isVideoDisabled ? '1px solid var(--accent-danger)' : '1px solid var(--border-color)',
              color: isVideoDisabled ? '#f87171' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isVideoDisabled ? <VideoOff size={22} /> : <VideoIcon size={22} />}
          </button>
        )}

        {/* Flip Camera (If video call) */}
        {callType === 'video' && (
          <button
            onClick={handleFlipCamera}
            title="Flip Camera"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <SwitchCamera size={22} />
          </button>
        )}

        {/* Quick In-Call Chat Button */}
        <button
          onClick={() => onOpenChat?.(peerUser)}
          title="Chat while on Call"
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.3)',
            border: '1px solid rgba(59, 130, 246, 0.6)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
          }}
        >
          <MessageSquare size={22} />
        </button>

        {/* END CALL BUTTON */}
        <button
          onClick={onEndCall}
          className="btn-danger"
          title="End Call"
          style={{
            width: '64px',
            height: '64px'
          }}
        >
          <PhoneOff size={28} />
        </button>
      </div>
    </div>
  );
};
