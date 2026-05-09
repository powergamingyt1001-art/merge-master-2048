'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Gamepad2 } from 'lucide-react'

interface InterstitialAdProps {
  isOpen: boolean
  onClose: () => void
  isOnline: boolean
  /** Duration in seconds */
  duration?: number
  /** Whether this is an app open ad */
  isAppOpen?: boolean
}

export function InterstitialAd({ isOpen, onClose, isOnline, duration = 5, isAppOpen = false }: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(0)
  const [canClose, setCanClose] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)

  // Detect when ad opens
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
    if (isOpen) onClose()
    return null
  }

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
            className="w-full h-full flex flex-col"
            style={{ background: isAppOpen
              ? 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)'
              : 'linear-gradient(135deg, #1a0533, #0d1b3e)'
            }}
          >
            {/* App Open Ad - Header */}
            {isAppOpen && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                <Gamepad2 className="w-5 h-5" style={{ color: '#EDC22E' }} />
                <span className="text-sm font-extrabold" style={{ color: '#EDC22E', textShadow: '0 0 20px rgba(237,194,46,0.5)' }}>MERGE MASTER 2048</span>
                <Gamepad2 className="w-5 h-5" style={{ color: '#EDC22E' }} />
              </div>
            )}

            {/* Header - Close/Countdown */}
            <div className="flex items-center justify-between px-3 py-2 w-full max-w-sm mx-auto">
              <div className="flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Sponsored</span>
              </div>
              <button
                onClick={handleClose}
                disabled={!canClose}
                className="h-7 px-3 rounded-full flex items-center justify-center gap-1.5 transition-all"
                style={{
                  backgroundColor: canClose ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  cursor: canClose ? 'pointer' : 'not-allowed',
                }}
              >
                {canClose ? (
                  <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>✕ Close</span>
                ) : (
                  <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{countdown}s</span>
                )}
              </button>
            </div>

            {/* Ad Container - Adsterra native or placeholder */}
            <div className="flex-1 w-full max-w-sm mx-auto flex flex-col items-center justify-center px-4">
              <div id="adsterra-interstitial" className="w-full rounded-xl overflow-hidden" style={{ minHeight: 250 }}>
                {/* Adsterra popunder triggers on click — this is a branded placeholder */}
                <div className="w-full aspect-[3/4] max-h-[35vh] rounded-xl flex flex-col items-center justify-center gap-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Megaphone className="w-16 h-16" style={{ color: '#EDC22E' }} />
                  <p className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {isAppOpen ? '🎮 Welcome!' : 'Advertisement'}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</p>
                </div>
              </div>
            </div>

            {/* Bottom - Progress + Continue */}
            <div className="w-full max-w-sm mx-auto px-6 pb-6">
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
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{
                    background: isAppOpen
                      ? 'linear-gradient(135deg, #00E676, #00C853)'
                      : 'linear-gradient(135deg, #EDC22E, #FF7A00)',
                    color: '#FFFFFF',
                    boxShadow: isAppOpen
                      ? '0 4px 20px rgba(0,230,118,0.4)'
                      : '0 4px 20px rgba(237,194,46,0.4)',
                  }}
                >
                  {isAppOpen ? (
                    <>
                      <Gamepad2 className="w-4 h-4" />
                      🚀 Enter Game
                    </>
                  ) : (
                    '▶ Continue'
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
