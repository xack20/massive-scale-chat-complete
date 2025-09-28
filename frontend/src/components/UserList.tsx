import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { cn, getInitials } from '../lib/utils';
import { User } from '../types';

interface UserListProps {
  className?: string;
}

export default function UserList({ className }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError("We couldn't refresh the roster just now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const onlineCount = users.filter((user: User) => Boolean(user.isOnline)).length;

  const getPresenceLabel = (user: User) => {
    if (user.isOnline) return 'Online now';
    if (!user.lastSeen) return 'Offline';
    try {
      return `Last seen ${formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}`;
    } catch (error) {
      console.warn('Failed to format last seen date for', user.username, error);
      return 'Offline';
    }
  };

  const handleUserClick = async (targetUser: User) => {
    try {
      // Get current user from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Create or find direct conversation with this user
      const response = await api.post('/messages/conversations/direct', {
        participantId: targetUser.id
      });
      
      const conversation = response.data;
      
      // Navigate to the conversation
      router.push(`/chat?conversation=${conversation.id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError('Failed to start conversation. Please try again.');
    }
  };

  const placeholders = Array.from({ length: 6 });

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
          <h2 className="text-base sm:text-lg font-semibold text-white">Active roster</h2>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
              onlineCount
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                : 'border-white/10 bg-white/5 text-white/60'
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                onlineCount ? 'bg-emerald-400 ring-2 ring-emerald-300/50 ring-offset-1 ring-offset-transparent' : 'bg-white/40'
              )}
            />
            <span>{onlineCount ? `${onlineCount} online` : 'Invite your team'}</span>
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void fetchUsers();
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
          : users.length > 0
            ? users.map((user: User) => {
                const displayName = user.fullName || user.username;
                const online = Boolean(user.isOnline);
                const presenceLabel = getPresenceLabel(user);

                return (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="group flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-transparent bg-white/0 px-2.5 py-2.5 sm:px-3 sm:py-3 transition duration-200 hover:border-white/20 hover:bg-white/5 w-full text-left cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
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
                          online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]' : 'bg-slate-500'
                        )}
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-white">{displayName}</span>
                      <span className="truncate text-xs text-white/60">{presenceLabel}</span>
                    </div>
                    {online && (
                      <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-200/80 flex-shrink-0">Live</span>
                    )}
                  </button>
                );
              })
            : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-white/60">
                <p className="text-sm font-medium">No teammates online yet</p>
                <p className="mt-2 text-xs text-white/40">Share an invite link to bring your crew into the conversation.</p>
              </div>
            )}
      </div>
    </div>
  );
}
