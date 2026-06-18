'use client'

import { useEffect } from 'react'
import { initAdSense } from '@/lib/admob'

/**
 * Initializes Google AdSense on app load.
 * Render once inside <body> of layout.tsx (after ThemeProvider, before children).
 * The script tag itself is also placed in <head> of layout.tsx for faster loading —
 * this hook ensures `initAdSense()` runs even if the head script is missing
 * and pushes the initial `(adsbygoogle = window.adsbygoogle || []).push({})` queue.
 */
export function AdSenseInit() {
  useEffect(() => {
    try {
      initAdSense()
    } catch {
      // AdSense init may fail if offline or already loaded — safe to ignore
    }
  }, [])

  return null
}
