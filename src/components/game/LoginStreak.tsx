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
  { day: 1, label: '2 Magnets + 10🪙', emoji: '🧲', color: '#00E676', items: '2x Magnet + 10 coins', coins: 10, abilities: [] as string[] },
  { day: 2, label: '2 Spins + 25🪙', emoji: '🎫', color: '#00FFFF', items: '2 Spin tickets + 25 coins', coins: 25, abilities: [] as string[] },
  { day: 3, label: 'Magnet + Boom + 35🪙', emoji: '🧲💣', color: '#F59563', items: 'Magnet & Boom + 35 coins + 1x 2.5x Ability!', coins: 35, abilities: ['💫 2.5x'] },
  { day: 4, label: '2 Booms + 50🪙', emoji: '💣', color: '#FF7A00', items: '2x Boom + 50 coins', coins: 50, abilities: [] as string[] },
  { day: 5, label: 'Hammer + Magnets + 65🪙', emoji: '🔨🧲', color: '#F67C5F', items: 'Hammer & Magnets + 65 coins + 1x +10s Timer!', coins: 65, abilities: ['⏱️ +10s'] },
  { day: 6, label: 'Mega Power-ups + 100🪙', emoji: '🧲🔨', color: '#F59563', items: 'Mega power-ups + 100 coins!', coins: 100, abilities: [] as string[] },
  { day: 7, label: '5 Spins + 200🪙', emoji: '🎰', color: '#EDC22E', items: 'BIG REWARD! 5 spins + 200 coins + ALL Abilities! 🎉', coins: 200, abilities: ['⚡ 5x', '💫 2.5x', '⏱️ +10s'] },
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
                  const isDay7 = i === 6

                  return (
                    <motion.div
                      key={i}
                      className={`relative flex flex-col items-center p-2 rounded-xl overflow-hidden ${isCurrent ? 'ring-2' : ''}`}
                      style={{
                        backgroundColor: isCurrent ? `${reward.color}15` : isClaimed ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                        border: isCurrent ? `1px solid ${reward.color}50` : isDay7 && isAvailable ? '1px solid rgba(237,194,46,0.3)' : '1px solid rgba(255,255,255,0.05)',
                        opacity: isLocked ? 0.35 : 1,
                        ringColor: isCurrent ? reward.color : undefined,
                      }}
                      animate={isCurrent ? {
                        boxShadow: [
                          `0 0 0px ${reward.color}00`,
                          `0 0 12px ${reward.color}40`,
                          `0 0 0px ${reward.color}00`,
                        ],
                      } : {}}
                      transition={isCurrent ? {
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      } : {}}
                    >
                      {/* Shimmer effect on current day */}
                      {isCurrent && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `linear-gradient(110deg, transparent 25%, ${reward.color}15 50%, transparent 75%)`,
                          }}
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                      )}

                      {/* Day 7 special glow */}
                      {isDay7 && isAvailable && !isCurrent && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `linear-gradient(110deg, transparent 25%, rgba(237,194,46,0.08) 50%, transparent 75%)`,
                          }}
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        />
                      )}

                      <span className="text-lg mb-0.5 relative z-10">{reward.emoji}</span>
                      <span className="text-[8px] font-bold text-center leading-tight relative z-10" style={{ color: isCurrent ? reward.color : isClaimed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)' }}>
                        D{reward.day}
                      </span>
                      <span className="text-[6px] text-center leading-tight mt-0.5 relative z-10" style={{ color: isCurrent ? reward.color : 'rgba(255,255,255,0.3)' }}>
                        {isClaimed ? '✓ Claimed' : isLocked ? '🔒' : reward.label}
                      </span>

                      {/* Ability badges */}
                      {reward.abilities.length > 0 && !isClaimed && !isLocked && (
                        <div className="flex flex-wrap gap-0.5 mt-1 justify-center relative z-10">
                          {reward.abilities.map((ability, ai) => (
                            <span
                              key={ai}
                              className="text-[5px] px-1 py-0.5 rounded-full font-bold"
                              style={{
                                backgroundColor: ability.includes('5x') ? 'rgba(255,0,255,0.15)' :
                                  ability.includes('2.5x') ? 'rgba(0,255,255,0.12)' :
                                  'rgba(0,230,118,0.12)',
                                color: ability.includes('5x') ? '#FF00FF' :
                                  ability.includes('2.5x') ? '#00FFFF' :
                                  '#00E676',
                                border: `1px solid ${ability.includes('5x') ? 'rgba(255,0,255,0.25)' :
                                  ability.includes('2.5x') ? 'rgba(0,255,255,0.2)' :
                                  'rgba(0,230,118,0.2)'}`,
                              }}
                            >
                              {ability}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Claim button for current day */}
              {streakDay < 7 && !streakClaimed[streakDay] && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl mb-2 relative overflow-hidden"
                  style={{ backgroundColor: `${STREAK_REWARDS[streakDay].color}10`, border: `1px solid ${STREAK_REWARDS[streakDay].color}30` }}
                >
                  {/* Shimmer on claim card */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(110deg, transparent 25%, ${STREAK_REWARDS[streakDay].color}10 50%, transparent 75%)`,
                    }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  />

                  <div className="flex items-center gap-3 relative z-10">
                    <span className="text-2xl">{STREAK_REWARDS[streakDay].emoji}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold" style={{ color: STREAK_REWARDS[streakDay].color }}>
                        Day {streakDay + 1}: {STREAK_REWARDS[streakDay].label}
                      </p>
                      <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {STREAK_REWARDS[streakDay].items}
                      </p>
                      {STREAK_REWARDS[streakDay].abilities.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {STREAK_REWARDS[streakDay].abilities.map((ability, ai) => (
                            <span
                              key={ai}
                              className="text-[7px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                backgroundColor: ability.includes('5x') ? 'rgba(255,0,255,0.15)' :
                                  ability.includes('2.5x') ? 'rgba(0,255,255,0.12)' :
                                  'rgba(0,230,118,0.12)',
                                color: ability.includes('5x') ? '#FF00FF' :
                                  ability.includes('2.5x') ? '#00FFFF' :
                                  '#00E676',
                              }}
                            >
                              {ability}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onClaim(streakDay)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-transform hover:scale-105 active:scale-95 relative z-10"
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
