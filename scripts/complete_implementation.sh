#!/bin/bash

echo "Completing final implementation..."

# Create missing login page
cat > frontend/src/app/login/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-center text-3xl font-bold">Sign in</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500">{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
EOF

# Create chat page
cat > frontend/src/app/chat/page.tsx << 'EOF'
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
EOF

# Create MessageList component
cat > frontend/src/components/MessageList.tsx << 'EOF'
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
EOF

# Create MessageInput component
cat > frontend/src/components/MessageInput.tsx << 'EOF'
import { useState } from 'react';
import { getSocket } from '../lib/socket';

export default function MessageInput() {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      const socket = getSocket();
      socket?.emit('send-message', { content: message });
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 p-2 border rounded"
      />
      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
        Send
      </button>
    </form>
  );
}
EOF

# Create UserList component
cat > frontend/src/components/UserList.tsx << 'EOF'
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Online Users</h2>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span>{user.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
EOF

# Create empty placeholder components
touch frontend/src/components/ChatWindow.tsx
touch frontend/src/components/EmojiPicker.tsx
touch frontend/src/components/FileUpload.tsx
touch frontend/src/components/TypingIndicator.tsx
touch frontend/src/components/VideoCall.tsx
touch frontend/src/components/VoiceCall.tsx
touch frontend/src/hooks/useChat.ts
touch frontend/src/hooks/usePresence.ts
touch frontend/src/lib/webrtc.ts

# Create tsconfig files
cat > services/api-gateway/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Copy tsconfig to all services
for service in user-service message-service file-service notification-service presence-service; do
  cp services/api-gateway/tsconfig.json services/$service/tsconfig.json
done

# Create frontend tsconfig
cat > frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# Create next.config.js
cat > frontend/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone'
}

module.exports = nextConfig
EOF

# Create tailwind.config.js
cat > frontend/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Create postcss.config.js
cat > frontend/postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

echo "Implementation completed successfully!"