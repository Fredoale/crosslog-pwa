import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crosslog.app',
  appName: 'CROSSLOG',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen',
      quality: 90,
      resultType: 'dataUrl', // Use dataUrl for better PWA compatibility
      saveToGallery: false,
      correctOrientation: true,
    },
    Geolocation: {
      timeout: 10000,
      maximumAge: 3000,
      enableHighAccuracy: true,
    },
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#0ea5e9',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    allowMixedContent: false,
    minWebViewVersion: 60,
  },
  ios: {
    contentInset: 'always',
    minSupportedVersion: '13.0',
  },
};

export default config;
