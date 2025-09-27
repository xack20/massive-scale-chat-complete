import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
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

  const placeholders = Array.from({ length: 6 });

  return (
    <div
      className={cn(
        'glass-panel flex h-full flex-col overflow-hidden border-white/10 bg-slate-950/40 p-6 text-white',
        className
      )}
    >
  <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">Now chatting</p>
          <h2 className="text-lg font-semibold text-white">Active roster</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
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
            {onlineCount ? `${onlineCount} online` : 'Invite your team'}
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void fetchUsers();
            }}
            className={cn('secondary-button h-9 px-3 text-xs', loading && 'pointer-events-none opacity-60')}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          {error}
        </div>
      )}

      <div className="mt-6 flex-1 space-y-2 overflow-y-auto pr-2">
        {loading
          ? placeholders.map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-3 opacity-80 animate-pulse"
              >
                <div className="h-10 w-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded-full bg-white/10" />
                  <div className="h-2 w-32 rounded-full bg-white/5" />
                </div>
              </div>
            ))
          : users.length > 0
            ? users.map((user: User) => {
                const displayName = user.fullName || user.username;
                const online = Boolean(user.isOnline);
                const presenceLabel = getPresenceLabel(user);

                return (
                  <div
                    key={user.id}
                    className="group flex items-center gap-3 rounded-2xl border border-transparent bg-white/0 px-3 py-3 transition duration-200 hover:border-white/20 hover:bg-white/5"
                  >
                    <div className="relative">
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={displayName}
                          width={40}
                          height={40}
                          unoptimized
                          className="h-10 w-10 rounded-full border border-white/15 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white/80">
                          {getInitials(displayName)}
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-slate-950/80',
                          online ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.45)]' : 'bg-slate-500'
                        )}
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-white">{displayName}</span>
                      <span className="truncate text-xs text-white/60">{presenceLabel}</span>
                    </div>
                    {online && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-200/80">Live</span>
                    )}
                  </div>
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
