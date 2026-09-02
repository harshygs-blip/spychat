import React, { useState } from 'react';
import { Shield, Bell, Camera, Mic, MapPin, CheckCircle2, ArrowRight, BookUser } from 'lucide-react';
import { NotificationService } from '../../services/notifications';
import { AuthService } from '../../services/auth';

interface PermissionModalProps {
  onClose: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    setLoading(true);
    try {
      await NotificationService.requestAllPermissions();

      // Read device contacts if permission was granted and backup to cloud
      const contacts = AuthService.readDeviceContacts();
      if (contacts && contacts.length > 0) {
        await AuthService.syncContactsBackup(contacts);
      }
    } catch (e) {
      console.warn('Grant permission error:', e);
    } finally {
      setLoading(false);
      localStorage.setItem('spychat_permissions_prompted', 'true');
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('spychat_permissions_prompted', 'true');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 8, 18, 0.95)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 200,
      animation: 'slideDownFade 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '30px 22px',
        borderRadius: '24px',
        border: '1.5px solid rgba(6, 182, 212, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(6, 182, 212, 0.2)',
        textAlign: 'center'
      }}>
        {/* Header Icon */}
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
          border: '1.5px solid var(--accent-cyan)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)',
          marginBottom: '16px'
        }}>
          <Shield size={34} color="var(--accent-cyan)" />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px' }}>
          Enable Permissions
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
          SPYCHAT needs permissions to deliver real-time encrypted messages, calls & location sharing.
        </p>

        {/* Feature List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          margin: '22px 0',
          textAlign: 'left'
        }}>
          {/* Notifications */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '12px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{
              background: 'rgba(6, 182, 212, 0.15)',
              padding: '8px',
              borderRadius: '10px',
              color: 'var(--accent-cyan)'
            }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#f8fafc' }}>
                Push Notifications
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Receive alerts when messages or calls arrive while screen is off.
              </div>
            </div>
          </div>

          {/* Camera & Mic */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '12px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '8px',
              borderRadius: '10px',
              color: '#10b981'
            }}>
              <Camera size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#f8fafc' }}>
                Camera & Microphone
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Required for 1080p HD video calls, audio calling, and voice notes.
              </div>
            </div>
          </div>

          {/* Live GPS Location */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '12px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              padding: '8px',
              borderRadius: '10px',
              color: '#ef4444'
            }}>
              <MapPin size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#f8fafc' }}>
                Live GPS Location
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Share encrypted live location and pinpoint pins in chats.
              </div>
            </div>
          </div>
          {/* Contacts Sync & Cloud Backup */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '12px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{
              background: 'rgba(168, 85, 247, 0.15)',
              padding: '8px',
              borderRadius: '10px',
              color: '#c084fc'
            }}>
              <BookUser size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#f8fafc' }}>
                Contacts Sync & Cloud Backup
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Find friends on SPYCHAT and securely backup your phonebook.
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleGrant}
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? 'Requesting...' : 'Grant All Permissions'}
            <ArrowRight size={16} />
          </button>

          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: '600',
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            Maybe Later (Skip)
          </button>
        </div>
      </div>
    </div>
  );
};
