import fs from 'fs';
import path from 'path';
import https from 'https';

export interface CatalogItem {
  id: string;
  title: string;
  price: string;
  description: string;
  image_url?: string;
  created_at: string;
}

export interface AutoReplyRule {
  id?: string;
  trigger: string;
  response: string;
  message_type?: 'text' | 'image' | 'video' | 'voice';
  media_url?: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  username: string;
  display_name: string;
  avatar_id: string;
  public_key?: string;
  created_at: string;
  updated_at: string;
  last_seen: string;
  app_pin?: string; // 4-digit passcode lock
  contacts?: string[]; // Auto-saved chat contacts
  privacy: {
    last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
    online_status_visibility: 'everyone' | 'contacts' | 'nobody';
    read_receipts: boolean;
    typing_indicator: boolean;
    spytus_privacy?: 'all' | 'contacts' | 'whitelist' | 'blacklist';
  };
  phone_number?: string;
  last_ip?: string;
  registration_ip?: string;
  device_info?: string;
  is_banned?: boolean;
  ban_reason?: string;
  banned_at?: string;
  business_automation?: {
    greeting_enabled: boolean;
    greeting_message: string;
    greeting_media_url?: string;
    greeting_type?: 'text' | 'image' | 'video' | 'voice';
    away_enabled: boolean;
    away_message: string;
    away_media_url?: string;
    away_type?: 'text' | 'image' | 'video' | 'voice';
    auto_replies_enabled: boolean;
    auto_reply_rules: AutoReplyRule[];
    quick_replies?: AutoReplyRule[];
    catalog?: CatalogItem[];
  };
}

export interface Session {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  members: string[]; // user_ids
  pinned_by?: string[]; // user_ids who pinned this conversation
  labels?: Record<string, string[]>; // userId -> array of labels ("client", "pending", etc)
  disappearing_timer_seconds?: number; // 0 = off, 60, 300, 3600, 86400
}

export interface SpytusStory {
  id: string;
  user_id: string;
  media_type: 'image' | 'video' | 'text';
  media_url?: string;
  text_content?: string;
  background_gradient?: string;
  caption?: string;
  viewers: string[]; // user_ids who viewed
  privacy_type?: 'all' | 'contacts' | 'whitelist' | 'blacklist';
  privacy_users?: string[];
  created_at: string;
  expires_at: string; // 24 hours from created_at
}

export interface MessageReaction {
  user_id: string;
  emoji: string;
}

export interface MessageReplyPreview {
  message_id: string;
  sender_name: string;
  text_preview: string;
  media_type?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  ciphertext: string;
  iv?: string;
  message_type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'product' | 'round_video';
  media_url?: string;
  file_name?: string;
  file_size?: number;
  duration_seconds?: number;
  product_data?: CatalogItem;
  reactions?: MessageReaction[];
  reply_to?: MessageReplyPreview;
  view_once?: boolean;
  viewed_by?: string[];
  silent?: boolean;
  burner_timer_seconds?: number;
  burner_started_at?: string;
  transcribed_text?: string;
  translation?: { lang: string; text: string };
  location_data?: { lat: number; lng: number; address?: string };
  expires_at?: string; // For disappearing messages
  created_at: string;
  edited_at?: string;
  deleted_for_everyone?: boolean;
  status: 'sent' | 'delivered' | 'read';
}

export interface CallLog {
  id: string;
  conversation_id?: string;
  caller_id: string;
  receiver_id: string;
  type: 'audio' | 'video';
  status: 'completed' | 'missed' | 'declined' | 'busy';
  duration_seconds: number;
  created_at: string;
}

interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  conversations: Conversation[];
  messages: Message[];
  calls: CallLog[];
  spytus_stories?: SpytusStory[];
  saved_messages?: Record<string, string[]>;
  banned_ips?: string[];
  blacklisted_phones?: string[];
}

const DB_FILE_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/spychat_db.json');

