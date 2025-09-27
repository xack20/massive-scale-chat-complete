import { Message } from '../types';
import MessageInput from './MessageInput';
import MessageList from './MessageList';

interface ChatWindowProps {
	messages: Message[];
	title?: string;
}

export default function ChatWindow({ messages, title = 'Chat' }: ChatWindowProps) {
	return (
		<div className="flex flex-col h-full w-full">
			<header className="px-4 py-2 border-b border-border bg-background">
				<h2 className="font-semibold text-lg">{title}</h2>
			</header>
			<div className="flex-1 overflow-y-auto p-4">
				<MessageList messages={messages} />
			</div>
					<div className="p-4 border-t border-border">
						<MessageInput />
					</div>
		</div>
	);
}
