'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface LoginStreakProps {
  isOpen: boolean
  onClose: () => void
  streakDay: number
  streakClaimed: boolean[]
  onClaim: (day: number) => void
}

const STREAK_REWARDS = [
  { day: 1, label: '2 Magnets', emoji: '🧲', color: '#00E676', items: '2x Magnet power-up' },
  { day: 2, label: '2 Spins', emoji: '🎫', color: '#00FFFF', items: '2 Spin tickets' },
  { day: 3, label: '1 Magnet + 1 Boom', emoji: '🧲💣', color: '#F59563', items: 'Magnet & Boom' },
  { day: 4, label: '2 Booms', emoji: '💣', color: '#FF7A00', items: '2x Boom power-up' },
  { day: 5, label: '1 Hammer + 2 Magnets', emoji: '🔨🧲', color: '#F67C5F', items: 'Hammer & Magnets' },
  { day: 6, label: '3 Magnets + 2 Hammers', emoji: '🧲🔨', color: '#F59563', items: 'Mega power-ups!' },
  { day: 7, label: '5 Spin Tickets', emoji: '🎰', color: '#EDC22E', items: 'BIG REWARD! 🎉' },
]

export function LoginStreak({ isOpen, onClose, streakDay, streakClaimed, onClaim }: LoginStreakProps) {
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
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>📅 Daily Rewards</h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Day {Math.min(streakDay + 1, 7)} of 7 • Login daily to claim!
                </p>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="px-4 pb-5">
              <p className="text-[9px] mb-3 px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                ⏰ Rewards expire after 7 days. Unclaimed rewards reduce to 30%.
              </p>

              {/* 7 Day Boxes */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {STREAK_REWARDS.map((reward, i) => {
                  const isClaimed = streakClaimed[i]
                  const isCurrent = i === streakDay && !isClaimed && i < 7
                  const isLocked = i > streakDay
                  const isAvailable = i <= streakDay && !isClaimed

                  return (
                    <motion.div
                      key={i}
                      className={`flex flex-col items-center p-2 rounded-xl ${isCurrent ? 'ring-2' : ''}`}
                      style={{
                        backgroundColor: isCurrent ? `${reward.color}15` : isClaimed ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                        border: isCurrent ? `1px solid ${reward.color}50` : '1px solid rgba(255,255,255,0.05)',
                        opacity: isLocked ? 0.35 : 1,
                        ringColor: isCurrent ? reward.color : undefined,
                      }}
                    >
                      <span className="text-lg mb-0.5">{reward.emoji}</span>
                      <span className="text-[8px] font-bold text-center leading-tight" style={{ color: isCurrent ? reward.color : isClaimed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)' }}>
                        D{reward.day}
                      </span>
                      <span className="text-[7px] text-center leading-tight mt-0.5" style={{ color: isCurrent ? reward.color : 'rgba(255,255,255,0.3)' }}>
                        {isClaimed ? '✓ Claimed' : isLocked ? '🔒' : reward.label}
                      </span>
                    </motion.div>
                  )
                })}
              </div>

              {/* Claim button for current day */}
              {streakDay < 7 && !streakClaimed[streakDay] && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl mb-2"
                  style={{ backgroundColor: `${STREAK_REWARDS[streakDay].color}10`, border: `1px solid ${STREAK_REWARDS[streakDay].color}30` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{STREAK_REWARDS[streakDay].emoji}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold" style={{ color: STREAK_REWARDS[streakDay].color }}>
                        Day {streakDay + 1}: {STREAK_REWARDS[streakDay].label}
                      </p>
                      <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {STREAK_REWARDS[streakDay].items}
                      </p>
                    </div>
                    <button
                      onClick={() => onClaim(streakDay)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-transform hover:scale-105 active:scale-95"
                      style={{ backgroundColor: STREAK_REWARDS[streakDay].color, color: '#FFFFFF' }}
                    >
                      CLAIM
                    </button>
                  </div>
                </motion.div>
              )}

              {/* All claimed message */}
              {streakDay >= 7 && (
                <div className="p-3 rounded-xl mb-2 text-center"
                  style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#EDC22E' }}>🎉 All 7 days claimed!</p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Come back tomorrow for new rewards</p>
                </div>
              )}

              {/* Progress bar */}
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(streakClaimed.filter(Boolean).length / 7) * 100}%`,
                      background: 'linear-gradient(90deg, #EDC22E, #FF7A00)',
                    }}
                  />
                </div>
                <p className="text-[9px] mt-1 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {streakClaimed.filter(Boolean).length}/7 claimed
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
