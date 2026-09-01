export function getAdminPortalHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPYCHAT Super-Admin Web Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #030712;
      --card-bg: rgba(10, 18, 38, 0.85);
      --border: rgba(6, 182, 212, 0.25);
      --cyan: #06b6d4;
      --cyan-glow: rgba(6, 182, 212, 0.35);
      --red: #ef4444;
      --green: #10b981;
      --amber: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .glass {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
    }
    header {
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
    }
    .badge-root {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 8px;
    }
    .container {
      max-width: 1300px;
      width: 100%;
      margin: 0 auto;
      padding: 24px 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .grid-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .card-stat {
      padding: 20px;
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .stat-val {
      font-size: 26px;
      font-weight: 800;
      color: #fff;
    }
    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      overflow-x: auto;
    }
    .tab-btn {
      padding: 10px 18px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: rgba(255,255,255,0.04);
      color: var(--text-muted);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
      color: #000;
      font-weight: 800;
      border-color: transparent;
      box-shadow: 0 0 15px var(--cyan-glow);
    }
    .table-container {
      overflow-x: auto;
      border-radius: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: rgba(255, 255, 255, 0.05);
      padding: 12px 16px;
      color: var(--cyan);
      font-weight: 800;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .btn {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn-ban { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .btn-unban { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .btn-primary { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #000; font-weight: 800; }
    .input-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border);
      color: #fff;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      outline: none;
    }
    .input-box:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 10px var(--cyan-glow);
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    /* Auth Modal */
    #auth-overlay {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 18, 0.98);
      backdrop-filter: blur(25px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
  </style>
</head>
<body>

  <!-- AUTH GATE MODAL -->
  <div id="auth-overlay">
    <div class="glass" style="max-width: 400px; width: 100%; border-radius: 24px; padding: 30px; text-align: center; display: flex; flex-direction: column; gap: 16px;">
      <div style="font-size: 40px;">🛡️</div>
      <h2 style="font-size: 20px; font-weight: 800;">SPYCHAT Super-Admin</h2>
      <p style="font-size: 13px; color: var(--text-muted);">Website Root Portal • Enter Master Admin Key</p>
      
      <input type="password" id="admin-key-input" class="input-box" placeholder="Enter Admin Master Key..." style="width: 100%; text-align: center; font-size: 15px;">
      <div id="auth-err" style="color: var(--red); font-size: 12.5px; display: none;">Invalid Master Key</div>
      
      <button class="btn btn-primary" onclick="verifyAdminKey()" style="height: 44px; border-radius: 12px; font-size: 14px;">Unlock Dashboard</button>
      <span style="font-size: 11px; color: var(--text-muted);">Master Key: <code class="mono" style="color: var(--cyan);">shivambhatt@admin</code> (CAPS / Small both supported)</span>
    </div>
  </div>

  <!-- DASHBOARD HEADER -->
  <header class="glass">
    <div style="display: flex; alignItems: center; gap: 12px;">
      <span style="font-size: 26px;">🛡️</span>
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <h1 style="font-size: 18px; font-weight: 800;">SPYCHAT Admin Web Portal</h1>
          <span class="badge-root">ROOT LIVE</span>
        </div>
        <p style="font-size: 12px; color: var(--text-muted);" id="header-subtitle">Connecting to encrypted database...</p>
      </div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-primary" onclick="loadAllData()">🔄 Refresh</button>
      <button class="btn" style="background: rgba(255,255,255,0.08); color: #fff;" onclick="logoutAdmin()">Log Out</button>
    </div>
  </header>

  <div class="container">
    <!-- STATS CARDS -->
    <div class="grid-stats" id="stats-grid">
      <div class="glass card-stat">
        <div class="stat-label">Total Users</div>
        <div class="stat-val" id="stat-users">-</div>
      </div>
      <div class="glass card-stat">
        <div class="stat-label">Banned Users</div>
        <div class="stat-val" id="stat-banned" style="color: var(--red);">-</div>
      </div>
      <div class="glass card-stat">
        <div class="stat-label">Banned IPs</div>
        <div class="stat-val" id="stat-ips" style="color: var(--amber);">-</div>
      </div>
      <div class="glass card-stat">
        <div class="stat-label">Blacklisted Phones</div>
        <div class="stat-val" id="stat-phones">-</div>
      </div>
      <div class="glass card-stat">
        <div class="stat-label">Uptime</div>
        <div class="stat-val" id="stat-uptime" style="font-size: 20px;">-</div>
      </div>
      <div class="glass card-stat">
        <div class="stat-label">RAM Used</div>
        <div class="stat-val" id="stat-ram" style="font-size: 20px; color: var(--cyan);">-</div>
      </div>
    </div>

    <!-- TABS NAVIGATION -->
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('users', this)">👥 Registered Users</button>
      <button class="tab-btn" onclick="switchTab('ips', this)">🌐 IP Firewall Ban</button>
      <button class="tab-btn" onclick="switchTab('phones', this)">📱 Phone Blacklist</button>
    </div>

    <!-- TAB 1: USERS -->
    <div id="tab-users" class="tab-content">
      <div class="glass" style="padding: 16px; border-radius: 20px; display: flex; flex-direction: column; gap: 14px;">
        <input type="text" id="user-search" class="input-box" placeholder="Filter by Name, @username, Email, IP, or Phone..." oninput="renderUsersTable()" style="max-width: 400px;">
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email / Phone</th>
                <th>IP Footprint</th>
                <th>Device</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="users-table-body">
              <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Loading users...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: IPS -->
    <div id="tab-ips" class="tab-content" style="display: none;">
      <div class="glass" style="padding: 20px; border-radius: 20px; display: flex; flex-direction: column; gap: 16px;">
        <h3 style="font-size: 16px; font-weight: 800;">🔥 Add IP to Firewall Blacklist</h3>
        <div style="display: flex; gap: 10px; max-width: 500px;">
          <input type="text" id="new-ip" class="input-box" placeholder="Enter IP Address (e.g. 192.168.1.1)..." style="flex: 1;">
          <button class="btn btn-primary" onclick="banIp()">Block IP</button>
        </div>
        
        <h4 style="font-size: 14px; font-weight: 700; color: var(--text-muted); margin-top: 10px;">ACTIVE BANNED IPS</h4>
        <div id="ips-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    </div>

    <!-- TAB 3: PHONES -->
    <div id="tab-phones" class="tab-content" style="display: none;">
      <div class="glass" style="padding: 20px; border-radius: 20px; display: flex; flex-direction: column; gap: 16px;">
        <h3 style="font-size: 16px; font-weight: 800;">📱 Blacklist Phone Number</h3>
        <div style="display: flex; gap: 10px; max-width: 500px;">
          <input type="text" id="new-phone" class="input-box" placeholder="Enter Phone (e.g. +919876543210)..." style="flex: 1;">
          <button class="btn btn-primary" onclick="blacklistPhone()">Blacklist Phone</button>
        </div>
        
        <h4 style="font-size: 14px; font-weight: 700; color: var(--text-muted); margin-top: 10px;">BLACKLISTED PHONES</h4>
        <div id="phones-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    </div>
  </div>

  <script>
    let adminKey = sessionStorage.getItem('spychat_admin_key') || '';
    let usersData = [];
    let bannedIpsData = [];
    let blacklistedPhonesData = [];

    function verifyAdminKey() {
      const val = document.getElementById('admin-key-input').value.trim();
      if (!val) return;
      fetch('/admin/stats', { headers: { 'x-admin-key': val } })
        .then(r => {
          if (r.ok) {
            adminKey = val;
            sessionStorage.setItem('spychat_admin_key', val);
            document.getElementById('auth-overlay').style.display = 'none';
            loadAllData();
          } else {
            document.getElementById('auth-err').style.display = 'block';
          }
        })
        .catch(() => { document.getElementById('auth-err').style.display = 'block'; });
    }

    if (adminKey) {
      document.getElementById('auth-overlay').style.display = 'none';
      loadAllData();
    }

    function logoutAdmin() {
      sessionStorage.removeItem('spychat_admin_key');
      location.reload();
    }

    async function loadAllData() {
      if (!adminKey) return;
      try {
        const [sRes, uRes, iRes, pRes] = await Promise.all([
          fetch('/admin/stats', { headers: { 'x-admin-key': adminKey } }),
          fetch('/admin/users', { headers: { 'x-admin-key': adminKey } }),
          fetch('/admin/banned-ips', { headers: { 'x-admin-key': adminKey } }),
          fetch('/admin/blacklisted-phones', { headers: { 'x-admin-key': adminKey } })
        ]);
        
        if (sRes.ok) {
          const s = (await sRes.json()).stats;
          document.getElementById('stat-users').innerText = s.total_users;
          document.getElementById('stat-banned').innerText = s.banned_users;
          document.getElementById('stat-ips').innerText = s.banned_ips_count;
          document.getElementById('stat-phones').innerText = s.blacklisted_phones_count;
          document.getElementById('stat-uptime').innerText = s.uptime_formatted;
          document.getElementById('stat-ram').innerText = s.memory_used_mb + ' MB';
          document.getElementById('header-subtitle').innerText = 'Connected • ' + s.total_users + ' users • Uptime ' + s.uptime_formatted;
        }

        if (uRes.ok) {
          usersData = (await uRes.json()).users || [];
          renderUsersTable();
        }

        if (iRes.ok) {
          bannedIpsData = (await iRes.json()).banned_ips || [];
          renderIpsList();
        }

        if (pRes.ok) {
          blacklistedPhonesData = (await pRes.json()).blacklisted_phones || [];
          renderPhonesList();
        }
      } catch (err) {
        console.error(err);
      }
    }

    function renderUsersTable() {
      const q = (document.getElementById('user-search').value || '').toLowerCase();
      const filtered = usersData.filter(u => 
        u.username.toLowerCase().includes(q) || 
        u.display_name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) || 
        u.last_ip.toLowerCase().includes(q) || 
        (u.phone_number && u.phone_number.includes(q))
      );

      const tbody = document.getElementById('users-table-body');
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No users found.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(u => \`
        <tr>
          <td>
            <strong>\${u.display_name}</strong><br>
            <span style="color: var(--cyan); font-weight: 700;">@\${u.username}</span>
          </td>
          <td>
            \${u.email}<br>
            <span style="color: var(--text-muted); font-size: 11px;">\${u.phone_number ? '📱 ' + u.phone_number : 'No phone'}</span>
          </td>
          <td class="mono">
            Last: <strong style="color: #38bdf8;">\${u.last_ip}</strong><br>
            <span style="color: var(--text-muted); font-size: 11px;">Reg: \${u.registration_ip}</span>
          </td>
          <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text-muted);">
            \${u.device_info}
          </td>
          <td style="font-size: 11px; color: var(--text-muted);">
            \${new Date(u.created_at).toLocaleDateString()}
          </td>
          <td>
            \${u.is_banned ? '<span class="badge-root" style="background: rgba(239,68,68,0.3);">BANNED</span>' : '<span style="color: var(--green); font-weight: 800;">ACTIVE</span>'}
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              \${u.is_banned ? 
                \`<button class="btn btn-unban" onclick="unbanUser('\${u.id}')">Unban</button>\` : 
                \`<button class="btn btn-ban" onclick="banUserPrompt('\${u.id}', '\${u.username}')">Ban</button>\`
              }
              <button class="btn" style="background: rgba(245,158,11,0.2); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4);" onclick="banIpDirect('\${u.last_ip}')">Ban IP</button>
            </div>
          </td>
        </tr>
      \`).join('');
    }

    async function banUserPrompt(userId, username) {
      const reason = prompt('Enter Ban Reason for @' + username + ':', 'Violation of Terms');
      if (reason === null) return;
      await fetch('/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ userId, reason })
      });
      loadAllData();
    }

    async function unbanUser(userId) {
      await fetch('/admin/unban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ userId })
      });
      loadAllData();
    }

    async function banIpDirect(ip) {
      if (!confirm('Ban IP: ' + ip + '?')) return;
      await fetch('/admin/ban-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ ip })
      });
      loadAllData();
    }

    async function banIp() {
      const ip = document.getElementById('new-ip').value.trim();
      if (!ip) return;
      await fetch('/admin/ban-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ ip })
      });
      document.getElementById('new-ip').value = '';
      loadAllData();
    }

    async function unbanIp(ip) {
      await fetch('/admin/unban-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ ip })
      });
      loadAllData();
    }

    function renderIpsList() {
      const container = document.getElementById('ips-list');
      if (bannedIpsData.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No banned IPs.</div>';
        return;
      }
      container.innerHTML = bannedIpsData.map(ip => \`
        <div class="glass" style="padding: 10px 16px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span class="mono" style="font-weight: 700; color: #fca5a5;">\${ip}</span>
          <button class="btn btn-unban" onclick="unbanIp('\${ip}')">Unblock IP</button>
        </div>
      \`).join('');
    }

    async function blacklistPhone() {
      const phone = document.getElementById('new-phone').value.trim();
      if (!phone) return;
      await fetch('/admin/blacklist-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ phone })
      });
      document.getElementById('new-phone').value = '';
      loadAllData();
    }

    async function unblacklistPhone(phone) {
      await fetch('/admin/unblacklist-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ phone })
      });
      loadAllData();
    }

    function renderPhonesList() {
      const container = document.getElementById('phones-list');
      if (blacklistedPhonesData.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No blacklisted phones.</div>';
        return;
      }
      container.innerHTML = blacklistedPhonesData.map(phone => \`
        <div class="glass" style="padding: 10px 16px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span class="mono" style="font-weight: 700; color: #fca5a5;">\${phone}</span>
          <button class="btn btn-unban" onclick="unblacklistPhone('\${phone}')">Remove</button>
        </div>
      \`).join('');
    }

    function switchTab(tabId, el) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      document.getElementById('tab-' + tabId).style.display = 'block';
    }
  </script>
</body>
</html>`;
}
