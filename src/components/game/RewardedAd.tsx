'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, Gift } from 'lucide-react'

interface RewardedAdProps {
  isOpen: boolean
  onClose: () => void
  onReward: () => void
  isOnline: boolean
}

export function RewardedAd({ isOpen, onClose, onReward, isOnline }: RewardedAdProps) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'complete'>('ready')
  const [countdown, setCountdown] = useState(5)
  const [dismissTimer, setDismissTimer] = useState(10)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const dismissRef = useRef<NodeJS.Timeout | null>(null)

  // Reset when opened - use key-based remount instead of setState in effect
  // Countdown logic: use refs to avoid setState in effect
  useEffect(() => {
    if (!isOpen) return
    if (phase !== 'playing') return
    if (countdown <= 0) {
      // Use microtask to avoid synchronous setState
      const id = setTimeout(() => setPhase('complete'), 0)
      return () => clearTimeout(id)
    }
    countdownRef.current = setTimeout(() => setCountdown(prev => prev - 1), 1000)
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current) }
  }, [isOpen, phase, countdown])

  useEffect(() => {
    if (!isOpen || phase === 'complete') return
    if (dismissTimer <= 0) { onClose(); return }
    dismissRef.current = setTimeout(() => setDismissTimer(prev => prev - 1), 1000)
    return () => { if (dismissRef.current) clearTimeout(dismissRef.current) }
  }, [isOpen, phase, dismissTimer, onClose])

  const handleStart = useCallback(() => {
    if (!isOnline) { onReward(); onClose(); return }
    setPhase('playing')
  }, [isOnline, onReward, onClose])

  const handleClaim = useCallback(() => { onReward(); onClose() }, [onReward, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8 }}
            className="w-full max-w-xs rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header with timer + close */}
            <div className="flex items-center justify-between p-3">
              <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>{dismissTimer}s</span>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="px-6 pb-6">
              {!isOnline ? (
                <div className="text-center py-6">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'rgba(246,94,59,0.2)', border: '2px solid #F65E3B' }}>
                    <Heart className="w-6 h-6" style={{ color: '#F65E3B' }} />
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-1">No Internet</h3>
                  <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Get an extra life for free!</p>
                  <button onClick={handleStart} className="px-8 py-3 rounded-xl font-bold text-sm" style={{ background: 'linear-gradient(135deg, #F65E3B, #F67C5F)', color: '#FFFFFF' }}>
                    ❤️ Claim Free Life
                  </button>
                </div>
              ) : phase === 'ready' ? (
                <div className="text-center py-6">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'rgba(246,94,59,0.2)', border: '2px solid #F65E3B' }}>
                    <Heart className="w-6 h-6" style={{ color: '#F65E3B' }} />
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-1">Watch & Revive!</h3>
                  <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Watch a short ad to earn <span style={{ color: '#F65E3B' }}>1 Extra Life</span></p>
                  <button onClick={handleStart} className="px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto"
                    style={{ background: 'linear-gradient(135deg, #F65E3B, #F67C5F)', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(246,94,59,0.4)' }}>
                    📺 Watch Ad
                  </button>
                </div>
              ) : phase === 'playing' ? (
                <div className="text-center py-8">
                  <div className="relative w-full h-28 rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Gift className="w-10 h-10" style={{ color: '#EDC22E' }} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <motion.div className="h-full" style={{ background: 'linear-gradient(90deg, #F65E3B, #EDC22E)' }}
                        initial={{ width: '0%' }} animate={{ width: `${((5 - countdown) / 5) * 100}%` }} transition={{ duration: 0.3 }} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Reward in <span style={{ color: '#F65E3B' }}>{countdown}s</span></p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'rgba(246,94,59,0.2)', border: '2px solid #F65E3B' }}>
                    <Heart className="w-6 h-6" style={{ color: '#F65E3B' }} />
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-1">Life Earned! ❤️</h3>
                  <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>You got an extra life!</p>
                  <button onClick={handleClaim} className="px-8 py-3 rounded-xl font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #F65E3B, #F67C5F)', color: '#FFFFFF' }}>
                    Continue Playing
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
