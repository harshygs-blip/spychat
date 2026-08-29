import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spychat.app',
  appName: 'SPYCHAT',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    // Camera & Microphone permissions configured
  }
};

export default config;
