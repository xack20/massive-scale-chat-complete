'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import { getSocket } from '../lib/socket';

interface VideoCallProps {
  conversationId: string;
  userId: string;
  onEnd?: () => void;
}

export default function VideoCall({ conversationId, userId, onEnd }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [calling, setCalling] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Request user media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error('Failed to get user media:', err));

    // Socket event handlers
    socket.on('video-offer', handleVideoOffer);
    socket.on('video-answer', handleVideoAnswer);
    socket.on('video-ice-candidate', handleIceCandidate);
    socket.on('video-end', handleCallEnd);

    return () => {
      socket.off('video-offer');
      socket.off('video-answer');
      socket.off('video-ice-candidate');
      socket.off('video-end');
      endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVideoOffer = () => {
    setReceiving(true);
    // Handle incoming call offer
  };

  const handleVideoAnswer = (data: { signal: any }) => {
    if (peerRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      peerRef.current.signal(data.signal);
    }
  };

  const handleIceCandidate = (data: { candidate: any }) => {
    if (peerRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      peerRef.current.signal(data.candidate);
    }
  };

  const handleCallEnd = () => {
    endCall();
    onEnd?.();
  };

  const startCall = () => {
    setCalling(true);
    const socket = getSocket();
    if (!socket || !streamRef.current) return;

    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: streamRef.current
    });

    peer.on('signal', signal => {
      socket.emit('video-offer', {
        conversationId,
        targetUserId: userId,
        signal
      });
    });

    peer.on('stream', stream => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setConnected(true);
    });

    peerRef.current = peer;
  };

  const answerCall = () => {
    const socket = getSocket();
    if (!socket || !streamRef.current) return;

    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: streamRef.current
    });

    peer.on('signal', signal => {
      socket.emit('video-answer', {
        conversationId,
        signal
      });
    });

    peer.on('stream', stream => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setConnected(true);
    });

    peerRef.current = peer;
    setReceiving(false);
  };

  const endCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    const socket = getSocket();
    socket?.emit('video-end', { conversationId });
    
    setCalling(false);
    setConnected(false);
    onEnd?.();
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-6xl max-h-screen p-4">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded-lg"
        />

        {/* Local Video */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-4 right-4 w-48 h-36 object-cover rounded-lg border-2 border-white"
        />

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4">
          {!connected && !calling && (
            <button
              onClick={startCall}
              className="px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700"
            >
              Start Call
            </button>
          )}

          {receiving && (
            <button
              onClick={answerCall}
              className="px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700"
            >
              Answer
            </button>
          )}

          {connected && (
            <>
              <button
                onClick={toggleMute}
                className={`px-4 py-2 rounded-full ${muted ? 'bg-red-600' : 'bg-gray-600'} text-white hover:opacity-80`}
              >
                {muted ? '🔇' : '🔊'}
              </button>
              
              <button
                onClick={toggleVideo}
                className={`px-4 py-2 rounded-full ${!videoEnabled ? 'bg-red-600' : 'bg-gray-600'} text-white hover:opacity-80`}
              >
                {videoEnabled ? '📹' : '📵'}
              </button>
            </>
          )}

          <button
            onClick={endCall}
            className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}
