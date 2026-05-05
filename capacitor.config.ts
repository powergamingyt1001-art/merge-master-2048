import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mergemaster2048.game',
  appName: 'Merge Master 2048',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    AdMob: {
      appID: 'ca-app-pub-4486474550864010~8947867010',
      bannerID: 'ca-app-pub-4486474550864010/6765165617',
      interstitialID: 'ca-app-pub-4486474550864010/3118624132',
      rewardedID: 'ca-app-pub-4486474550864010/6068310395',
      appOpenID: 'ca-app-pub-4486474550864010/9199757262',
      isTesting: true,
    },
  },
};

export default config;
