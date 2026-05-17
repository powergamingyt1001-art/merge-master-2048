'use client'

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'

// AdMob Ad Unit IDs - Production IDs
export const ADMOB_IDS = {
  appId: 'ca-app-pub-4486474550864010~8947867010',
  banner: 'ca-app-pub-4486474550864010/6765165617',
  openAd: 'ca-app-pub-4486474550864010/9199757262',
  interstitial: 'ca-app-pub-4486474550864010/3118624132',
  rewarded: 'ca-app-pub-4486474550864010/6068310395',
}

interface AdState {
  gamesPlayed: number
  quickDeaths: number
  isOnline: boolean
  lastInterstitialTime: number
  lastAppOpenTime: number
}

interface AdContextType extends AdState {
  showAppOpenAd: () => Promise<boolean>
  showInterstitialAd: (reason: 'battle' | 'death') => Promise<boolean>
  showRewardedAd: () => Promise<boolean>
  recordGamePlayed: (score: number) => void
  resetQuickDeaths: () => void
  setOnline: (v: boolean) => void
}

const AdContext = createContext<AdContextType | null>(null)

export function useAdContext() {
  const ctx = useContext(AdContext)
  if (!ctx) throw new Error('useAdContext must be within AdProvider')
  return ctx
}

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdState>(() => {
    if (typeof window === 'undefined') return { gamesPlayed: 0, quickDeaths: 0, isOnline: false, lastInterstitialTime: 0, lastAppOpenTime: 0 }
    try {
      const saved = localStorage.getItem('mergeMaster2048_ads')
      if (saved) {
        const d = JSON.parse(saved)
        return { gamesPlayed: d.gamesPlayed || 0, quickDeaths: d.quickDeaths || 0, isOnline: navigator.onLine, lastInterstitialTime: 0, lastAppOpenTime: 0 }
      }
    } catch { /* */ }
    return { gamesPlayed: 0, quickDeaths: 0, isOnline: typeof window !== 'undefined' ? navigator.onLine : false, lastInterstitialTime: 0, lastAppOpenTime: 0 }
  })

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('mergeMaster2048_ads', JSON.stringify({ gamesPlayed: state.gamesPlayed, quickDeaths: state.quickDeaths }))
  }, [state.gamesPlayed, state.quickDeaths])

  // Internet detection
  useEffect(() => {
    const on = () => setState(p => ({ ...p, isOnline: true }))
    const off = () => setState(p => ({ ...p, isOnline: false }))
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const setOnline = useCallback((v: boolean) => setState(p => ({ ...p, isOnline: v })), [])

  const recordGamePlayed = useCallback((score: number) => {
    setState(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      quickDeaths: score < 600 ? prev.quickDeaths + 1 : 0, // Reset if good score
    }))
  }, [])

  const resetQuickDeaths = useCallback(() => {
    setState(prev => ({ ...prev, quickDeaths: 0 }))
  }, [])

  // Simulated ad display - in production these would call AdMob SDK via Capacitor
  const showAppOpenAd = useCallback(async (): Promise<boolean> => {
    if (!state.isOnline) return true // Skip if offline
    // In web preview, simulate with a brief delay
    // In Capacitor Android app, this would call AdMob SDK
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 100)
    })
  }, [state.isOnline])

  const showInterstitialAd = useCallback(async (reason: 'battle' | 'death'): Promise<boolean> => {
    if (!state.isOnline) return true // Skip if offline

    if (reason === 'battle') {
      // Show every 2 games
      if (state.gamesPlayed % 2 !== 0) return true // Skip odd-numbered games (1st, 3rd, etc.)
    }

    if (reason === 'death') {
      // Quick death rule: skip first 2, then show
      if (state.quickDeaths <= 2) return true // Skip first 2 quick deaths
    }

    // Rate limit: don't show more than once per 30 seconds
    const now = Date.now()
    if (now - state.lastInterstitialTime < 30000) return true

    return new Promise(resolve => {
      setTimeout(() => {
        setState(p => ({ ...p, lastInterstitialTime: Date.now() }))
        resolve(true)
      }, 100)
    })
  }, [state.isOnline, state.gamesPlayed, state.quickDeaths, state.lastInterstitialTime])

  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    if (!state.isOnline) return false // Can't show reward if offline
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 100)
    })
  }, [state.isOnline])

  return (
    <AdContext.Provider value={{
      ...state,
      showAppOpenAd,
      showInterstitialAd,
      showRewardedAd,
      recordGamePlayed,
      resetQuickDeaths,
      setOnline,
    }}>
      {children}
    </AdContext.Provider>
  )
}
