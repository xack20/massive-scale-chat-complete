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
        <div className="absolute bottom-full right-0 mb-3 w-72 rounded-3xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl shadow-indigo-900/40">
          <EmojiPicker onSelect={handleEmojiSelect} className="max-h-80 overflow-y-auto" />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="glass-panel flex flex-col gap-4 border border-white/10 bg-white/5 p-5"
      >
        <div className="flex items-center gap-3">
          <FileUpload
            multiple
            onUploaded={(file) => {
              setMessage((prev: string) => (prev ? `${prev} [${file.name}]` : `[${file.name}]`));
            }}
          />
          <button
            type="button"
            onClick={() => setShowEmoji((prev: boolean) => !prev)}
            className="secondary-button h-10 w-10 rounded-2xl border-white/15 bg-white/10 p-0 text-lg"
            aria-label="Toggle emoji picker"
          >
            <span role="img" aria-hidden="true">😊</span>
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs text-white/50">
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
          className="min-h-[96px] w-full resize-none rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-white/90 shadow-inner shadow-black/20 placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />

        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{message.length ? `${message.length}/1000` : 'Encrypted in transit'}</span>
          <button
            type="submit"
            className="primary-button px-6"
            disabled={!message.trim()}
          >
            Send message
          </button>
        </div>
      </form>
    </div>
  );
}
