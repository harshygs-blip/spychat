import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';
import { AuthService } from '../../services/auth';
import { User } from '../../types';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await AuthService.login(email, password);
        onSuccess(res.user);
      } else {
        const res = await AuthService.signup(email, password, displayName, username);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 8, 18, 0.96)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 100
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '30px 24px',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)',
        border: '1px solid rgba(6, 182, 212, 0.2)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '20px',
            overflow: 'hidden',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)',
            marginBottom: '12px'
          }}>
            <img src="/logo.png" alt="SPYCHAT Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            SPYCHAT
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {isLogin ? 'Enter your private space' : 'Create an anonymous, encrypted profile'}
          </p>
        </div>

        {/* Privacy Highlight Badge */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Sparkles size={18} color="var(--accent-cyan)" />
          <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
            No Phone Number • No OTP • E2EE Protected
          </span>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '10px',
            color: '#f87171',
            fontSize: '13px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isLogin && (
            <>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Agent 007"
                  className="spychat-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Public Tag (Username)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--accent-cyan)',
                    fontWeight: '700'
                  }}>@</span>
                  <input
                    type="text"
                    placeholder="shadow_fox"
                    className="spychat-input"
                    style={{ paddingLeft: '30px' }}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {isLogin ? 'Email or @Username' : 'Private Email (Never shared publicly)'}
            </label>
            <input
              type={isLogin ? 'text' : 'email'}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={isLogin ? 'user@example.com or @username' : 'user@example.com'}
              className="spychat-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="spychat-input"
                style={{ paddingRight: '42px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: '10px', height: '46px' }}
          >
            {loading ? 'Securing...' : (isLogin ? 'Sign In' : 'Create Encrypted Account')}
          </button>
        </form>

        {/* Toggle Login / Signup */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-cyan)',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {isLogin ? "Don't have an account? Create one" : 'Already registered? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};
