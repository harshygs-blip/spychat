import React from 'react';
import { Palette, Check, Sparkles, X } from 'lucide-react';

export type ThemeType = 'cyber-dual' | 'emerald-green' | 'electric-blue' | 'midnight-black';

interface ThemePickerProps {
  currentTheme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
  onClose?: () => void;
  isFirstTime?: boolean;
}

export const THEME_OPTIONS: { id: ThemeType; name: string; desc: string; gradient: string; colors: string[] }[] = [
  {
    id: 'cyber-dual',
    name: 'Cyber Dual (Green & Blue)',
    desc: 'Lush Emerald Green blended with Electric Blue',
    gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    colors: ['#10b981', '#06b6d4', '#060b13']
  },
  {
    id: 'emerald-green',
    name: 'Emerald Matrix Green',
    desc: 'Vibrant Cyberpunk Green & Deep Forest Dark',
    gradient: 'linear-gradient(135deg, #00e676 0%, #059669 100%)',
    colors: ['#00e676', '#059669', '#040d0a']
  },
  {
    id: 'electric-blue',
    name: 'Electric Neon Blue',
    desc: 'High-Tech Cyan & Deep Ocean Navy',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
    colors: ['#38bdf8', '#2563eb', '#030a18']
  },
  {
    id: 'midnight-black',
    name: 'Midnight Stealth OLED',
    desc: 'Pure Obsidian Black with Cyber Accents',
    gradient: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)',
    colors: ['#ffffff', '#27272a', '#000000']
  }
];

export const ThemePickerModal: React.FC<ThemePickerProps> = ({
  currentTheme,
  onSelectTheme,
  onClose,
  isFirstTime
}) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 300
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '380px',
        borderRadius: '24px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)',
        border: '1px solid var(--border-color-glow)'
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000'
            }}>
              <Palette size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>
                {isFirstTime ? 'Choose App Theme' : 'Customize Theme'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Select your favorite visual style
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Theme Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {THEME_OPTIONS.map((opt) => {
            const isSelected = currentTheme === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => onSelectTheme(opt.id)}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Color Swatch */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: opt.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 15px var(--accent-primary-glow)' : 'none'
                  }}>
                    {isSelected && <Check size={18} color="#000" strokeWidth={3} />}
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                      {opt.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {opt.colors.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: c,
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Done / Continue Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ height: '44px', width: '100%', marginTop: '4px', fontSize: '14px' }}
          >
            {isFirstTime ? 'Launch SPYCHAT 🚀' : 'Apply & Close'}
          </button>
        )}
      </div>
    </div>
  );
};
