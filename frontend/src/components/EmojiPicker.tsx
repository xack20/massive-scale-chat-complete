"use client";
import Picker, { EmojiClickData } from 'emoji-picker-react';

interface EmojiPickerProps {
	onSelect: (emoji: string) => void;
	className?: string;
}

export default function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
	const handleClick = (emojiData: EmojiClickData) => {
		onSelect(emojiData.emoji);
	};
	return (
		<div className={className}>
			<Picker onEmojiClick={handleClick} lazyLoadEmojis width="100%" />
		</div>
	);
}
