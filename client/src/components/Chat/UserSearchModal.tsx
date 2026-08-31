import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Phone, Video, Shield, ShieldAlert, Sparkles, Lock } from 'lucide-react';
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
          setResults(users || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, 60);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query]);

  const cleanQuery = query.replace(/^@+/, '').trim();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 8, 18, 0.95)',
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
            placeholder="Type exact @username (e.g. @mrharsh)..."
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

      {/* Results / Privacy Placeholder Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            Searching encrypted network for @{cleanQuery}...
          </div>
        ) : cleanQuery.length === 0 ? (
          /* --- PRIVACY FIRST PLACEHOLDER (NO USERS EXPOSED) --- */
          <div style={{
            textAlign: 'center',
            padding: '70px 20px',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(6, 182, 212, 0.2)'
            }}>
              <Shield size={32} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#f8fafc', marginBottom: '6px' }}>
                Private Encrypted Search
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto', lineHeight: '1.5' }}>
                Enter the exact <strong style={{ color: 'var(--accent-cyan)' }}>@username</strong> of the person you want to chat with.
              </p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '8px 14px',
              fontSize: '11.5px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px'
            }}>
              <Lock size={13} color="var(--accent-emerald)" />
              <span>Zero Public Directory • 100% Metadata Protected</span>
            </div>
          </div>
        ) : results.length > 0 ? (
          /* --- FOUND MATCHING USER --- */
          <>
            <div style={{
              fontSize: '11.5px',
              fontWeight: '800',
              color: 'var(--accent-cyan)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px'
            }}>
              {cleanQuery ? `Search Results (${results.length})` : `Available Contacts (${results.length})`}
            </div>

            {results.map((user) => (
              <div
                key={user.id}
                onClick={() => onSelectUser(user, 'chat')}
                className="glass"
                style={{
                  padding: '14px 16px',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  border: '1.5px solid rgba(6, 182, 212, 0.35)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(6, 182, 212, 0.2)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* User Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '17px',
                    color: '#000',
                    boxShadow: '0 0 15px rgba(6, 182, 212, 0.35)',
                    flexShrink: 0
                  }}>
                    {(user.display_name || user.username || 'U').substring(0, 2).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '15.5px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.display_name || user.username}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: '700', marginTop: '1px' }}>
                      @{user.username}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onSelectUser(user, 'chat')}
                    title="Send Message"
                    style={{
                      background: 'rgba(6, 182, 212, 0.2)',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      color: 'var(--accent-cyan)',
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <MessageSquare size={18} />
                  </button>

                  <button
                    onClick={() => onSelectUser(user, 'audio')}
                    title="Audio Call"
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#10b981',
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Phone size={18} />
                  </button>

                  <button
                    onClick={() => onSelectUser(user, 'video')}
                    title="Video Call"
                    style={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      color: '#a855f7',
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Video size={18} />
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          /* --- NOT FOUND --- */
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ShieldAlert size={40} color="#f87171" opacity={0.8} />
            <p style={{ fontSize: '15px', color: '#fca5a5', fontWeight: '700' }}>
              No user found with @{cleanQuery}
            </p>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Make sure the @username is spelled accurately.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
