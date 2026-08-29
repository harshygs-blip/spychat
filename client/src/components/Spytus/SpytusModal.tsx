import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  X, 
  Image as ImageIcon, 
  Send, 
  Eye, 
  Sparkles, 
  Clock, 
  Type, 
  Check, 
  ChevronRight,
  Flame,
  MessageSquare,
  Shield,
  Users,
  Globe,
  UserX,
  UserCheck
} from 'lucide-react';
import { User, SpytusStory } from '../../types';
import { socketService } from '../../services/socket';

interface SpytusModalProps {
  currentUser: User;
  onOpenChatWithPeer?: (peerId: string, replyText?: string) => void;
}

const GRADIENTS = [
  'linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)', // Emerald Cyan
  'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',               // Electric Blue
  'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',               // Cyber Violet
  'linear-gradient(135deg, #ea580c 0%, #e11d48 100%)',               // Neon Blaze
  'linear-gradient(135deg, #0f172a 0%, #020617 100%)'                // Stealth Obsidian
];

export const SpytusModal: React.FC<SpytusModalProps> = ({
  currentUser,
  onOpenChatWithPeer
}) => {
  const [stories, setStories] = useState<SpytusStory[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [creatorType, setCreatorType] = useState<'text' | 'media'>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  // Status Privacy Settings
  const [privacyType, setPrivacyType] = useState<'all' | 'contacts' | 'whitelist' | 'blacklist'>(() => {
    return (localStorage.getItem('spytus_privacy_type') as any) || 'all';
  });
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Active Story Viewer State
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [replyText, setReplyText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<any>(null);

  // Fetch Spytus Stories
  const loadStories = () => {
    socketService.emit('get_spytus_stories', (res: any) => {
      if (res && res.stories) {
        setStories(res.stories);
      }
    });
  };

  useEffect(() => {
    loadStories();
    const interval = setInterval(loadStories, 4000);

    const handleNewSpytus = (data: { story: SpytusStory }) => {
      setStories(prev => [data.story, ...prev.filter(s => s.id !== data.story.id)]);
    };

    const handleSpytusDeleted = (data: { storyId: string }) => {
      setStories(prev => prev.filter(s => s.id !== data.storyId));
    };

    const handleSpytusViewed = (data: { storyId: string; viewerId: string }) => {
      setStories(prev => prev.map(s => {
        if (s.id === data.storyId && !s.viewers.includes(data.viewerId)) {
          return { ...s, viewers: [...s.viewers, data.viewerId] };
        }
        return s;
      }));
    };

    socketService.on('new_spytus', handleNewSpytus);
    socketService.on('spytus_deleted', handleSpytusDeleted);
    socketService.on('spytus_viewed', handleSpytusViewed);

    return () => {
      clearInterval(interval);
      socketService.off('new_spytus', handleNewSpytus);
      socketService.off('spytus_deleted', handleSpytusDeleted);
      socketService.off('spytus_viewed', handleSpytusViewed);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // Story Progress Auto-Advance
  useEffect(() => {
    if (activeStoryIndex === null) return;

    setStoryProgress(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    const activeStory = stories[activeStoryIndex];
    if (activeStory && activeStory.user_id !== currentUser.id && !activeStory.viewers.includes(currentUser.id)) {
      socketService.emit('view_spytus', { storyId: activeStory.id });
    }

    const duration = 6000; // 6 seconds per story
    const interval = 60;
    const step = (interval / duration) * 100;

    progressTimerRef.current = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [activeStoryIndex, stories.length]);

  const handlePublishSpytus = () => {
    if (creatorType === 'text' && !textContent.trim()) return;
    if (creatorType === 'media' && !mediaUrl) return;

    setLoading(true);
    socketService.emit('post_spytus', {
      mediaType: creatorType === 'text' ? 'text' : (mediaUrl.startsWith('data:video') ? 'video' : 'image'),
      mediaUrl: creatorType === 'media' ? mediaUrl : undefined,
      textContent: creatorType === 'text' ? textContent.trim() : undefined,
      backgroundGradient: creatorType === 'text' ? selectedGradient : undefined,
      caption: creatorType === 'media' ? caption.trim() : undefined,
      privacyType
    }, () => {
      setLoading(false);
      setShowCreator(false);
      setTextContent('');
      setMediaUrl('');
      setCaption('');
      loadStories();
    });
  };

  const handleDeleteActiveStory = (storyId: string) => {
    socketService.emit('delete_spytus', { storyId }, () => {
      setActiveStoryIndex(null);
      loadStories();
    });
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || activeStoryIndex === null) return;

    const activeStory = stories[activeStoryIndex];
    if (activeStory && activeStory.user_id !== currentUser.id && onOpenChatWithPeer) {
      onOpenChatWithPeer(activeStory.user_id, `Replying to Spytus: "${replyText.trim()}"`);
      setActiveStoryIndex(null);
      setReplyText('');
    }
  };

  const myStories = stories.filter(s => s.user_id === currentUser.id);
  const friendStories = stories.filter(s => s.user_id !== currentUser.id);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hidden File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            setMediaUrl(reader.result as string);
            setCreatorType('media');
            setShowCreator(true);
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
      />

      {/* HEADER BANNER WITH STATUS PRIVACY BUTTON */}
      <div className="glass" style={{
        padding: '16px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%)',
        border: '1px solid var(--border-color-glow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            boxShadow: '0 0 15px var(--accent-primary-glow)'
          }}>
            <Flame size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>SPYTUS Stories</h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              24-Hour Ephemeral • {privacyType === 'contacts' ? '👥 Contacts Only' : privacyType === 'all' ? '🌍 Everyone' : '🔒 Custom Privacy'}
            </p>
          </div>
        </div>

        {/* STATUS PRIVACY SETTINGS BUTTON */}
        <button
          onClick={() => setShowPrivacyModal(true)}
          title="Status Privacy"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-color)',
            color: 'var(--accent-primary)',
            padding: '8px 12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Shield size={16} /> Privacy
        </button>
      </div>

      {/* 1. MY SPYTUS CARD */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          My Status
        </h3>

        <div className="glass" style={{
          padding: '14px',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--border-color)'
        }}>
          <div
            onClick={() => {
              if (myStories.length > 0) {
                const idx = stories.findIndex(s => s.id === myStories[0].id);
                if (idx !== -1) setActiveStoryIndex(idx);
              } else {
                setCreatorType('text');
                setShowCreator(true);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flex: 1 }}
          >
            <div style={{
              position: 'relative',
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              padding: '2px',
              border: myStories.length > 0 ? '2.5px solid var(--accent-primary)' : '2px dashed var(--text-muted)',
              boxShadow: myStories.length > 0 ? '0 0 12px var(--accent-primary-glow)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: myStories.length > 0 && myStories[0].background_gradient ? myStories[0].background_gradient : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontWeight: '800',
                color: '#fff',
                fontSize: '18px'
              }}>
                {myStories.length > 0 && myStories[0].media_url ? (
                  <img src={myStories[0].media_url} alt="My story" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  currentUser.display_name.substring(0, 2).toUpperCase()
                )}
              </div>

              {myStories.length === 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Plus size={14} strokeWidth={3} />
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                {myStories.length > 0 ? 'My Spytus' : 'Add to My Spytus'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {myStories.length > 0 ? (
                  <>
                    <Eye size={13} color="var(--accent-primary)" />
                    <span>{myStories[0].viewers.length} views • Tap to view</span>
                  </>
                ) : (
                  <span>Share 24-hour disappearing updates</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setCreatorType('text');
                setShowCreator(true);
              }}
              title="Post Text Spytus"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-color)',
                color: '#ffffff',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Type size={18} />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Post Photo/Video Spytus"
              style={{
                background: 'var(--accent-gradient)',
                border: 'none',
                color: '#000',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ImageIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. RECENT UPDATES (FRIENDS / CONTACTS) */}
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Recent Updates ({friendStories.length})
        </h3>

        {friendStories.length === 0 ? (
          <div className="glass" style={{
            padding: '36px 20px',
            borderRadius: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)'
          }}>
            <Clock size={36} color="var(--accent-primary)" style={{ opacity: 0.7 }} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>No Recent Spytus Stories</div>
            <div style={{ fontSize: '12.5px', maxWidth: '260px' }}>
              When your auto-saved contacts post 24-hour stories, they will appear here!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {friendStories.map((story) => {
              const hasViewed = story.viewers.includes(currentUser.id);
              const author = story.user;
              const storyIdx = stories.findIndex(s => s.id === story.id);

              return (
                <div
                  key={story.id}
                  onClick={() => setActiveStoryIndex(storyIdx)}
                  className="glass"
                  style={{
                    padding: '12px 14px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      padding: '2px',
                      border: hasViewed ? '2px solid rgba(255, 255, 255, 0.2)' : '2.5px solid var(--accent-primary)',
                      boxShadow: hasViewed ? 'none' : '0 0 10px var(--accent-primary-glow)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        background: story.background_gradient || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        fontWeight: '800',
                        color: '#fff',
                        fontSize: '16px'
                      }}>
                        {story.media_url ? (
                          <img src={story.media_url} alt="Story" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          author?.display_name ? author.display_name.substring(0, 2).toUpperCase() : 'SP'
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#ffffff' }}>
                        {author?.display_name || 'Contact'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 24h Story
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STATUS PRIVACY MODAL */}
      {showPrivacyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 600
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '350px',
            borderRadius: '24px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
            border: '1px solid var(--border-color-glow)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '16px', color: '#ffffff' }}>
                <Shield size={20} color="var(--accent-primary)" />
                <span>Spytus Status Privacy</span>
              </div>
              <button onClick={() => setShowPrivacyModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Choose who can view your 24-hour Spytus stories. Changes apply to future posts:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Option 1: Contacts Only */}
              <div
                onClick={() => {
                  setPrivacyType('contacts');
                  localStorage.setItem('spytus_privacy_type', 'contacts');
                }}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  background: privacyType === 'contacts' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: privacyType === 'contacts' ? '1.5px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={18} color="var(--accent-emerald)" />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>My Contacts Only</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto-saved chat contacts</div>
                  </div>
                </div>
                {privacyType === 'contacts' && <Check size={18} color="var(--accent-emerald)" strokeWidth={3} />}
              </div>

              {/* Option 2: Everyone */}
              <div
                onClick={() => {
                  setPrivacyType('all');
                  localStorage.setItem('spytus_privacy_type', 'all');
                }}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  background: privacyType === 'all' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: privacyType === 'all' ? '1.5px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Globe size={18} color="var(--accent-cyan)" />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>Everyone</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Anyone on SPYCHAT server</div>
                  </div>
                </div>
                {privacyType === 'all' && <Check size={18} color="var(--accent-cyan)" strokeWidth={3} />}
              </div>

              {/* Option 3: Whitelist */}
              <div
                onClick={() => {
                  setPrivacyType('whitelist');
                  localStorage.setItem('spytus_privacy_type', 'whitelist');
                }}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  background: privacyType === 'whitelist' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: privacyType === 'whitelist' ? '1.5px solid #eab308' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserCheck size={18} color="#eab308" />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>Only Share With...</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Close friends only</div>
                  </div>
                </div>
                {privacyType === 'whitelist' && <Check size={18} color="#eab308" strokeWidth={3} />}
              </div>
            </div>

            <button
              onClick={() => {
                setShowPrivacyModal(false);
                alert('✓ Status Privacy settings updated!');
              }}
              className="btn-primary"
              style={{ height: '44px', fontSize: '13.5px', marginTop: '6px' }}
            >
              Done / Save Privacy
            </button>
          </div>
        </div>
      )}

      {/* STORY CREATOR MODAL */}
      {showCreator && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 16px'
        }}>
          {/* Creator Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => {
                setShowCreator(false);
                setTextContent('');
                setMediaUrl('');
              }}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCreatorType('text')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '12px',
                  background: creatorType === 'text' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                  color: creatorType === 'text' ? '#000' : '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Text
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '6px 14px',
                  borderRadius: '12px',
                  background: creatorType === 'media' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                  color: creatorType === 'media' ? '#000' : '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Media
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div style={{
            flex: 1,
            margin: '20px 0',
            borderRadius: '24px',
            background: creatorType === 'text' ? selectedGradient : '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {creatorType === 'text' ? (
              <textarea
                placeholder="Type your Spytus update..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                maxLength={300}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: '800',
                  textAlign: 'center',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                }}
                rows={4}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {mediaUrl.startsWith('data:video') ? (
                  <video src={mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '16px' }} />
                ) : (
                  <img src={mediaUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '16px' }} />
                )}
              </div>
            )}
          </div>

          {/* Bottom Bar: Gradients / Captions & Publish */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {creatorType === 'text' ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                {GRADIENTS.map((g, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedGradient(g)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: g,
                      cursor: 'pointer',
                      border: selectedGradient === g ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                      transform: selectedGradient === g ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="spychat-input"
                style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.1)' }}
              />
            )}

            <button
              onClick={handlePublishSpytus}
              disabled={loading || (creatorType === 'text' && !textContent.trim()) || (creatorType === 'media' && !mediaUrl)}
              className="btn-primary"
              style={{ height: '48px', fontSize: '15px', borderRadius: '16px' }}
            >
              {loading ? 'Posting...' : 'Share to Spytus 🔥'}
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN STORY PLAYER */}
      {activeStoryIndex !== null && stories[activeStoryIndex] && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          zIndex: 550,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px'
        }}>
          {/* Progress Bar Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '4px', height: '3px', width: '100%' }}>
              {stories.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: '100%',
                    borderRadius: '2px',
                    background: 'rgba(255, 255, 255, 0.25)',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    height: '100%',
                    background: '#ffffff',
                    width: idx < activeStoryIndex ? '100%' : idx === activeStoryIndex ? `${storyProgress}%` : '0%',
                    transition: idx === activeStoryIndex ? 'width 0.06s linear' : 'none'
                  }} />
                </div>
              ))}
            </div>

            {/* Author Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  color: '#000'
                }}>
                  {stories[activeStoryIndex].user?.display_name?.substring(0, 2).toUpperCase() || 'SP'}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                    {stories[activeStoryIndex].user?.display_name || 'Contact'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                    {new Date(stories[activeStoryIndex].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {stories[activeStoryIndex].user_id === currentUser.id && (
                  <button
                    onClick={() => handleDeleteActiveStory(stories[activeStoryIndex].id)}
                    title="Delete Story"
                    style={{ background: 'rgba(239, 68, 68, 0.3)', border: 'none', color: '#f87171', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <button
                  onClick={() => setActiveStoryIndex(null)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Story Content Area */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              if (clickX < rect.width / 2) {
                if (activeStoryIndex > 0) setActiveStoryIndex(activeStoryIndex - 1);
              } else {
                if (activeStoryIndex < stories.length - 1) setActiveStoryIndex(activeStoryIndex + 1);
                else setActiveStoryIndex(null);
              }
            }}
            style={{
              flex: 1,
              margin: '16px 0',
              borderRadius: '20px',
              background: stories[activeStoryIndex].background_gradient || '#0a0a0a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              position: 'relative',
              cursor: 'pointer'
            }}
          >
            {stories[activeStoryIndex].media_type === 'text' ? (
              <div style={{
                fontSize: '26px',
                fontWeight: '800',
                color: '#ffffff',
                textAlign: 'center',
                lineHeight: '1.4',
                textShadow: '0 2px 15px rgba(0,0,0,0.6)'
              }}>
                {stories[activeStoryIndex].text_content}
              </div>
            ) : stories[activeStoryIndex].media_type === 'video' ? (
              <video
                src={stories[activeStoryIndex].media_url}
                autoPlay
                playsInline
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '16px' }}
              />
            ) : (
              <img
                src={stories[activeStoryIndex].media_url}
                alt="Story"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '16px' }}
              />
            )}

            {stories[activeStoryIndex].caption && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                right: '16px',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                padding: '10px 14px',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {stories[activeStoryIndex].caption}
              </div>
            )}
          </div>

          {/* Reply or Views Bottom Bar */}
          {stories[activeStoryIndex].user_id === currentUser.id ? (
            <div className="glass" style={{
              padding: '12px 16px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--accent-primary)',
              fontWeight: '800',
              fontSize: '14px'
            }}>
              <Eye size={18} />
              <span>{stories[activeStoryIndex].viewers.length} Viewers</span>
            </div>
          ) : (
            <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Reply to Spytus..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="spychat-input"
                style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.1)' }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ width: '44px', height: '44px', borderRadius: '50%', padding: 0 }}
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
