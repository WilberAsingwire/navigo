import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ug.co.navigo.app',
  appName: 'NAVIGO',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
