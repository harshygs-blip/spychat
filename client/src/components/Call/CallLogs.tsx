import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Lock } from 'lucide-react';
import { CallLog, User } from '../../types';
import { AuthService } from '../../services/auth';

interface CallLogsProps {
  onStartCall: (peer: User, callType: 'audio' | 'video') => void;
}

export const CallLogs: React.FC<CallLogsProps> = ({ onStartCall }) => {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const token = AuthService.getAccessToken();
        const res = await fetch(`${AuthService.getApiBase()}/calls`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.calls) {
          setCalls(data.calls);
        }
      } catch (err) {
        console.error('Error fetching call logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading call logs...
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px',
        textAlign: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Phone size={28} color="var(--accent-emerald)" />
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: '700' }}>No Recent Calls</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px' }}>
          All your voice and video calls use P2P WebRTC encryption with zero server listening.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {calls.map((call) => {
          const peer = call.peer;
          const isMissed = call.status === 'missed' || call.status === 'declined';

          return (
            <div
              key={call.id}
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
                  border: isMissed ? '1px solid var(--accent-danger)' : '1px solid var(--accent-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  color: isMissed ? '#f87171' : '#10b981'
                }}>
                  {peer ? peer.display_name.substring(0, 2).toUpperCase() : '??'}
                </div>

                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>
                    {peer ? peer.display_name : 'Unknown Contact'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: isMissed ? 'var(--accent-danger)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '2px'
                  }}>
                    {isMissed ? <PhoneMissed size={12} /> : <PhoneIncoming size={12} />}
                    <span>{call.type === 'video' ? 'Video Call' : 'Audio Call'}</span>
                    <span>•</span>
                    <span>{new Date(call.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {peer && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => onStartCall(peer as User, call.type)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-color)',
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
                    {call.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
