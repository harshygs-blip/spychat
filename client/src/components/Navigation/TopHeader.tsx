import React from 'react';
import { Shield, Lock, Search, Palette, Settings, Share2 } from 'lucide-react';
import { User } from '../../types';
import { APP_VERSION } from '../../config/version';

interface TopHeaderProps {
  currentUser: User | null;
  activeTab: string;
  onOpenSearch: () => void;
  onOpenTheme: () => void;
  onOpenSettings: () => void;
  onOpenShareApp?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  activeTab,
  onOpenSearch,
  onOpenTheme,
  onOpenSettings,
  onOpenShareApp
}) => {
  const [hasNewBuild, setHasNewBuild] = React.useState(false);

  React.useEffect(() => {
    const seen = localStorage.getItem('spychat_seen_build_version');
    if (seen !== APP_VERSION) {
      setHasNewBuild(true);
    }
  }, []);

  const handleShareClick = () => {
    localStorage.setItem('spychat_seen_build_version', APP_VERSION);
    setHasNewBuild(false);
    if (onOpenShareApp) onOpenShareApp();
  };

  return (
    <header className="glass" style={{
      paddingTop: 'max(10px, calc(env(safe-area-inset-top, 0px) + 6px))',
      paddingBottom: '10px',
      paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
      paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-color)',
      zIndex: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px var(--accent-primary-glow)'
        }}>
          <Shield size={22} color="#000000" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h1 style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '0.5px' }}>SPYCHAT</h1>
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <Lock size={10} /> E2EE
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {currentUser ? `@${currentUser.username}` : 'Privacy-First Communication'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Share APK Button 📲 (With New Build Glowing Pulsing Dot) */}
        {onOpenShareApp && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleShareClick}
              title={`Share SPYCHAT App APK (${APP_VERSION})`}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: hasNewBuild ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.12)',
                border: hasNewBuild ? '1.5px solid var(--accent-cyan)' : '1px solid rgba(6, 182, 212, 0.35)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: hasNewBuild ? '0 0 15px rgba(6, 182, 212, 0.5)' : 'none'
              }}
            >
              <Share2 size={17} />
            </button>
            {hasNewBuild && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '2px solid #040711',
                  boxShadow: '0 0 10px #10b981'
                }}
                className="animate-pulse"
              />
            )}
          </div>
        )}

        {/* Search Users Button */}
        <button
          onClick={onOpenSearch}
          title="Search Users by Tag"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Search size={17} />
        </button>

        {/* Theme Picker Button 🎨 */}
        <button
          onClick={onOpenTheme}
          title="Switch Color Theme (Green / Blue / Dual)"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-color)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Palette size={17} />
        </button>

        {/* Settings ⚙️ Button */}
        <button
          onClick={onOpenSettings}
          title="Settings & Privacy"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: activeTab === 'settings' ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-color)',
            color: activeTab === 'settings' ? '#000000' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
};
