import React, { useState, useRef, useEffect } from 'react';
import { Conversation } from '../../types';
import { Search, Plus, Lock, Pin, Trash2, Timer, Archive, ArchiveRestore, Check, MoreVertical, Star, Shield } from 'lucide-react';
import { socketService } from '../../services/socket';

interface ChatListProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onOpenSearch: () => void;
  onDeleteConversation?: (convId: string) => void;
  onOpenSavedVault?: () => void;
}

const LABEL_FILTERS = ['All', 'VIP', 'Clients', 'Pending', 'Personal'];

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  onSelectConversation,
  onOpenSearch,
  onDeleteConversation,
  onOpenSavedVault
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close 3-dots menu on outside tap anywhere on screen (touch & click)
  useEffect(() => {
    if (!showMenu) return;

    const handleOutsideTap = (event: MouseEvent | TouchEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideTap, true);
    document.addEventListener('touchstart', handleOutsideTap, true);
    document.addEventListener('mousedown', handleOutsideTap, true);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideTap, true);
      document.removeEventListener('touchstart', handleOutsideTap, true);
      document.removeEventListener('mousedown', handleOutsideTap, true);
    };
  }, [showMenu]);

  // Telegram Style Delete Chat Modal (Outside chat)
  const [chatToDelete, setChatToDelete] = useState<Conversation | null>(null);
  const [deleteChatForBoth, setDeleteChatForBoth] = useState(true);

  // Swipe state tracking
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchCurrentXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPinnedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleArchive = (id: string) => {
    setArchivedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleOpenDeleteChat = (conv: Conversation) => {
    setChatToDelete(conv);
    setDeleteChatForBoth(true);
  };

  const handleConfirmDeleteChat = () => {
    if (!chatToDelete) return;

    socketService.emit('delete_conversation', {
      conversationId: chatToDelete.id,
      deleteForBoth: deleteChatForBoth,
      recipientId: chatToDelete.peer?.id
    });

    if (onDeleteConversation) {
      onDeleteConversation(chatToDelete.id);
    }

    setChatToDelete(null);
  };

  // Touch Swipe Handlers (Left = Delete/Pin, Right = Archive)
  const handleTouchStart = (id: string, clientX: number, e?: React.TouchEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    touchStartXRef.current = clientX;
    touchCurrentXRef.current = clientX;
    isDraggingRef.current = true;
    setSwipingId(id);
  };

  const handleTouchMove = (clientX: number, e?: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    if (e) e.stopPropagation();
    touchCurrentXRef.current = clientX;
    const diff = clientX - touchStartXRef.current;
    // Cap swipe between -140px and +140px
    const clamped = Math.max(-140, Math.min(140, diff));
    setSwipeOffset(clamped);
  };

  const handleTouchEnd = (conv: Conversation, e?: React.TouchEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Full swipe right -> Auto-Archive (> 90px)
    if (swipeOffset > 90) {
      toggleArchive(conv.id);
    }
    // Full swipe left -> Open Delete Modal (< -90px)
    else if (swipeOffset < -90) {
      handleOpenDeleteChat(conv);
    }

    setSwipeOffset(0);
    setSwipingId(null);
  };

  // Filter and sort conversations
  const filteredConversations = conversations
    .filter((conv) => {
      const isArchived = archivedIds.includes(conv.id);
      if (showArchivedOnly && !isArchived) return false;
      if (!showArchivedOnly && isArchived) return false;

      const peer = conv.peer;
      const matchesSearch = !searchQuery || 
        (peer && (
          peer.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          peer.username.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      return matchesSearch;
    })
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      position: 'relative'
    }}>
      {/* Search Bar & 3-Dots Actions Menu */}
      <div style={{ padding: '12px 16px 6px 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder={showArchivedOnly ? "Search archived chats..." : "Search encrypted chats..."}
              className="spychat-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '38px',
                borderRadius: '14px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* 3-DOTS TOP ACTIONS MENU */}
          <div ref={menuContainerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="Chat Options"
              style={{
                background: showMenu ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <MoreVertical size={19} />
            </button>

            {showMenu && (
              <>
                {/* Random screen tap backdrop to close */}
                <div
                  onClick={() => setShowMenu(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99,
                    background: 'transparent'
                  }}
                />

                <div className="glass ios-menu-animate" style={{
                  position: 'absolute',
                  top: '48px',
                  right: '0',
                  width: '215px',
                  borderRadius: '18px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.92), 0 0 25px rgba(6, 182, 212, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  background: 'rgba(10, 16, 32, 0.98)',
                  backdropFilter: 'blur(30px)',
                  zIndex: 100
                }}>
                {/* Toggle Archived Chats */}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowArchivedOnly(!showArchivedOnly);
                  }}
                  style={{
                    padding: '9px 12px',
                    background: 'none',
                    border: 'none',
                    color: showArchivedOnly ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Archive size={16} />
                    <span>{showArchivedOnly ? 'View All Chats' : 'Archived Chats'}</span>
                  </div>
                  {archivedIds.length > 0 && (
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>
                      {archivedIds.length}
                    </span>
                  )}
                </button>

                {/* Saved Messages Vault */}
                {onOpenSavedVault && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenSavedVault();
                    }}
                    style={{
                      padding: '9px 12px',
                      background: 'none',
                      border: 'none',
                      color: '#eab308',
                      fontSize: '13px',
                      fontWeight: '600',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <Star size={16} /> Saved Vault
                  </button>
                )}

                {/* Mark all as read */}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    alert('✓ All chats marked as read');
                  }}
                  style={{
                    padding: '9px 12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: '500',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <Check size={16} /> Mark all read
                </button>
              </div>
              </>
            )}
          </div>
        </div>

        {/* Filter Chips & Archived Banner */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '10px', paddingBottom: '4px' }}>
          {showArchivedOnly && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid var(--accent-emerald)',
              color: 'var(--accent-emerald)',
              fontSize: '11px',
              fontWeight: '800'
            }}>
              <Archive size={13} /> Archived Folder ({filteredConversations.length})
            </div>
          )}

          {!showArchivedOnly && LABEL_FILTERS.map(lbl => (
            <button
              key={lbl}
              onClick={() => setActiveFilter(lbl)}
              style={{
                padding: '4px 12px',
                borderRadius: '12px',
                background: activeFilter === lbl ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.05)',
                color: activeFilter === lbl ? '#000' : 'var(--text-secondary)',
                border: activeFilter === lbl ? 'none' : '1px solid var(--border-color)',
                fontSize: '11px',
                fontWeight: activeFilter === lbl ? '800' : '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Swipe Hint Helper Banner */}
      <div style={{ padding: '0 16px 6px 16px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>👉 Slide Right: Archive</span>
        <span>Slide Left: Delete / Pin 👈</span>
      </div>

      {/* Conversation List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {filteredConversations.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '24px'
          }}>
            <Lock size={40} color="var(--accent-primary)" style={{ marginBottom: '12px', opacity: 0.7 }} />
            <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {showArchivedOnly ? 'No Archived Conversations' : 'No Encrypted Chats Yet'}
            </div>
            <div style={{ fontSize: '13px' }}>
              {showArchivedOnly ? 'Swipe right on any chat to archive it.' : 'Start a conversation by searching username/tag.'}
            </div>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const peer = conv.peer;
            const lastMsg = conv.last_message;
            const isPinned = pinnedIds.includes(conv.id);
            const isArchived = archivedIds.includes(conv.id);
            const isCurrentSwiping = swipingId === conv.id;
            const currentOffset = isCurrentSwiping ? swipeOffset : 0;

            return (
              <div
                key={conv.id}
                style={{
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}
              >
                {/* BACKGROUND SWIPE ACTION BUTTONS */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  borderRadius: '16px',
                  background: currentOffset > 0 
                    ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                    : currentOffset < 0 
                    ? 'linear-gradient(90deg, #38bdf8 0%, #ef4444 100%)' 
                    : 'transparent'
                }}>
                  {/* Left Side (Slide Right to Archive) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: '800', fontSize: '13px' }}>
                    <Archive size={20} />
                    <span>{isArchived ? 'Unarchive' : 'Archive'}</span>
                  </div>

                  {/* Right Side (Slide Left to Pin / Delete) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#ffffff', fontWeight: '800', fontSize: '13px' }}>
                    <button
                      onClick={(e) => togglePin(e, conv.id)}
                      style={{ background: 'none', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                      <Pin size={18} />
                      <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenDeleteChat(conv)}
                      style={{ background: 'none', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* FOREGROUND SWIPEABLE CARD */}
                <div
                  onClick={() => onSelectConversation(conv)}
                  onTouchStart={(e) => handleTouchStart(conv.id, e.touches[0].clientX, e)}
                  onTouchMove={(e) => handleTouchMove(e.touches[0].clientX, e)}
                  onTouchEnd={(e) => handleTouchEnd(conv, e)}
                  onMouseDown={(e) => handleTouchStart(conv.id, e.clientX, e)}
                  onMouseMove={(e) => handleTouchMove(e.clientX, e)}
                  onMouseUp={(e) => handleTouchEnd(conv, e)}
                  className="glass"
                  style={{
                    padding: '12px 14px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transform: `translateX(${currentOffset}px) scale(${isCurrentSwiping && Math.abs(currentOffset) > 10 ? 0.985 : 1})`,
                    transition: isDraggingRef.current && isCurrentSwiping ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                    position: 'relative',
                    border: isPinned ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(255, 255, 255, 0.07)',
                    background: isPinned ? 'rgba(16, 185, 129, 0.06)' : 'rgba(14, 23, 42, 0.75)',
                    backdropFilter: 'blur(16px)',
                    zIndex: 2,
                    userSelect: 'none',
                    touchAction: 'pan-y'
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      border: '1.5px solid var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '16px',
                      color: 'var(--accent-primary)',
                      overflow: 'hidden'
                    }}>
                      {peer?.avatar_url ? (
                        <img
                          src={peer.avatar_url}
                          alt={peer.display_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        peer ? peer.display_name.substring(0, 2).toUpperCase() : '??'
                      )}
                    </div>
                    {/* Online indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: 'var(--accent-emerald)',
                      border: '2px solid var(--bg-primary)'
                    }} />
                  </div>

                  {/* Chat Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {peer ? peer.display_name : 'Unknown User'}
                        </span>
                        {isPinned && <Pin size={12} color="var(--accent-primary)" />}
                        {conv.disappearing_timer_seconds && conv.disappearing_timer_seconds > 0 && (
                          <Timer size={12} color="#f87171" />
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {lastMsg ? (
                          <>
                            <Lock size={11} color="var(--accent-primary)" />
                            <span>
                              {lastMsg.deleted_for_everyone
                                ? '🚫 Message deleted'
                                : lastMsg.view_once
                                ? '👁️ 1x Photo'
                                : lastMsg.message_type === 'round_video'
                                ? '⭕ Video Note'
                                : lastMsg.message_type === 'image'
                                ? '📷 Photo'
                                : lastMsg.message_type === 'video'
                                ? '🎥 Video'
                                : lastMsg.message_type === 'voice'
                                ? '🎙️ Voice Note'
                                : lastMsg.message_type === 'file'
                                ? '📁 Document'
                                : lastMsg.message_type === 'product'
                                ? '🛍️ Product Item'
                                : (lastMsg.decrypted_text || lastMsg.ciphertext || 'Encrypted Message')}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>@{peer?.username}</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Pin Toggle button */}
                        <button
                          onClick={(e) => togglePin(e, conv.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isPinned ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <Pin size={13} />
                        </button>

                        {/* Archive button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleArchive(conv.id);
                          }}
                          title="Archive Chat"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.3)',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <Archive size={13} />
                        </button>

                        {/* Delete Chat Button (Telegram style) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteChat(conv);
                          }}
                          title="Delete Chat (Telegram style)"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(239, 68, 68, 0.5)',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>

                        {/* Unread Badge */}
                        {conv.unread_count && conv.unread_count > 0 ? (
                          <div style={{
                            background: 'var(--accent-primary)',
                            color: '#000000',
                            borderRadius: '10px',
                            padding: '2px 7px',
                            fontSize: '11px',
                            fontWeight: '800',
                            minWidth: '18px',
                            textAlign: 'center'
                          }}>
                            {conv.unread_count}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (New Chat) */}
      <button
        onClick={onOpenSearch}
        className="btn-primary"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          boxShadow: '0 8px 25px var(--accent-primary-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
      >
        <Plus size={26} color="#000000" />
      </button>

      {/* TELEGRAM-STYLE DELETE CHAT MODAL (OUTSIDE CHAT) */}
      {chatToDelete && (
        <div 
          onClick={() => setChatToDelete(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 200
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass ios-sheet-animate" 
            style={{
              width: '100%',
              maxWidth: '340px',
              borderRadius: '24px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              background: 'rgba(10, 16, 32, 0.98)'
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>Delete chat?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Are you sure you want to delete the chat with {chatToDelete.peer?.display_name || 'this user'}?
            </p>

            {chatToDelete.peer && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={deleteChatForBoth}
                  onChange={(e) => setDeleteChatForBoth(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600' }}>
                  Also delete for {chatToDelete.peer.display_name}
                </span>
              </label>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setChatToDelete(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteChat}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
