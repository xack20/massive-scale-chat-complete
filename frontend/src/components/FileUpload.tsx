"use client";
import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { getSocket } from '../lib/socket';

interface FileUploadProps {
	onUploaded?: (fileInfo: { name: string; size: number; url?: string }) => void;
	multiple?: boolean;
}

export default function FileUpload({ onUploaded, multiple }: FileUploadProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [uploading, setUploading] = useState(false);

	const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		setUploading(true);
		try {
			const socket = getSocket();
			for (let index = 0; index < files.length; index++) {
				const file = files.item(index);
				if (!file) continue;
				socket?.emit('upload-placeholder', { name: file.name, size: file.size });
				onUploaded?.({ name: file.name, size: file.size });
			}
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = '';
		}
	};

	return (
		<div className="relative flex items-center">
			<label className="group relative inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-all duration-200 hover:border-indigo-400/60 hover:bg-white/20 hover:text-white">
				<span className="text-base">📎</span>
				<span className="hidden sm:inline">Attach</span>
				<input
					ref={inputRef}
					type="file"
					onChange={handleChange}
					multiple={multiple}
					className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
				/>
			</label>
			{uploading && (
				<span className="ml-3 animate-pulse text-xs font-medium text-indigo-300">Uploading…</span>
			)}
		</div>
	);
}
