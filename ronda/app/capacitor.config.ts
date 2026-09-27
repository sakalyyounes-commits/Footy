import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuration des applications Android et iOS.
 * ⚠️ `appId` ne peut plus changer une fois l'application publiée sur les stores.
 */
const config: CapacitorConfig = {
  appId: 'com.rondadyalna.app',
  appName: 'Ronda Dyalna',
  webDir: 'dist',
  backgroundColor: '#062b21',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#062b21',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#062b21',
      overlaysWebView: true,
    },
  },
};

export default config;
