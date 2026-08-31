import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Phone, Video, ShieldAlert, Sparkles, Users } from 'lucide-react';
import { AuthService } from '../../services/auth';
import { User } from '../../types';

interface UserSearchModalProps {
  onClose: () => void;
  onSelectUser: (user: User, action: 'chat' | 'audio' | 'video') => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  onClose,
  onSelectUser
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const cleanQuery = query.replace(/^@+/, '').trim();

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const users = await AuthService.searchUsers(cleanQuery);
        if (isCurrent) {
          setResults(users);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, 50);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 8, 18, 0.94)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      animation: 'slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Top Search Header */}
      <div className="glass" style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--accent-cyan)" style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)'
          }} />
          <input
            type="text"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search by username or display name..."
            className="spychat-input"
            style={{ paddingLeft: '38px', paddingRight: query ? '36px' : '14px', width: '100%' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '8px 14px',
            color: '#cbd5e1',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>

      {/* Directory / Results Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {loading && results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            Searching encrypted directory...
          </div>
        ) : results.length > 0 ? (
          <>
            <div style={{
              fontSize: '11.5px',
              fontWeight: '800',
              color: 'var(--accent-cyan)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Users size={14} />
              <span>{query.trim() ? `Matching Users (${results.length})` : `All Users Directory (${results.length})`}</span>
            </div>

            {results.map((user) => (
              <div
                key={user.id}
                onClick={() => onSelectUser(user, 'chat')}
                className="glass"
                style={{
                  padding: '12px 14px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* User Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '16px',
                    color: '#000',
                    boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)',
                    flexShrink: 0
                  }}>
                    {(user.display_name || user.username || 'U').substring(0, 2).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.display_name || user.username}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: '600', marginTop: '1px' }}>
                      @{user.username}
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onSelectUser(user, 'chat')}
                    title="Send Message"
                    style={{
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.35)',
                      color: 'var(--accent-cyan)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <MessageSquare size={17} />
                  </button>

                  <button
                    onClick={() => onSelectUser(user, 'audio')}
                    title="Audio Call"
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10b981',
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Phone size={17} />
                  </button>

                  <button
                    onClick={() => onSelectUser(user, 'video')}
                    title="Video Call"
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      color: '#a855f7',
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Video size={17} />
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ShieldAlert size={40} color="var(--accent-cyan)" opacity={0.7} />
            <p style={{ fontSize: '15px', color: '#cbd5e1', fontWeight: '600' }}>
              No user found matching "{query.replace(/^@+/, '')}"
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Check the spelling or search with another username.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
