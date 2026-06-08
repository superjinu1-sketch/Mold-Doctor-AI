import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jinsimlabs.molddoctor',
  appName: 'Mold-Doctor',
  webDir: 'capacitor-www',
  server: {
    url: 'https://mold-doctor-ai.vercel.app',
    cleartext: false,
  },
};

export default config;
