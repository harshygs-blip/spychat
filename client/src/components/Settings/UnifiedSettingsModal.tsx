import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Palette, 
  ShieldCheck, 
  KeyRound, 
  LogOut, 
  Bot, 
  Bell, 
  Info, 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  Lock, 
  Sparkles, 
  Volume2, 
  Smartphone,
  ShieldAlert,
  Sliders,
  Star,
  Download,
  UploadCloud,
  FileText,
  Trash2,
  Camera,
  Image
} from 'lucide-react';
import { User as UserType, Message } from '../../types';
import { AuthService } from '../../services/auth';
import { CloudinaryService } from '../../services/cloudinary';
import { socketService } from '../../services/socket';
import { ThemeType, THEME_OPTIONS } from './ThemePickerModal';
import { APP_VERSION, BUILD_DATE, BUILD_TIME, FULL_BUILD_INFO } from '../../config/version';
import { Capacitor } from '@capacitor/core';

interface UnifiedSettingsProps {
  currentUser: UserType;
  currentTheme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
  onUpdateUser: (user: UserType) => void;
  onLogout: () => void;
  onNavigateToBusiness: () => void;
  onOpenShareApp?: () => void;
  onOpenAdminDashboard?: () => void;
}

type SettingsSubPage = 'main' | 'profile' | 'theme' | 'privacy' | 'security' | 'vault' | 'backup' | 'notifications' | 'about';

