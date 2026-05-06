'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone } from 'lucide-react'
import { ADMOB_CONFIG } from '@/lib/admob'

interface InterstitialAdProps {
  isOpen: boolean
  onClose: () => void
  isOnline: boolean
  /** Duration in seconds. App open = 8s, interstitial = 5s */
  duration?: number
  /** Whether this is an app open ad (full screen, 8s) or interstitial (5s) */
  isAppOpen?: boolean
}

export function InterstitialAd({ isOpen, onClose, isOnline, duration = 5, isAppOpen = false }: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(0)
  const [canClose, setCanClose] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)

  // Detect when ad opens and initialize
  if (isOpen && !wasOpen) {
    setWasOpen(true)
    setCountdown(duration)
    setCanClose(false)
  }
  if (!isOpen && wasOpen) {
    setWasOpen(false)
  }

  // Countdown timer
  useEffect(() => {
    if (!isOpen || canClose || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanClose(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, canClose, countdown])

  const handleClose = useCallback(() => {
    if (canClose) {
      onClose()
    }
  }, [canClose, onClose])

  if (!isOnline) {
    // If offline, skip the ad and start game immediately
    if (isOpen) onClose()
    return null
  }

  const adUnitId = isAppOpen ? ADMOB_CONFIG.appOpen.id : ADMOB_CONFIG.interstitial.id
  const adLabel = isAppOpen ? 'App Open Ad' : 'Advertisement'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8 }}
            className="w-full h-full flex flex-col items-center justify-center"
            style={{ background: isAppOpen
              ? 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)'
              : 'linear-gradient(135deg, #1a0533, #0d1b3e)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 w-full max-w-sm">
              <div className="flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Sponsored</span>
              </div>
              <button
                onClick={handleClose}
                disabled={!canClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: canClose ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  cursor: canClose ? 'pointer' : 'not-allowed',
                }}
              >
                {canClose ? (
                  <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>✕</span>
                ) : (
                  <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{countdown}</span>
                )}
              </button>
            </div>

            {/* Ad content - FULL SCREEN */}
            <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center px-6">
              {isAppOpen ? (
                /* App Open Ad - more prominent */
                <div className="w-full aspect-[3/4] max-h-[60vh] rounded-xl flex flex-col items-center justify-center gap-4"
                  style={{
                    backgroundColor: 'rgba(237,194,46,0.06)',
                    border: '2px solid rgba(237,194,46,0.2)',
                    boxShadow: '0 0 60px rgba(237,194,46,0.1)',
                  }}>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Megaphone className="w-20 h-20" style={{ color: '#EDC22E' }} />
                  </motion.div>
                  <p className="text-xl font-bold" style={{ color: '#EDC22E' }}>App Open Ad</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Your game will start shortly</p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Ad ID: {adUnitId}
                  </p>
                </div>
              ) : (
                /* Interstitial Ad - standard */
                <div className="w-full aspect-[3/4] max-h-[60vh] rounded-xl flex flex-col items-center justify-center gap-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Megaphone className="w-16 h-16" style={{ color: '#EDC22E' }} />
                  <p className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>{adLabel}</p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Ad ID: {adUnitId}
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar - bottom */}
            <div className="w-full max-w-sm px-6 pb-6">
              {!canClose && countdown > 0 && (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: isAppOpen
                      ? 'linear-gradient(90deg, #EDC22E, #FF7A00, #EDC22E)'
                      : 'linear-gradient(90deg, #EDC22E, #FF7A00)'
                    }}
                    animate={{ width: `${((duration - countdown) / duration) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
              {canClose && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl font-bold text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 20px rgba(237,194,46,0.4)',
                  }}
                >
                  {isAppOpen ? '🚀 Start Game' : '▶ Continue'}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
