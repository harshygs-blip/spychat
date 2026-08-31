import { socketService } from './socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
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
  private pendingCandidates: RTCIceCandidateInit[] = [];

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
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 }
      }
    };

    try {
      this.rawAudioStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = this.rawAudioStream;
      return this.localStream;
    } catch (err) {
      console.warn('[WebRTC] HD Camera failed, fallback to standard media:', err);
      try {
        this.rawAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: this.isAudioOnly ? false : true
        });
        this.localStream = this.rawAudioStream;
        return this.localStream;
      } catch (err2) {
        console.warn('[WebRTC] Video capture failed, audio only fallback:', err2);
        this.rawAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.localStream = this.rawAudioStream;
        this.isAudioOnly = true;
        return this.localStream;
      }
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
        this.replaceOutgoingAudioTrack(audioTrack);
        return;
      }

      if (this.audioSourceNode) {
        try { this.audioSourceNode.disconnect(); } catch {}
      }

      this.audioSourceNode = this.audioCtx.createMediaStreamSource(this.rawAudioStream);
      this.audioDestinationNode = this.audioCtx.createMediaStreamDestination();

      if (effect === 'robot') {
        const osc = this.audioCtx.createOscillator();
        const oscGain = this.audioCtx.createGain();
        const mainGain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, this.audioCtx.currentTime);
        oscGain.gain.setValueAtTime(0.7, this.audioCtx.currentTime);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
        filter.Q.setValueAtTime(3, this.audioCtx.currentTime);

        this.audioSourceNode.connect(filter);
        filter.connect(mainGain);
        osc.connect(oscGain.gain);
        mainGain.connect(this.audioDestinationNode);
        osc.start();
      } else if (effect === 'deep') {
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowshelf';
        filter.frequency.setValueAtTime(300, this.audioCtx.currentTime);
        filter.gain.setValueAtTime(15, this.audioCtx.currentTime);

        const highCut = this.audioCtx.createBiquadFilter();
        highCut.type = 'lowpass';
        highCut.frequency.setValueAtTime(1200, this.audioCtx.currentTime);

        this.audioSourceNode.connect(filter);
        filter.connect(highCut);
        highCut.connect(this.audioDestinationNode);
      } else if (effect === 'radio') {
        const highPass = this.audioCtx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.setValueAtTime(800, this.audioCtx.currentTime);

        const lowPass = this.audioCtx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.setValueAtTime(2500, this.audioCtx.currentTime);

        const distortion = this.audioCtx.createWaveShaper();
        distortion.curve = this.makeDistortionCurve(20) as any;
        distortion.oversample = '4x';

        this.audioSourceNode.connect(highPass);
        highPass.connect(lowPass);
        lowPass.connect(distortion);
        distortion.connect(this.audioDestinationNode);
      }

      const processedTrack = this.audioDestinationNode.stream.getAudioTracks()[0];
      if (processedTrack) {
        this.replaceOutgoingAudioTrack(processedTrack);
      }
    } catch (e) {
      console.warn('Live voice effect error:', e);
    }
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private replaceOutgoingAudioTrack(newTrack: MediaStreamTrack) {
    if (!this.peerConnection) return;
    const senders = this.peerConnection.getSenders();
    const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
    if (audioSender) {
      audioSender.replaceTrack(newTrack).catch(e => console.warn('Replace track error:', e));
    }
  }

  // Create RTCPeerConnection
  private createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.pendingCandidates = [];
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    // Attach local audio & video tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote track arrivals
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC ontrack] Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          this.remoteStream!.addTrack(track);
        });
      } else {
        this.remoteStream!.addTrack(event.track);
      }

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

  // Flush buffered ICE candidates after remote description is set
  private async processPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Error adding buffered ICE candidate:', err);
        }
      }
    }
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
    await this.processPendingCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return answer;
  }

  // Handle Answer on Caller Side
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.processPendingCandidates();
    }
  }

  // Add Received ICE Candidate
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[WebRTC] Error adding ICE candidate:', err);
    }
  }

  // Toggle Mute Audio
  public toggleMute(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  // Toggle Video Track
  public toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Flip Camera (Front / Back)
  public async flipCamera(): Promise<MediaStream | null> {
    this.isFrontCamera = !this.isFrontCamera;
    const newStream = await this.getLocalMedia('video');

    if (this.peerConnection && newStream) {
      const videoTrack = newStream.getVideoTracks()[0];
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack);
      }
    }
    return newStream;
  }

  // End Call & Cleanup
  public endCall(): void {
    this.stopLocalMedia();

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
        this.audioCtx = null;
      } catch {}
    }

    this.remoteStream = null;
    this.targetUserId = null;
    this.pendingCandidates = [];
    this.currentVoiceEffect = 'normal';
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
}

export const webrtcService = new WebRTCService();
