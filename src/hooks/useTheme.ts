'use client'

import { useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'default' | 'premium'

const THEME_KEY = 'mergeMaster2048_theme'

interface ThemeColors {
  bg: string
  bgGradient: string
  cardBg: string
  cardBorder: string
  accent: string
  accentColor: string
  buttonGradient: string
  buttonHighlight: string
  secondaryAccent: string
  glowColor: string
  headerBg: string
  overlayBg: string
}

const defaultTheme: ThemeColors = {
  bg: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)',
  bgGradient: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
  cardBg: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#9b59b6',
  accentColor: '#D8B4FE',
  buttonGradient: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
  buttonHighlight: 'rgba(255,255,255,0.08)',
  secondaryAccent: '#EDC22E',
  glowColor: 'rgba(237,194,46,0.4)',
  headerBg: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
  overlayBg: 'rgba(0,0,0,0.85)',
}

const premiumTheme: ThemeColors = {
  bg: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  bgGradient: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  cardBg: 'rgba(0, 255, 200, 0.06)',
  cardBorder: 'rgba(0, 255, 200, 0.15)',
  accent: '#00FFD1',
  accentColor: '#00FFD1',
  buttonGradient: 'linear-gradient(135deg, #00FFD1, #00B4D8)',
  buttonHighlight: 'rgba(0, 255, 200, 0.1)',
  secondaryAccent: '#EDC22E',
  glowColor: 'rgba(0,255,209,0.4)',
  headerBg: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  overlayBg: 'rgba(0,0,0,0.88)',
}

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'premium' ? premiumTheme : defaultTheme
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'default'
    try {
      const saved = localStorage.getItem(THEME_KEY)
      return (saved === 'premium' ? 'premium' : 'default') as ThemeMode
    } catch {
      return 'default'
    }
  })

  // Listen for theme changes from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        setThemeState(e.newValue === 'premium' ? 'premium' : 'default')
      }
    }

    const handleCustomEvent = () => {
      try {
        const saved = localStorage.getItem(THEME_KEY)
        setThemeState(saved === 'premium' ? 'premium' : 'default')
      } catch {
        // ignore
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('themeChanged', handleCustomEvent)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('themeChanged', handleCustomEvent)
    }
  }, [])

  const setTheme = useCallback((mode: ThemeMode) => {
    try {
      localStorage.setItem(THEME_KEY, mode)
    } catch {
      // ignore
    }
    setThemeState(mode)
    // Dispatch custom event so other components can react instantly
    window.dispatchEvent(new Event('themeChanged'))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'default' ? 'premium' : 'default')
  }, [theme, setTheme])

  const colors = getThemeColors(theme)

  return { theme, colors, setTheme, toggleTheme, isPremium: theme === 'premium' }
}
