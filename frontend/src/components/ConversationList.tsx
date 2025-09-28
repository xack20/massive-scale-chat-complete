import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePresence } from '../hooks/usePresence';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { cn, getInitials } from '../lib/utils';
import { User } from '../types';

interface ConversationItem {
  id: string;
  type: 'direct' | 'group' | 'channel';
  otherParticipant?: {
    userId: string;
    userName: string;
    userAvatar?: string;
  };
  lastMessage?: {
    content: string;
    timestamp: Date;
  };
  messageCount: number;
}

interface ConversationListProps {
  className?: string;
}

export default function ConversationList({ className }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();
  const { onlineUsers } = usePresence();
  const { user: currentUser, loading: authLoading } = useAuth();

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await api.get('/messages/conversations');
      setConversations(response.data.conversations || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError("We couldn't load your conversations.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get('/users', {
        params: { search: query }
      });
      // Filter out current user from search results
      const filteredResults = (response.data.users || []).filter(
        (user: User) => user.id !== currentUser?.id
      );
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Failed to search users:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      void fetchConversations();
    }
  }, [fetchConversations, authLoading, currentUser]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        void searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchUsers]);

  const handleConversationClick = (conversationId: string) => {
    router.push(`/chat?conversation=${conversationId}`);
  };

  const handleUserClick = async (targetUser: User) => {
    try {
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Creating conversation with user:', targetUser);
      
      const response = await api.post('/messages/conversations/direct', {
        participantId: targetUser.id,
        participantName: targetUser.fullName || targetUser.username
      });
      
      const conversation = response.data;
      const conversationId = conversation.id || conversation._id;
      
      if (!conversationId) {
        throw new Error('No conversation ID returned from server');
      }
      
      // Close search and navigate to conversation
      setShowSearch(false);
      setSearchQuery('');
      router.push(`/chat?conversation=${conversationId}`);
    } catch (error: unknown) {
      console.error('Failed to create conversation:', error);
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosError?.response?.data?.message || axiosError?.message || 'Failed to start conversation. Please try again.';
      setError(errorMessage);
    }
  };

  const getPresenceLabel = (userId: string) => {
    const isOnline = onlineUsers.includes(userId);
    return isOnline ? 'Online' : 'Offline';
  };

  const placeholders = Array.from({ length: 3 });

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'glass-panel flex h-full flex-col overflow-hidden border-white/10 bg-slate-950/40 p-4 sm:p-6 text-white',
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">Now chatting</p>
          <h2 className="text-base sm:text-lg font-semibold text-white">Conversations</h2>
        </div>

        {/* Search Section */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users to start a chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/60"></div>
              </div>
            )}
          </div>

          {/* Search Results */}
          {showSearch && (searchQuery || searchResults.length > 0) && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
              {searchResults.length > 0 ? (
                <div className="space-y-1 p-2">
                  {searchResults.map((user) => {
                    const isOnline = onlineUsers.includes(user.id);
                    const displayName = user.fullName || user.username;
                    
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className="flex w-full items-center gap-3 rounded-lg bg-white/0 p-2 text-left transition-colors hover:bg-white/10"
                      >
                        <div className="relative flex-shrink-0">
                          {user.avatar ? (
                            <Image
                              src={user.avatar}
                              alt={displayName}
                              width={32}
                              height={32}
                              unoptimized
                              className="h-8 w-8 rounded-full border border-white/15 object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white/80">
                              {getInitials(displayName)}
                            </div>
                          )}
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-slate-950/80',
                              isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{displayName}</p>
                          <p className="truncate text-xs text-white/60">{getPresenceLabel(user.id)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchQuery ? (
                <div className="p-4 text-center text-sm text-white/60">
                    No users found for &ldquo;{searchQuery}&rdquo;
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/60">
            <span className="h-2 w-2 rounded-full bg-white/40" />
            <span>{conversations.length} conversations</span>
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void fetchConversations();
            }}
            className={cn('secondary-button h-8 px-2.5 text-xs', loading && 'pointer-events-none opacity-60')}
          >
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          {error}
        </div>
      )}

      <div className="mt-4 sm:mt-6 flex-1 space-y-1.5 sm:space-y-2 overflow-y-auto pr-1 sm:pr-2">
        {loading
          ? placeholders.map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/5 bg-white/5 px-2.5 py-2.5 sm:px-3 sm:py-3 opacity-80 animate-pulse"
              >
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="h-3 w-20 sm:w-24 rounded-full bg-white/10" />
                  <div className="h-2 w-24 sm:w-32 rounded-full bg-white/5" />
                </div>
              </div>
            ))
          : conversations.length > 0
            ? conversations.map((conversation) => {
                const otherParticipant = conversation.otherParticipant;
                if (!otherParticipant) return null;

                const displayName = otherParticipant.userName;
                const isOnline = onlineUsers.includes(otherParticipant.userId);
                const lastMessageTime = conversation.lastMessage?.timestamp
                  ? formatDistanceToNow(new Date(conversation.lastMessage.timestamp), { addSuffix: true })
                  : 'No messages';

                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation.id)}
                    className="group flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-transparent bg-white/0 px-2.5 py-2.5 sm:px-3 sm:py-3 transition duration-200 hover:border-white/20 hover:bg-white/5 w-full text-left cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      {otherParticipant.userAvatar ? (
                        <Image
                          src={otherParticipant.userAvatar}
                          alt={displayName}
                          width={32}
                          height={32}
                          unoptimized
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/15 object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs sm:text-sm font-semibold text-white/80">
                          {getInitials(displayName)}
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border border-slate-950/80',
                          isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]' : 'bg-slate-500'
                        )}
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-white">{displayName}</span>
                      <span className="truncate text-xs text-white/60">
                        {conversation.lastMessage?.content || 'Start a conversation'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-white/50">{lastMessageTime}</span>
                      {isOnline && (
                        <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-200/80">Live</span>
                      )}
                    </div>
                  </button>
                );
              })
            : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-white/60">
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="mt-2 text-xs text-white/40">Search for users above to start chatting, or wait for someone to message you.</p>
              </div>
            )}
      </div>

      {/* Current User Profile Section */}
      {currentUser && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="relative flex-shrink-0">
              {currentUser.avatar ? (
                <Image
                  src={currentUser.avatar}
                  alt={currentUser.fullName || currentUser.username}
                  width={32}
                  height={32}
                  unoptimized
                  className="h-8 w-8 rounded-full border border-white/15 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white/80">
                  {getInitials(currentUser.fullName || currentUser.username)}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-slate-950/80 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-white">
                {currentUser.fullName || currentUser.username}
              </span>
              <span className="truncate text-xs text-emerald-200/80">You • Online</span>
            </div>
            <button
              onClick={() => auth.logout()}
              className="flex-shrink-0 rounded-lg border border-red-400/30 bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-200 transition-colors hover:border-red-400/50 hover:bg-red-500/25"
              title="Logout"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">↗</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}