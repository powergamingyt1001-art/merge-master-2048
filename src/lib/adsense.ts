// Google AdSense Configuration for Web
// AdMob IDs (ca-app-pub-xxx) are for Android/iOS Apps ONLY
// AdSense IDs (ca-pub-xxx) are for Websites/Web Apps
// You need to create AdSense ad units at https://www.google.com/adsense

// IMPORTANT: Replace these with your actual AdSense ad unit IDs after:
// 1. Sign up at https://www.google.com/adsense
// 2. Get your site approved
// 3. Create ad units and get the data-ad-slot values

export const ADSENSE_CONFIG = {
  // Your AdSense Publisher ID (ca-pub-XXXXXXX)
  // Get this from AdSense dashboard → Account → Account information
  publisherId: 'ca-pub-4486474550864010',
  
  // Ad Slot IDs - Create these in AdSense dashboard → Ads → By ad unit
  banner: {
    // Create a "Display Ad" unit in AdSense for banner ads
    slot: 'banner-slot-id',
  },
  interstitial: {
    // Create a "Vignette Ad" or "Anchor Ad" unit in AdSense
    slot: 'interstitial-slot-id',
  },
  rewarded: {
    // Rewarded ads on web use Google AdMob Reward Web API
    // or you can use AdSense anchor ads as alternative
    slot: 'rewarded-slot-id',
  },
  anchor: {
    // Create an "Anchor Ad" unit for bottom sticky ad
    slot: 'anchor-slot-id',
  },
}

// Track last ad show times to prevent showing too frequently
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

// Check if running on production domain (not localhost)
export function isProductionDomain(): boolean {
  if (typeof window === 'undefined') return false
  return !window.location.hostname.includes('localhost') && 
         !window.location.hostname.includes('127.0.0.1') &&
         !window.location.hostname.includes('0.0.0.0')
}

// Push ad to AdSense queue (auto-ads)
export function pushAdSlot() {
  try {
    const w = window as Record<string, unknown>
    w.adsbygoogle = w.adsbygoogle || []
    w.adsbygoogle.push({})
  } catch {
    // AdSense not loaded
  }
}
