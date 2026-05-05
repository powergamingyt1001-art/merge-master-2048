// AdMob Configuration - All ad unit IDs
export const ADMOB_CONFIG = {
  appId: 'ca-app-pub-4486474550864010~8947867010',
  banner: {
    id: 'ca-app-pub-4486474550864010/6765165617',
    position: 'bottom' as const,
  },
  rewarded: {
    id: 'ca-app-pub-4486474550864010/6068310395',
    // Only 1 reward per ad watch
  },
  interstitial: {
    id: 'ca-app-pub-4486474550864010/3118624132',
    // Show between game transitions
  },
  appOpen: {
    id: 'ca-app-pub-4486474550864010/9199757262',
    // Show when app opens
  },
}

// Track last ad show times to prevent showing too frequently
let lastInterstitialTime = 0
let lastAppOpenTime = 0

export function canShowInterstitial(): boolean {
  const now = Date.now()
  // Minimum 60 seconds between interstitial ads
  if (now - lastInterstitialTime < 60000) return false
  return true
}

export function canShowAppOpen(): boolean {
  const now = Date.now()
  // Minimum 30 seconds between app open ads
  if (now - lastAppOpenTime < 30000) return false
  return true
}

export function markInterstitialShown() {
  lastInterstitialTime = Date.now()
}

export function markAppOpenShown() {
  lastAppOpenTime = Date.now()
}
