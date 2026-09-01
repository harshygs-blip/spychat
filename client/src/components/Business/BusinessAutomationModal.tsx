import React, { useState, useRef } from 'react';
import { 
  Bot, 
  MessageSquare, 
  Moon, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  Zap, 
  Image, 
  Video, 
  Mic, 
  Paperclip, 
  X,
  Play
} from 'lucide-react';
import { User, AutoReplyRule } from '../../types';
import { AuthService } from '../../services/auth';
import { ProductCatalogModal } from './ProductCatalogModal';

interface BusinessAutomationProps {
  currentUser: User;
  onUpdate: (updated: User) => void;
}

export const BusinessAutomationModal: React.FC<BusinessAutomationProps> = ({
  currentUser,
  onUpdate
}) => {
  const [subTab, setSubTab] = useState<'bot' | 'catalog'>('bot');

  const auto = currentUser.business_automation || {
    greeting_enabled: false,
    greeting_message: '👋 Welcome to my secure channel! How can I assist you today?',
    greeting_type: 'text',
    away_enabled: false,
    away_message: '🌙 I am currently offline. Your encrypted message has been received and I will get back to you shortly.',
    away_type: 'text',
    auto_replies_enabled: false,
    auto_reply_rules: [
      { trigger: 'price', response: '💰 Our packages start from $49/mo.', message_type: 'text' },
      { trigger: 'info', response: '🛡️ SPYCHAT provides zero-leakage encrypted communications.', message_type: 'text' }
    ],
    quick_replies: [
      { trigger: '/pricing', response: 'Here is our updated pricing catalog for 2026.', message_type: 'text' },
      { trigger: '/thanks', response: 'Thank you for connecting with us! Have a great day.', message_type: 'text' }
    ]
  };

  const [greetingEnabled, setGreetingEnabled] = useState(auto.greeting_enabled);
  const [greetingMsg, setGreetingMsg] = useState(auto.greeting_message);
  const [greetingType, setGreetingType] = useState<'text' | 'image' | 'video' | 'voice'>(auto.greeting_type || 'text');
  const [greetingMediaUrl, setGreetingMediaUrl] = useState(auto.greeting_media_url || '');

  const [awayEnabled, setAwayEnabled] = useState(auto.away_enabled);
  const [awayMsg, setAwayMsg] = useState(auto.away_message);
  const [awayType, setAwayType] = useState<'text' | 'image' | 'video' | 'voice'>(auto.away_type || 'text');
  const [awayMediaUrl, setAwayMediaUrl] = useState(auto.away_media_url || '');

  const [autoRepliesEnabled, setAutoRepliesEnabled] = useState(auto.auto_replies_enabled);
  const [rules, setRules] = useState<AutoReplyRule[]>(auto.auto_reply_rules || []);
  const [quickReplies, setQuickReplies] = useState<AutoReplyRule[]>(auto.quick_replies || []);

  // Form states for new Auto-reply rule
  const [newTrigger, setNewTrigger] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [newType, setNewType] = useState<'text' | 'image' | 'video' | 'voice'>('text');
  const [newMediaUrl, setNewMediaUrl] = useState('');

  // Form states for new Quick Reply template
  const [quickShortcut, setQuickShortcut] = useState('');
  const [quickText, setQuickText] = useState('');
  const [quickType, setQuickType] = useState<'text' | 'image' | 'video' | 'voice'>('text');
  const [quickMediaUrl, setQuickMediaUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'greeting' | 'away' | 'rule' | 'quick' | null>(null);

  const handleTriggerUpload = (target: 'greeting' | 'away' | 'rule' | 'quick') => {
    setUploadTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      let detectedType: 'image' | 'video' | 'voice' = 'image';
      if (file.type.startsWith('video/')) detectedType = 'video';
      else if (file.type.startsWith('audio/')) detectedType = 'voice';

      if (uploadTarget === 'greeting') {
        setGreetingMediaUrl(base64);
        setGreetingType(detectedType);
      } else if (uploadTarget === 'away') {
        setAwayMediaUrl(base64);
        setAwayType(detectedType);
      } else if (uploadTarget === 'rule') {
        setNewMediaUrl(base64);
        setNewType(detectedType);
      } else if (uploadTarget === 'quick') {
        setQuickMediaUrl(base64);
        setQuickType(detectedType);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddRule = () => {
    if (!newTrigger.trim()) return;
    setRules([...rules, {
      trigger: newTrigger.trim(),
      response: newResponse.trim(),
      message_type: newType,
      media_url: newMediaUrl || undefined
    }]);
    setNewTrigger('');
    setNewResponse('');
    setNewType('text');
    setNewMediaUrl('');
  };

  const handleAddQuickReply = () => {
    if (!quickShortcut.trim()) return;
    const formatted = quickShortcut.startsWith('/') ? quickShortcut : `/${quickShortcut}`;
    setQuickReplies([...quickReplies, {
      trigger: formatted,
      response: quickText.trim(),
      message_type: quickType,
      media_url: quickMediaUrl || undefined
    }]);
    setQuickShortcut('');
    setQuickText('');
    setQuickType('text');
    setQuickMediaUrl('');
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const updated = await AuthService.updateProfile({
        business_automation: {
          greeting_enabled: greetingEnabled,
          greeting_message: greetingMsg,
          greeting_type: greetingType,
          greeting_media_url: greetingMediaUrl,
          away_enabled: awayEnabled,
          away_message: awayMsg,
          away_type: awayType,
          away_media_url: awayMediaUrl,
          auto_replies_enabled: autoRepliesEnabled,
          auto_reply_rules: rules,
          quick_replies: quickReplies
        }
      });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error saving business settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAnyActive = greetingEnabled || awayEnabled || autoRepliesEnabled;

  return (
    <div style={{
      flex: 1,
      height: '100%',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: '16px 14px 130px 14px',
      touchAction: 'pan-y'
    }}>
      {/* Hidden File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*,audio/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Master Status Card */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '16px',
          background: isAnyActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
          border: isAnyActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isAnyActive ? '#10b981' : '#64748b',
            boxShadow: isAnyActive ? '0 0 10px #10b981' : 'none'
          }} />
          <div style={{ fontSize: '12.5px', color: isAnyActive ? '#34d399' : 'var(--text-secondary)', fontWeight: '600' }}>
            {isAnyActive 
              ? 'Business Automation is ACTIVE (auto-responses enabled)' 
              : 'Business Automation is OFF by default. Turn ON any switch below to activate.'}
          </div>
        </div>

        {/* Sub-Tab Navigation Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          gap: '4px'
        }}>
          <button
            onClick={() => setSubTab('bot')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              border: 'none',
              background: subTab === 'bot' ? 'var(--accent-cyan)' : 'none',
              color: subTab === 'bot' ? '#000' : 'var(--text-primary)',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Bot size={16} /> 🤖 Auto-Reply & Bot
          </button>
          <button
            onClick={() => setSubTab('catalog')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              border: 'none',
              background: subTab === 'catalog' ? 'var(--accent-cyan)' : 'none',
              color: subTab === 'catalog' ? '#000' : 'var(--text-primary)',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={16} /> 🛍️ Product Catalog
          </button>
        </div>

        {subTab === 'catalog' ? (
          <ProductCatalogModal
            currentUser={currentUser}
            onUpdate={onUpdate}
          />
        ) : (
          <>
            {/* Banner */}
            <div className="glass" style={{
              padding: '16px',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
              }}>
                <Bot size={26} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                  WhatsApp Business Pro Suite
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Auto-Reply Bot, Quick Replies, Greeting & Away (Text, Photo, Video, Voice)
                </p>
              </div>
            </div>

            {/* 1. QUICK REPLIES (Instant Templates with /shortcut) */}
            <div className="glass" style={{ padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} color="var(--accent-cyan)" />
            <span style={{ fontWeight: '700', fontSize: '15px' }}>⚡ Quick Replies Templates</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Create shortcuts starting with <code>/</code> to 1-tap send text, photos, videos or voice messages in any chat!
          </p>

          {/* Quick replies list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quickReplies.map((qr, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: '800', fontFamily: 'monospace' }}>
                      {qr.trigger}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: 'var(--accent-cyan)'
                    }}>
                      {qr.message_type || 'text'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {qr.response || '[Media Template]'}
                  </div>
                </div>
                <button
                  onClick={() => setQuickReplies(quickReplies.filter((_, i) => i !== idx))}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '6px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Quick Reply */}
          <div style={{
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px dashed rgba(6, 182, 212, 0.3)',
            padding: '12px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
              + Add New Quick Reply Template
            </span>
            <input
              type="text"
              placeholder="Shortcut (e.g. /price, /catalog, /welcome)"
              className="spychat-input"
              value={quickShortcut}
              onChange={(e) => setQuickShortcut(e.target.value)}
              style={{ fontSize: '13px', padding: '8px 12px' }}
            />
            <input
              type="text"
              placeholder="Template message or caption..."
              className="spychat-input"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              style={{ fontSize: '13px', padding: '8px 12px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => handleTriggerUpload('quick')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: quickMediaUrl ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <Paperclip size={13} />
                <span>{quickMediaUrl ? '✓ Media Attached' : '+ Attach Photo/Video/Audio'}</span>
              </button>

              <button
                onClick={handleAddQuickReply}
                disabled={!quickShortcut.trim()}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <Plus size={14} /> Add Template
              </button>
            </div>
          </div>
        </div>

        {/* 2. GREETING MESSAGE */}
        <div className="glass" style={{ padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--accent-cyan)" />
              <span style={{ fontWeight: '700', fontSize: '15px' }}>Automatic Greeting Message</span>
            </div>
            <input
              type="checkbox"
              checked={greetingEnabled}
              onChange={(e) => setGreetingEnabled(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Automatically sent when a user messages you for the first time.
          </p>
          {greetingEnabled && (
            <>
              <textarea
                rows={3}
                className="spychat-input"
                value={greetingMsg}
                onChange={(e) => setGreetingMsg(e.target.value)}
                placeholder="Type your greeting message..."
                style={{ resize: 'none', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={() => handleTriggerUpload('greeting')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: greetingMediaUrl ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  alignSelf: 'flex-start'
                }}
              >
                <Paperclip size={14} />
                <span>{greetingMediaUrl ? `✓ Attached (${greetingType})` : '+ Attach Greeting Photo/Voice'}</span>
              </button>
            </>
          )}
        </div>

        {/* 3. AWAY / OFFLINE MESSAGE */}
        <div className="glass" style={{ padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Moon size={18} color="var(--accent-purple)" />
              <span style={{ fontWeight: '700', fontSize: '15px' }}>Automatic Away Message</span>
            </div>
            <input
              type="checkbox"
              checked={awayEnabled}
              onChange={(e) => setAwayEnabled(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
            />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Automatically replies when you are away or offline.
          </p>
          {awayEnabled && (
            <>
              <textarea
                rows={3}
                className="spychat-input"
                value={awayMsg}
                onChange={(e) => setAwayMsg(e.target.value)}
                placeholder="Type your away message..."
                style={{ resize: 'none', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={() => handleTriggerUpload('away')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: awayMediaUrl ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  alignSelf: 'flex-start'
                }}
              >
                <Paperclip size={14} />
                <span>{awayMediaUrl ? `✓ Attached (${awayType})` : '+ Attach Away Photo/Voice'}</span>
              </button>
            </>
          )}
        </div>

        {/* 4. KEYWORD AUTO-REPLIES BOT */}
        <div className="glass" style={{ padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="var(--accent-emerald)" />
              <span style={{ fontWeight: '700', fontSize: '15px' }}>Keyword Auto-Reply Rules</span>
            </div>
            <input
              type="checkbox"
              checked={autoRepliesEnabled}
              onChange={(e) => setAutoRepliesEnabled(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
            />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Bot automatically matches incoming keywords and delivers text, photos, video, or voice replies.
          </p>

          {autoRepliesEnabled && (
            <>
              {/* Existing Rules */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rules.map((rule, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                          Keyword: "{rule.trigger}"
                        </span>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981'
                        }}>
                          {rule.message_type || 'text'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {rule.response || '[Media Response]'}
                      </div>
                    </div>
                    <button
                      onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '6px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Rule */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px dashed rgba(16, 185, 129, 0.3)',
                padding: '12px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-emerald)' }}>
                  + Add Auto-Reply Rule
                </span>
                <input
                  type="text"
                  placeholder="Keyword to match (e.g. price, catalog, help, demo)"
                  className="spychat-input"
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  style={{ fontSize: '13px', padding: '8px 12px' }}
                />
                <input
                  type="text"
                  placeholder="Bot response text / caption..."
                  className="spychat-input"
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  style={{ fontSize: '13px', padding: '8px 12px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => handleTriggerUpload('rule')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-color)',
                      color: newMediaUrl ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Paperclip size={13} />
                    <span>{newMediaUrl ? '✓ Media Attached' : '+ Attach Media File'}</span>
                  </button>

                  <button
                    onClick={handleAddRule}
                    disabled={!newTrigger.trim()}
                    className="btn-success"
                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '10px' }}
                  >
                    <Plus size={14} /> Add Rule
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary"
          style={{ height: '46px', marginTop: '4px' }}
        >
          {loading ? 'Saving Changes...' : saved ? '✓ All Business Automations Active' : 'Save Business Settings'}
        </button>
      </>
    )}
      </div>
    </div>
  );
};
