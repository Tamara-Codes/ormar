import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ormar.mycloset',
  appName: 'Komodus',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullScreen',
    },
    Filesystem: {
      // Default settings
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
