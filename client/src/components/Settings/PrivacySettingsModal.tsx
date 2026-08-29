import React, { useState } from 'react';
import { ShieldCheck, Eye, Lock, Bell, Check, KeyRound, AlertTriangle } from 'lucide-react';
import { User } from '../../types';
import { AuthService } from '../../services/auth';

interface PrivacySettingsProps {
  currentUser: User;
  onUpdate: (updated: User) => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsProps> = ({
  currentUser,
  onUpdate
}) => {
  const [lastSeen, setLastSeen] = useState(currentUser.privacy?.last_seen_visibility || 'everyone');
  const [onlineStatus, setOnlineStatus] = useState(currentUser.privacy?.online_status_visibility || 'everyone');
  const [readReceipts, setReadReceipts] = useState(currentUser.privacy?.read_receipts ?? true);
  const [typingIndicator, setTypingIndicator] = useState(currentUser.privacy?.typing_indicator ?? true);
  const [appPin, setAppPin] = useState(currentUser.app_pin || '');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const payload: any = {
        privacy: {
          last_seen_visibility: lastSeen as any,
          online_status_visibility: onlineStatus as any,
          read_receipts: readReceipts,
          typing_indicator: typingIndicator
        }
      };
      if (appPin.length === 4) {
        payload.app_pin = appPin;
      }
      const updated = await AuthService.updateProfile(payload);
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to update privacy:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner */}
        <div className="glass" style={{
          padding: '16px',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          background: 'rgba(16, 185, 129, 0.06)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} color="#10b981" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>Zero Leakage Guarantee</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Your email, IP address, and identity are never revealed.
            </p>
          </div>
        </div>

        {/* Last Seen Setting */}
        <div className="glass" style={{ padding: '16px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Eye size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: '700', fontSize: '15px' }}>Last Seen Visibility</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Choose who can see when you were last active.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setLastSeen(opt)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: lastSeen === opt ? '700' : '400',
                  background: lastSeen === opt ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.06)',
                  color: lastSeen === opt ? '#000' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Online Status */}
        <div className="glass" style={{ padding: '16px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <KeyRound size={18} color="var(--accent-purple)" />
            <span style={{ fontWeight: '700', fontSize: '15px' }}>Online Presence</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Allow peers to see your active green badge.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['everyone', 'nobody'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setOnlineStatus(opt)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: onlineStatus === opt ? '700' : '400',
                  background: onlineStatus === opt ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.06)',
                  color: onlineStatus === opt ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
              >
                {opt === 'everyone' ? 'Show Online' : 'Hide Online (Stealth)'}
              </button>
            ))}
          </div>
        </div>

        {/* Read Receipts Toggle */}
        <div className="glass" style={{
          padding: '16px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>Read Receipts</div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Show blue checkmarks when messages are read
            </p>
          </div>
          <input
            type="checkbox"
            checked={readReceipts}
            onChange={(e) => setReadReceipts(e.target.checked)}
            style={{ width: '22px', height: '22px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
          />
        </div>

        {/* Typing Indicators Toggle */}
        <div className="glass" style={{
          padding: '16px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>Typing Indicator</div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Broadcast "typing..." when authoring messages
            </p>
          </div>
          <input
            type="checkbox"
            checked={typingIndicator}
            onChange={(e) => setTypingIndicator(e.target.checked)}
            style={{ width: '22px', height: '22px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
          />
        </div>

        {/* App PIN Passcode Lock */}
        <div className="glass" style={{ padding: '16px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <KeyRound size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: '700', fontSize: '15px' }}>App Passcode Lock (PIN)</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Require a 4-digit PIN every time the app opens.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="password"
              maxLength={4}
              placeholder={currentUser.app_pin ? '•••• (PIN Active)' : 'Set 4-digit PIN'}
              className="spychat-input"
              value={appPin}
              onChange={(e) => setAppPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: '800', width: '160px' }}
            />
            {currentUser.app_pin && (
              <button
                type="button"
                onClick={async () => {
                  setAppPin('');
                  const updated = await AuthService.updateProfile({ app_pin: '' });
                  onUpdate(updated);
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Disable PIN
              </button>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary"
          style={{ height: '46px', marginTop: '8px' }}
        >
          {loading ? 'Saving...' : saved ? '✓ Privacy Updated' : 'Save Privacy Controls'}
        </button>
      </div>
    </div>
  );
};
