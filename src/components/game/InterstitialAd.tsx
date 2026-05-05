'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Megaphone } from 'lucide-react'
import { ADMOB_CONFIG, canShowInterstitial, markInterstitialShown } from '@/lib/admob'

interface InterstitialAdProps {
  isOpen: boolean
  onClose: () => void
  isOnline: boolean
}

export function InterstitialAd({ isOpen, onClose, isOnline }: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(5)
  const [canClose, setCanClose] = useState(false)
  const [prevOpen, setPrevOpen] = useState(false)

  // Reset when ad opens
  if (isOpen && !prevOpen) {
    setPrevOpen(true)
    setCountdown(5)
    setCanClose(false)
  }
  if (!isOpen && prevOpen) {
    setPrevOpen(false)
  }

  useEffect(() => {
    if (!isOpen || canClose) return

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
  }, [isOpen, canClose])

  const handleClose = useCallback(() => {
    if (canClose) {
      markInterstitialShown()
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
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Sponsored</span>
              </div>
              <button
                onClick={handleClose}
                disabled={!canClose}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: canClose ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  cursor: canClose ? 'pointer' : 'not-allowed',
                }}
              >
                {canClose ? (
                  <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.7)' }} />
                ) : (
                  <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>{countdown}</span>
                )}
              </button>
            </div>

            {/* Ad content placeholder */}
            <div className="px-6 pb-6">
              <div className="w-full h-40 rounded-xl flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Megaphone className="w-10 h-10" style={{ color: '#EDC22E' }} />
                <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Advertisement</p>
                <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Ad ID: {ADMOB_CONFIG.interstitial.id}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
