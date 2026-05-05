'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Megaphone } from 'lucide-react'
import { ADMOB_CONFIG } from '@/lib/admob'

interface InterstitialAdProps {
  isOpen: boolean
  onClose: () => void
  isOnline: boolean
  /** Duration in seconds. App open = 8s, interstitial = 5s */
  duration?: number
}

export function InterstitialAd({ isOpen, onClose, isOnline, duration = 5 }: InterstitialAdProps) {
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

  if (!isOnline) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8 }}
            className="w-full h-full flex flex-col items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)' }}
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
                className="w-8 h-8 rounded-full flex items-center justify-center"
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
              <div className="w-full aspect-[3/4] max-h-[60vh] rounded-xl flex flex-col items-center justify-center gap-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Megaphone className="w-16 h-16" style={{ color: '#EDC22E' }} />
                <p className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Advertisement</p>
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Ad ID: {ADMOB_CONFIG.interstitial.id}
                </p>
              </div>
            </div>

            {/* Progress bar - bottom */}
            <div className="w-full max-w-sm px-6 pb-6">
              {!canClose && countdown > 0 && (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #EDC22E, #FF7A00)' }}
                    animate={{ width: `${((duration - countdown) / duration) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
