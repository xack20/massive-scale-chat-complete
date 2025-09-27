"use client";

interface TypingIndicatorProps {
	users: string[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
	if (!users.length) return null;
	return (
		<div className="text-xs text-gray-500 px-2 py-1">
			{users.join(', ')} typing...
		</div>
	);
}
