import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Phone, Video, ShieldAlert, Sparkles, UserPlus } from 'lucide-react';
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
    const fetchResults = async () => {
      setLoading(true);
      try {
        const users = await AuthService.searchUsers(query.trim());
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
      fetchResults();
    }, 150);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 8, 18, 0.9)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50
    }}>
      {/* Top Search Bar */}
      <div className="glass" style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <form onSubmit={handleSearch} style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)'
          }} />
          <input
            type="text"
            autoFocus
            placeholder="Search by @tag or username..."
            className="spychat-input"
            style={{ paddingLeft: '38px' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Results List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Searching encrypted registry...
          </div>
        ) : results.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((user) => (
              <div
                key={user.id}
                className="glass"
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    border: '1px solid var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: 'var(--accent-cyan)'
                  }}>
                    {user.display_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{user.display_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                      @{user.username}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onSelectUser(user, 'chat')}
                    title="Send Encrypted Message"
                    style={{
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      color: 'var(--accent-cyan)',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <MessageSquare size={16} />
                  </button>

                  <button
                    onClick={() => onSelectUser(user, 'audio')}
                    title="Start Voice Call"
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Phone size={16} />
                  </button>

                  <button
                    onClick={() => onSelectUser(user, 'video')}
                    title="Start Video Call"
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#a855f7',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Video size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : query.trim().length > 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ShieldAlert size={36} color="var(--text-muted)" />
            <p style={{ fontSize: '15px' }}>No user found matching "@{query}"</p>
            <p style={{ fontSize: '12px' }}>Make sure the @tag is spelled accurately.</p>
          </div>
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
            <Search size={36} color="var(--accent-cyan)" opacity={0.6} />
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              Search anyone by their private public tag
            </p>
            <p style={{ fontSize: '12px' }}>
              Example: search <code>@shadow</code> or <code>@spy</code> to start talking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
