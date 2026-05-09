// Adsterra Ad Configuration for Web
// AdSense replaced with Adsterra for better web monetization

export const AD_CONFIG = {
  // Adsterra configuration
  adsterra: {
    // Popunder Ad - Replace with YOUR Adsterra Popunder ID
    popunderId: 'popunder-script',
    // Social Bar Ad - Replace with YOUR Adsterra Social Bar ID
    socialBarId: 'social-bar-script',
    // Banner/Display Ad - Replace with YOUR Adsterra Banner ID
    bannerId: 'banner-script',
    // Native Banner - for in-content ads
    nativeBannerId: 'native-banner-script',
  },

  // Legacy compat - AdSense slots removed, use Adsterra
  publisherId: '',
  banner: {
    id: '',
    position: 'bottom' as const,
  },
  multiplex: {
    id: '',
  },
  rewarded: {
    id: '',
  },
  interstitial: {
    id: '',
  },
  appOpen: {
    id: '',
  },
}

// Track last ad show times
let lastInterstitialTime = 0
let lastAppOpenTime = 0

export function canShowInterstitial(): boolean {
  const now = Date.now()
  if (now - lastInterstitialTime < 60000) return false
  return true
}

export function canShowAppOpen(): boolean {
  const now = Date.now()
  if (now - lastAppOpenTime < 30000) return false
  return true
}

export function markInterstitialShown() {
  lastInterstitialTime = Date.now()
}

export function markAppOpenShown() {
  lastAppOpenTime = Date.now()
}

// No-op for Adsterra (it auto-loads via script tags)
export function initAdSense() {
  // Adsterra scripts are loaded via layout/script tags, no JS init needed
}

// No-op push for Adsterra
export function pushAd() {
  // Adsterra doesn't need push like AdSense
}
