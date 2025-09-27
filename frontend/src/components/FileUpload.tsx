"use client";
import React, { useRef, useState } from 'react';
import { getSocket } from '../lib/socket';

interface FileUploadProps {
	onUploaded?: (fileInfo: { name: string; size: number; url?: string }) => void;
	multiple?: boolean;
}

export default function FileUpload({ onUploaded, multiple }: FileUploadProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [uploading, setUploading] = useState(false);

	const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		setUploading(true);
		try {
			// Placeholder: emit via socket; real implementation would POST to file-service
			const socket = getSocket();
			Array.from(files).forEach(f => {
				socket?.emit('upload-placeholder', { name: f.name, size: f.size });
				onUploaded?.({ name: f.name, size: f.size });
			});
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = '';
		}
	};

	return (
		<div className="flex items-center space-x-2">
			<input
				ref={inputRef}
				type="file"
				onChange={handleChange}
				multiple={multiple}
				className="text-sm"
			/>
			{uploading && <span className="text-xs text-gray-500">Uploading...</span>}
		</div>
	);
}
