'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, Play, Heart, Hammer, Magnet, Bomb } from 'lucide-react'

export type RewardType = 'life' | 'hammer' | 'magnet' | 'blast'

interface RewardedAdProps {
  isOpen: boolean
  onClose: () => void
  onReward: (type: RewardType) => void
  rewardType: RewardType
  isOnline: boolean
  timeoutSeconds?: number
}

const REWARD_INFO: Record<RewardType, { icon: React.ReactNode; label: string; color: string }> = {
  life: { icon: <Heart className="w-6 h-6" />, label: 'Extra Life', color: '#F65E3B' },
  hammer: { icon: <Hammer className="w-6 h-6" />, label: 'Hammer', color: '#F59563' },
  magnet: { icon: <Magnet className="w-6 h-6" />, label: 'Magnet', color: '#00E676' },
  blast: { icon: <Bomb className="w-6 h-6" />, label: 'Blast', color: '#FF7A00' },
}

export function RewardedAd({ isOpen, onClose, onReward, rewardType, isOnline, timeoutSeconds = 10 }: RewardedAdProps) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'complete'>('ready')
  const [countdown, setCountdown] = useState(5)
  const [dismissTimer, setDismissTimer] = useState(timeoutSeconds)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const dismissRef = useRef<NodeJS.Timeout | null>(null)

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPhase('ready')
      setCountdown(5)
      setDismissTimer(timeoutSeconds)
    }
  }, [isOpen, timeoutSeconds])

  // Ad countdown
  useEffect(() => {
    if (phase !== 'playing') return

    if (countdown <= 0) {
      setPhase('complete')
      return
    }

    countdownRef.current = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current)
    }
  }, [phase, countdown])

  // Dismiss timer (auto-close after timeout)
  useEffect(() => {
    if (!isOpen) return
    if (phase === 'complete') return

    if (dismissTimer <= 0) {
      onClose()
      return
    }

    dismissRef.current = setTimeout(() => {
      setDismissTimer(prev => prev - 1)
    }, 1000)

    return () => {
      if (dismissRef.current) clearTimeout(dismissRef.current)
    }
  }, [isOpen, phase, dismissTimer, onClose])

  const handleStart = useCallback(() => {
    if (!isOnline) {
      // If offline, just give reward directly (no ad)
      onReward(rewardType)
      onClose()
      return
    }
    setPhase('playing')
  }, [isOnline, onReward, rewardType, onClose])

  const handleClaim = useCallback(() => {
    onReward(rewardType)
    onClose()
  }, [onReward, rewardType, onClose])

  const info = REWARD_INFO[rewardType]

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
            exit={{ scale: 0.8, y: 30 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Cross/Close button + Timer */}
            <div className="flex items-center justify-between p-3">
              <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {dismissTimer}s
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              {!isOnline ? (
                // Offline - instant reward
                <div className="text-center py-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: info.color + '30', border: `2px solid ${info.color}` }}
                  >
                    <div style={{ color: info.color }}>{info.icon}</div>
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-1">No Internet</h3>
                  <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    You&apos;re offline. Get <span style={{ color: info.color }}>{info.label}</span> for free!
                  </p>
                  <button
                    onClick={handleStart}
                    className="px-8 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-105 active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}CC)`, color: '#FFFFFF' }}
                  >
                    Claim Free
                  </button>
                </div>
              ) : phase === 'ready' ? (
                // Pre-ad screen
                <div className="text-center py-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: info.color + '30', border: `2px solid ${info.color}` }}
                  >
                    <div style={{ color: info.color }}>{info.icon}</div>
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-1">Watch & Earn!</h3>
                  <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Watch a short ad to earn <span style={{ color: info.color }}>{info.label}</span>
                  </p>
                  <button
                    onClick={handleStart}
                    className="px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto transition-transform hover:scale-105 active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}CC)`, color: '#FFFFFF', boxShadow: `0 4px 20px ${info.color}40` }}
                  >
                    <Play className="w-4 h-4" />
                    Watch Ad
                  </button>
                </div>
              ) : phase === 'playing' ? (
                // Ad playing
                <div className="text-center py-8">
                  <div className="relative w-full h-28 rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Gift className="w-10 h-10" style={{ color: '#EDC22E' }} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <motion.div
                        className="h-full"
                        style={{ background: `linear-gradient(90deg, ${info.color}, #EDC22E)` }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${((5 - countdown) / 5) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                    Reward in <span style={{ color: info.color }}>{countdown}s</span>
                  </p>
                </div>
              ) : (
                // Reward complete
                <div className="text-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: info.color + '30', border: `2px solid ${info.color}` }}
                  >
                    <div style={{ color: info.color }}>{info.icon}</div>
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-1">Reward Earned!</h3>
                  <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    You earned <span style={{ color: info.color }}>{info.label}</span> 🎉
                  </p>
                  <button
                    onClick={handleClaim}
                    className="px-8 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-105 active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}CC)`, color: '#FFFFFF' }}
                  >
                    Claim Reward
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
