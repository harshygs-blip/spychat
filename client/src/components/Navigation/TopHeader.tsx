import React from 'react';
import { Shield, Lock, Search, Palette, Settings } from 'lucide-react';
import { User } from '../../types';

interface TopHeaderProps {
  currentUser: User | null;
  activeTab: string;
  onOpenSearch: () => void;
  onOpenTheme: () => void;
  onOpenSettings: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  activeTab,
  onOpenSearch,
  onOpenTheme,
  onOpenSettings
}) => {
  return (
    <header className="glass" style={{
      padding: '10px 16px',
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
