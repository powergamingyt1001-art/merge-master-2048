// Google AdSense Configuration for Web
// AdMob only works in native Android/iOS apps — NOT in web browsers
// For web, we use Google AdSense / Google Publisher Tag (GPT)

export const AD_CONFIG = {
  // ✅ Google AdSense Approved — Publisher ID
  publisherId: 'ca-pub-4486474550864010',

  // Ad slot IDs — Approved by Google AdSense
  // Display Ad (Home) — format: auto, full-width responsive
  banner: {
    id: '6859053436',
    position: 'bottom' as const,
  },
  // Multi/Autorelaxed Ad — shows multiple relevant ads
  multiplex: {
    id: '9209884606',
  },
  // Rewarded ad slot (create in AdSense if needed)
  rewarded: {
    id: '6859053436', // Reusing display ad slot for now
  },
  // Interstitial ad slot
  interstitial: {
    id: '6859053436', // Reusing display ad slot for now
  },
  // App Open ad slot
  appOpen: {
    id: '6859053436', // Reusing display ad slot for now
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

// Initialize Google AdSense script
export function initAdSense() {
  if (typeof window === 'undefined') return
  if (document.getElementById('adsense-script')) return

  const script = document.createElement('script')
  script.id = 'adsense-script'
  script.async = true
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CONFIG.publisherId}`
  script.crossOrigin = 'anonymous'
  document.head.appendChild(script)
}

// Push an ad to AdSense
export function pushAd() {
  if (typeof window === 'undefined') return
  try {
    const w = window as Window & { adsbygoogle: unknown[] }
    w.adsbygoogle = w.adsbygoogle || []
    w.adsbygoogle.push({})
  } catch {
    // AdSense not loaded yet
  }
}
