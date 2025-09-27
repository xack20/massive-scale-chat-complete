'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import MessageList from '../../components/MessageList';
import MessageInput from '../../components/MessageInput';
import UserList from '../../components/UserList';

export default function ChatPage() {
  const { user } = useAuth();
  const { socket, connected } = useSocket(user?.token);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (socket) {
      socket.on('new-message', (message) => {
        setMessages(prev => [...prev, message]);
      });
    }
  }, [socket]);

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-100">
        <UserList />
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="bg-white shadow p-4">
          <h1 className="text-xl font-bold">Chat Room</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <MessageList messages={messages} />
        </div>
        <div className="p-4">
          <MessageInput />
        </div>
      </main>
    </div>
  );
}