export const UnifiedSettingsModal: React.FC<UnifiedSettingsProps> = ({
  currentUser,
  currentTheme,
  onSelectTheme,
  onUpdateUser,
  onLogout,
  onNavigateToBusiness,
  onOpenShareApp,
  onOpenAdminDashboard
}) => {
  const [currentPage, setCurrentPage] = useState<SettingsSubPage>('main');

  // Form states
  const [displayName, setDisplayName] = useState(currentUser.display_name);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentUser.avatar_url);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [lastSeen, setLastSeen] = useState(currentUser.privacy?.last_seen_visibility || 'everyone');
  const [onlineStatus, setOnlineStatus] = useState(currentUser.privacy?.online_status_visibility || 'everyone');
  const [readReceipts, setReadReceipts] = useState(currentUser.privacy?.read_receipts ?? true);
  const [typingIndicator, setTypingIndicator] = useState(currentUser.privacy?.typing_indicator ?? true);
  const [appPin, setAppPin] = useState(currentUser.app_pin || '');
  const [savedMessages, setSavedMessages] = useState<Message[]>([]);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const { url } = await CloudinaryService.uploadWithFallback(file);
      if (url) {
        setAvatarUrl(url);
        const res = await AuthService.updateProfile({ avatar_url: url, display_name: displayName });
        if (res) {
          onUpdateUser(res);
        }
        setSavedMsg('✅ Profile photo updated!');
        setTimeout(() => setSavedMsg(''), 2500);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setSavedMsg('❌ Failed to upload photo');
      setTimeout(() => setSavedMsg(''), 2000);
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl(undefined);
    try {
      const res = await AuthService.updateProfile({ avatar_url: '', display_name: displayName });
      if (res) {
        onUpdateUser(res);
      }
      setSavedMsg('Profile photo removed');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch {
      setSavedMsg('Photo removed');
      setTimeout(() => setSavedMsg(''), 2000);
    }
  };

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');

  // Load Saved Messages when entering vault
  useEffect(() => {
    if (currentPage === 'vault') {
      socketService.emit('get_saved_messages', (res: any) => {
        if (res && res.savedMessages) {
          setSavedMessages(res.savedMessages);
        }
      });
    }
  }, [currentPage]);

  // Export Backup File
  const handleExportBackup = async () => {
    try {
      const token = AuthService.getAccessToken();
      const res = await fetch(`${AuthService.getApiBase()}/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const backupData = {
        app: 'SPYCHAT',
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        user: {
          id: currentUser.id,
          username: currentUser.username,
          display_name: currentUser.display_name
        },
        conversations: data.conversations || []
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spychat_backup_${currentUser.username}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('✓ Encrypted Chat Backup downloaded successfully!');
    } catch (err) {
      console.error('Backup error:', err);
      alert('Failed to export backup.');
    }
  };

  const playSampleRingtone = () => {
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
      setTimeout(() => {
        osc1.stop();
        osc2.stop();
        ctx.close();
      }, 1500);
    } catch {}
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const updated = await AuthService.updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl
      });
      onUpdateUser(updated);
      setSavedMsg('✓ Profile Updated');
      setTimeout(() => {
        setSavedMsg('');
        setCurrentPage('main');
      }, 1000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassMsg('');

    if (!currentPassword || !newPassword) {
      setPassError('Please fill in both current and new password');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }

    setPassLoading(true);
    try {
      const res = await AuthService.changePassword(currentPassword, newPassword);
      setPassMsg(res.message || 'Password changed successfully! 🔐');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPassMsg('');
      }, 3000);
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setPassLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    try {
      const updated = await AuthService.updateProfile({
        privacy: {
          last_seen_visibility: lastSeen,
          online_status_visibility: onlineStatus,
          read_receipts: readReceipts,
          typing_indicator: typingIndicator
        }
      });
      onUpdateUser(updated);
      setSavedMsg('✓ Privacy Settings Saved');
      setTimeout(() => {
        setSavedMsg('');
        setCurrentPage('main');
      }, 1000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = async () => {
    if (appPin.length !== 4) {
      alert('PIN must be exactly 4 digits');
      return;
    }
    setLoading(true);
    try {
      const updated = await AuthService.updateProfile({ app_pin: appPin });
      onUpdateUser(updated);
      setSavedMsg('✓ App Passcode Vault Enabled');
      setTimeout(() => {
        setSavedMsg('');
        setCurrentPage('main');
      }, 1000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePin = async () => {
    setLoading(true);
    try {
      setAppPin('');
      const updated = await AuthService.updateProfile({ app_pin: '' });
      onUpdateUser(updated);
      setSavedMsg('✓ App Passcode Disabled');
      setTimeout(() => {
        setSavedMsg('');
        setCurrentPage('main');
      }, 1000);
    } catch (err) {
      console.error('Disable error:', err);
    } finally {
      setLoading(false);
    }
  };

  // SUBPAGE HEADER COMPONENT
  const SubHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '4px 0 12px 0',
      borderBottom: '1px solid var(--border-color)',
      marginBottom: '12px'
    }}>
      <button
        onClick={() => setCurrentPage('main')}
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid var(--border-color)',
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
        <ArrowLeft size={18} />
      </button>
      <div>
        <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
    </div>
  );

  // ==========================================
  // 1. MAIN SETTINGS LIST PAGE
  // ==========================================
  if (currentPage === 'main') {
    return (
      <div
        className="custom-scrollbar smooth-scroll-panel"
        style={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '16px 14px 220px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          touchAction: 'pan-y pan-x',
          overscrollBehaviorY: 'contain'
        }}
      >
        {/* QUICK CATEGORY HORIZONTAL SLIDER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '2px',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {[
            { id: 'profile', label: 'Profile', icon: User, color: '#38bdf8' },
            { id: 'theme', label: 'Theme', icon: Palette, color: '#00e676' },
            { id: 'privacy', label: 'Privacy', icon: ShieldCheck, color: '#10b981' },
            { id: 'security', label: 'App Lock', icon: Lock, color: '#06b6d4' },
            { id: 'vault', label: 'Vault', icon: Star, color: '#f59e0b' },
            { id: 'business', label: 'Business', icon: Bot, color: '#a855f7' },
            { id: 'backup', label: 'Backup', icon: Download, color: '#ec4899' },
            { id: 'notifications', label: 'Sounds', icon: Bell, color: '#eab308' },
            { id: 'about', label: 'About', icon: Info, color: '#94a3b8' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'business') {
                    onNavigateToBusiness();
                  } else {
                    setCurrentPage(item.id as SettingsSubPage);
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} color={item.color} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Profile Header Card */}
        <div
          onClick={() => setCurrentPage('profile')}
          className="glass"
          style={{
            padding: '16px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
            border: '1px solid var(--border-color-glow)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '2px solid var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '20px',
              color: 'var(--accent-primary)',
              boxShadow: '0 0 15px var(--accent-primary-glow)',
              overflow: 'hidden'
            }}>
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.display_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                currentUser.display_name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                {currentUser.display_name}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                @{currentUser.username} • <span style={{ color: 'var(--accent-primary)' }}>Tap to edit</span>
              </div>
            </div>
          </div>
          <ChevronRight size={20} color="var(--text-muted)" />
        </div>

        {/* SETTINGS MENU LIST */}
        <div className="glass" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {/* 1. Theme & Appearance */}
          <div
            onClick={() => setCurrentPage('theme')}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00e676 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000'
              }}>
                <Palette size={19} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Theme & Colors</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cyber Green, Electric Blue & OLED</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          {/* 2. Privacy & Stealth */}
          <div
            onClick={() => setCurrentPage('privacy')}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-emerald)'
              }}>
                <ShieldCheck size={19} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Privacy & Stealth</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Last seen, read receipts, visibility</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          {/* 3. Passcode Vault */}
          <div
            onClick={() => setCurrentPage('security')}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.2)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}>
                <KeyRound size={19} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>4-Digit Passcode Lock</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {currentUser.app_pin ? '🔒 Passcode Active' : 'Configure App PIN'}
                </div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          {/* 4. Saved Messages Cloud Vault ⭐ */}
          <div
            onClick={() => setCurrentPage('vault')}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(234, 179, 8, 0.2)',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#eab308'
              }}>
                <Star size={19} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Saved Messages Vault</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Personal bookmarked notes & files</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          {/* 5. Business & Automation */}
          <div
            onClick={onNavigateToBusiness}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a855f7'
              }}>
                <Bot size={19} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Business Automation</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Auto-reply, away, greetings & catalog</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          {/* 6. Export Encrypted Backup 💾 */}
          <div
            onClick={() => setCurrentPage('backup')}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6'
              }}>
                <Download size={19} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Backup & Export</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Download offline encrypted vault</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          {/* 7. Notifications & Sounds */}
          <div
            onClick={() => setCurrentPage('notifications')}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(234, 179, 8, 0.2)',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#eab308'
              }}>
                <Bell size={19} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Notifications & Sounds</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Dual-tone ringtone & call alerts</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          {/* 8. About SPYCHAT */}
          <div
            onClick={() => setCurrentPage('about')}
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)'
              }}>
                <Info size={19} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>About SPYCHAT E2EE</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Zero-knowledge architecture & keys</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          {/* 9. Share & Download App APK 📲 */}
          {onOpenShareApp && (
            <div
              onClick={() => {
                localStorage.setItem('spychat_seen_build_version', APP_VERSION);
                onOpenShareApp();
              }}
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderTop: '1px solid var(--border-color)',
                background: 'rgba(6, 182, 212, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 0 14px rgba(6, 182, 212, 0.45)'
                  }}>
                    <Smartphone size={19} />
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#10b981',
                      border: '2px solid #040711',
                      boxShadow: '0 0 8px #10b981'
                    }}
                    className="animate-pulse"
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-cyan)' }}>Share SPYCHAT App (APK)</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34d399',
                      padding: '1px 6px',
                      borderRadius: '8px'
                    }}>
                      {APP_VERSION}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Direct APK download & WhatsApp share</div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--accent-cyan)" />
            </div>
          )}

          {/* 10. Admin Command Center (Website Only - Hidden in Mobile App) 🛡️ */}
          {onOpenAdminDashboard && !Capacitor.isNativePlatform() && (
            <div
              onClick={onOpenAdminDashboard}
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderTop: '1px solid var(--border-color)',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.35)'
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>Admin Command Center</span>
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: '800',
                      background: 'rgba(239, 68, 68, 0.25)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      color: '#fca5a5',
                      padding: '1px 6px',
                      borderRadius: '8px'
                    }}>
                      ROOT
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>User management, IP bans, phone blacklist & telemetry</div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          )}
        </div>

        {/* LOGOUT BUTTON */}
        <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
          {confirmLogout ? (
            <div className="glass" style={{
              padding: '14px',
              borderRadius: '16px',
              border: '1px solid var(--accent-danger)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '700' }}>
                Are you sure you want to log out?
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setConfirmLogout(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={onLogout}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    background: '#ef4444',
                    border: 'none',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Confirm Logout
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLogout(true)}
              style={{
                width: '100%',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                padding: '12px',
                borderRadius: '14px',
                fontWeight: '700',
                fontSize: '13.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} /> Logout / Clear Session
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. PROFILE SUBPAGE
  // ==========================================
  if (currentPage === 'profile') {
    return (
      <div style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 14px 220px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        touchAction: 'pan-y pan-x'
      }}>
        <SubHeader title="Edit Profile" subtitle="Manage your public handle and display identity" />

        {/* Hidden Profile Avatar File Picker */}
        <input
          type="file"
          ref={avatarInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarFileSelect}
        />

        <div className="glass" style={{ padding: '22px 20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar with Camera Icon Overlay */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{
                position: 'relative',
                width: '92px',
                height: '92px',
                cursor: 'pointer'
              }}
              title="Change Profile Photo"
            >
              <div style={{
                width: '92px',
                height: '92px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '3px solid var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '32px',
                color: 'var(--accent-primary)',
                boxShadow: '0 0 25px var(--accent-primary-glow)',
                overflow: 'hidden'
              }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  displayName ? displayName.substring(0, 2).toUpperCase() : 'SP'
                )}
              </div>

              {/* Camera Badge */}
              <div style={{
                position: 'absolute',
                bottom: '0px',
                right: '0px',
                background: 'var(--accent-primary)',
                color: '#000000',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                border: '2px solid #0f172a'
              }}>
                <Camera size={16} strokeWidth={2.5} />
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarLoading}
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  color: 'var(--accent-cyan)',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Camera size={14} /> {avatarLoading ? 'Uploading...' : 'Choose Photo'}
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
              Display Name
            </label>
            <input
              type="text"
              className="spychat-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
              Username Tag (Permanent)
            </label>
            <input
              type="text"
              disabled
              className="spychat-input"
              value={`@${currentUser.username}`}
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading || !displayName.trim()}
            className="btn-primary"
            style={{ height: '46px', fontSize: '14px', marginTop: '10px' }}
          >
            {loading ? 'Saving...' : savedMsg || 'Save Profile'}
          </button>
        </div>

        {/* --- CHANGE PASSWORD SECTION --- */}
        <div className="glass" style={{ padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}>
                <KeyRound size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>Change Password</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Update your account access key</div>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordFields(!showPasswordFields)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '6px 12px',
                color: 'var(--accent-cyan)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {showPasswordFields ? 'Hide' : 'Change'}
            </button>
          </div>

          {showPasswordFields && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {passError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '10px',
                  padding: '10px',
                  color: '#fca5a5',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {passError}
                </div>
              )}

              {passMsg && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '10px',
                  padding: '10px',
                  color: '#6ee7b7',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  textAlign: 'center'
                }}>
                  {passMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  className="spychat-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  New Password (Min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  className="spychat-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  className="spychat-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="btn-primary"
                style={{
                  height: '44px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  marginTop: '4px',
                  cursor: passLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {passLoading ? 'Updating Password...' : 'Update Password 🔐'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. THEME SUBPAGE
  // ==========================================
  if (currentPage === 'theme') {
    return (
      <div style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 14px 220px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        touchAction: 'pan-y pan-x'
      }}>
        <SubHeader title="Theme & Appearance" subtitle="Select your preferred color palette" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {THEME_OPTIONS.map((opt) => {
            const isSelected = currentTheme === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => onSelectTheme(opt.id)}
                className="glass"
                style={{
                  padding: '16px',
                  borderRadius: '18px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: opt.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 15px var(--accent-primary-glow)' : 'none'
                  }}>
                    {isSelected && <Check size={20} color="#000" strokeWidth={3} />}
                  </div>

                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                      {opt.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {opt.colors.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: c,
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. PRIVACY SUBPAGE
  // ==========================================
  if (currentPage === 'privacy') {
    return (
      <div style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 14px 220px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        touchAction: 'pan-y pan-x'
      }}>
        <SubHeader title="Privacy & Stealth" subtitle="Control visibility, read receipts and status" />

        <div className="glass" style={{ padding: '18px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Last Seen */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Last Seen Status</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Who can see when you were online</div>
            </div>
            <select
              value={lastSeen}
              onChange={(e) => setLastSeen(e.target.value as any)}
              className="spychat-input"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">Contacts</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>

          {/* Online Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Online Status</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Show green online activity dot</div>
            </div>
            <select
              value={onlineStatus}
              onChange={(e) => setOnlineStatus(e.target.value as any)}
              className="spychat-input"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="everyone">Everyone</option>
              <option value="nobody">Nobody (Stealth)</option>
            </select>
          </div>

          {/* Read Receipts */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Read Receipts</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Send blue checkmarks on read</div>
            </div>
            <input
              type="checkbox"
              checked={readReceipts}
              onChange={(e) => setReadReceipts(e.target.checked)}
              style={{ width: '22px', height: '22px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
          </div>

          {/* Typing Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Typing Indicators</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Show "typing..." to peer</div>
            </div>
            <input
              type="checkbox"
              checked={typingIndicator}
              onChange={(e) => setTypingIndicator(e.target.checked)}
              style={{ width: '22px', height: '22px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
          </div>

          <button
            onClick={handleSavePrivacy}
            disabled={loading}
            className="btn-primary"
            style={{ height: '46px', fontSize: '14px', marginTop: '10px' }}
          >
            {loading ? 'Saving...' : savedMsg || 'Save Privacy Settings'}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. SECURITY & PASSCODE SUBPAGE
  // ==========================================
  if (currentPage === 'security') {
    return (
      <div style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 14px 220px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        touchAction: 'pan-y pan-x'
      }}>
        <SubHeader title="4-Digit Passcode Lock" subtitle="Protect chat database with local PIN encryption" />

        <div className="glass" style={{ padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.2)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Lock size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                {currentUser.app_pin ? 'Passcode is Enabled' : 'Passcode is Disabled'}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Require 4 digits when opening app
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
              Enter 4-Digit Passcode:
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              className="spychat-input"
              value={appPin}
              onChange={(e) => setAppPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ letterSpacing: '8px', textAlign: 'center', fontWeight: '800', fontSize: '20px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              onClick={handleSavePin}
              disabled={loading || appPin.length !== 4}
              className="btn-primary"
              style={{ flex: 1, height: '44px', fontSize: '13px' }}
            >
              {loading ? 'Saving...' : savedMsg || 'Enable / Update PIN'}
            </button>

            {currentUser.app_pin && (
              <button
                onClick={handleDisablePin}
                disabled={loading}
                style={{
                  padding: '0 16px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Disable
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 6. SAVED MESSAGES CLOUD VAULT SUBPAGE ⭐
  // ==========================================
  if (currentPage === 'vault') {
    return (
      <div style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 14px 220px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        touchAction: 'pan-y pan-x'
      }}>
        <SubHeader title="Saved Messages Vault" subtitle="Your bookmarked personal encrypted notes" />

        {savedMessages.length === 0 ? (
          <div className="glass" style={{
            padding: '30px 20px',
            borderRadius: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-muted)'
          }}>
            <Star size={36} color="#eab308" />
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>No Saved Messages Yet</div>
            <div style={{ fontSize: '12px' }}>
              Tap the ⭐ Star icon on any message in a chat to save it here for quick access.
            </div>
          </div>
        ) : (
          savedMessages.map((msg) => (
            <div
              key={msg.id}
              className="glass"
              style={{
                padding: '14px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '700' }}>
                  {msg.message_type.toUpperCase()} • {new Date(msg.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => {
                    socketService.emit('toggle_save_message', { messageId: msg.id }, () => {
                      setSavedMessages(prev => prev.filter(m => m.id !== msg.id));
                    });
                  }}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {msg.media_url ? (
                <img
                  src={msg.media_url}
                  alt="Saved media"
                  style={{ maxHeight: '180px', borderRadius: '10px', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ fontSize: '14px', color: '#ffffff' }}>
                  {msg.ciphertext || '[Encrypted Note]'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // ==========================================
  // 7. BACKUP & EXPORT SUBPAGE 💾
  // ==========================================
  if (currentPage === 'backup') {
    return (
      <div style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 14px 220px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        touchAction: 'pan-y pan-x'
      }}>
        <SubHeader title="Encrypted Backup" subtitle="Download and restore chat data locally" />

        <div className="glass" style={{ padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <Download size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>Export Chat Database</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Download JSON archive of your messages
              </p>
            </div>
          </div>

          <button
            onClick={handleExportBackup}
            className="btn-primary"
            style={{ height: '46px', fontSize: '14px' }}
          >
            <Download size={18} /> Download Backup (.json)
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 8. NOTIFICATIONS SUBPAGE
  // ==========================================
  if (currentPage === 'notifications') {
    return (
      <div style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 14px 220px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        touchAction: 'pan-y pan-x'
      }}>
        <SubHeader title="Notifications & Sounds" subtitle="Calling ringtone and alert configuration" />

        <div className="glass" style={{ padding: '18px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Dual-Tone Ringtone</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>440Hz / 480Hz telecom synthetic ring</div>
            </div>
            <button
              onClick={playSampleRingtone}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '10px' }}
            >
              <Volume2 size={15} /> Test Ringtone
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>In-App Chat Vibrations</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Haptic feedback on message sent</div>
            </div>
            <input
              type="checkbox"
              defaultChecked
              style={{ width: '22px', height: '22px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 9. ABOUT SUBPAGE
  // ==========================================
  return (
    <div style={{
      flex: 1,
      height: '100%',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: '16px 14px 220px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      touchAction: 'pan-y pan-x'
    }}>
      <SubHeader title="About SPYCHAT" subtitle="End-to-End Encrypted Zero-Knowledge Messenger" />

      <div className="glass" style={{ padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000'
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>SPYCHAT {APP_VERSION}</h3>
            <p style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: '700' }}>
              📅 Build: {BUILD_DATE} • {BUILD_TIME}
            </p>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          SPYCHAT utilizes client-side encryption keys generated on your device. Voice & video calls are routed peer-to-peer via WebRTC data relays with zero recording.
        </div>

        <div style={{
          padding: '12px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-color)',
          fontSize: '11.5px',
          color: 'var(--text-muted)'
        }}>
          🛡️ Encryption: AES-256-GCM + PBKDF2<br />
          📞 Audio/Video: Opus / VP8 WebRTC SRTP<br />
          ⚡ Realtime Sync: WebSocket Relay (100MB Multi-Media)<br />
          🔥 Stories: SPYTUS 24-Hour Ephemeral Relays<br />
          👁️ Self-Destruct: 1x View-Once Burner Protocol
        </div>
      </div>
    </div>
  );
};
