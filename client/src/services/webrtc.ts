import { socketService } from './socket';
import { AuthService } from './auth';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Multi-Global STUN Infrastructure
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.nextcloud.com:443' },
    { urls: 'stun:stun.voip.blackberry.com:3478' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
    
    // TURN UDP / TCP Relays for Symmetric Carrier-Grade NAT (Jio / Airtel across states)
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:5349',
        'turns:openrelay.metered.ca:5349?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: [
        'turn:relay.metered.ca:80',
        'turn:relay.metered.ca:443',
        'turn:relay.metered.ca:443?transport=tcp',
        'turns:relay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
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
  private activeIceServers: RTCIceServer[] = ICE_SERVERS.iceServers || [];

  public async refreshTurnServers(): Promise<void> {
    try {
      const token = AuthService.getAccessToken();
      const res = await fetch(`${AuthService.getApiBase()}/calls/turn-servers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.iceServers && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          console.log(`[WebRTC] Loaded ${data.iceServers.length} fresh STUN/TURN relays from enclave`);
          this.activeIceServers = data.iceServers;
        }
      }
    } catch (e) {
      console.warn('[WebRTC] Using built-in TURNS relays fallback:', e);
    }
  }

  // Live Web Audio DSP Chain for Voice Changing
  private audioCtx: AudioContext | null = null;
  private audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private audioDestinationNode: MediaStreamAudioDestinationNode | null = null;
  private currentVoiceEffect: VoiceEffectType = 'normal';

  public onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  public onConnectionStateCallback: ((state: RTCPeerConnectionState) => void) | null = null;

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public getIsFrontCamera(): boolean {
    return this.isFrontCamera;
  }

  // Initialize Local Media (Camera/Mic) - Reuses active stream if already running
  public async getLocalMedia(callType: 'audio' | 'video', forceNew = false): Promise<MediaStream> {
    this.isAudioOnly = callType === 'audio';

    // If stream already exists and has active tracks, reuse it!
    if (!forceNew && this.localStream && this.localStream.active) {
      const audioActive = this.localStream.getAudioTracks().some(t => t.readyState === 'live');
      const videoActive = this.isAudioOnly || this.localStream.getVideoTracks().some(t => t.readyState === 'live');
      if (audioActive && videoActive) {
        return this.localStream;
      }
    }

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
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, min: 20 }
      }
    };

    // Resilient Hardware Media Capture with Multi-Tier Fallback
    try {
      // 1. Try Optimized Audio & Video Capture
      this.rawAudioStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = this.rawAudioStream;
      return this.localStream;
    } catch (err: any) {
      console.warn('[WebRTC] Preferred constraints failed, trying basic audio/video:', err.message);
      
      try {
        // 2. Try Standard Facing Mode Without Resolution Restraints
        this.rawAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: this.isAudioOnly ? false : {
            facingMode: this.isFrontCamera ? 'user' : 'environment'
          }
        });
        this.localStream = this.rawAudioStream;
        return this.localStream;
      } catch (err2: any) {
        console.warn('[WebRTC] FacingMode pair failed, falling back to basic video:', err2.message);

        // 3. If Audio Source failed (e.g. mic busy/locked), try Video only + Silent Audio track
        if (!this.isAudioOnly) {
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const silentAudio = this.createSilentAudioTrack();
            if (silentAudio) videoStream.addTrack(silentAudio);
            this.rawAudioStream = videoStream;
            this.localStream = videoStream;
            return this.localStream;
          } catch (err3) {
            console.warn('[WebRTC] Video capture also failed:', err3);
          }
        }

        // 4. If Video failed, try Audio only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          this.rawAudioStream = audioStream;
          this.localStream = audioStream;
          this.isAudioOnly = true;
          return this.localStream;
        } catch (err4) {
          console.warn('[WebRTC] Hardware mic/camera unavailable. Using synthetic fallback stream:', err4);
          
          // 5. Ultimate Fallback: Create synthetic stream so call connects without throwing error
          const fallbackStream = new MediaStream();
          const silentAudio = this.createSilentAudioTrack();
          if (silentAudio) fallbackStream.addTrack(silentAudio);
          if (!this.isAudioOnly) {
            const blankVideo = this.createBlankVideoTrack();
            if (blankVideo) fallbackStream.addTrack(blankVideo);
          }
          this.rawAudioStream = fallbackStream;
          this.localStream = fallbackStream;
          return this.localStream;
        }
      }
    }
  }

  private createSilentAudioTrack(): MediaStreamTrack | null {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      const dest = ctx.createMediaStreamDestination();
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      return dest.stream.getAudioTracks()[0] || null;
    } catch {
      return null;
    }
  }

  private createBlankVideoTrack(): MediaStreamTrack | null {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#040711';
        ctx.fillRect(0, 0, 640, 480);
      }
      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(15) : null;
      return stream ? stream.getVideoTracks()[0] || null : null;
    } catch {
      return null;
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

  // Create RTCPeerConnection with STUN & TURN Relay
  private createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.activeIceServers.length > 0 ? this.activeIceServers : ICE_SERVERS.iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });
    this.remoteStream = new MediaStream();

    // Attach local audio & video tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          this.peerConnection!.addTrack(track, this.localStream!);
          console.log(`[WebRTC] Added local ${track.kind} track to PeerConnection`);
        } catch (e) {
          console.warn('[WebRTC] addTrack error:', e);
        }
      });
    }

    // Add bidirectional transceivers to guarantee audio/video negotiation
    try {
      const transceivers = this.peerConnection.getTransceivers();
      const hasAudio = transceivers.some(t => t.sender.track?.kind === 'audio' || t.receiver.track?.kind === 'audio');
      const hasVideo = transceivers.some(t => t.sender.track?.kind === 'video' || t.receiver.track?.kind === 'video');

      if (!hasAudio) {
        this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
      }
      if (!hasVideo && !this.isAudioOnly) {
        this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });
      }
    } catch (e) {
      console.warn('[WebRTC] addTransceiver warning:', e);
    }

    // Handle remote track arrivals (Audio & Video)
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC ontrack] Received remote track:', event.track.kind, event.track.id);
      event.track.enabled = true;
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) this.remoteStream = new MediaStream();
        if (!this.remoteStream.getTracks().some(t => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
      }

      if (this.onRemoteStreamCallback && this.remoteStream) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    // Send ICE candidates to peer via socket
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.targetUserId) {
        const candidateJson = event.candidate.toJSON ? event.candidate.toJSON() : {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment
        };
        console.log('[WebRTC onicecandidate] Emitting candidate to peer:', this.targetUserId, candidateJson.candidate?.substring(0, 40));
        socketService.emit('ice_candidate', {
          targetUserId: this.targetUserId,
          candidate: candidateJson
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const connState = this.peerConnection?.connectionState;
      console.log('[WebRTC Connection State Changed]:', connState);
      if (this.onConnectionStateCallback && connState) {
        this.onConnectionStateCallback(connState);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC ICE State]:', this.peerConnection?.iceConnectionState);
    };

    return this.peerConnection;
  }

  // Flush buffered ICE candidates after remote description is set
  private async processPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    console.log(`[WebRTC] Draining ${this.pendingCandidates.length} pending ICE candidates`);
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] Successfully applied buffered candidate');
        } catch (err) {
          console.warn('[WebRTC] Error adding buffered ICE candidate:', err);
        }
      }
    }
  }

  // Start Call (Caller creates SDP Offer)
  public async startCall(targetUserId: string, callType: 'audio' | 'video'): Promise<RTCSessionDescriptionInit> {
    this.targetUserId = targetUserId;
    await this.refreshTurnServers();
    await this.getLocalMedia(callType, true);
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
    await this.refreshTurnServers();
    await this.getLocalMedia(callType, true);
    const pc = this.createPeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.processPendingCandidates();

    const answer = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'video'
    });
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
  public async addIceCandidate(candidate: any): Promise<void> {
    if (!candidate) return;
    const candidateData = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;

    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      console.log('[WebRTC] Buffering ICE candidate (remoteDescription pending)...');
      this.pendingCandidates.push(candidateData);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
      console.log('[WebRTC] Successfully added live ICE candidate');
    } catch (err) {
      console.warn('[WebRTC] Error adding live ICE candidate:', err);
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
    const newStream = await this.getLocalMedia('video', true);

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
      this.localStream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      this.localStream = null;
    }
    if (this.rawAudioStream) {
      this.rawAudioStream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      this.rawAudioStream = null;
    }
  }
}

export const webrtcService = new WebRTCService();
