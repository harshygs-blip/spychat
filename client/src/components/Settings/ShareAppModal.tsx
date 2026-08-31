import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  QrCode, 
  Smartphone, 
  ShieldCheck, 
  ExternalLink,
  Zap
} from 'lucide-react';
import { AuthService } from '../../services/auth';

interface ShareAppModalProps {
  onClose: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const downloadUrl = `${AuthService.getApiBase()}/download/app.apk`;
  const rawGithubUrl = 'https://github.com/harshygs-blip/spychat/raw/main/app-debug.apk';

  const shareText = `🛡️ Hey! Download SPYCHAT - Quantum E2EE Encrypted Messenger with Disappearing Chats, Zero-Knowledge Privacy, and Ultra-HD Audio/Video Calling.\n\n📥 Direct APK Download Link:\n${downloadUrl}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SPYCHAT - E2EE Encrypted Messenger',
          text: shareText,
          url: downloadUrl
        });
      } catch (err) {
        console.warn('Share cancelled:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDirectDownload = () => {
    window.open(downloadUrl, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '24px',
        border: '1px solid rgba(6, 182, 212, 0.35)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(4, 7, 17, 0.98) 100%)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(6, 182, 212, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
            }}>
              <Share2 size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>Share SPYCHAT App</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Instant APK Transfer & Install</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* APP BADGE BANNER */}
          <div style={{
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '16px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)'
            }}>
              <Smartphone size={26} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>SPYCHAT Android APK</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: '600' }}>v1.0.0 • E2EE Direct Install</div>
            </div>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              Latest
            </div>
          </div>

          {/* QR CODE SCAN SECTION (TOGGLE) */}
          {showQr ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(downloadUrl)}`}
                alt="Scan to Install SPYCHAT"
                style={{ width: '180px', height: '180px', borderRadius: '10px' }}
              />
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
                📱 Scan with any phone camera to install instantly
              </div>
            </div>
          ) : null}

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* 1. NATIVE SHARE (WHATSAPP, BLUETOOTH, QUICK SHARE) */}
            <button
              onClick={handleNativeShare}
              className="btn-primary"
              style={{
                height: '48px',
                fontSize: '14.5px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
              }}
            >
              <Share2 size={18} /> Share via WhatsApp / Bluetooth / Apps
            </button>

            {/* 2. DIRECT DOWNLOAD BUTTON */}
            <button
              onClick={handleDirectDownload}
              style={{
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Download size={18} color="var(--accent-cyan)" /> Direct Download APK (.apk)
            </button>

            {/* 3. COPY LINK / SHOW QR BUTTONS */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCopyLink}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '12px',
                  background: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: copied ? '1px solid #10b981' : '1px solid var(--border-color)',
                  color: copied ? '#34d399' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Link Copied!' : 'Copy Link'}
              </button>

              <button
                onClick={() => setShowQr(!showQr)}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '12px',
                  background: showQr ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                  border: showQr ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  color: showQr ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <QrCode size={16} />
                {showQr ? 'Hide QR' : 'Show QR Code'}
              </button>
            </div>

          </div>

          {/* ZERO-SERVER SHARING TIP */}
          <div style={{
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            paddingTop: '6px'
          }}>
            <ShieldCheck size={14} color="#34d399" />
            <span>Direct offline APK distribution • No PlayStore account required</span>
          </div>

        </div>
      </div>
    </div>
  );
};
