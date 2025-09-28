import Image from 'next/image';
import { cn, formatDate, getInitials } from '../lib/utils';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
  if (!messages.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-white/50 px-4">
        <div className="mb-4 h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-dashed border-white/20 bg-white/10" />
        <p className="text-base sm:text-lg font-medium text-white/70">Start a sparkling conversation</p>
        <p className="mt-1 max-w-xs text-sm text-white/60">Your messages will appear here instantly—try sharing a quick update or dropping an attachment.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {messages.map((message) => {
        const isOwn = currentUserId && message.senderId === currentUserId;
        const initials = getInitials(message.senderName ?? 'User');

        return (
          <div
            key={message.id}
            className={cn(
              'flex w-full items-end gap-2.5 sm:gap-3',
              isOwn ? 'flex-row-reverse text-right' : 'flex-row'
            )}
          >
            {message.senderAvatar ? (
              <Image
                src={message.senderAvatar}
                alt={message.senderName}
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/20 object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs sm:text-sm font-semibold text-white/80 flex-shrink-0">
                {initials}
              </div>
            )}

            <div className={cn('max-w-[75%] sm:max-w-[72%] space-y-1.5 sm:space-y-2', isOwn && 'items-end text-right')}>
              <div className={cn('flex items-center gap-1.5 sm:gap-2 text-xs uppercase tracking-widest text-white/40', isOwn && 'justify-end')}
              >
                <span className="font-semibold text-white/80 truncate">{message.senderName}</span>
                <span className="flex-shrink-0">{formatDate(message.createdAt)}</span>
              </div>
              <div
                className={cn(
                  'rounded-2xl sm:rounded-3xl border border-white/10 bg-white/10 px-3.5 py-2.5 sm:px-5 sm:py-3 text-sm leading-relaxed text-white/80 shadow-xl shadow-indigo-950/30 backdrop-blur-xl break-words',
                  isOwn && 'bg-gradient-to-br from-indigo-500/90 via-purple-500/90 to-pink-500/90 text-white shadow-indigo-600/30'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
