'use client';

import { useEffect, useMemo, useState } from 'react';
import MessageInput from '../../components/MessageInput';
import MessageList from '../../components/MessageList';
import UserList from '../../components/UserList';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { auth } from '../../lib/auth';
import { Message } from '../../types';

export default function ChatPage() {
  const { user } = useAuth();
  const token = auth.getToken() || undefined;
  const { socket, connected } = useSocket(token);
  const [messages, setMessages] = useState<Message[]>([]);

  const greetingName = useMemo(() => {
    const displayName = user?.fullName || user?.username;
    if (!displayName) return 'there';
    return displayName.split(' ')[0];
  }, [user?.fullName, user?.username]);

  const headline = user ? `Welcome back, ${greetingName}` : 'Welcome to the lounge';

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      setMessages((prev: Message[]) => {
        const exists = prev.some((item) => item.id === message.id);
        return exists ? prev : [...prev, message];
      });
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket]);

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
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  connected
                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                    : 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    connected
                      ? 'bg-emerald-400 ring-2 ring-emerald-300/60 ring-offset-1 ring-offset-transparent'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                {connected ? 'Connected' : 'Connecting…'}
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 md:px-8">
            <MessageList messages={messages} currentUserId={user?.id} />
          </div>

          <div className="border-t border-white/10 px-4 py-4 sm:px-6 sm:py-6 md:px-8">
            <MessageInput />
          </div>
        </main>

        <aside className="w-full lg:w-80 lg:flex-shrink-0 order-first lg:order-last">
          <UserList className="h-64 sm:h-80 lg:h-full" />
        </aside>
      </div>
    </div>
  );
}
