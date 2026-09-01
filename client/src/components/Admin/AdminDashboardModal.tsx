import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  ShieldAlert, 
  Globe, 
  Smartphone, 
  Radio, 
  Activity, 
  Search, 
  X, 
  Trash2, 
  UserX, 
  UserCheck, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Cpu, 
  Server, 
  HardDrive, 
  Send,
  AlertTriangle,
  Key,
  CheckCircle2
} from 'lucide-react';
import { AuthService } from '../../services/auth';
import { socketService } from '../../services/socket';

interface AdminDashboardModalProps {
  onClose: () => void;
}

interface AdminStats {
  total_users: number;
  banned_users: number;
  banned_ips_count: number;
  blacklisted_phones_count: number;
  total_conversations: number;
  total_messages: number;
  total_calls: number;
  total_active_sessions: number;
  total_spytus_stories: number;
  uptime_formatted: string;
  memory_used_mb: string;
  system_free_mem_mb: string;
  system_total_mem_mb: string;
  cpu_count: number;
  os_platform: string;
}

interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  phone_number: string;
  last_ip: string;
  registration_ip: string;
  device_info: string;
  is_banned: boolean;
  ban_reason?: string;
  banned_at?: string;
  avatar_id: string;
  created_at: string;
  last_seen: string;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ onClose }) => {
  const [adminKey, setAdminKey] = useState<string>(() => sessionStorage.getItem('spychat_admin_key') || '');
  const [keyInput, setKeyInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!sessionStorage.getItem('spychat_admin_key'));
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'users' | 'ips' | 'phones' | 'broadcast' | 'telemetry'>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bannedIps, setBannedIps] = useState<string[]>([]);
  const [blacklistedPhones, setBlacklistedPhones] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [loading, setLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // New IP input
  const [newIpInput, setNewIpInput] = useState('');
  // New Phone input
  const [newPhoneInput, setNewPhoneInput] = useState('');
  // Broadcast inputs
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Ban Reason Modal
  const [banTargetUser, setBanTargetUser] = useState<AdminUser | null>(null);
  const [customBanReason, setCustomBanReason] = useState('Violation of Terms of Service & Privacy Policy');

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey
  });

  const apiBase = AuthService.getApiBase();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!keyInput.trim()) {
      setAuthError('Please enter the Admin Master Key.');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/admin/stats`, {
        headers: { 'x-admin-key': keyInput.trim() }
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('spychat_admin_key', keyInput.trim());
        setAdminKey(keyInput.trim());
        setIsAuthenticated(true);
        setStats(data.stats);
      } else {
        setAuthError('Invalid Admin Key. Access Denied.');
      }
    } catch {
      setAuthError('Connection error to Admin API.');
    }
  };

  const fetchAllData = async () => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, ipsRes, phonesRes] = await Promise.all([
        fetch(`${apiBase}/admin/stats`, { headers: getHeaders() }),
        fetch(`${apiBase}/admin/users`, { headers: getHeaders() }),
        fetch(`${apiBase}/admin/banned-ips`, { headers: getHeaders() }),
        fetch(`${apiBase}/admin/blacklisted-phones`, { headers: getHeaders() })
      ]);

      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s.stats);
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u.users || []);
      }
      if (ipsRes.ok) {
        const i = await ipsRes.json();
        setBannedIps(i.banned_ips || []);
      }
      if (phonesRes.ok) {
        const p = await phonesRes.json();
        setBlacklistedPhones(p.blacklisted_phones || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  // Ban User
  const handleConfirmBanUser = async () => {
    if (!banTargetUser) return;
    try {
      const res = await fetch(`${apiBase}/admin/ban-user`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId: banTargetUser.id, reason: customBanReason })
      });
      if (res.ok) {
        showToast(`🚫 User @${banTargetUser.username} has been BANNED.`);
        setBanTargetUser(null);
        fetchAllData();
      }
    } catch {
      showToast('Failed to ban user.');
    }
  };

  // Unban User
  const handleUnbanUser = async (user: AdminUser) => {
    try {
      const res = await fetch(`${apiBase}/admin/unban-user`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        showToast(`🟢 User @${user.username} UNBANNED.`);
        fetchAllData();
      }
    } catch {
      showToast('Failed to unban user.');
    }
  };

  // Delete User
  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete user @${user.username}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${apiBase}/admin/delete-user`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        showToast(`🗑️ User @${user.username} deleted.`);
        fetchAllData();
      }
    } catch {
      showToast('Failed to delete user.');
    }
  };

  // Ban IP
  const handleBanIp = async (ipToBan: string) => {
    if (!ipToBan.trim()) return;
    try {
      const res = await fetch(`${apiBase}/admin/ban-ip`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ip: ipToBan.trim() })
      });
      if (res.ok) {
        showToast(`🔥 IP ${ipToBan} added to firewall blacklist.`);
        setNewIpInput('');
        fetchAllData();
      }
    } catch {
      showToast('Failed to ban IP.');
    }
  };

  // Unban IP
  const handleUnbanIp = async (ipToUnban: string) => {
    try {
      const res = await fetch(`${apiBase}/admin/unban-ip`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ip: ipToUnban })
      });
      if (res.ok) {
        showToast(`✓ IP ${ipToUnban} unbanned.`);
        fetchAllData();
      }
    } catch {
      showToast('Failed to unban IP.');
    }
  };

  // Blacklist Phone
  const handleBlacklistPhone = async (phone: string) => {
    if (!phone.trim()) return;
    try {
      const res = await fetch(`${apiBase}/admin/blacklist-phone`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phone: phone.trim() })
      });
      if (res.ok) {
        showToast(`📱 Phone ${phone} blacklisted.`);
        setNewPhoneInput('');
        fetchAllData();
      }
    } catch {
      showToast('Failed to blacklist phone.');
    }
  };

  // Unblacklist Phone
  const handleUnblacklistPhone = async (phone: string) => {
    try {
      const res = await fetch(`${apiBase}/admin/unblacklist-phone`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phone })
      });
      if (res.ok) {
        showToast(`✓ Phone ${phone} removed from blacklist.`);
        fetchAllData();
      }
    } catch {
      showToast('Failed to unblacklist phone.');
    }
  };

  // Send Broadcast Announcement
  const handleSendBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showToast('Please enter both title and message.');
      return;
    }

    socketService.emit('admin_broadcast', {
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
      timestamp: new Date().toISOString()
    });

    showToast('📢 Global broadcast transmitted to all active users!');
    setBroadcastTitle('');
    setBroadcastMessage('');
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      u.username.toLowerCase().includes(q) || 
      u.display_name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) || 
      u.last_ip.toLowerCase().includes(q) ||
      (u.phone_number && u.phone_number.includes(q));

    if (statusFilter === 'banned') return matchesSearch && u.is_banned;
    if (statusFilter === 'active') return matchesSearch && !u.is_banned;
    return matchesSearch;
  });

  // =========================================================================
  // 1. ADMIN AUTHENTICATION GATE
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 18, 0.98)',
        backdropFilter: 'blur(30px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="glass" style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '24px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          border: '1.5px solid rgba(6, 182, 212, 0.4)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(6, 182, 212, 0.25)',
          background: 'rgba(10, 16, 32, 0.98)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            boxShadow: '0 0 25px rgba(6, 182, 212, 0.5)'
          }}>
            <ShieldCheck size={32} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px' }}>
              SPYCHAT Command Center
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Restricted Root Access • Enter Master Admin Key
            </p>
          </div>

          <form onSubmit={handleAdminLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <Key size={18} color="var(--accent-cyan)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                autoFocus
                placeholder="Enter Master Admin Key..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="spychat-input"
                style={{ paddingLeft: '42px', fontSize: '14px' }}
              />
            </div>

            {authError && (
              <div style={{ color: '#f87171', fontSize: '12.5px', textAlign: 'center', fontWeight: '600' }}>
                {authError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ flex: 1, height: '44px', fontWeight: '700' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1, height: '44px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Unlock size={16} /> Access
              </button>
            </div>
          </form>

          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Default Key: <span style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>SPYCHAT-MASTER-2026</span>
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. MAIN ADMIN COMMAND DASHBOARD
  // =========================================================================
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.98)',
      backdropFilter: 'blur(25px)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* HEADER BAR (With Notch Clearance) */}
      <header className="glass" style={{
        paddingTop: 'max(46px, calc(env(safe-area-inset-top, 0px) + 12px))',
        paddingBottom: '12px',
        paddingLeft: '16px',
        paddingRight: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(6, 182, 212, 0.25)',
        background: 'rgba(6, 12, 26, 0.95)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.5)'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px' }}>
                SPYCHAT Super-Admin
              </h1>
              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: '800', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                ROOT LIVE
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Total Users: {stats?.total_users || 0} • Banned: {stats?.banned_users || 0} • IPs Blocked: {stats?.banned_ips_count || 0}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={fetchAllData}
            title="Refresh Live Data"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-cyan)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={onClose}
            title="Exit Admin Panel"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ACTION FEEDBACK TOAST */}
      {actionFeedback && (
        <div style={{
          position: 'fixed',
          top: '85px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10, 16, 32, 0.95)',
          border: '1.5px solid var(--accent-cyan)',
          color: '#ffffff',
          padding: '8px 20px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '700',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(6, 182, 212, 0.4)',
          zIndex: 99999,
          pointerEvents: 'none',
          animation: 'slideDownFade 0.2s ease'
        }}>
          {actionFeedback}
        </div>
      )}

      {/* TOP NAVIGATION TABS */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        background: 'rgba(6, 10, 22, 0.9)',
        borderBottom: '1px solid var(--border-color)',
        padding: '6px 12px',
        gap: '6px'
      }}>
        {[
          { id: 'users', label: 'Registered Users', icon: Users, count: users.length },
          { id: 'ips', label: 'IP Firewall Ban', icon: Globe, count: bannedIps.length },
          { id: 'phones', label: 'Phone Blacklist', icon: Smartphone, count: blacklistedPhones.length },
          { id: 'broadcast', label: 'Live Broadcast', icon: Radio },
          { id: 'telemetry', label: 'Server Metrics', icon: Activity }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                border: 'none',
                background: isActive ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#000000' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  fontSize: '10.5px',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  background: isActive ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                  fontWeight: '800'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT CONTAINER */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ================================================================= */}
        {/* TAB 1: USERS DIRECTORY */}
        {/* ================================================================= */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                <Search size={16} color="var(--accent-cyan)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filter by Name, @username, Email, IP, Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="spychat-input"
                  style={{ paddingLeft: '36px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['all', 'active', 'banned'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: '1px solid var(--border-color)',
                      background: statusFilter === filter ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: statusFilter === filter ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Users List Grid / Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No users found matching query.
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="glass"
                    style={{
                      padding: '14px 16px',
                      borderRadius: '18px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      border: u.is_banned ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                      background: u.is_banned ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)'
                    }}
                  >
                    {/* User Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px', flex: 1 }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: u.is_banned ? '#ef4444' : 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontWeight: '800',
                        fontSize: '16px'
                      }}>
                        {u.display_name.substring(0, 2).toUpperCase()}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '800', fontSize: '14.5px', color: '#ffffff' }}>
                            {u.display_name}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                            @{u.username}
                          </span>
                          {u.is_banned && (
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', fontWeight: '800' }}>
                              BANNED
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          📧 {u.email} {u.phone_number && `• 📱 ${u.phone_number}`}
                        </div>

                        {/* IP & Telemetry Footprint */}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                          <span>📍 Last IP: <strong style={{ color: '#38bdf8' }}>{u.last_ip}</strong></span>
                          <span>🌐 Reg IP: {u.registration_ip}</span>
                          <span>📱 {u.device_info}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Ban / Unban Toggle */}
                      {u.is_banned ? (
                        <button
                          onClick={() => handleUnbanUser(u)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#10b981',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <UserCheck size={14} /> Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => setBanTargetUser(u)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <UserX size={14} /> Ban User
                        </button>
                      )}

                      {/* Instant IP Ban */}
                      <button
                        onClick={() => handleBanIp(u.last_ip)}
                        title={`Ban User IP: ${u.last_ip}`}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: '#f59e0b',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Globe size={14} /> Ban IP
                      </button>

                      {/* Delete User */}
                      <button
                        onClick={() => handleDeleteUser(u)}
                        title="Delete User Permanently"
                        style={{
                          padding: '8px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: IP FIREWALL BAN */}
        {/* ================================================================= */}
        {activeTab === 'ips' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass" style={{ padding: '16px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} color="var(--accent-cyan)" /> Add IP to Firewall Blacklist
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Blacklisting an IP will immediately reject all REST API calls and disconnect active WebSocket sockets from that IP address.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter IP Address (e.g. 192.168.1.55 or 49.37.12.9)..."
                  value={newIpInput}
                  onChange={(e) => setNewIpInput(e.target.value)}
                  className="spychat-input"
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button
                  onClick={() => handleBanIp(newIpInput)}
                  className="btn-primary"
                  style={{ padding: '0 16px', fontWeight: '800', fontSize: '13px', whiteSpace: 'nowrap' }}
                >
                  Block IP
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                ACTIVE BANNED IPS ({bannedIps.length})
              </div>

              {bannedIps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No IP addresses currently banned. Firewall is clean.
                </div>
              ) : (
                bannedIps.map((ip) => (
                  <div
                    key={ip}
                    className="glass"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Globe size={18} color="#ef4444" />
                      <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '14px', color: '#ffffff' }}>
                        {ip}
                      </span>
                    </div>

                    <button
                      onClick={() => handleUnbanIp(ip)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: PHONE NUMBER BLACKLIST */}
        {/* ================================================================= */}
        {activeTab === 'phones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass" style={{ padding: '16px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={18} color="var(--accent-cyan)" /> Blacklist Phone Number
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Blacklisted phone numbers cannot be used to register new accounts.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter Phone Number with country code (e.g. +919876543210)..."
                  value={newPhoneInput}
                  onChange={(e) => setNewPhoneInput(e.target.value)}
                  className="spychat-input"
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button
                  onClick={() => handleBlacklistPhone(newPhoneInput)}
                  className="btn-primary"
                  style={{ padding: '0 16px', fontWeight: '800', fontSize: '13px', whiteSpace: 'nowrap' }}
                >
                  Blacklist
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                BLACKLISTED PHONE NUMBERS ({blacklistedPhones.length})
              </div>

              {blacklistedPhones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No phone numbers currently blacklisted.
                </div>
              ) : (
                blacklistedPhones.map((phone) => (
                  <div
                    key={phone}
                    className="glass"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Smartphone size={18} color="#ef4444" />
                      <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '14px', color: '#ffffff' }}>
                        {phone}
                      </span>
                    </div>

                    <button
                      onClick={() => handleUnblacklistPhone(phone)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: LIVE BROADCAST CENTER */}
        {/* ================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="glass" style={{ padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={20} color="var(--accent-cyan)" /> Emergency Global Broadcast
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Transmit a high-priority banner notification instantly to all connected SPYCHAT client devices.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>ANNOUNCEMENT TITLE</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled Security Maintenance / App Update Notice"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="spychat-input"
                  style={{ marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>MESSAGE BODY</label>
                <textarea
                  rows={4}
                  placeholder="Type your official announcement to all online users..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="spychat-input"
                  style={{ marginTop: '4px', resize: 'vertical' }}
                />
              </div>

              <button
                onClick={handleSendBroadcast}
                className="btn-primary"
                style={{ height: '46px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Send size={18} /> Send Global Announcement
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: TELEMETRY & SYSTEM METRICS */}
        {/* ================================================================= */}
        {activeTab === 'telemetry' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {[
                { title: 'Server Uptime', value: stats.uptime_formatted, icon: Server, color: '#06b6d4' },
                { title: 'Heap Memory Used', value: `${stats.memory_used_mb} MB`, icon: HardDrive, color: '#10b981' },
                { title: 'System Free RAM', value: `${stats.system_free_mem_mb} MB`, icon: Activity, color: '#f59e0b' },
                { title: 'CPU Cores', value: `${stats.cpu_count} Cores`, icon: Cpu, color: '#8b5cf6' },
                { title: 'Active Sockets', value: `${stats.total_active_sessions}`, icon: Radio, color: '#ec4899' },
                { title: 'Total Messages', value: `${stats.total_messages}`, icon: CheckCircle2, color: '#3b82f6' }
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="glass"
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '700' }}>{card.title}</span>
                      <Icon size={18} color={card.color} />
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff' }}>
                      {card.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BAN REASON MODAL POPUP */}
      {banTargetUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '380px',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: '1.5px solid #ef4444',
            background: 'rgba(12, 18, 34, 0.98)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={24} color="#ef4444" />
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>
                Ban User @{banTargetUser.username}
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Banning this user will immediately disconnect their active sessions and prevent future logins.
            </p>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '700' }}>BAN REASON</label>
              <textarea
                rows={3}
                value={customBanReason}
                onChange={(e) => setCustomBanReason(e.target.value)}
                className="spychat-input"
                style={{ marginTop: '4px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setBanTargetUser(null)}
                className="btn-secondary"
                style={{ flex: 1, height: '42px', fontWeight: '700' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBanUser}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
