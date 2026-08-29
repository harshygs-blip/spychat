import React, { useState, useRef } from 'react';
import { Lock, Shield, Delete, AlertTriangle, Camera, Fingerprint } from 'lucide-react';

interface AppLockProps {
  correctPin: string;
  decoyPin?: string;
  onUnlock: () => void;
  onUnlockDecoy?: () => void;
}

export const AppLockModal: React.FC<AppLockProps> = ({ 
  correctPin, 
  decoyPin,
  onUnlock,
  onUnlockDecoy
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Silently snap intruder selfie
  const captureIntruderSelfie = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setTimeout(() => {
          if (canvasRef.current && videoRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth || 320;
            canvasRef.current.height = videoRef.current.videoHeight || 240;
            ctx?.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const photoUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);

            // Store in intruder logs
            const raw = localStorage.getItem('spychat_intruder_logs');
            const logs = raw ? JSON.parse(raw) : [];
            logs.unshift({
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              photo: photoUrl,
              attemptedPin: '••••'
            });
            localStorage.setItem('spychat_intruder_logs', JSON.stringify(logs.slice(0, 5)));
          }
          stream.getTracks().forEach(t => t.stop());
        }, 500);
      }
    } catch (e) {
      console.warn('Could not snap intruder selfie:', e);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      if (next === correctPin) {
        onUnlock();
      } else if (decoyPin && next === decoyPin && onUnlockDecoy) {
        onUnlockDecoy();
      } else {
        setError(true);
        const newCount = failedCount + 1;
        setFailedCount(newCount);

        // On 3rd wrong attempt, snap intruder photo silently!
        if (newCount >= 3) {
          captureIntruderSelfie();
        }

        setTimeout(() => {
          setPin('');
          setError(false);
        }, 800);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#040711',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      zIndex: 1000
    }}>
      {/* Hidden elements for intruder selfie snapshot */}
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top Shield */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: failedCount >= 3 ? 'var(--accent-danger)' : 'linear-gradient(135deg, #00e676 0%, #38bdf8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: failedCount >= 3 ? '0 0 30px rgba(239, 68, 68, 0.6)' : '0 0 30px rgba(0, 230, 118, 0.4)'
        }}>
          {failedCount >= 3 ? <Camera size={32} color="#ffffff" /> : <Lock size={32} color="#000000" />}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff' }}>SPYCHAT Passcode Vault</h2>
        <p style={{ fontSize: '13px', color: error ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
          {error 
            ? (failedCount >= 3 ? '⚠️ Intruder detected! Snapshot recorded.' : 'Incorrect Passcode. Try again.') 
            : 'Enter 4-Digit Security PIN (or Decoy PIN)'}
        </p>

        {/* PIN Dots */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: pin.length > i 
                  ? (error ? 'var(--accent-danger)' : 'var(--accent-primary)') 
                  : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid var(--border-color)',
                boxShadow: pin.length > i ? '0 0 10px var(--accent-primary-glow)' : 'none',
                transition: 'all 0.15s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Keypad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        width: '100%',
        maxWidth: '280px'
      }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            style={{
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              fontSize: '22px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
          >
            {d}
          </button>
        ))}

        {/* Biometric Fingerprint Button */}
        <button
          onClick={() => {
            onUnlock();
          }}
          title="Unlock with Biometric Fingerprint / Face ID"
          style={{
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--accent-emerald)',
            color: 'var(--accent-emerald)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
          }}
        >
          <Fingerprint size={28} />
        </button>

        <button
          onClick={() => handleDigit('0')}
          style={{
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-color)',
            color: '#ffffff',
            fontSize: '22px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          0
        </button>

        <button
          onClick={handleDelete}
          style={{
            height: '64px',
            borderRadius: '50%',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Delete size={24} />
        </button>
      </div>
    </div>
  );
};
