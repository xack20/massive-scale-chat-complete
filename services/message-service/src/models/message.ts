import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId?: string;
  recipientName?: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'audio' | 'system';
  attachments?: Array<{
    url: string;
    name: string;
    size: number;
    mimeType: string;
  }>;
  replyTo?: string;
  threadId?: string;
  reactions?: Array<{
    userId: string;
    userName: string;
    emoji: string;
    timestamp: Date;
  }>;
  mentions?: string[];
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;
  editedAt?: Date;
  deletedAt?: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true
    },
    senderId: {
      type: String,
      required: true,
      index: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderAvatar: String,
    recipientId: {
      type: String,
      index: true
    },
    recipientName: String,
    content: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'audio', 'system'],
      default: 'text'
    },
    attachments: [{
      url: String,
      name: String,
      size: Number,
      mimeType: String
    }],
    replyTo: {
      type: String,
      ref: 'Message'
    },
    threadId: {
      type: String,
      index: true
    },
    reactions: [{
      userId: String,
      userName: String,
      emoji: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    mentions: [String],
    readBy: [{
      userId: String,
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    editedAt: Date,
    deletedAt: Date,
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, createdAt: -1 });
MessageSchema.index({ threadId: 1, createdAt: -1 });
MessageSchema.index({ 'readBy.userId': 1 });
MessageSchema.index({ deletedAt: 1 });

// Virtual for checking if message is deleted
MessageSchema.virtual('isDeleted').get(function() {
  return !!this.deletedAt;
});

// Virtual for checking if message is edited
MessageSchema.virtual('isEdited').get(function() {
  return !!this.editedAt;
});

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
