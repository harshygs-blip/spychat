import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Video, 
  Lock, 
  MessageSquare, 
  User as UserIcon, 
  X, 
  ShieldCheck, 
  Clock, 
  Calendar 
} from 'lucide-react';
import { CallLog, User } from '../../types';
import { AuthService } from '../../services/auth';

interface CallLogsProps {
  onStartCall: (peer: User, callType: 'audio' | 'video') => void;
  onOpenChat?: (peer: User) => void;
}

export const CallLogs: React.FC<CallLogsProps> = ({ onStartCall, onOpenChat }) => {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfilePeer, setSelectedProfilePeer] = useState<{ peer: User; lastCall: CallLog } | null>(null);

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
        Loading encrypted call logs...
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px 120px 20px',
        textAlign: 'center',
        gap: '14px'
      }}>
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1.5px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(16, 185, 129, 0.2)'
        }}>
          <Phone size={30} color="var(--accent-emerald)" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>No Recent Calls</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: '1.5' }}>
          All your audio and video calls are encrypted end-to-end with zero recordings on servers.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      height: '100%',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: '12px 14px 130px 14px',
      touchAction: 'pan-y'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {calls.map((call) => {
          const peer = call.peer;
          const isMissed = call.status === 'missed' || call.status === 'declined';

          return (
            <div
              key={call.id}
              className="glass"
              style={{
                padding: '12px 14px',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--border-color)',
                transition: 'all 0.2s ease',
                cursor: peer ? 'pointer' : 'default'
              }}
              onClick={() => {
                if (peer) {
                  setSelectedProfilePeer({ peer: peer as User, lastCall: call });
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                {/* Avatar */}
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  border: isMissed ? '1.5px solid var(--accent-danger)' : '1.5px solid var(--accent-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '16px',
                  color: isMissed ? '#f87171' : '#10b981',
                  flexShrink: 0
                }}>
                  {peer ? peer.display_name.substring(0, 2).toUpperCase() : '??'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: '700',
                    fontSize: '15px',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {peer ? peer.display_name : 'Unknown Contact'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: isMissed ? 'var(--accent-danger)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginTop: '2px'
                  }}>
                    {isMissed ? <PhoneMissed size={12} color="#f87171" /> : <PhoneIncoming size={12} color="#34d399" />}
                    <span>{call.type === 'video' ? 'Video Call' : 'Voice Call'}</span>
                    <span>•</span>
                    <span>{new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(call.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {peer && (
                <div
                  style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Direct Chat / Message Button */}
                  {onOpenChat && (
                    <button
                      onClick={() => onOpenChat(peer as User)}
                      title="Send Message / Open Chat"
                      style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        color: '#60a5fa',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <MessageSquare size={17} />
                    </button>
                  )}

                  {/* Call Back Button */}
                  <button
                    onClick={() => onStartCall(peer as User, call.type)}
                    title={`Call Back (${call.type})`}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: 'var(--accent-emerald)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {call.type === 'video' ? <Video size={17} /> : <Phone size={17} />}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CALLER PROFILE & QUICK ACTIONS MODAL */}
      {selectedProfilePeer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 90
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '350px',
            borderRadius: '24px',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(6, 182, 212, 0.25)',
            border: '1.5px solid rgba(6, 182, 212, 0.3)',
            animation: 'scaleUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: 'var(--accent-cyan)', fontSize: '15px' }}>
                <UserIcon size={18} /> Contact Profile
              </div>
              <button
                onClick={() => setSelectedProfilePeer(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Avatar & Names */}
            <div style={{
              width: '76px',
              height: '76px',
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
              {selectedProfilePeer.peer.display_name.substring(0, 2).toUpperCase()}
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#ffffff' }}>
                {selectedProfilePeer.peer.display_name}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                @{selectedProfilePeer.peer.username}
              </p>
            </div>

            {/* Call History Record Card */}
            <div style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '12px', fontWeight: '800' }}>
                <ShieldCheck size={14} /> End-to-End Encrypted Peer
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <span>Last Call Type:</span>
                <strong style={{ color: '#ffffff' }}>{selectedProfilePeer.lastCall.type.toUpperCase()} CALL</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <span>Timestamp:</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {new Date(selectedProfilePeer.lastCall.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Actions: Send Message, Voice Call, Video Call */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* PRIMARY MESSAGE / CHAT BUTTON 💬 */}
              {onOpenChat && (
                <button
                  onClick={() => {
                    const p = selectedProfilePeer.peer;
                    setSelectedProfilePeer(null);
                    onOpenChat(p);
                  }}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    height: '46px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '800'
                  }}
                >
                  <MessageSquare size={18} /> Send Message / Open Chat 💬
                </button>
              )}

              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                  onClick={() => {
                    const p = selectedProfilePeer.peer;
                    setSelectedProfilePeer(null);
                    onStartCall(p, 'audio');
                  }}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '13px'
                  }}
                >
                  <Phone size={16} color="#10b981" /> Voice Call
                </button>
                <button
                  onClick={() => {
                    const p = selectedProfilePeer.peer;
                    setSelectedProfilePeer(null);
                    onStartCall(p, 'video');
                  }}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    borderColor: 'rgba(168, 85, 247, 0.4)',
                    color: '#c084fc'
                  }}
                >
                  <Video size={16} /> Video Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
