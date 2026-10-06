export interface User {
  id: number;
  username: string;
  phone: string;
  display_name: string;
  avatar_url?: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export interface UserSearchItem extends User {
  is_contact: boolean;
}

export interface Contact {
  id: number;
  user_id: number;
  contact_user_id: number;
  contact_user: User;
  created_at: string;
}

export interface MessageReply {
  id: number;
  content: string;
  sender_id: number;
  sender_name?: string | null;
}

export interface MessageRead {
  id: number;
  message_id: number;
  user_id: number;
  read_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: "text" | "image" | "system";
  status: "sending" | "sent" | "delivered" | "read";
  reply_to_id?: number | null;
  reply_to?: MessageReply | null;
  created_at: string;
  updated_at: string;
  sender: User;
  reads: MessageRead[];
  temp_id?: string;
}

export interface ConversationMember {
  id: number;
  user_id: number;
  role: "admin" | "member";
  joined_at: string;
  user: User;
}

export interface Conversation {
  id: number;
  type: "direct" | "group";
  name?: string | null;
  avatar_url?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message?: Message | null;
  unread_count: number;
  other_user?: User | null;
}

export interface UserSettings {
  id: number;
  user_id: number;
  read_receipts: boolean;
  last_seen_privacy: boolean;
  typing_indicator_privacy: boolean;
  theme: "light" | "dark";
  sound_enabled: boolean;
  notifications_enabled: boolean;
}

export interface TypingEvent {
  conversation_id: number;
  user_id: number;
  display_name: string;
  is_typing: boolean;
}

export interface StatusChangeEvent {
  user_id: number;
  is_online: boolean;
  last_seen: string;
}

export interface MessagesReadEvent {
  conversation_id: number;
  user_id: number;
  message_ids: number[];
  read_at: string;
}
