'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, Hammer, Magnet, Bomb, Sparkles } from 'lucide-react'

interface LoginStreakProps {
  isOpen: boolean
  onClose: () => void
  streakDay: number
  onClaim: (day: number) => void
}

const STREAK_REWARDS: { day: number; icon: React.ReactNode; label: string; color: string }[] = [
  { day: 0, icon: <Heart className="w-4 h-4" />, label: '❤️ +1 Life', color: '#F65E3B' },
  { day: 1, icon: <Hammer className="w-4 h-4" />, label: '🔨 Hammer', color: '#F59563' },
  { day: 2, icon: <Sparkles className="w-4 h-4" />, label: '💰 50 Pts', color: '#EDC22E' },
  { day: 3, icon: <Magnet className="w-4 h-4" />, label: '🧲 Magnet', color: '#00E676' },
  { day: 4, icon: <Sparkles className="w-4 h-4" />, label: '2X Score', color: '#FF7A00' },
  { day: 5, icon: <Bomb className="w-4 h-4" />, label: '💣 Blast', color: '#FF7A00' },
  { day: 6, icon: <Sparkles className="w-4 h-4" />, label: '🎰 5 Spins', color: '#EDC22E' },
]

export function LoginStreak({ isOpen, onClose, streakDay, onClaim }: LoginStreakProps) {
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
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>📅 Login Streak</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="px-4 pb-5">
              <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Login daily to earn rewards! Day {streakDay + 1} of 7
              </p>

              <div className="space-y-2">
                {STREAK_REWARDS.map((reward, i) => {
                  const isClaimed = i < streakDay
                  const isCurrent = i === streakDay
                  const isLocked = i > streakDay

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                      style={{
                        backgroundColor: isCurrent ? `${reward.color}15` : isClaimed ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                        border: isCurrent ? `1px solid ${reward.color}40` : '1px solid rgba(255,255,255,0.05)',
                        opacity: isLocked ? 0.4 : 1,
                      }}
                    >
                      {/* Day indicator */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          backgroundColor: isClaimed ? `${reward.color}20` : isCurrent ? reward.color : 'rgba(255,255,255,0.06)',
                          color: isClaimed || isCurrent ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {isClaimed ? '✓' : `D${i + 1}`}
                      </div>

                      {/* Reward info */}
                      <span className="text-xs font-semibold flex-1" style={{ color: isCurrent ? reward.color : isClaimed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)' }}>
                        {reward.label}
                      </span>

                      {/* Status */}
                      {isCurrent && (
                        <button
                          onClick={() => onClaim(i)}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold transition-transform hover:scale-105 active:scale-95"
                          style={{ backgroundColor: reward.color, color: '#FFFFFF' }}
                        >
                          CLAIM
                        </button>
                      )}
                      {isClaimed && (
                        <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          CLAIMED
                        </span>
                      )}
                      {isLocked && (
                        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
                          🔒
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
