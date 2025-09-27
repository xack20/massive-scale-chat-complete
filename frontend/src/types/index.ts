export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'audio' | 'system';
  attachments?: Attachment[];
  reactions?: Reaction[];
  readBy?: ReadReceipt[];
  createdAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

export interface Attachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface Reaction {
  userId: string;
  userName: string;
  emoji: string;
  timestamp: Date;
}

export interface ReadReceipt {
  userId: string;
  readAt: Date;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name?: string;
  avatar?: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Participant {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
  isActive: boolean;
}
