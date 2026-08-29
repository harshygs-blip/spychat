import { socketService } from './socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export type VoiceEffectType = 'normal' | 'robot' | 'deep' | 'radio';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private rawAudioStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private targetUserId: string | null = null;
  private isAudioOnly: boolean = false;
  private isFrontCamera: boolean = true;

  // Live Web Audio DSP Chain for Voice Changing
  private audioCtx: AudioContext | null = null;
  private audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private audioDestinationNode: MediaStreamAudioDestinationNode | null = null;
  private currentVoiceEffect: VoiceEffectType = 'normal';

  public onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  public onConnectionStateCallback: ((state: RTCPeerConnectionState) => void) | null = null;

  // Initialize Local Media (Camera/Mic)
  public async getLocalMedia(callType: 'audio' | 'video'): Promise<MediaStream> {
    this.isAudioOnly = callType === 'audio';

    if (this.localStream) {
      this.stopLocalMedia();
    }

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: this.isAudioOnly ? false : {
        facingMode: this.isFrontCamera ? 'user' : 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      this.rawAudioStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = this.rawAudioStream;
      return this.localStream;
    } catch (err) {
      console.warn('Could not get video stream, falling back to audio only:', err);
      this.rawAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.localStream = this.rawAudioStream;
      this.isAudioOnly = true;
      return this.localStream;
    }
  }

  // LIVE VOICE CHANGER DSP ENGINE (Works in Real-Time During Live Calls)
  public applyLiveVoiceEffect(effect: VoiceEffectType): void {
    this.currentVoiceEffect = effect;
    if (!this.rawAudioStream || !this.peerConnection) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      const audioTrack = this.rawAudioStream.getAudioTracks()[0];
      if (!audioTrack) return;

      if (effect === 'normal') {
        // Revert to original clean mic track
        this.replaceOutgoingAudioTrack(audioTrack);
        return;
      }

      // Build Web Audio DSP chain
      if (this.audioSourceNode) {
        try { this.audioSourceNode.disconnect(); } catch {}
      }

      this.audioSourceNode = this.audioCtx.createMediaStreamSource(this.rawAudioStream);
      this.audioDestinationNode = this.audioCtx.createMediaStreamDestination();

      if (effect === 'robot') {
        // 1. Cyber Robot Ring Modulator
        const osc = this.audioCtx.createOscillator();
        const oscGain = this.audioCtx.createGain();
        const mainGain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, this.audioCtx.currentTime); // Metallic robot carrier
        osc.start();

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(400, this.audioCtx.currentTime);

        this.audioSourceNode.connect(filter);
        filter.connect(mainGain);
        osc.connect(oscGain.gain);

        mainGain.connect(this.audioDestinationNode);
      } else if (effect === 'deep') {
        // 2. Deep Hacker Stealth Pitch (Resonant Low-Pass + Bass Sub)
        const filter = this.audioCtx.createBiquadFilter();
        const lowShelf = this.audioCtx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, this.audioCtx.currentTime);
        filter.Q.setValueAtTime(3.0, this.audioCtx.currentTime);

        lowShelf.type = 'lowshelf';
        lowShelf.frequency.setValueAtTime(200, this.audioCtx.currentTime);
        lowShelf.gain.setValueAtTime(12, this.audioCtx.currentTime);

        this.audioSourceNode.connect(filter);
        filter.connect(lowShelf);
        lowShelf.connect(this.audioDestinationNode);
      } else if (effect === 'radio') {
        // 3. Military Walkie-Talkie Radio (Bandpass 500-3000Hz + subtle grit)
        const bp = this.audioCtx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1700, this.audioCtx.currentTime);
        bp.Q.setValueAtTime(1.5, this.audioCtx.currentTime);

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(1.8, this.audioCtx.currentTime);

        this.audioSourceNode.connect(bp);
        bp.connect(gain);
        gain.connect(this.audioDestinationNode);
      }

      // Replace audio track in WebRTC sender live
      const processedTrack = this.audioDestinationNode.stream.getAudioTracks()[0];
      if (processedTrack) {
        this.replaceOutgoingAudioTrack(processedTrack);
      }
    } catch (err) {
      console.error('Error applying live voice effect:', err);
    }
  }

  private replaceOutgoingAudioTrack(newTrack: MediaStreamTrack) {
    if (!this.peerConnection) return;
    const senders = this.peerConnection.getSenders();
    const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
    if (audioSender) {
      audioSender.replaceTrack(newTrack);
    }
  }

  // Create Peer Connection
  private createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    // Attach local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote track arrivals
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC ontrack] Received remote track:', event.track.kind);
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream!.addTrack(track);
      });

      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream!);
      }
    };

    // Send ICE candidates to peer via socket
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.targetUserId) {
        socketService.emit('ice_candidate', {
          targetUserId: this.targetUserId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC Connection State]:', this.peerConnection?.connectionState);
      if (this.onConnectionStateCallback && this.peerConnection) {
        this.onConnectionStateCallback(this.peerConnection.connectionState);
      }
    };

    return this.peerConnection;
  }

  // Start Call (Caller creates SDP Offer)
  public async startCall(targetUserId: string, callType: 'audio' | 'video'): Promise<RTCSessionDescriptionInit> {
    this.targetUserId = targetUserId;
    await this.getLocalMedia(callType);
    const pc = this.createPeerConnection();

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'video'
    });

    await pc.setLocalDescription(offer);
    return offer;
  }

  // Answer Call (Receiver creates SDP Answer)
  public async answerCall(targetUserId: string, offer: RTCSessionDescriptionInit, callType: 'audio' | 'video'): Promise<RTCSessionDescriptionInit> {
    this.targetUserId = targetUserId;
    await this.getLocalMedia(callType);
    const pc = this.createPeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return answer;
  }

  // Handle Answer on Caller Side
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  // Add Received ICE Candidate
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection && candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  }

  // Toggle Mute Audio
  public toggleMute(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
    if (this.rawAudioStream) {
      this.rawAudioStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  // Toggle Video Camera
  public toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Flip Camera (Front/Back)
  public async flipCamera(): Promise<MediaStream | null> {
    if (this.isAudioOnly) return null;
    this.isFrontCamera = !this.isFrontCamera;
    return await this.getLocalMedia('video');
  }

  // End Call & Cleanup
  public endCall(): void {
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
    this.stopLocalMedia();
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.targetUserId = null;
  }

  private stopLocalMedia(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.rawAudioStream) {
      this.rawAudioStream.getTracks().forEach(track => track.stop());
      this.rawAudioStream = null;
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}

export const webrtcService = new WebRTCService();
