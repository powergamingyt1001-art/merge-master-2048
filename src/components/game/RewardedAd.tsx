'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, Play, Heart, Hammer, Magnet, Bomb } from 'lucide-react'

export type RewardType = 'life' | 'hammer' | 'magnet' | 'blast'

interface RewardedAdProps {
  isOpen: boolean
  onClose: () => void
  onReward: (type: RewardType) => void
  rewardType: RewardType
}

const REWARD_INFO: Record<RewardType, { icon: React.ReactNode; label: string; color: string }> = {
  life: { icon: <Heart className="w-6 h-6" />, label: 'Extra Life', color: '#F65E3B' },
  hammer: { icon: <Hammer className="w-6 h-6" />, label: 'Hammer', color: '#F59563' },
  magnet: { icon: <Magnet className="w-6 h-6" />, label: 'Magnet', color: '#00E676' },
  blast: { icon: <Bomb className="w-6 h-6" />, label: 'Blast', color: '#FF7A00' },
}

export function RewardedAd({ isOpen, onClose, onReward, rewardType }: RewardedAdProps) {
  const [countdown, setCountdown] = useState(5)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [canSkip, setCanSkip] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5)
      setIsPlaying(false)
      setIsComplete(false)
      setCanSkip(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isPlaying || isComplete) return

    if (countdown <= 0) {
      setIsComplete(true)
      setCanSkip(true)
      return
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [isPlaying, countdown, isComplete])

  const handleStart = useCallback(() => {
    setIsPlaying(true)
  }, [])

  const handleClaim = useCallback(() => {
    onReward(rewardType)
    onClose()
  }, [onReward, rewardType, onClose])

  const handleSkip = useCallback(() => {
    if (canSkip) {
      onClose()
    }
  }, [canSkip, onClose])

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
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Skip button */}
            <div className="flex justify-end p-3">
              <button
                onClick={handleSkip}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: canSkip ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  color: canSkip ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                }}
                disabled={!canSkip}
              >
                <X className="w-3 h-3" />
                {canSkip ? 'Skip' : `${countdown}s`}
              </button>
            </div>

            {/* Ad content area */}
            <div className="px-6 pb-2">
              {!isPlaying ? (
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
                  <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Watch a short ad to earn <span style={{ color: info.color }}>{info.label}</span>
                  </p>
                  <button
                    onClick={handleStart}
                    className="px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto transition-transform hover:scale-105 active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${info.color}, ${info.color}CC)`,
                      color: '#FFFFFF',
                      boxShadow: `0 4px 20px ${info.color}40`,
                    }}
                  >
                    <Play className="w-4 h-4" />
                    Watch Ad
                  </button>
                </div>
              ) : !isComplete ? (
                // Simulated ad playing
                <div className="text-center py-8">
                  <div className="relative w-full h-32 rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    {/* Simulated ad content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Gift className="w-10 h-10 mx-auto mb-2" style={{ color: '#EDC22E' }} />
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Ad Playing...</p>
                      </div>
                    </div>
                    {/* Progress bar */}
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
                    You earned <span style={{ color: info.color }}>{info.label}</span>
                  </p>
                  <button
                    onClick={handleClaim}
                    className="px-8 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-105 active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${info.color}, ${info.color}CC)`,
                      color: '#FFFFFF',
                      boxShadow: `0 4px 20px ${info.color}40`,
                    }}
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
