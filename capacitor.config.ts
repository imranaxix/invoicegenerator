import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.invoicegenerator.app',
  appName: 'Invoice Generator',
  webDir: 'dist',
  // No server.url: always load bundled, offline Vite assets.
  android: { backgroundColor: '#f7f8f5' },
  plugins: { SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'LIGHT' } },
};
export default config;
