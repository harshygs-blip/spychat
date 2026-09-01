import React, { useRef, useState, useCallback } from 'react';
import { MessageSquare, Phone, Bot, Settings, Flame } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'chats' | 'spytus' | 'calls' | 'business' | 'settings';
  onTabChange: (tab: 'chats' | 'spytus' | 'calls' | 'business' | 'settings') => void;
  unreadChatCount?: number;
  missedCallCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadChatCount = 0,
  missedCallCount = 0
}) => {
  const tabs: Array<{ id: 'chats' | 'spytus' | 'calls' | 'business' | 'settings'; label: string; icon: any; badge?: number }> = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadChatCount },
    { id: 'spytus', label: 'Spytus', icon: Flame },
    { id: 'calls', label: 'Calls', icon: Phone, badge: missedCallCount },
    { id: 'business', label: 'Business', icon: Bot },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const activeIndex = tabs.findIndex(t => t.id === activeTab);
  const navRef = useRef<HTMLElement>(null);
  const isDraggingRef = useRef(false);
  const [dragTilt, setDragTilt] = useState<{ rotateY: number; rotateX: number }>({ rotateY: 0, rotateX: 0 });
  const [isActivelyDragging, setIsActivelyDragging] = useState(false);

  // Trigger light haptic feedback on tab change
  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
    } catch {
      // ignore
    }
  }, []);

  // Calculate tab from touch/pointer X position
  const handlePointerDrag = useCallback((clientX: number, clientY: number) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    const tabWidth = rect.width / tabs.length;

    // 3D dynamic tilt angle based on finger position
    const tiltY = ((relativeX / rect.width) - 0.5) * 16;
    const tiltX = (0.5 - (relativeY / rect.height)) * 12;
    setDragTilt({ rotateY: tiltY, rotateX: tiltX });

    const newIndex = Math.max(0, Math.min(tabs.length - 1, Math.floor(relativeX / tabWidth)));
    if (newIndex !== activeIndex) {
      triggerHaptic();
      onTabChange(tabs[newIndex].id);
    }
  }, [activeIndex, tabs, onTabChange, triggerHaptic]);

  // Touch Handlers (1-Finger Slide & Drag)
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    setIsActivelyDragging(true);
    const touch = e.touches[0];
    handlePointerDrag(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const touch = e.touches[0];
    handlePointerDrag(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setIsActivelyDragging(false);
    setDragTilt({ rotateY: 0, rotateX: 0 });
  };

  // Mouse Handlers (Desktop / Web Dragging)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    setIsActivelyDragging(true);
    handlePointerDrag(e.clientX, e.clientY);

    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingRef.current) return;
      handlePointerDrag(moveEvt.clientX, moveEvt.clientY);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsActivelyDragging(false);
      setDragTilt({ rotateY: 0, rotateX: 0 });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <nav
      ref={navRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className="glass-nav"
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 6px 12px 6px',
        position: 'relative',
        zIndex: 20,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(6, 11, 20, 0.95)',
        backdropFilter: 'blur(25px)',
        userSelect: 'none',
        touchAction: 'none',
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${dragTilt.rotateX}deg) rotateY(${dragTilt.rotateY}deg)`,
        transition: isActivelyDragging ? 'transform 0.05s ease-out' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* 3D Holographic Sliding Capsule Pill */}
      <div style={{
        position: 'absolute',
        top: '6px',
        left: `${(activeIndex * 20) + 2}%`,
        width: '16%',
        height: '46px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.35) 100%)',
        borderRadius: '18px',
        border: '1.5px solid rgba(6, 182, 212, 0.55)',
        boxShadow: isActivelyDragging
          ? '0 12px 30px rgba(6, 182, 212, 0.6), 0 0 25px rgba(16, 185, 129, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.5)'
          : '0 8px 24px rgba(6, 182, 212, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.35)',
        transform: isActivelyDragging ? 'translateZ(20px) scale(1.08)' : 'translateZ(12px) scale(1)',
        transition: isActivelyDragging
          ? 'left 0.12s cubic-bezier(0.1, 0.9, 0.2, 1), transform 0.15s ease, box-shadow 0.15s ease'
          : 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: '3px'
      }}>
        {/* Neon 3D Under-Glow Particle */}
        <div style={{
          width: '16px',
          height: '3px',
          borderRadius: '3px',
          background: 'var(--accent-gradient)',
          boxShadow: '0 0 10px var(--accent-cyan)'
        }} />
      </div>

      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const distance = Math.abs(idx - activeIndex);

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              position: 'relative',
              padding: '6px 2px',
              borderRadius: '16px',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isActive
                ? 'translateZ(22px) translateY(-3px) scale(1.12)'
                : distance === 1 && isActivelyDragging
                ? 'translateZ(6px) scale(0.98)'
                : 'translateZ(0px) scale(1)',
              transformStyle: 'preserve-3d'
            }}
          >
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: isActive ? 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.6))' : 'none',
              transition: 'filter 0.25s ease'
            }}>
              <Icon
                size={22}
                strokeWidth={isActive ? 2.6 : 1.8}
                color={isActive ? '#38bdf8' : 'currentColor'}
              />

              {tab.badge && tab.badge > 0 ? (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-10px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 5px',
                  borderRadius: '10px',
                  minWidth: '16px',
                  textAlign: 'center',
                  boxShadow: '0 3px 10px rgba(239, 68, 68, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  animation: 'pulse 1.8s infinite'
                }}>
                  {tab.badge}
                </span>
              ) : null}
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: isActive ? '800' : '600',
              letterSpacing: isActive ? '0.3px' : '0.1px',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              textShadow: isActive ? '0 0 10px rgba(6, 182, 212, 0.5)' : 'none',
              transition: 'all 0.25s ease'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
