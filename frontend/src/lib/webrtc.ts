export interface PeerConfig {
	iceServers?: RTCIceServer[];
}

export function createPeerConnection(config?: PeerConfig) {
	const pc = new RTCPeerConnection({
		iceServers: config?.iceServers || [
			{ urls: ['stun:stun.l.google.com:19302'] }
		]
	});
	return pc;
}

export async function getLocalStream(constraints: MediaStreamConstraints = { audio: true, video: true }) {
	return navigator.mediaDevices.getUserMedia(constraints);
}

export async function createOffer(pc: RTCPeerConnection) {
	const offer = await pc.createOffer();
	await pc.setLocalDescription(offer);
	return offer;
}

export async function createAnswer(pc: RTCPeerConnection) {
	const answer = await pc.createAnswer();
	await pc.setLocalDescription(answer);
	return answer;
}

export async function setRemote(pc: RTCPeerConnection, sdp: RTCSessionDescriptionInit) {
	await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}
