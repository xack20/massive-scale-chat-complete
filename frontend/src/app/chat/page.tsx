'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import ConnectionStatus from '../../components/ConnectionStatus';
import ConversationList from '../../components/ConversationList';
import MessageInput from '../../components/MessageInput';
import MessageList from '../../components/MessageList';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useEncryption } from '../../hooks/useEncryption';
import { useSocket } from '../../hooks/useSocket';
import { auth } from '../../lib/auth';

function ChatContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation');
  const recipientUserId = searchParams.get('recipient');
  const token = auth.getToken() || undefined;
  const { socket, connected } = useSocket(token);
  const { messages, sendMessage } = useChat(conversationId || undefined);
  const { isSupported: encryptionSupported, isReady: encryptionReady } = useEncryption();

  const greetingName = useMemo(() => {
    const displayName = user?.fullName || user?.username;
    if (!displayName) return 'there';
    return displayName.split(' ')[0];
  }, [user?.fullName, user?.username]);

  const headline = conversationId
    ? 'Direct Message'
    : user
      ? `Welcome back, ${greetingName}`
      : 'Welcome to the lounge';

  return (
    <div className="relative min-h-screen overflow-hidden px-2 py-4 sm:px-4 sm:py-6 md:px-8 lg:px-12 lg:py-10">     
      <div
        className="pointer-events-none absolute inset-0 bg-aurora opacity-30 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6 lg:h-[calc(100vh-5rem)] lg:flex-row">
        <main className="glass-panel flex flex-1 flex-col overflow-hidden border-white/10 bg-slate-950/40 min-h-[60vh] lg:min-h-0">
          <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">Live conversation</p>  
              <h1 className="text-xl sm:text-2xl font-semibold text-white truncate">{headline}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 md:inline">
                {messages.length ? `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}` : 'No messages yet'}
              </span>
              <ConnectionStatus socket={socket} connected={connected} />
              {user && (
                <Link
                  href="/profile"
                  className="rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-200 transition-colors hover:border-blue-400/50 hover:bg-blue-500/25"
                  title={`Profile for ${user.username}`}
                >
                  <span className="hidden sm:inline">Profile</span>
                  <span className="sm:hidden">👤</span>
                </Link>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 md:px-8">
            <MessageList messages={messages} currentUserId={user?.id} />
          </div>

          <div className="border-t border-white/10 px-4 py-4 sm:px-6 sm:py-6 md:px-8">
            <MessageInput
              conversationId={conversationId || undefined}
              onSendMessage={sendMessage}
              recipientUserId={recipientUserId || undefined}
              encryptionEnabled={encryptionSupported && encryptionReady}
            />
          </div>
        </main>

        <aside className="w-full lg:w-80 lg:flex-shrink-0 order-first lg:order-last">
         <ConversationList className="h-64 sm:h-80 lg:h-full" />
        </aside>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Loading...</div>}>    
      <ChatContent />
    </Suspense>
  );
}
