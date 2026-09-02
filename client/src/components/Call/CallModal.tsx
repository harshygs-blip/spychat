import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  SwitchCamera,
  Volume2, 
  Volume1,
  Headphones,
  Bluetooth,
  Lock,
  Wifi,
  ChevronDown,
  MessageSquare,
  PictureInPicture,
  Minimize2,
  Monitor,
  MonitorOff
} from 'lucide-react';
import { ActiveCall, User } from '../../types';
import { webrtcService } from '../../services/webrtc';
import { audioOutputService, AudioOutputMode } from '../../services/audioOutput';

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
  const [audioMode, setAudioMode] = useState<AudioOutputMode>(audioOutputService.getCurrentMode());
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(webrtcService.getIsFrontCamera());
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(webrtcService.getIsScreenSharing());
  const [showAudioMenu, setShowAudioMenu] = useState<boolean>(false);
  const [canScreenShare] = useState<boolean>(
    typeof navigator !== 'undefined' && 
    !!navigator.mediaDevices && 
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  );

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

  // Draggable Local Video Self-Preview PIP Box
  const [localPipPos, setLocalPipPos] = useState<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 135) : 220,
    y: 80
  });
  const isDraggingLocalPip = useRef(false);
  const pipDragStart = useRef<{ startX: number; startY: number; initX: number; initY: number }>({ startX: 0, startY: 0, initX: 0, initY: 0 });

  const handlePipTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    isDraggingLocalPip.current = true;
    pipDragStart.current = { startX: t.clientX, startY: t.clientY, initX: localPipPos.x, initY: localPipPos.y };
  };

  const handlePipTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingLocalPip.current) return;
    const t = e.touches[0];
    const dx = t.clientX - pipDragStart.current.startX;
    const dy = t.clientY - pipDragStart.current.startY;
    const newX = Math.max(10, Math.min(window.innerWidth - 125, pipDragStart.current.initX + dx));
    const newY = Math.max(60, Math.min(window.innerHeight - 240, pipDragStart.current.initY + dy));
    setLocalPipPos({ x: newX, y: newY });
  };

  const handlePipTouchEnd = () => {
    isDraggingLocalPip.current = false;
  };

  const handlePipMouseDown = (e: React.MouseEvent) => {
    isDraggingLocalPip.current = true;
    pipDragStart.current = { startX: e.clientX, startY: e.clientY, initX: localPipPos.x, initY: localPipPos.y };

    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingLocalPip.current) return;
      const dx = moveEvt.clientX - pipDragStart.current.startX;
      const dy = moveEvt.clientY - pipDragStart.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 125, pipDragStart.current.initX + dx));
      const newY = Math.max(60, Math.min(window.innerHeight - 240, pipDragStart.current.initY + dy));
      setLocalPipPos({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      isDraggingLocalPip.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

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
        audioOutputService.registerMediaElement(remoteAudioRef.current);
        remoteAudioRef.current.play().catch(e => console.warn('[CallModal] Audio element play error:', e));
      }

      // Feed to remoteVideoRef if video call (keep muted so only dedicated remoteAudioRef plays audio to avoid double loop)
      if (remoteVideoRef.current && callType === 'video') {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.muted = true;
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

    // Listen to audio output mode changes
    const unsubAudio = audioOutputService.onAudioModeChange((newMode) => {
      setAudioMode(newMode);
    });

    // If remote stream is already connected
    const existingRemote = webrtcService.getRemoteStream();
    if (existingRemote && existingRemote.getTracks().length > 0) {
      handleRemoteStream(existingRemote);
    }

    // Attach local stream preview without hardware freezing
    const attachLocalPreview = async () => {
      const localMedia = webrtcService.getLocalStream() || await webrtcService.getLocalMedia(callType);
      if (localVideoRef.current && callType === 'video' && localMedia) {
        const vid = localVideoRef.current;
        vid.srcObject = localMedia;
        vid.onloadedmetadata = () => {
          vid.play().catch(e => console.warn('[CallModal] Local preview play error:', e));
        };
        // Fallback play
        vid.play().catch(() => {});
      }
    };

    attachLocalPreview();

    return () => {
      webrtcService.onRemoteStreamCallback = null;
      webrtcService.onConnectionStateCallback = null;
      unsubAudio();
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
    setIsFrontCamera(webrtcService.getIsFrontCamera());
    if (newStream && localVideoRef.current) {
      const vid = localVideoRef.current;
      vid.srcObject = newStream;
      vid.onloadedmetadata = () => {
        vid.play().catch(e => console.warn('[CallModal] Flipped camera play error:', e));
      };
      vid.play().catch(() => {});
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        const cameraStream = await webrtcService.stopScreenShare();
        setIsScreenSharing(false);
        if (cameraStream && localVideoRef.current) {
          const vid = localVideoRef.current;
          vid.srcObject = cameraStream;
          vid.play().catch(() => {});
        }
      } else {
        const screenMedia = await webrtcService.startScreenShare();
        if (screenMedia) {
          setIsScreenSharing(true);
          if (localVideoRef.current) {
            const vid = localVideoRef.current;
            vid.srcObject = screenMedia;
            vid.play().catch(() => {});
          }
        } else {
          // If null, it means either cancelled or device/browser does not support getDisplayMedia
          if (typeof navigator !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia)) {
            alert('Screen sharing is not supported by your current Android system WebView version.');
          }
        }
      }
    } catch (err: any) {
      console.warn('Screen share toggle error:', err);
      alert('Screen share error: ' + (err?.message || 'Unable to share screen'));
    }
  };

  const handleCycleAudioMode = async () => {
    const next = await audioOutputService.cycleOutputMode();
    setAudioMode(next);
  };

  const handleSelectAudioMode = async (mode: AudioOutputMode) => {
    await audioOutputService.setAudioMode(mode);
    setAudioMode(mode);
    setShowAudioMenu(false);
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
      background: '#070b14',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      zIndex: 90,
      overflow: 'hidden',
      userSelect: 'none'
    }}>
      {/* Hidden audio element for WebRTC audio track */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* TOP HEADER BAR */}
      <div style={{
        position: 'relative',
        zIndex: 40,
        paddingTop: 'max(20px, env(safe-area-inset-top, 16px))',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(5, 9, 18, 0.95) 0%, rgba(5, 9, 18, 0.6) 70%, transparent 100%)'
      }}>
        {/* Minimize into Floating PiP Button */}
        <button
          onClick={onMinimize}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '14px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer'
          }}
          title="Minimize & Chat"
        >
          <ChevronDown size={24} />
        </button>

        {/* Center: Status & Encryption Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: '#38bdf8',
            fontSize: '11px',
            fontWeight: '700'
          }}>
            <Lock size={11} /> End-to-End Encrypted
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: state === 'CONNECTED' ? '#34d399' : '#38bdf8'
          }}>
            {state === 'CONNECTED' ? (duration > 0 ? formatDuration(duration) : 'Connected') : (state === 'CALLING' ? 'Calling...' : 'Ringing...')}
          </span>
        </div>

        {/* In-Call Quick Chat Button */}
        <button
          onClick={() => onOpenChat?.(peerUser)}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '14px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer'
          }}
          title="Open Chat"
        >
          <MessageSquare size={20} />
        </button>
      </div>

      {/* MIDDLE CONTENT: VIDEO OR AUDIO CALL SCREEN */}
      {callType === 'video' ? (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* Main Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              background: '#040812'
            }}
          />

          {/* Draggable Local Preview Picture-in-Picture */}
          <div
            onTouchStart={handlePipTouchStart}
            onTouchMove={handlePipTouchMove}
            onTouchEnd={handlePipTouchEnd}
            onMouseDown={handlePipMouseDown}
            style={{
              position: 'fixed',
              left: `${localPipPos.x}px`,
              top: `${localPipPos.y}px`,
              width: '110px',
              height: '155px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(6, 182, 212, 0.3)',
              border: '2px solid rgba(6, 182, 212, 0.8)',
              zIndex: 35,
              background: '#0f172a',
              cursor: 'grab',
              touchAction: 'none'
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: isScreenSharing ? 'contain' : 'cover',
                transform: (!isScreenSharing && isFrontCamera) ? 'scaleX(-1)' : 'none',
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>
      ) : (
        /* AUDIO CALL CENTER VIEW */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '18px',
          padding: '20px'
        }}>
          {/* Pulsing Avatar */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {state === 'CONNECTED' && (
              <div style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'rgba(6, 182, 212, 0.15)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
            )}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 35px rgba(6, 182, 212, 0.4)',
              zIndex: 2
            }}>
              <span style={{ fontSize: '42px', fontWeight: '800', color: '#ffffff' }}>
                {peerUser.display_name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
              {peerUser.display_name}
            </h2>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
              @{peerUser.username}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS PANEL */}
      <div style={{
        position: 'relative',
        zIndex: 40,
        paddingTop: '16px',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom, 24px))',
        paddingLeft: '20px',
        paddingRight: '20px',
        background: 'linear-gradient(to top, rgba(5, 9, 18, 0.98) 0%, rgba(5, 9, 18, 0.85) 60%, transparent 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* Voice Changer Pills (Clean & Compact) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.06)',
          padding: '4px 8px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {(['normal', 'robot', 'deep', 'radio'] as const).map((eff) => (
            <button
              key={eff}
              onClick={() => {
                setSelectedEffect(eff);
                webrtcService.applyLiveVoiceEffect(eff);
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                background: selectedEffect === eff ? '#06b6d4' : 'transparent',
                color: selectedEffect === eff ? '#000000' : '#cbd5e1',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: selectedEffect === eff ? '800' : '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {eff === 'normal' ? 'Natural' : eff === 'robot' ? '🤖 Robot' : eff === 'deep' ? '🕵️ Deep' : '📻 Radio'}
            </button>
          ))}
        </div>

        {/* Main Action Buttons Grid */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '18px',
          width: '100%',
          maxWidth: '380px'
        }}>
          {/* MUTE / UNMUTE BUTTON */}
          <button
            onClick={handleToggleMute}
            style={{
              flex: 1,
              height: '56px',
              borderRadius: '16px',
              background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: isMuted ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isMuted ? '#f87171' : '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            <span style={{ fontSize: '10.5px', fontWeight: 700 }}>
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>

          {/* SPEAKER / EARPIECE BUTTON */}
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => setShowAudioMenu(!showAudioMenu)}
              style={{
                width: '100%',
                height: '56px',
                borderRadius: '16px',
                background: audioMode === 'speaker'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : audioMode === 'bluetooth'
                  ? 'rgba(59, 130, 246, 0.25)'
                  : 'rgba(245, 158, 11, 0.25)',
                border: audioMode === 'speaker'
                  ? '1.5px solid #10b981'
                  : audioMode === 'bluetooth'
                  ? '1.5px solid #3b82f6'
                  : '1.5px solid #f59e0b',
                color: audioMode === 'speaker' ? '#34d399' : audioMode === 'bluetooth' ? '#60a5fa' : '#fbbf24',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              {audioMode === 'speaker' ? <Volume2 size={22} /> : audioMode === 'bluetooth' ? <Bluetooth size={22} /> : <Volume1 size={22} />}
              <span style={{ fontSize: '10.5px', fontWeight: 700 }}>
                {audioMode === 'speaker' ? 'Speaker' : audioMode === 'bluetooth' ? 'Bluetooth' : 'Earpiece'}
              </span>
            </button>

            {/* Audio Dropdown Menu */}
            {showAudioMenu && (
              <div style={{
                position: 'absolute',
                bottom: '68px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minWidth: '180px',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.9)',
                zIndex: 50
              }}>
                <button
                  onClick={() => handleSelectAudioMode('speaker')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: audioMode === 'speaker' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                    color: audioMode === 'speaker' ? '#34d399' : '#e2e8f0',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Volume2 size={16} />
                  <span>🔊 Loudspeaker</span>
                </button>

                <button
                  onClick={() => handleSelectAudioMode('earpiece')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: audioMode === 'earpiece' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                    color: audioMode === 'earpiece' ? '#fbbf24' : '#e2e8f0',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Volume1 size={16} />
                  <span>👂 Earpiece</span>
                </button>

                <button
                  onClick={() => handleSelectAudioMode('bluetooth')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: audioMode === 'bluetooth' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                    color: audioMode === 'bluetooth' ? '#60a5fa' : '#e2e8f0',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Bluetooth size={16} />
                  <span>🎧 Bluetooth</span>
                </button>
              </div>
            )}
          </div>

          {/* FLIP CAMERA (IF VIDEO CALL) */}
          {callType === 'video' && (
            <button
              onClick={handleFlipCamera}
              style={{
                flex: 1,
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <SwitchCamera size={22} />
              <span style={{ fontSize: '10.5px', fontWeight: 700 }}>Flip</span>
            </button>
          )}

          {/* SCREEN SHARE (IF VIDEO CALL AND SUPPORTED BY DEVICE) */}
          {callType === 'video' && canScreenShare && (
            <button
              onClick={handleToggleScreenShare}
              style={{
                flex: 1,
                height: '56px',
                borderRadius: '16px',
                background: isScreenSharing ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                border: isScreenSharing ? '1.5px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isScreenSharing ? '#38bdf8' : '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
              <span style={{ fontSize: '10.5px', fontWeight: 700 }}>
                {isScreenSharing ? 'Stop' : 'Screen'}
              </span>
            </button>
          )}

          {/* END CALL BUTTON */}
          <button
            onClick={onEndCall}
            style={{
              flex: 1,
              height: '56px',
              borderRadius: '16px',
              background: '#ef4444',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.45)'
            }}
          >
            <PhoneOff size={22} />
            <span style={{ fontSize: '10.5px', fontWeight: 800 }}>End</span>
          </button>
        </div>
      </div>
    </div>
  );
};
