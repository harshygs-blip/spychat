import React from 'react';
import { Phone, PhoneOff, Video, Shield } from 'lucide-react';
import { User } from '../../types';

interface IncomingCallModalProps {
  caller: User;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller,
  callType,
  onAccept,
  onDecline
}) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 8, 16, 0.95)',
      backdropFilter: 'blur(25px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '60px 24px 80px 24px',
      zIndex: 100
    }}>
      {/* Top Banner */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '20px',
          background: 'rgba(6, 182, 212, 0.12)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          color: 'var(--accent-cyan)',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          {callType === 'video' ? <Video size={16} /> : <Phone size={16} />}
          <span>Incoming Encrypted {callType === 'video' ? 'Video' : 'Voice'} Call</span>
        </div>
      </div>

      {/* Center Caller Profile & Pulsing Ring */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div className="ripple-circle" />
        <div className="animate-call-ring" style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(6, 182, 212, 0.6)',
          zIndex: 2
        }}>
          <span style={{ fontSize: '42px', fontWeight: '800', color: '#ffffff' }}>
            {caller.display_name.substring(0, 2).toUpperCase()}
          </span>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: '800', marginTop: '24px', color: '#ffffff' }}>
          {caller.display_name}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--accent-cyan)', marginTop: '4px', fontFamily: 'monospace' }}>
          @{caller.username}
        </p>
      </div>

      {/* Bottom Accept & Decline Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
        {/* Decline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onDecline}
            className="btn-danger"
            style={{
              width: '64px',
              height: '64px'
            }}
          >
            <PhoneOff size={28} />
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Decline</span>
        </div>

        {/* Accept */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onAccept}
            className="btn-success animate-pulse-glow"
            style={{
              width: '64px',
              height: '64px'
            }}
          >
            {callType === 'video' ? <Video size={28} /> : <Phone size={28} />}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Accept</span>
        </div>
      </div>
    </div>
  );
};
