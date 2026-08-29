import React, { useState } from 'react';
import { User, LogOut, Copy, Check, ShieldAlert, Key } from 'lucide-react';
import { User as UserType } from '../../types';
import { AuthService } from '../../services/auth';

interface ProfileModalProps {
  currentUser: UserType;
  onUpdate: (updated: UserType) => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  currentUser,
  onUpdate,
  onLogout
}) => {
  const [displayName, setDisplayName] = useState(currentUser.display_name);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopyTag = () => {
    navigator.clipboard.writeText(`@${currentUser.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      const updated = await AuthService.updateProfile({ display_name: displayName });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error updating name:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Profile Card */}
        <div className="glass" style={{
          padding: '24px 20px',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: '800',
            color: '#ffffff',
            boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)'
          }}>
            {currentUser.display_name.substring(0, 2).toUpperCase()}
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{currentUser.display_name}</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '4px'
            }}>
              <span style={{ fontSize: '14px', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                @{currentUser.username}
              </span>
              <button
                onClick={handleCopyTag}
                title="Copy Tag"
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Edit Name Form */}
        <form onSubmit={handleUpdate} className="glass" style={{ padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="spychat-input"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Private Email (Hidden from public)
            </label>
            <input
              type="text"
              disabled
              value={currentUser.email || 'Hidden / Protected'}
              className="spychat-input"
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ height: '42px' }}
          >
            {loading ? 'Updating...' : saved ? '✓ Name Saved' : 'Save Changes'}
          </button>
        </form>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="btn-secondary"
          style={{
            height: '46px',
            color: '#f87171',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            marginTop: '8px'
          }}
        >
          <LogOut size={18} />
          <span>Sign Out Securely</span>
        </button>
      </div>
    </div>
  );
};
