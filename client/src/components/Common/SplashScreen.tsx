import React from 'react';
import { Shield, Lock, Cpu, Sparkles } from 'lucide-react';
import { APP_VERSION, BUILD_DATE, BUILD_TIME } from '../../config/version';

interface SplashScreenProps {
  statusText?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  statusText = 'Initializing SPYCHAT Quantum Enclave...' 
}) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at 50% 30%, #0d1a30 0%, #040711 75%, #02040a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 'max(50px, calc(env(safe-area-inset-top, 0px) + 16px))',
      paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
      paddingLeft: '24px',
      paddingRight: '24px',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      {/* BACKGROUND AMBIENT GLOW */}
      <div style={{
        position: 'absolute',
        top: '25%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 80%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      {/* TOP EMPTY SPACER */}
      <div style={{ height: '20px' }} />

      {/* CENTER LOGO & BRANDING */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        zIndex: 2,
        animation: 'fadeInScale 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* LOGO SHIELD CONTAINER */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '30px',
          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #10b981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 45px rgba(6, 182, 212, 0.5), 0 15px 35px rgba(0, 0, 0, 0.6)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          position: 'relative'
        }}>
          <Shield size={54} color="#000000" strokeWidth={2.5} />
          
          <div style={{
            position: 'absolute',
            bottom: '-6px',
            right: '-6px',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: '#040711',
            border: '2px solid #06b6d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#06b6d4'
          }}>
            <Lock size={14} />
          </div>
        </div>

        {/* APP TITLE & SUBTITLE */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '900',
            letterSpacing: '2px',
            background: 'linear-gradient(135deg, #ffffff 0%, #a5f3fc 50%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            SPYCHAT
          </h1>
          <div style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            fontWeight: '600',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <Sparkles size={13} color="#06b6d4" />
            <span>QUANTUM E2EE MESSENGER</span>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        <div style={{
          marginTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '180px',
            height: '4px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '60%',
              background: 'linear-gradient(90deg, #06b6d4, #10b981)',
              borderRadius: '8px',
              animation: 'indeterminateSlide 1.2s infinite ease-in-out'
            }} />
          </div>
          <div style={{
            fontSize: '12px',
            color: '#06b6d4',
            fontWeight: '600',
            letterSpacing: '0.3px'
          }}>
            {statusText}
          </div>
        </div>
      </div>

      {/* BOTTOM VERSION & BUILD DATE/TIME BADGE */}
      <div style={{
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        animation: 'fadeIn 1s ease'
      }}>
        {/* VERSION PILL */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: '20px',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)'
        }}>
          <Cpu size={14} color="#06b6d4" />
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
            Version {APP_VERSION}
          </span>
          <span style={{
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            fontSize: '10px',
            fontWeight: '800',
            padding: '2px 6px',
            borderRadius: '6px'
          }}>
            PROD
          </span>
        </div>

        {/* BUILD DATE & TIME INFO */}
        <div style={{
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          fontWeight: '600',
          letterSpacing: '0.4px',
          textAlign: 'center'
        }}>
          📅 Build: <strong style={{ color: '#e2e8f0' }}>{BUILD_DATE}</strong> at <strong style={{ color: '#06b6d4' }}>{BUILD_TIME}</strong>
        </div>

        <div style={{
          fontSize: '10.5px',
          color: 'rgba(255, 255, 255, 0.3)',
          letterSpacing: '0.2px'
        }}>
          Zero-Knowledge Architecture • SHA-256 Verified
        </div>
      </div>

      {/* EMBEDDED ANIMATIONS */}
      <style>{`
        @keyframes indeterminateSlide {
          0% { left: -60%; width: 30%; }
          50% { left: 30%; width: 60%; }
          100% { left: 100%; width: 30%; }
        }
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
