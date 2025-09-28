'use client';

import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { Message } from '../types';
import { formatDate } from '../lib/utils';

interface MessageSearchProps {
  conversationId?: string;
  onSelectMessage?: (message: Message) => void;
}

export default function MessageSearch({ conversationId, onSelectMessage }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await api.get('/messages/search', {
        params: {
          q: query,
          conversationId
        }
      });
      setResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [query, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-700"
        title="Search messages"
      >
        🔍
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search messages..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-4 max-h-96 overflow-y-auto">
                <div className="text-sm text-gray-500 mb-2">
                  Found {results.length} results
                </div>
                {results.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => {
                      onSelectMessage?.(message);
                      setIsOpen(false);
                    }}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm">{message.senderName}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(message.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mt-1 truncate">
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.length === 0 && query && !loading && (
              <div className="mt-4 text-center text-gray-500">
                No messages found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
