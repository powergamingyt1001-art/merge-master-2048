// Unity Ads stub - placeholder for native mobile integration
export const UNITY_ADS_CONFIG = {
  gameId: "",
  placementIds: { banner: "", interstitial: "", rewarded: "" },
}

export function isNativePlatform(): boolean { return false }
export function canShowInterstitial(): boolean { return false }
export function markInterstitialShown(): void {}
export function showRewardedAd(): Promise<boolean> { return Promise.resolve(false) }
export function showInterstitialAd(): Promise<boolean> { return Promise.resolve(false) }
export function initUnityAds(): void {}

