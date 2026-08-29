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

  return (
    <nav className="glass-nav" style={{
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 4px 12px 4px',
      position: 'relative',
      zIndex: 20
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              position: 'relative',
              padding: '6px 8px',
              borderRadius: '12px',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {tab.badge && tab.badge > 0 ? (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-8px',
                  background: 'var(--accent-danger)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 5px',
                  borderRadius: '10px',
                  minWidth: '16px',
                  textAlign: 'center'
                }}>
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span style={{ fontSize: '10.5px', fontWeight: isActive ? '800' : '500' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
