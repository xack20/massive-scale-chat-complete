import { Message } from '../types';
import { formatDate } from '../lib/utils';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="flex items-start space-x-3">
          <img
            src={message.senderAvatar || '/default-avatar.png'}
            alt={message.senderName}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">{message.senderName}</span>
              <span className="text-sm text-gray-500">{formatDate(message.createdAt)}</span>
            </div>
            <p className="text-gray-800">{message.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
