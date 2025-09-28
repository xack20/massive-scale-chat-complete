import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  type: 'direct' | 'group' | 'channel';
  name?: string;
  description?: string;
  avatar?: string;
  participants: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: Date;
    lastSeenAt?: Date;
    isActive: boolean;
  }>;
  lastMessage?: {
    messageId: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
  };
  settings?: {
    isPublic?: boolean;
    allowInvites?: boolean;
    muteNotifications?: boolean;
    autoDelete?: number; // hours
  };
  pinnedMessages?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  createdBy: string;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'channel'],
      required: true
    },
    name: {
      type: String,
      required: function() {
        return this.type !== 'direct';
      }
    },
    description: String,
    avatar: String,
    participants: [{
      userId: {
        type: String,
        required: true
      },
      userName: {
        type: String,
        required: true
      },
      userAvatar: String,
      role: {
        type: String,
        enum: ['admin', 'moderator', 'member'],
        default: 'member'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      lastSeenAt: Date,
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    lastMessage: {
      messageId: String,
      content: String,
      senderId: String,
      senderName: String,
      timestamp: Date
    },
    settings: {
      isPublic: {
        type: Boolean,
        default: false
      },
      allowInvites: {
        type: Boolean,
        default: true
      },
      muteNotifications: {
        type: Boolean,
        default: false
      },
      autoDelete: Number
    },
    pinnedMessages: [String],
    tags: [String],
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    },
    createdBy: {
      type: String,
      required: true
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    archivedAt: Date
  },
  {
    timestamps: true
  }
);

// Indexes
ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ isArchived: 1 });
ConversationSchema.index({ createdAt: -1 });
ConversationSchema.index({ 'lastMessage.timestamp': -1 });

// Optimized compound index for direct conversation lookups
ConversationSchema.index({ 
  type: 1, 
  'participants.userId': 1,
  isArchived: 1 
}, { 
  name: 'direct_conversation_lookup',
  background: true 
});

// Virtual for participant count
ConversationSchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Virtual for checking if conversation is active
ConversationSchema.virtual('isActive').get(function() {
  return !this.isArchived && this.participants.some(p => p.isActive);
});

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);