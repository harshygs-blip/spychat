import { socketService } from './socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
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

  // Initialize Ultra-HD Local Media (1080p60 Studio Camera + 48kHz Stereo Audio)
  public async getLocalMedia(callType: 'audio' | 'video'): Promise<MediaStream> {
    this.isAudioOnly = callType === 'audio';

    if (this.localStream) {
      this.stopLocalMedia();
    }

    const ultraHdConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 2,
        sampleRate: 48000
      },
      video: this.isAudioOnly ? false : {
        facingMode: this.isFrontCamera ? 'user' : 'environment',
        width: { ideal: 1920, max: 3840, min: 1280 },
        height: { ideal: 1080, max: 2160, min: 720 },
        frameRate: { ideal: 60, min: 30 }
      }
    };

    try {
      this.rawAudioStream = await navigator.mediaDevices.getUserMedia(ultraHdConstraints);
      this.localStream = this.rawAudioStream;
      return this.localStream;
    } catch (err) {
      console.warn('[WebRTC] Ultra-HD 1080p requested, fallback to 720p HD:', err);
      try {
        const fallbackConstraints: MediaStreamConstraints = {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: this.isAudioOnly ? false : {
            facingMode: this.isFrontCamera ? 'user' : 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        };
        this.rawAudioStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        this.localStream = this.rawAudioStream;
        return this.localStream;
      } catch {
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
      audioSender.replaceTrack(newTrack);
    }
  }

  // Create RTCPeerConnection with Ultra-HD 4Mbps Tuning
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

    // Boost video bitrate to 4.5 Mbps Full HD
    setTimeout(() => {
      this.tuneVideoSenderQuality();
    }, 500);

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

  // Maximize video sender encoding bitrate for crystal clarity
  private async tuneVideoSenderQuality(): Promise<void> {
    if (!this.peerConnection) return;
    try {
      const senders = this.peerConnection.getSenders();
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 4500000; // 4.5 Mbps Full-HD
          params.encodings[0].maxFramerate = 60;
          params.encodings[0].scaleResolutionDownBy = 1.0; // 100% full pixel resolution
          await sender.setParameters(params);
          console.log('[WebRTC] Tuned Video Quality to 4.5 Mbps Full HD @ 60fps');
        }
      }
    } catch (e) {
      console.warn('[WebRTC] tuneVideoSenderQuality warning:', e);
    }
  }

  private enhanceSdpBitrate(sdp: string): string {
    return sdp
      .replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:4500\r\nb=TIAS:4500000\r\n')
      .replace(/a=fmtp:111 /g, 'a=fmtp:111 minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=128000;');
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

    const enhancedSdp = offer.sdp ? this.enhanceSdpBitrate(offer.sdp) : offer.sdp;
    const finalOffer = { type: offer.type, sdp: enhancedSdp };

    await pc.setLocalDescription(finalOffer);
    return finalOffer;
  }

  // Answer Call (Receiver creates SDP Answer)
  public async answerCall(targetUserId: string, offer: RTCSessionDescriptionInit, callType: 'audio' | 'video'): Promise<RTCSessionDescriptionInit> {
    this.targetUserId = targetUserId;
    await this.getLocalMedia(callType);
    const pc = this.createPeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();

    const enhancedSdp = answer.sdp ? this.enhanceSdpBitrate(answer.sdp) : answer.sdp;
    const finalAnswer = { type: answer.type, sdp: enhancedSdp };

    await pc.setLocalDescription(finalAnswer);
    return finalAnswer;
  }

  // Handle Answer on Caller Side
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.tuneVideoSenderQuality();
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
  }

  // Toggle Video Track
  public toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Flip Camera (Front / Back) with Full 1080p Quality
  public async flipCamera(): Promise<MediaStream | null> {
    this.isFrontCamera = !this.isFrontCamera;
    const newStream = await this.getLocalMedia('video');

    if (this.peerConnection && newStream) {
      const videoTrack = newStream.getVideoTracks()[0];
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack);
        await this.tuneVideoSenderQuality();
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