class Database {
  private data: DatabaseSchema = {
    users: [],
    sessions: [],
    conversations: [],
    messages: [],
    calls: [],
    spytus_stories: [],
    saved_messages: {},
    banned_ips: [],
    blacklisted_phones: []
  };

  constructor() {
    this.init();
  }

  private init() {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading DB file, reinitializing', err);
      }
    }
    this.ensureSeedUsers();
    this.save();
  }

  private ensureSeedUsers() {
    if (!this.data.users) this.data.users = [];
    
    // Hash for password "123456"
    const defaultHash = '$2b$10$vzjwKiY9TmfFQzUqaKLo/udD6LEQ2C7Nr7oM0lr/TtV/vHsx2isoq';

    const seedUsers: Partial<User>[] = [
      {
        id: 'usr_harsh_primary_1',
        email: 'harsh@gmail.com',
        username: 'mrharsh',
        display_name: 'Harsh',
        password_hash: defaultHash,
        avatar_id: 'avatar_1'
      },
      {
        id: 'usr_agent1_shadow_2',
        email: 'test@gmail.com',
        username: 'shadow_fox',
        display_name: 'Agent Fox',
        password_hash: defaultHash,
        avatar_id: 'avatar_5'
      },
      {
        id: 'usr_agent2_ag2_3',
        email: 'test1@gmail.com',
        username: 'agent2',
        display_name: 'Agent 2',
        password_hash: defaultHash,
        avatar_id: 'avatar_7'
      }
    ];

    for (const seed of seedUsers) {
      const idx = this.data.users.findIndex(u => 
        u.id === seed.id || 
        u.email.toLowerCase() === seed.email!.toLowerCase() || 
        u.username.toLowerCase() === seed.username!.toLowerCase()
      );
      if (idx === -1) {
        this.data.users.push({
          id: seed.id!,
          email: seed.email!,
          username: seed.username!,
          display_name: seed.display_name!,
          password_hash: seed.password_hash!,
          avatar_id: seed.avatar_id || 'avatar_1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          privacy: {
            last_seen_visibility: 'everyone',
            online_status_visibility: 'everyone',
            read_receipts: true,
            typing_indicator: true
          }
        });
      } else {
        // Enforce valid username, email, and password hash
        this.data.users[idx].email = seed.email!;
        this.data.users[idx].username = seed.username!;
        this.data.users[idx].display_name = seed.display_name!;
        this.data.users[idx].password_hash = defaultHash;
      }
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
      this.syncToFirebase();
    } catch (err) {
      console.error('Error saving DB to disk:', err);
    }
  }

  private syncToFirebase() {
    try {
      const payload = JSON.stringify(this.data);
      const req = https.request({
        hostname: 'andriod-a0911-default-rtdb.firebaseio.com',
        path: '/spychat_data.json',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        if (res.statusCode === 200) {
          console.log('[Firebase RTDB] Cloud database synchronized successfully ☁️');
        }
      });
      req.on('error', () => {});
      req.write(payload);
      req.end();
    } catch {}
  }

  // USERS
  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserByUsername(username: string): User | undefined {
    const clean = username.replace(/^@/, '').toLowerCase();
    return this.data.users.find(u => u.username.toLowerCase() === clean);
  }

  public searchUsers(query: string, currentUserId?: string): Omit<User, 'email' | 'password_hash'>[] {
    const clean = query.replace(/^@+/, '').trim().toLowerCase();
    if (!clean) return this.getAllUsersExcept(currentUserId);

    return this.data.users
      .filter(u => (!currentUserId || u.id !== currentUserId) && (
        u.username.toLowerCase().includes(clean) || 
        u.display_name.toLowerCase().includes(clean) ||
        (u.email && u.email.toLowerCase().includes(clean))
      ))
      .map(u => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_id: u.avatar_id,
        public_key: u.public_key,
        created_at: u.created_at,
        updated_at: u.updated_at,
        last_seen: u.privacy?.last_seen_visibility === 'nobody' ? '' : u.last_seen,
        privacy: u.privacy
      }));
  }

  public getAllUsersExcept(currentUserId?: string): Omit<User, 'email' | 'password_hash'>[] {
    return this.data.users
      .filter(u => !currentUserId || u.id !== currentUserId)
      .slice(0, 100)
      .map(u => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_id: u.avatar_id,
        public_key: u.public_key,
        created_at: u.created_at,
        updated_at: u.updated_at,
        last_seen: u.privacy.last_seen_visibility === 'nobody' ? '' : u.last_seen,
        privacy: u.privacy
      }));
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updated_at: new Date().toISOString() };
    this.save();
    return this.data.users[idx];
  }

  // SESSIONS
  public createSession(session: Session): Session {
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  public revokeSession(userId: string): void {
    this.data.sessions = this.data.sessions.map(s => 
      s.user_id === userId ? { ...s, revoked_at: new Date().toISOString() } : s
    );
    this.save();
  }

  // CONVERSATIONS
  public findConversationById(id: string): Conversation | undefined {
    return this.data.conversations.find(c => c.id === id);
  }

  public findOrCreateDirectConversation(userA: string, userB: string): Conversation {
    const existing = this.data.conversations.find(c => 
      c.type === 'direct' && 
      c.members.includes(userA) && 
      c.members.includes(userB)
    );
    if (existing) return existing;

    const newConv: Conversation = {
      id: 'conv_' + Math.random().toString(36).substring(2, 11),
      type: 'direct',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [userA, userB]
    };
    this.data.conversations.push(newConv);
    this.save();
    return newConv;
  }

  public getUserConversations(userId: string): Array<Conversation & { unread_count: number; last_message?: Message; peer?: Partial<User> }> {
    const list = this.data.conversations.filter(c => c.members.includes(userId));
    return list.map(c => {
      const messages = this.data.messages.filter(m => m.conversation_id === c.id);
      const lastMessage = messages[messages.length - 1];
      const unreadCount = messages.filter(m => m.sender_id !== userId && m.status !== 'read').length;
      const peerId = c.members.find(m => m !== userId);
      const peerUser = peerId ? this.findUserById(peerId) : undefined;
      
      return {
        ...c,
        unread_count: unreadCount,
        last_message: lastMessage,
        peer: peerUser ? {
          id: peerUser.id,
          username: peerUser.username,
          display_name: peerUser.display_name,
          avatar_id: peerUser.avatar_id,
          public_key: peerUser.public_key,
          last_seen: peerUser.privacy.last_seen_visibility === 'nobody' ? '' : peerUser.last_seen
        } : undefined
      };
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public updateConversation(id: string, updates: Partial<Conversation>): Conversation | undefined {
    const idx = this.data.conversations.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.data.conversations[idx] = { ...this.data.conversations[idx], ...updates, updated_at: new Date().toISOString() };
    this.save();
    return this.data.conversations[idx];
  }

  // MESSAGES
  public createMessage(msg: Message): Message {
    this.data.messages.push(msg);
    const conv = this.data.conversations.find(c => c.id === msg.conversation_id);
    if (conv) {
      conv.updated_at = msg.created_at;
    }
    this.save();
    return msg;
  }

  public getMessages(conversationId: string, limit = 50): Message[] {
    const now = new Date().getTime();
    // Filter out expired disappearing messages
    return this.data.messages
      .filter(m => {
        if (m.conversation_id !== conversationId) return false;
        if (m.expires_at && new Date(m.expires_at).getTime() < now) return false;
        return true;
      })
      .slice(-limit);
  }

  public updateMessage(messageId: string, updates: Partial<Message>): Message | undefined {
    const idx = this.data.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return undefined;
    this.data.messages[idx] = { ...this.data.messages[idx], ...updates };
    this.save();
    return this.data.messages[idx];
  }

  public addMessageReaction(messageId: string, userId: string, emoji: string): Message | undefined {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (!msg) return undefined;

    if (!msg.reactions) msg.reactions = [];
    const existingIdx = msg.reactions.findIndex(r => r.user_id === userId);
    if (existingIdx !== -1) {
      if (msg.reactions[existingIdx].emoji === emoji) {
        // Toggle off reaction
        msg.reactions.splice(existingIdx, 1);
      } else {
        msg.reactions[existingIdx].emoji = emoji;
      }
    } else {
      msg.reactions.push({ user_id: userId, emoji });
    }

    this.save();
    return msg;
  }

  public deleteMessageCompletely(messageId: string): boolean {
    const idx = this.data.messages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      this.data.messages.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  public deleteMessageForEveryone(messageId: string): Message | undefined {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (!msg) return undefined;

    // Telegram style complete wipe
    const idx = this.data.messages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      this.data.messages.splice(idx, 1);
      this.save();
    }
    return msg;
  }

  // WHATSAPP-STYLE STORE-AND-FORWARD: ZERO SERVER RETENTION
  public purgeDeliveredMessage(messageId: string): void {
    const idx = this.data.messages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      this.data.messages.splice(idx, 1);
      this.save();
    }
  }

  public getPendingUndeliveredMessages(userId: string): Message[] {
    const userConvs = this.getUserConversations(userId).map(c => c.id);
    return this.data.messages.filter(m => 
      userConvs.includes(m.conversation_id) && 
      m.sender_id !== userId &&
      m.status === 'sent'
    );
  }

  public deleteConversation(conversationId: string, deleteForBoth = true, userId?: string): boolean {
    if (deleteForBoth) {
      // Remove all messages
      this.data.messages = this.data.messages.filter(m => m.conversation_id !== conversationId);
      // Remove conversation
      const idx = this.data.conversations.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        this.data.conversations.splice(idx, 1);
      }
    } else if (userId) {
      // Remove user from members
      const conv = this.data.conversations.find(c => c.id === conversationId);
      if (conv) {
        conv.members = conv.members.filter(m => m !== userId);
        if (conv.members.length === 0) {
          this.data.conversations = this.data.conversations.filter(c => c.id !== conversationId);
          this.data.messages = this.data.messages.filter(m => m.conversation_id !== conversationId);
        }
      }
    }
    this.save();
    return true;
  }

  public clearConversationHistory(conversationId: string): boolean {
    this.data.messages = this.data.messages.filter(m => m.conversation_id !== conversationId);
    this.save();
    return true;
  }

  public findMessageById(messageId: string): Message | undefined {
    return this.data.messages.find(m => m.id === messageId);
  }

  public editMessage(messageId: string, newCiphertext: string, newIv?: string): Message | undefined {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (!msg) return undefined;

    msg.ciphertext = newCiphertext;
    if (newIv) msg.iv = newIv;
    msg.edited_at = new Date().toISOString();
    this.save();
    return msg;
  }

  public markMessagesAsRead(conversationId: string, readerUserId: string): void {
    let changed = false;
    this.data.messages.forEach(m => {
      if (m.conversation_id === conversationId && m.sender_id !== readerUserId && m.status !== 'read') {
        m.status = 'read';
        changed = true;
      }
    });
    if (changed) this.save();
  }

  // VIEW-ONCE SELF-DESTRUCTING CONSUME
  public markViewOnceConsumed(messageId: string, viewerId: string): Message | undefined {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (!msg || !msg.view_once) return undefined;

    if (!msg.viewed_by) msg.viewed_by = [];
    if (!msg.viewed_by.includes(viewerId)) {
      msg.viewed_by.push(viewerId);
    }
    // Delete media and ciphertext completely for zero trace
    msg.media_url = undefined;
    msg.ciphertext = '[View Once Expired]';
    this.save();
    return msg;
  }

  // SAVED MESSAGES VAULT
  public toggleSaveMessage(userId: string, messageId: string): boolean {
    if (!this.data.saved_messages) this.data.saved_messages = {};
    if (!this.data.saved_messages[userId]) this.data.saved_messages[userId] = [];

    const list = this.data.saved_messages[userId];
    const idx = list.indexOf(messageId);
    let isSaved = false;
    if (idx >= 0) {
      list.splice(idx, 1);
      isSaved = false;
    } else {
      list.push(messageId);
      isSaved = true;
    }
    this.save();
    return isSaved;
  }

  public getSavedMessages(userId: string): Message[] {
    if (!this.data.saved_messages || !this.data.saved_messages[userId]) return [];
    const ids = this.data.saved_messages[userId];
    return this.data.messages.filter(m => ids.includes(m.id));
  }

  // AUTO-SAVE CHAT CONTACTS
  public autoSaveChatContact(userAId: string, userBId: string) {
    const userA = this.findUserById(userAId);
    const userB = this.findUserById(userBId);
    if (userA) {
      if (!userA.contacts) userA.contacts = [];
      if (!userA.contacts.includes(userBId)) {
        userA.contacts.push(userBId);
      }
    }
    if (userB) {
      if (!userB.contacts) userB.contacts = [];
      if (!userB.contacts.includes(userAId)) {
        userB.contacts.push(userAId);
      }
    }
    this.save();
  }

  // SPYTUS 24-HOUR STORIES
  public createSpytusStory(story: SpytusStory): SpytusStory {
    if (!this.data.spytus_stories) this.data.spytus_stories = [];
    this.data.spytus_stories.push(story);
    this.save();
    return story;
  }

  public getActiveSpytusStories(requestUserId?: string): Array<SpytusStory & { user?: Partial<User> }> {
    if (!this.data.spytus_stories) this.data.spytus_stories = [];
    const now = Date.now();
    return this.data.spytus_stories
      .filter(s => {
        // Guaranteed 24-Hour Expiration Check
        const storyCreated = new Date(s.created_at).getTime();
        const storyExpiry = s.expires_at ? new Date(s.expires_at).getTime() : (storyCreated + 24 * 60 * 60 * 1000);
        if (now > storyExpiry && (now - storyCreated > 24 * 60 * 60 * 1000)) return false;

        // Author always sees their own story
        if (!requestUserId || s.user_id === requestUserId) return true;

        const privacy = s.privacy_type || 'all';

        if (privacy === 'blacklist') {
          if (s.privacy_users && s.privacy_users.includes(requestUserId)) return false;
        } else if (privacy === 'whitelist') {
          if (!s.privacy_users || !s.privacy_users.includes(requestUserId)) return false;
        }

        return true;
      })
      .map(s => {
        const user = this.findUserById(s.user_id);
        return {
          ...s,
          user: user ? {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_id: user.avatar_id
          } : undefined
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public viewSpytusStory(storyId: string, viewerId: string): boolean {
    if (!this.data.spytus_stories) return false;
    const story = this.data.spytus_stories.find(s => s.id === storyId);
    if (!story) return false;
    if (!story.viewers) story.viewers = [];
    if (!story.viewers.includes(viewerId)) {
      story.viewers.push(viewerId);
      this.save();
    }
    return true;
  }

  public deleteSpytusStory(storyId: string, userId: string): boolean {
    if (!this.data.spytus_stories) return false;
    this.data.spytus_stories = this.data.spytus_stories.filter(s => !(s.id === storyId && s.user_id === userId));
    this.save();
    return true;
  }

  // CALL LOGS
  public createCallLog(call: CallLog): CallLog {
    this.data.calls.push(call);
    this.save();
    return call;
  }

  public getUserCalls(userId: string): Array<CallLog & { peer?: Partial<User> }> {
    return this.data.calls
      .filter(c => c.caller_id === userId || c.receiver_id === userId)
      .map(c => {
        const peerId = c.caller_id === userId ? c.receiver_id : c.caller_id;
        const peer = this.findUserById(peerId);
        return {
          ...c,
          peer: peer ? {
            id: peer.id,
            username: peer.username,
            display_name: peer.display_name,
            avatar_id: peer.avatar_id
          } : undefined
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public deleteCallLog(callId: string, userId: string): boolean {
    const idx = this.data.calls.findIndex(c => c.id === callId && (c.caller_id === userId || c.receiver_id === userId));
    if (idx !== -1) {
      this.data.calls.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  public clearUserCalls(userId: string): boolean {
    this.data.calls = this.data.calls.filter(c => !(c.caller_id === userId || c.receiver_id === userId));
    this.save();
    return true;
  }

  // ==========================================
  // --- SUPER ADMIN & MODERATION METHODS ---
  // ==========================================

  public getAllUsersAdmin(): User[] {
    return this.data.users.map(u => ({ ...u }));
  }

  public banUser(userId: string, reason: string = 'Violation of Privacy Terms'): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    user.is_banned = true;
    user.ban_reason = reason;
    user.banned_at = new Date().toISOString();
    // Invalidate active sessions
    this.data.sessions = this.data.sessions.filter(s => s.user_id !== userId);
    this.save();
    return true;
  }

  public unbanUser(userId: string): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    user.is_banned = false;
    user.ban_reason = undefined;
    user.banned_at = undefined;
    this.save();
    return true;
  }

  public deleteUserAdmin(userId: string): boolean {
    const idx = this.data.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      this.data.users.splice(idx, 1);
      this.data.sessions = this.data.sessions.filter(s => s.user_id !== userId);
      this.save();
      return true;
    }
    return false;
  }

  public banIp(ip: string): boolean {
    if (!this.data.banned_ips) this.data.banned_ips = [];
    const cleanIp = ip.trim();
    if (cleanIp && !this.data.banned_ips.includes(cleanIp)) {
      this.data.banned_ips.push(cleanIp);
      this.save();
      return true;
    }
    return false;
  }

  public unbanIp(ip: string): boolean {
    if (!this.data.banned_ips) return false;
    const initialLen = this.data.banned_ips.length;
    this.data.banned_ips = this.data.banned_ips.filter(item => item !== ip.trim());
    if (this.data.banned_ips.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public isIpBanned(ip: string): boolean {
    if (!this.data.banned_ips || !ip) return false;
    const clean = ip.trim().replace(/^::ffff:/, '');
    return this.data.banned_ips.some(banned => {
      const bClean = banned.trim().replace(/^::ffff:/, '');
      return bClean === clean || clean.includes(bClean);
    });
  }

  public getBannedIps(): string[] {
    return this.data.banned_ips || [];
  }

  public blacklistPhone(phone: string): boolean {
    if (!this.data.blacklisted_phones) this.data.blacklisted_phones = [];
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (cleanPhone && !this.data.blacklisted_phones.includes(cleanPhone)) {
      this.data.blacklisted_phones.push(cleanPhone);
      this.save();
      return true;
    }
    return false;
  }

  public unblacklistPhone(phone: string): boolean {
    if (!this.data.blacklisted_phones) return false;
    const initialLen = this.data.blacklisted_phones.length;
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    this.data.blacklisted_phones = this.data.blacklisted_phones.filter(p => p !== cleanPhone);
    if (this.data.blacklisted_phones.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public isPhoneBlacklisted(phone: string): boolean {
    if (!this.data.blacklisted_phones || !phone) return false;
    const clean = phone.trim().replace(/\s+/g, '');
    return this.data.blacklisted_phones.includes(clean);
  }

  public getBlacklistedPhones(): string[] {
    return this.data.blacklisted_phones || [];
  }

  public getAdminTelemetry(): {
    total_users: number;
    banned_users: number;
    banned_ips_count: number;
    blacklisted_phones_count: number;
    total_conversations: number;
    total_messages: number;
    total_calls: number;
    total_active_sessions: number;
    total_spytus_stories: number;
  } {
    return {
      total_users: this.data.users.length,
      banned_users: this.data.users.filter(u => u.is_banned).length,
      banned_ips_count: (this.data.banned_ips || []).length,
      blacklisted_phones_count: (this.data.blacklisted_phones || []).length,
      total_conversations: this.data.conversations.length,
      total_messages: this.data.messages.length,
      total_calls: this.data.calls.length,
      total_active_sessions: this.data.sessions.length,
      total_spytus_stories: (this.data.spytus_stories || []).length
    };
  }
}

export const db = new Database();
