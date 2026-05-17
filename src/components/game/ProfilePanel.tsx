'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Trophy, Star, Shield, Zap, Edit3, Check, Bell, Coins, Swords, Target, Calendar, Users, TrendingUp, Percent } from 'lucide-react'
import { Notification, PLAYER_AVATARS, getLevelInfo, getLevelThreshold, MAX_LEVEL } from '@/hooks/useGame'

interface ProfilePanelProps {
  isOpen: boolean
  onClose: () => void
  playerName: string
  playerAvatar: string
  playerLevel: number
  gamePoints: number
  levelXP: number
  bestScore: number
  modBestScore: number
  coins: number
  gamesPlayedToday: number
  maxGamesPerDay: number
  invitedUsers: { id: string; name: string }[]
  onUpdateName: (name: string) => void
  onUpdateAvatar: (avatar: string) => void
  totalBattlesPlayed: number
  totalBattlesWon: number
  onResetAllData?: () => void
}

// Level info is now imported from useGame.ts (1000 levels)

export function ProfilePanel({
  isOpen, onClose, playerName, playerAvatar, playerLevel,
  gamePoints, levelXP, bestScore, modBestScore, coins,
  gamesPlayedToday, maxGamesPerDay, invitedUsers,
  onUpdateName, onUpdateAvatar,
  totalBattlesPlayed, totalBattlesWon,
  onResetAllData,
}: ProfilePanelProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(playerName)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const levelInfo = getLevelInfo(playerLevel)
  const currentLevelThreshold = getLevelThreshold(playerLevel)
  const nextLevelThreshold = getLevelThreshold(playerLevel + 1)
  const progressPct = nextLevelThreshold > currentLevelThreshold
    ? Math.min(100, ((levelXP - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100)
    : 100
  const xpNeededForNextLevel = playerLevel < MAX_LEVEL ? nextLevelThreshold - levelXP : 0

  const winPercentage = totalBattlesPlayed > 0
    ? Math.round((totalBattlesWon / totalBattlesPlayed) * 100)
    : 0

  const handleSaveName = () => {
    if (nameInput.trim()) {
      onUpdateName(nameInput.trim())
    }
    setEditingName(false)
  }

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
            className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)' }}>
              <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>👤 Profile</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="px-4 pb-4">
              {/* Avatar + Name Section */}
              <div className="flex flex-col items-center mb-4">
                <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-2 relative"
                  style={{
                    background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}88)`,
                    border: '3px solid rgba(255,255,255,0.2)',
                    boxShadow: `0 0 20px ${levelInfo.color}40`,
                  }}>
                  <span className="text-4xl">{playerAvatar}</span>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: levelInfo.color, color: '#FFFFFF', border: '2px solid #1a0533' }}>
                    {playerLevel}
                  </div>
                </button>

                {/* Avatar Picker */}
                <AnimatePresence>
                  {showAvatarPicker && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="w-full mb-2">
                      <div className="grid grid-cols-5 gap-2 p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {PLAYER_AVATARS.map((av) => (
                          <button key={av} onClick={() => { onUpdateAvatar(av); setShowAvatarPicker(false) }}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-transform hover:scale-110"
                            style={{
                              backgroundColor: av === playerAvatar ? `${levelInfo.color}20` : 'rgba(255,255,255,0.04)',
                              border: av === playerAvatar ? `1.5px solid ${levelInfo.color}` : '1px solid rgba(255,255,255,0.06)',
                            }}>
                            {av}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Name */}
                <div className="flex items-center gap-2">
                  {editingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="px-2 py-1 rounded-lg text-sm font-bold w-28 text-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)', outline: 'none' }}
                        maxLength={12}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      />
                      <button onClick={handleSaveName} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(0,230,118,0.2)' }}>
                        <Check className="w-3.5 h-3.5" style={{ color: '#00E676' }} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold" style={{ color: '#FFFFFF' }}>{playerName}</span>
                      <button onClick={() => { setEditingName(true); setNameInput(playerName) }}
                        className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        <Edit3 className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Level Title */}
                <div className="flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${levelInfo.color}15`, border: `1px solid ${levelInfo.color}30` }}>
                  <span className="text-sm">{levelInfo.icon}</span>
                  <span className="text-[10px] font-bold" style={{ color: levelInfo.color }}>{levelInfo.title}</span>
                </div>
              </div>

              {/* Level Progress */}
              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold" style={{ color: levelInfo.color }}>Level {playerLevel} Progress</span>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{levelXP.toLocaleString()} / {nextLevelThreshold.toLocaleString()} XP</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}CC)` }} />
                </div>
                {playerLevel < MAX_LEVEL && (
                  <p className="text-[8px] mt-1 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {xpNeededForNextLevel.toLocaleString()} more XP to Level {playerLevel + 1}
                  </p>
                )}
                {playerLevel >= MAX_LEVEL && (
                  <p className="text-[8px] mt-1 text-center" style={{ color: '#F65E3B' }}>MAX LEVEL! 🎮🔥</p>
                )}
              </div>

              {/* Win Rate Box - Prominent */}
              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-4 h-4" style={{ color: '#F65E3B' }} />
                  <span className="text-xs font-bold" style={{ color: '#F65E3B' }}>Win Rate</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-extrabold" style={{ color: winPercentage >= 50 ? '#00E676' : '#F65E3B' }}>
                      {totalBattlesPlayed > 0 ? `${winPercentage}%` : '-'}
                    </p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {totalBattlesWon}W / {totalBattlesPlayed - totalBattlesWon}L ({totalBattlesPlayed} battles)
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center relative" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '3px solid rgba(255,255,255,0.1)' }}>
                    <svg className="absolute inset-0" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke={winPercentage >= 50 ? '#00E676' : '#F65E3B'} strokeWidth="2.5"
                        strokeDasharray={`${winPercentage}, 100`} strokeLinecap="round" />
                    </svg>
                    <TrendingUp className="w-5 h-5" style={{ color: winPercentage >= 50 ? '#00E676' : '#F65E3B' }} />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <StatBox icon={<Trophy className="w-4 h-4" />} label="Best Score" value={bestScore.toLocaleString()} color="#EDC22E" />
                <StatBox icon={<Swords className="w-4 h-4" />} label="Mod Best" value={modBestScore > 0 ? modBestScore.toLocaleString() : '-'} color="#F65E3B" />
                <StatBox icon={<Target className="w-4 h-4" />} label="Level XP" value={`${levelXP.toLocaleString()} / ${nextLevelThreshold.toLocaleString()}`} color="#00E676" />
                <StatBox icon={<Coins className="w-4 h-4" />} label="Coins" value={coins.toLocaleString()} color="#EDC22E" />
                <StatBox icon={<Calendar className="w-4 h-4" />} label="Games Today" value={`${gamesPlayedToday}/${maxGamesPerDay}`} color="#00FFFF" />
                <StatBox icon={<Users className="w-4 h-4" />} label="Invited" value={invitedUsers.length.toString()} color="#F59563" />
              </div>

              {/* Points Info */}
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.1)' }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: '#00E676' }}>📊 How Points Work</p>
                <ul className="space-y-0.5">
                  <li className="text-[9px] flex items-start gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#00E676' }}>•</span> 50 score = 1.5 points from merges
                  </li>
                  <li className="text-[9px] flex items-start gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#00E676' }}>•</span> 3 points = 1 XP
                  </li>
                  <li className="text-[9px] flex items-start gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#00E676' }}>•</span> XP determines your level
                  </li>
                  <li className="text-[9px] flex items-start gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#00E676' }}>•</span> 100 coins per level completion
                  </li>
                  <li className="text-[9px] flex items-start gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#00E676' }}>•</span> Bonus 400 coins every 5 levels
                  </li>
                  <li className="text-[9px] flex items-start gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#00E676' }}>•</span> Daily limit: {maxGamesPerDay} games
                  </li>
                </ul>
              </div>

              {/* Reset Data Button */}
              {onResetAllData && (
                <button
                  onClick={() => {
                    if (window.confirm('Reset ALL data? This will clear everything and start fresh. Welcome bonus will be available again.')) {
                      onResetAllData()
                      onClose()
                    }
                  }}
                  className="w-full mt-3 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01] active:scale-95"
                  style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)', color: '#F65E3B' }}
                >
                  🔄 Reset All Data
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}08`, border: `1px solid ${color}15` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <div style={{ color }}>{icon}</div>
        <span className="text-[8px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      </div>
      <span className="text-sm font-extrabold" style={{ color }}>{value}</span>
    </div>
  )
}

export function NotificationsPanel({
  isOpen, onClose, notifications, onMarkRead, onMarkAllRead,
}: {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}) {
  const unreadCount = notifications.filter(n => !n.read).length

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
            className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)' }}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" style={{ color: '#EDC22E' }} />
                <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(246,94,59,0.2)', color: '#F65E3B' }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={onMarkAllRead} className="text-[8px] font-bold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                    Read All
                  </button>
                )}
                <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
            </div>

            <div className="px-4 pb-4">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No notifications yet</p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Your rewards and updates will appear here</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {notifications.map((notif) => (
                    <button key={notif.id} onClick={() => onMarkRead(notif.id)}
                      className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl transition-colors"
                      style={{
                        backgroundColor: notif.read ? 'rgba(255,255,255,0.02)' : `${getTypeColor(notif.type)}08`,
                        border: notif.read ? '1px solid rgba(255,255,255,0.04)' : `1px solid ${getTypeColor(notif.type)}20`,
                      }}>
                      <span className="text-lg flex-shrink-0 mt-0.5">{notif.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-[10px] font-bold truncate" style={{ color: notif.read ? 'rgba(255,255,255,0.5)' : '#FFFFFF' }}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getTypeColor(notif.type) }} />
                          )}
                        </div>
                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{notif.message}</p>
                        <p className="text-[7px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          {new Date(notif.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function getTypeColor(type: Notification['type']): string {
  switch (type) {
    case 'reward': return '#00E676'
    case 'rank': return '#EDC22E'
    case 'invite': return '#00FFFF'
    case 'commission': return '#FF7A00'
    case 'battle': return '#F65E3B'
    case 'system': return '#8f7a66'
    default: return '#FFFFFF'
  }
}
