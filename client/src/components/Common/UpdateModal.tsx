import React from 'react';
import { Download, Sparkles, AlertCircle, ArrowUpCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { AppUpdateInfo, UpdateService } from '../../services/updateService';
import { APP_VERSION } from '../../config/version';

interface UpdateModalProps {
  updateInfo: AppUpdateInfo;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onClose }) => {
  const { latestVersion, downloadUrl, changelog, forceUpdate } = updateInfo;

  const handleUpdate = () => {
    UpdateService.downloadAndInstallUpdate(downloadUrl);
  };

  const changelogItems = changelog
    ? changelog.split('\n').filter(line => line.trim().length > 0)
    : ['⚡ Performance improvements & bug fixes', '🔒 WebRTC E2EE calling stability enhancements'];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.96)',
      backdropFilter: 'blur(25px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 300,
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '28px',
        border: '1.5px solid var(--accent-cyan)',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 45px rgba(6, 182, 212, 0.25)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Glow Accent Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
          padding: '28px 24px 20px 24px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative'
        }}>
          {/* Animated Download Icon Badge */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 35px rgba(6, 182, 212, 0.5)',
            marginBottom: '14px'
          }}>
            <ArrowUpCircle size={38} color="#ffffff" className="animate-bounce" />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}>
            <Sparkles size={12} /> New Update Available
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px' }}>
            SPYCHAT {latestVersion}
          </h2>

          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span>Installed: {APP_VERSION}</span>
            <span>•</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>Latest: {latestVersion}</span>
          </div>
        </div>

        {/* Content & Changelog */}
        <div style={{ padding: '22px 24px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '700',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={14} color="var(--accent-cyan)" /> What's New in this Build:
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '160px',
            overflowY: 'auto'
          }}>
            {changelogItems.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '13px',
                color: '#f8fafc',
                lineHeight: '1.4'
              }}>
                <CheckCircle size={15} color="#10b981" style={{ minWidth: '15px', marginTop: '2px' }} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {forceUpdate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '12px',
              fontWeight: '600',
              marginTop: '14px'
            }}>
              <AlertCircle size={16} style={{ minWidth: '16px' }} />
              <span>This update contains critical privacy & calling fixes and is required.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          padding: '0 24px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button
            onClick={handleUpdate}
            className="btn-success"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '800',
              borderRadius: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)'
            }}
          >
            <Download size={20} />
            Update SPYCHAT Now
          </button>

          {!forceUpdate && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '600',
                padding: '8px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Remind Me Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
