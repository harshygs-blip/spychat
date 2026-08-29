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
  trigger: string; // e.g. "price", "/catalog", "help"
  response: string;
  message_type?: 'text' | 'image' | 'video' | 'voice' | 'product';
  media_url?: string;
}

export interface User {
  id: string;
  username: string; // e.g. "ghost_49"
  display_name: string;
  avatar_id: string;
  email?: string;
  public_key?: string;
  last_seen?: string;
  app_pin?: string; // 4-digit security PIN
  privacy?: {
    last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
    online_status_visibility: 'everyone' | 'contacts' | 'nobody';
    read_receipts: boolean;
    typing_indicator: boolean;
  };
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

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  members: string[];
  unread_count?: number;
  last_message?: Message;
  peer?: User;
  pinned_by?: string[];
  labels?: Record<string, string[]>;
  disappearing_timer_seconds?: number;
}

export interface SpytusStory {
  id: string;
  user_id: string;
  media_type: 'image' | 'video' | 'text';
  media_url?: string;
  text_content?: string;
  background_gradient?: string;
  caption?: string;
  viewers: string[];
  created_at: string;
  expires_at: string;
  user?: User;
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
  ciphertext: string; // Encrypted string
  iv?: string; // AES-GCM IV
  decrypted_text?: string; // Decrypted on client
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
  expires_at?: string;
  edited_at?: string;
  deleted_for_everyone?: boolean;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
}

export type CallState = 
  | 'IDLE' 
  | 'CALLING' 
  | 'RINGING' 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'ENDING' 
  | 'ENDED'
  | 'DECLINED'
  | 'BUSY';

export interface ActiveCall {
  peerUser: User;
  callType: 'audio' | 'video';
  isCaller: boolean;
  state: CallState;
  startTime?: number;
}

export interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  type: 'audio' | 'video';
  status: 'completed' | 'missed' | 'declined' | 'busy';
  duration_seconds: number;
  created_at: string;
  peer?: User;
}
