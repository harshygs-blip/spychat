// Audio Output Routing Service (Speaker / Hands-Free, Earpiece / In-Ear / Hands-On, Bluetooth / Headset)

export type AudioOutputMode = 'speaker' | 'earpiece' | 'bluetooth';

export interface AudioOutputDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  mode: AudioOutputMode;
}

class AudioOutputService {
  private currentMode: AudioOutputMode = 'speaker'; // default for calls & media in messenger
  private availableDevices: MediaDeviceInfo[] = [];
  private listeners: Array<(mode: AudioOutputMode, devices: MediaDeviceInfo[]) => void> = [];
  private attachedMediaElements: Set<HTMLMediaElement> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && navigator?.mediaDevices) {
      // Listen for Bluetooth / Headset connect / disconnect
      navigator.mediaDevices.addEventListener?.('devicechange', () => {
        this.enumerateDevices();
      });
      this.enumerateDevices();
    }
  }

  public async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter(d => d.kind === 'audiooutput');
      this.notifyListeners();
      return this.availableDevices;
    } catch (err) {
      console.warn('[AudioOutputService] Error enumerating devices:', err);
      return [];
    }
  }

  public getAvailableOutputs(): { speaker: boolean; earpiece: boolean; bluetooth: boolean; bluetoothName?: string; devices: MediaDeviceInfo[] } {
    let hasBluetooth = false;
    let bluetoothName: string | undefined = undefined;
    let hasEarpiece = false;
    let hasSpeaker = false;

    this.availableDevices.forEach(d => {
      const label = d.label.toLowerCase();
      if (label.includes('bluetooth') || label.includes('bt') || label.includes('buds') || label.includes('airpods') || label.includes('headset') || label.includes('hands-free') || label.includes('wireless')) {
        hasBluetooth = true;
        bluetoothName = d.label || 'Bluetooth Device';
      } else if (label.includes('earpiece') || label.includes('receiver') || label.includes('handset') || label.includes('phone') || label.includes('internal')) {
        hasEarpiece = true;
      } else if (label.includes('speaker') || label.includes('speakerphone') || label.includes('loudspeaker')) {
        hasSpeaker = true;
      }
    });

    return {
      speaker: hasSpeaker || true,
      earpiece: hasEarpiece || true,
      bluetooth: hasBluetooth,
      bluetoothName,
      devices: this.availableDevices
    };
  }

  public getCurrentMode(): AudioOutputMode {
    return this.currentMode;
  }

  public registerMediaElement(element: HTMLMediaElement | null) {
    if (!element) return;
    this.attachedMediaElements.add(element);
    this.applyModeToElement(element, this.currentMode);
  }

  public unregisterMediaElement(element: HTMLMediaElement | null) {
    if (!element) return;
    this.attachedMediaElements.delete(element);
  }

  public async setAudioMode(mode: AudioOutputMode): Promise<boolean> {
    this.currentMode = mode;
    console.log(`[AudioOutputService] Switched audio route to: ${mode}`);

    // Update all registered media elements (audio & video in calls / voice player)
    const promises = Array.from(this.attachedMediaElements).map(el => this.applyModeToElement(el, mode));
    await Promise.allSettled(promises);

    this.notifyListeners();
    return true;
  }

  private async applyModeToElement(element: HTMLMediaElement, mode: AudioOutputMode) {
    if (!element) return;

    // Check HTML5 setSinkId support (Modern Chromium, Android Chrome, WebView)
    const elWithSink = element as any;
    if (typeof elWithSink.setSinkId === 'function') {
      try {
        let targetDeviceId = '';

        if (mode === 'bluetooth') {
          const btDevice = this.availableDevices.find(d => {
            const l = d.label.toLowerCase();
            return l.includes('bluetooth') || l.includes('bt') || l.includes('buds') || l.includes('headset') || l.includes('airpods') || l.includes('wireless');
          });
          if (btDevice) targetDeviceId = btDevice.deviceId;
        } else if (mode === 'earpiece') {
          const earpieceDevice = this.availableDevices.find(d => {
            const l = d.label.toLowerCase();
            return l.includes('earpiece') || l.includes('receiver') || l.includes('handset') || l.includes('phone') || l.includes('internal');
          });
          if (earpieceDevice) targetDeviceId = earpieceDevice.deviceId;
        } else if (mode === 'speaker') {
          const speakerDevice = this.availableDevices.find(d => {
            const l = d.label.toLowerCase();
            return l.includes('speaker') || l.includes('speakerphone') || l.includes('loudspeaker');
          });
          if (speakerDevice) targetDeviceId = speakerDevice.deviceId;
        }

        if (targetDeviceId) {
          await elWithSink.setSinkId(targetDeviceId);
          console.log(`[AudioOutputService] Element setSinkId to ${targetDeviceId} (${mode})`);
        } else if (mode === 'speaker') {
          await elWithSink.setSinkId(''); // default system loudspeaker route
        }
      } catch (err) {
        console.warn(`[AudioOutputService] setSinkId error for mode ${mode}:`, err);
      }
    }

    // Proximity / Volume compensation for Earpiece mode (Hands-on)
    if (mode === 'earpiece') {
      element.volume = 0.35; // Calibrated for holding to ear
    } else {
      element.volume = 1.0; // Loudspeaker / Headset full output
    }
  }

  public async cycleOutputMode(): Promise<AudioOutputMode> {
    const info = this.getAvailableOutputs();
    let nextMode: AudioOutputMode = 'speaker';

    if (this.currentMode === 'speaker') {
      nextMode = 'earpiece';
    } else if (this.currentMode === 'earpiece') {
      if (info.bluetooth) {
        nextMode = 'bluetooth';
      } else {
        nextMode = 'speaker';
      }
    } else if (this.currentMode === 'bluetooth') {
      nextMode = 'speaker';
    }

    await this.setAudioMode(nextMode);
    return nextMode;
  }

  public onAudioModeChange(fn: (mode: AudioOutputMode) => void): () => void {
    return this.subscribe((mode) => fn(mode));
  }

  public subscribe(fn: (mode: AudioOutputMode, devices: MediaDeviceInfo[]) => void): () => void {
    this.listeners.push(fn);
    fn(this.currentMode, this.availableDevices);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn(this.currentMode, this.availableDevices));
  }
}

export const audioOutputService = new AudioOutputService();
