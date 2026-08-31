import React from 'react';
import { MessageSquare, Phone, Bot, Settings, Flame } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'chats' | 'spytus' | 'calls' | 'business' | 'settings';
  onTabChange: (tab: 'chats' | 'spytus' | 'calls' | 'business' | 'settings') => void;
  unreadChatCount?: number;
  missedCallCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadChatCount = 0,
  missedCallCount = 0
}) => {
  const tabs: Array<{ id: 'chats' | 'spytus' | 'calls' | 'business' | 'settings'; label: string; icon: any; badge?: number }> = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadChatCount },
    { id: 'spytus', label: 'Spytus', icon: Flame },
    { id: 'calls', label: 'Calls', icon: Phone, badge: missedCallCount },
    { id: 'business', label: 'Business', icon: Bot },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <nav className="glass-nav" style={{
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '6px 4px 10px 4px',
      position: 'relative',
      zIndex: 20,
      borderTop: '1px solid var(--border-color)',
      userSelect: 'none'
    }}>
      {/* Sliding Active Pill Background Capsule (iPhone WhatsApp Style) */}
      <div style={{
        position: 'absolute',
        top: '6px',
        left: `${(activeIndex * 20) + 2}%`,
        width: '16%',
        height: '42px',
        background: 'var(--accent-gradient)',
        borderRadius: '16px',
        opacity: 0.16,
        boxShadow: '0 0 20px var(--accent-primary-glow)',
        transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
        pointerEvents: 'none'
      }} />

      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              position: 'relative',
              padding: '6px 4px',
              borderRadius: '14px',
              transition: 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
              transform: isActive ? 'scale(1.06)' : 'scale(1)'
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
              {tab.badge && tab.badge > 0 ? (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-10px',
                  background: 'var(--accent-danger)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 5px',
                  borderRadius: '10px',
                  minWidth: '16px',
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)'
                }}>
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span style={{
              fontSize: '10.5px',
              fontWeight: isActive ? '800' : '500',
              letterSpacing: '0.2px',
              color: isActive ? '#ffffff' : 'var(--text-muted)'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
