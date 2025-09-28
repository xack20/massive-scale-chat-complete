"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import { getSocket } from '../lib/socket';
import EmojiPicker from './EmojiPicker';
import FileUpload from './FileUpload';

export default function MessageInput() {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const emitMessage = () => {
    if (!message.trim()) return;
    const socket = getSocket();
    socket?.emit('send-message', { content: message.trim() });
    setMessage('');
    composerRef.current?.focus();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    emitMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      emitMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev: string) => `${prev}${emoji}`);
    setShowEmoji(false);
    composerRef.current?.focus();
  };

  return (
    <div className="relative">
      {showEmoji && (
        <div className="absolute bottom-full right-0 mb-3 w-64 sm:w-72 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/95 p-2 sm:p-3 shadow-2xl shadow-indigo-900/40 z-50">
          <EmojiPicker onSelect={handleEmojiSelect} className="max-h-60 sm:max-h-80 overflow-y-auto" />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="glass-panel flex flex-col gap-3 sm:gap-4 border border-white/10 bg-white/5 p-3 sm:p-5"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <FileUpload
            multiple
            onUploaded={(file) => {
              setMessage((prev: string) => (prev ? `${prev} [${file.name}]` : `[${file.name}]`));
            }}
          />
          <button
            type="button"
            onClick={() => setShowEmoji((prev: boolean) => !prev)}
            className="secondary-button h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl border-white/15 bg-white/10 p-0 text-base sm:text-lg flex-shrink-0"
            aria-label="Toggle emoji picker"
          >
            <span role="img" aria-hidden="true">😊</span>
          </button>
          <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-white/50">
            <span>Shift + Enter for newline</span>
          </div>
        </div>

        <textarea
          ref={composerRef}
          value={message}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Compose a message, share a link, or @mention a teammate..."
          rows={3}
          maxLength={1000}
          className="min-h-[80px] sm:min-h-[96px] w-full resize-none rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-white/90 shadow-inner shadow-black/20 placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-white/60">
          <span className="order-2 sm:order-1">{message.length ? `${message.length}/1000` : 'Encrypted in transit'}</span>
          <button
            type="submit"
            className="primary-button px-4 py-2 sm:px-6 text-sm order-1 sm:order-2"
            disabled={!message.trim()}
          >
            <span className="sm:hidden">Send</span>
            <span className="hidden sm:inline">Send message</span>
          </button>
        </div>
      </form>
    </div>
  );
}
