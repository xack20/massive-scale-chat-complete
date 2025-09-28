'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

interface ConnectionStatusProps {
  className?: string;
}

export default function ConnectionStatus({ className }: ConnectionStatusProps) {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    
    if (!socket) {
      setStatus('disconnected');
      return;
    }

    const updateStatus = () => {
      if (socket.connected) {
        setStatus('connected');
        setError(null);
      } else if (socket.disconnected) {
        setStatus('disconnected');
      } else {
        setStatus('connecting');
      }
    };

    updateStatus();

    socket.on('connect', () => {
      setStatus('connected');
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      setStatus('disconnected');
      if (reason === 'io server disconnect') {
        setError('Server disconnected');
      }
    });

    socket.on('connect_error', (err) => {
      setStatus('error');
      setError(err.message || 'Connection failed');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200';
      case 'connecting':
        return 'border-amber-400/30 bg-amber-500/15 text-amber-200';
      case 'error':
        return 'border-red-400/30 bg-red-500/15 text-red-200';
      default:
        return 'border-gray-400/30 bg-gray-500/15 text-gray-200';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return error || 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-400 ring-2 ring-emerald-300/60 ring-offset-1 ring-offset-transparent';
      case 'connecting':
        return 'bg-amber-400 animate-pulse';
      case 'error':
        return 'bg-red-400 animate-pulse';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusColor()} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${getStatusIcon()}`} />
      {getStatusText()}
    </div>
  );
}