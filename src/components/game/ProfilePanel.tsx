'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Trophy, Star, Edit3, Check, Bell, Coins, Swords, Calendar, Percent, Gift, Trash2, Sun, Moon, Copy, History, UserPlus, Shield } from 'lucide-react'
import { Notification, PLAYER_AVATARS, getLevelInfo, getLevelThreshold, MAX_LEVEL, GameHistoryEntry } from '@/hooks/useGame'
import { AdsterraBanner320x50 } from '@/components/ads/AdsterraAds'
import { useTheme } from 'next-themes'

// Extended avatar list with 35+ diverse avatars
const EXTENDED_AVATARS = [
  // Animals
  '🦊', '🐺', '🦅', '🐉', '🦁', '🐧', '🦄', '🐙', '🦈', '🐝',
  '🦋', '🐢', '🦎', '🦉', '🐊', '🐳', '🦩', '🐱', '🐶', '🐼',
  // Objects
  '🔥', '💎', '⚡', '👑', '🌟', '🎯', '🎪', '🚀', '🎭', '⭐',
  '🍀', '🌈', '🫧', '💫', '🎸', '🎨',
  // Faces
  '😎', '🤩', '😈', '👻', '🤖', '👽', '🥷', '💀', '🧙', '🧛', '🦸',
]

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
  // New props
  userCode: string
  totalCoinsEarned: number
  roomCardCount: number
  battleBestScore: number
  gameHistory: GameHistoryEntry[]
  onOpenRoomFight?: () => void
  onStartRoomGame?: (settings: any) => void
  skillPoints?: number
  isOwnProfile?: boolean
  onAddNotification?: (title: string, message: string, type: 'reward' | 'rank' | 'invite' | 'commission' | 'system' | 'battle' | 'friend_request', emoji: string) => void
  playerId?: string
  viewerPlayerId?: string
  onDeleteGameHistory?: (id: string) => void
  onClearGameHistory?: () => void
  classicBestScore?: number
  tournamentBestScore?: number
  onOpenAdminPanel?: () => void  // Open admin panel from profile
}

// Coin count formatter: 1000→1K, 2500→2.5K, 1000000→1M
function formatCoinCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return count.toString()
}

// Format date for game history grouping
function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const dateOnly = dateStr.split('T')[0]
  if (dateOnly === todayStr) return 'Today'
  if (dateOnly === yesterdayStr) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Get mode icon for game history
function getModeIcon(mode: string): string {
  switch (mode) {
    case 'bot': return '⚔️'
    case 'coins': return '🪙'
    case 'tournament': return '🏆'
    case 'classic': return '🎮'
    default: return '🎮'
  }
}

// Get mode label
function getModeLabel(mode: string): string {
  switch (mode) {
    case 'bot': return 'Battle'
    case 'coins': return 'Coins'
    case 'tournament': return 'Tour'
    case 'classic': return 'Classic'
    default: return mode
  }
}

// Calculate win/loss streak from game history
function calculateStreak(gameHistory: GameHistoryEntry[]): { type: 'win' | 'lose' | null; count: number } {
  if (gameHistory.length === 0) return { type: null, count: 0 }
  const sorted = [...gameHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const firstResult = sorted[0].result
  if (firstResult === 'classic') return { type: null, count: 0 }
  let streakType: 'win' | 'lose' = firstResult === 'win' ? 'win' : 'lose'
  let count = 0
  for (const entry of sorted) {
    if (entry.result === 'classic') continue
    const entryType = entry.result === 'win' ? 'win' : 'lose'
    if (entryType === streakType) {
      count++
    } else {
      break
    }
  }
  return { type: streakType, count }
}

export function ProfilePanel({
  isOpen, onClose, playerName, playerAvatar, playerLevel,
  gamePoints, levelXP, bestScore, modBestScore, coins,
  gamesPlayedToday, maxGamesPerDay, invitedUsers,
  onUpdateName, onUpdateAvatar,
  totalBattlesPlayed, totalBattlesWon,
  onResetAllData,
  userCode, totalCoinsEarned, roomCardCount, battleBestScore, gameHistory,
  skillPoints, isOwnProfile = true,
  onAddNotification,
  playerId, viewerPlayerId,
  onDeleteGameHistory, onClearGameHistory,
  classicBestScore = 0, tournamentBestScore = 0,
  onOpenAdminPanel,
}: ProfilePanelProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(playerName)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showLevelList, setShowLevelList] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showGameHistory, setShowGameHistory] = useState(false)
  const [historyTab, setHistoryTab] = useState<'today' | 'yesterday' | 'week'>('today')
  const [showAdminInput, setShowAdminInput] = useState(false)
  const [adminPwd, setAdminPwd] = useState('')
  const [adminPwdError, setAdminPwdError] = useState(false)
  const { theme, setTheme } = useTheme()

  // Sync local state with next-themes
  useEffect(() => {
    setIsDarkTheme(theme !== 'light')
  }, [theme])

  const levelInfo = getLevelInfo(playerLevel)
  const currentLevelThreshold = getLevelThreshold(playerLevel)
  const nextLevelThreshold = getLevelThreshold(playerLevel + 1)
  const progressPct = nextLevelThreshold > currentLevelThreshold
    ? Math.min(100, ((levelXP - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100)
    : 100
  const xpNeededForNextLevel = playerLevel < MAX_LEVEL ? nextLevelThreshold - levelXP : 0

  const totalLosses = totalBattlesPlayed - totalBattlesWon
  const winPercentage = totalBattlesPlayed > 0
    ? Math.round((totalBattlesWon / totalBattlesPlayed) * 100)
    : 0
  const lossPercentage = totalBattlesPlayed > 0 ? 100 - winPercentage : 0

  const streak = calculateStreak(gameHistory)

  // SP display value
  const spValue = skillPoints ?? gamePoints

  // Numeric-only UID for display and copy (friend search uses numeric IDs)
  const numericUid = userCode.replace(/\D/g, '') || userCode

  const handleSaveName = () => {
    if (nameInput.trim()) {
      onUpdateName(nameInput.trim())
    }
    setEditingName(false)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(numericUid).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }).catch(() => {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = numericUid
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  const handleInviteFriend = () => {
    try {
      const requests = JSON.parse(localStorage.getItem('mergeMaster2048_friendRequests') || '[]')
      const existingIndex = requests.findIndex((r: any) => r.uid === userCode)
      if (existingIndex >= 0) {
        // Already sent
        return
      }
      requests.push({
        uid: userCode,
        name: playerName,
        avatar: playerAvatar,
        level: playerLevel,
        date: new Date().toISOString(),
        status: 'pending'
      })
      localStorage.setItem('mergeMaster2048_friendRequests', JSON.stringify(requests))
      onAddNotification?.('Friend Request Sent! 🎉', `Request sent to ${playerName}`, 'invite', '👤')
    } catch { /* ignore */ }
  }

  // Filter game history by tab
  const getFilteredHistory = () => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)

    switch (historyTab) {
      case 'today':
        return gameHistory.filter(e => e.date.split('T')[0] === todayStr)
      case 'yesterday':
        return gameHistory.filter(e => e.date.split('T')[0] === yesterdayStr)
      case 'week':
        return gameHistory.filter(e => new Date(e.date) >= weekAgo)
      default:
        return gameHistory
    }
  }

  // Group game history by date
  const groupedHistory = gameHistory.reduce<Record<string, GameHistoryEntry[]>>((acc, entry) => {
    const dateGroup = formatDateGroup(entry.date)
    if (!acc[dateGroup]) acc[dateGroup] = []
    acc[dateGroup].push(entry)
    return acc
  }, {})

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
            style={{ background: 'linear-gradient(135deg, var(--game-bg-1), var(--game-bg-2))', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, var(--game-bg-1), var(--game-bg-2))' }}>
              <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>👤 Profile</h3>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
            </div>

            <div className="px-4 pb-4">
              {/* 1. Avatar + Level Badge */}
              <div className="flex flex-col items-center mb-4">
                <button
                  onClick={() => isOwnProfile && setShowAvatarPicker(!showAvatarPicker)}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-2 relative"
                  style={{
                    background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}88)`,
                    border: '3px solid rgba(255,255,255,0.2)',
                    boxShadow: `0 0 20px ${levelInfo.color}40`,
                  }}>
                  <span className="text-4xl">{playerAvatar}</span>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer hover:scale-110 transition-transform"
                    onClick={(e) => { e.stopPropagation(); setShowLevelList(true) }}
                    style={{ backgroundColor: levelInfo.color, color: '#FFFFFF', border: '2px solid #1a0533' }}>
                    {playerLevel}
                  </div>
                </button>

                {/* 2. Avatar Picker - Extended with 35+ avatars */}
                <AnimatePresence>
                  {showAvatarPicker && isOwnProfile && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="w-full mb-2">
                      <div className="grid grid-cols-6 gap-1.5 p-2 rounded-xl max-h-52 overflow-y-auto" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {EXTENDED_AVATARS.map((av, idx) => (
                          <button key={`${av}-${idx}`} onClick={() => { onUpdateAvatar(av); setShowAvatarPicker(false) }}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-95"
                            style={{
                              backgroundColor: av === playerAvatar ? `${levelInfo.color}20` : 'rgba(255,255,255,0.04)',
                              border: av === playerAvatar ? `1.5px solid ${levelInfo.color}` : '1px solid rgba(255,255,255,0.06)',
                            }}>
                            {av}
                          </button>
                        ))}
                      </div>
                      <p className="text-[7px] text-center mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {EXTENDED_AVATARS.length} avatars available • Tap to select
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3. Name with edit button */}
                <div className="flex items-center gap-2 mt-1">
                  {editingName && isOwnProfile ? (
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
                      <button onClick={handleSaveName} className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform active:scale-95" style={{ backgroundColor: 'rgba(0,230,118,0.2)' }}>
                        <Check className="w-3.5 h-3.5" style={{ color: '#00E676' }} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold" style={{ color: '#FFFFFF' }}>{playerName}</span>
                      {isOwnProfile && (
                        <button onClick={() => { setEditingName(true); setNameInput(playerName) }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-95" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                          <Edit3 className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. UID with copy + Invite button - right below name */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>ID:</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="text-xs font-mono font-bold tracking-wider" style={{ color: '#00FFFF' }}>{numericUid}</span>
                    <button onClick={handleCopyCode}
                      className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-90"
                      style={{ backgroundColor: copiedCode ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.08)' }}>
                      <Copy className="w-2.5 h-2.5" style={{ color: copiedCode ? '#00E676' : 'rgba(255,255,255,0.5)' }} />
                    </button>
                  </div>
                  {isOwnProfile ? (
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold transition-transform active:scale-90"
                      style={{ backgroundColor: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', color: '#00E676' }}>
                      <UserPlus className="w-2.5 h-2.5" />
                      {copiedCode ? 'Copied!' : 'Invite'}
                    </button>
                  ) : (
                    <button
                      onClick={handleInviteFriend}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold transition-transform active:scale-90"
                      style={{ backgroundColor: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', color: '#00E676' }}>
                      <UserPlus className="w-2.5 h-2.5" />
                      Invite
                    </button>
                  )}
                  {copiedCode && (
                    <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>Copied!</span>
                  )}
                </div>

              </div>

              {/* 6. Win/Loss Rate Box */}
              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4" style={{ color: '#EDC22E' }} />
                    <span className="text-xs font-bold" style={{ color: '#EDC22E' }}>Win Rate</span>
                  </div>
                  <span className="text-lg font-extrabold" style={{ color: winPercentage >= 50 ? '#00E676' : '#F65E3B' }}>
                    {totalBattlesPlayed > 0 ? `${winPercentage}%` : '-'}
                  </span>
                </div>

                {/* Horizontal bar with red/green */}
                <div className="h-5 rounded-full overflow-hidden relative flex" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  {/* Red (loss) portion - LEFT */}
                  <div
                    className="h-full transition-all flex items-center justify-center"
                    style={{
                      width: totalBattlesPlayed > 0 ? `${lossPercentage}%` : '50%',
                      background: 'linear-gradient(90deg, #F65E3B, #FF7A00)',
                      minWidth: totalBattlesPlayed > 0 && totalLosses > 0 ? '20px' : '0',
                    }}>
                    {totalLosses > 0 && (
                      <span className="text-[8px] font-bold text-white drop-shadow-sm px-1">{totalLosses}L</span>
                    )}
                  </div>

                  {/* Divider slash */}
                  {totalBattlesPlayed > 0 && totalBattlesWon > 0 && totalLosses > 0 && (
                    <div className="flex items-center justify-center px-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                      <span className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>/</span>
                    </div>
                  )}

                  {/* Green (win) portion - RIGHT */}
                  <div
                    className="h-full transition-all flex items-center justify-center"
                    style={{
                      width: totalBattlesPlayed > 0 ? `${winPercentage}%` : '50%',
                      background: 'linear-gradient(90deg, #00C853, #00E676)',
                      minWidth: totalBattlesPlayed > 0 && totalBattlesWon > 0 ? '20px' : '0',
                    }}>
                    {totalBattlesWon > 0 && (
                      <span className="text-[8px] font-bold text-white drop-shadow-sm px-1">{totalBattlesWon}W</span>
                    )}
                  </div>

                  {/* Empty state */}
                  {totalBattlesPlayed === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>No battles yet</span>
                    </div>
                  )}
                </div>

                {/* W/L text format */}
                <div className="flex items-center justify-center gap-3 mt-1.5">
                  <span className="text-[10px] font-bold" style={{ color: '#00E676' }}>{totalBattlesWon}W</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                  <span className="text-[10px] font-bold" style={{ color: '#F65E3B' }}>{totalLosses}L</span>
                  <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>({totalBattlesPlayed} battles)</span>
                </div>

                {/* Win/Loss Streak */}
                {streak.type && streak.count > 0 && (
                  <div className="mt-2 flex items-center justify-center gap-1 px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: streak.type === 'win' ? 'rgba(0,230,118,0.08)' : 'rgba(246,94,59,0.08)',
                      border: `1px solid ${streak.type === 'win' ? 'rgba(0,230,118,0.2)' : 'rgba(246,94,59,0.2)'}`,
                    }}>
                    {streak.type === 'win' ? (
                      <>
                        {Array.from({ length: Math.min(streak.count, 5) }, (_, i) => (
                          <span key={i} className="text-[10px]">🔥</span>
                        ))}
                        <span className="text-[9px] font-bold" style={{ color: '#00E676' }}>
                          {streak.count} Win Streak
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px]">❄️</span>
                        <span className="text-[9px] font-bold" style={{ color: '#F65E3B' }}>
                          {streak.count} Loss Streak
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 7. Stats Row (3 boxes) - Mode-specific best scores (own profile only) */}
              {isOwnProfile && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <StatBox icon={<Trophy className="w-3 h-3" />} label="Classic Best" value={classicBestScore > 0 ? classicBestScore.toLocaleString() : (bestScore > 0 ? bestScore.toLocaleString() : '-')} color="#EDC22E" />
                  <StatBox icon={<Swords className="w-3 h-3" />} label="Battle Best" value={battleBestScore > 0 ? battleBestScore.toLocaleString() : '-'} color="#F65E3B" />
                  <StatBox icon={<Crown className="w-3 h-3" />} label="Tour Best" value={tournamentBestScore > 0 ? tournamentBestScore.toLocaleString() : (modBestScore > 0 ? modBestScore.toLocaleString() : '-')} color="#E040FB" />
                </div>
              )}

              {/* 8. Bottom Row (3 boxes) - Games Today, History, Room Cards */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {/* Games Today */}
                <div className="p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(0,255,255,0.06)', border: '1px solid rgba(0,255,255,0.12)' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" style={{ color: '#00FFFF' }} />
                    <span className="text-[7px] font-bold" style={{ color: '#00FFFF' }}>Today</span>
                  </div>
                  <span className="text-sm font-extrabold" style={{ color: gamesPlayedToday >= maxGamesPerDay ? '#F65E3B' : '#00FFFF' }}>
                    {gamesPlayedToday}/{maxGamesPerDay}
                  </span>
                  <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(100, (gamesPlayedToday / maxGamesPerDay) * 100)}%`,
                      background: gamesPlayedToday >= maxGamesPerDay ? 'linear-gradient(90deg, #F65E3B, #FF7A00)' : 'linear-gradient(90deg, #00FFFF, #00E676)',
                    }} />
                  </div>
                </div>

                {/* History - Clickable to full screen */}
                <button onClick={() => setShowGameHistory(true)}
                  className="p-2 rounded-xl text-center transition-transform active:scale-95"
                  style={{ backgroundColor: 'rgba(255,122,0,0.06)', border: '1px solid rgba(255,122,0,0.12)' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <History className="w-3 h-3" style={{ color: '#FF7A00' }} />
                    <span className="text-[7px] font-bold" style={{ color: '#FF7A00' }}>History</span>
                  </div>
                  <span className="text-sm font-extrabold" style={{ color: '#FF7A00' }}>📊</span>
                  <p className="text-[9px] font-bold" style={{ color: '#FF7A00' }}>{gameHistory.length}</p>
                </button>

                {/* Admin Panel - Password Protected */}
                {!showAdminInput ? (
                  <button onClick={() => { setShowAdminInput(true); setAdminPwd(''); setAdminPwdError(false) }}
                    className="p-2.5 rounded-xl text-center transition-transform active:scale-95 w-full"
                    style={{ backgroundColor: 'rgba(255,122,0,0.08)', border: '1px solid rgba(255,122,0,0.2)' }}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Shield className="w-3.5 h-3.5" style={{ color: '#FF7A00' }} />
                      <span className="text-[8px] font-bold" style={{ color: '#FF7A00' }}>Admin Panel</span>
                    </div>
                    <span className="text-base">🔐</span>
                    <p className="text-[6px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Tap to enter
                    </p>
                  </button>
                ) : (
                  <div className="p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,122,0,0.1)', border: adminPwdError ? '1px solid rgba(246,94,59,0.5)' : '1px solid rgba(255,122,0,0.3)' }}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Shield className="w-3 h-3" style={{ color: '#FF7A00' }} />
                      <span className="text-[7px] font-bold" style={{ color: '#FF7A00' }}>Password</span>
                    </div>
                    <input
                      type="password"
                      value={adminPwd}
                      onChange={(e) => { setAdminPwd(e.target.value.toUpperCase()); setAdminPwdError(false) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (adminPwd === 'ADMIN.IN') {
                            setShowAdminInput(false)
                            setAdminPwd('')
                            onOpenAdminPanel?.()
                          } else {
                            setAdminPwdError(true)
                          }
                        }
                        if (e.key === 'Escape') { setShowAdminInput(false); setAdminPwd('') }
                      }}
                      placeholder="Enter password..."
                      autoFocus
                      className="w-full px-2 py-1.5 rounded-lg text-[10px] font-mono text-center outline-none"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        border: adminPwdError ? '1px solid rgba(246,94,59,0.5)' : '1px solid rgba(255,255,255,0.12)',
                        color: '#FFFFFF',
                      }}
                    />
                    {adminPwdError && (
                      <p className="text-[6px] font-bold mt-0.5" style={{ color: '#F65E3B' }}>Wrong password!</p>
                    )}
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => {
                        if (adminPwd === 'ADMIN.IN') {
                          setShowAdminInput(false)
                          setAdminPwd('')
                          onOpenAdminPanel?.()
                        } else {
                          setAdminPwdError(true)
                        }
                      }}
                        className="flex-1 px-1.5 py-1 rounded text-[7px] font-bold transition-transform active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #FF7A00, #EDC22E)', color: '#FFFFFF' }}>
                        Enter
                      </button>
                      <button onClick={() => { setShowAdminInput(false); setAdminPwd('') }}
                        className="px-1.5 py-1 rounded text-[7px] font-bold"
                        style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 9. Total Coins Earned + Room Cards */}
              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.15)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <div>
                      <p className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>Total Coins Earned</p>
                      <p className="text-base font-extrabold" style={{ color: '#EDC22E' }}>{formatCoinCount(totalCoinsEarned)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(224,64,251,0.1)', border: '1px solid rgba(224,64,251,0.2)' }}>
                      <span className="text-[10px]">🃏</span>
                      <span className="text-[8px] font-bold" style={{ color: '#E040FB' }}>{roomCardCount}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1px solid rgba(237,194,46,0.2)' }}>
                      <Coins className="w-3 h-3" style={{ color: '#EDC22E' }} />
                      <span className="text-[8px] font-bold" style={{ color: '#EDC22E' }}>{coins.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 10. Level XP Progress Box */}
              <button onClick={() => setShowLevelList(true)} className="w-full p-3 rounded-xl mb-3 text-left transition-transform active:scale-[0.98]" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold" style={{ color: levelInfo.color }}>Lv.{playerLevel}</span>
                    <span className="text-[9px] font-bold" style={{ color: levelInfo.color }}>{levelInfo.icon} {levelInfo.title}</span>
                  </div>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{levelXP.toLocaleString()} / {nextLevelThreshold.toLocaleString()} XP</span>
                </div>
                <div className="h-4 rounded-full overflow-hidden relative" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}CC)` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-extrabold" style={{ color: 'rgba(255,255,255,0.95)', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    Lv.{playerLevel} — {Math.round(progressPct)}%
                  </span>
                </div>
                {playerLevel < MAX_LEVEL && (
                  <p className="text-[8px] mt-1 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {xpNeededForNextLevel.toLocaleString()} more XP to Level {playerLevel + 1} ▼ Tap to see all levels
                  </p>
                )}
              </button>

              {/* Level List - Expands below the level progress bar */}
              <AnimatePresence>
                {showLevelList && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3"
                  >
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                          <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Level Progression</span>
                        </div>
                        <button onClick={() => setShowLevelList(false)}
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                          <X className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                        </button>
                      </div>
                      <div className="max-h-52 overflow-y-auto px-2 py-1.5 space-y-1">
                        {Array.from({ length: Math.min(playerLevel + 5, MAX_LEVEL) }, (_, i) => i + 1).map((lv) => {
                          const info = getLevelInfo(lv)
                          const isAchieved = lv <= playerLevel
                          const isCurrent = lv === playerLevel
                          const isBonusLevel = lv % 5 === 0
                          const bonusCoins = isBonusLevel ? (lv / 5) * 100 : 0
                          return (
                            <div key={lv}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                              style={{
                                backgroundColor: isCurrent ? `${info.color}20` : isBonusLevel && isAchieved ? 'rgba(237,194,46,0.08)' : 'rgba(255,255,255,0.02)',
                                border: isCurrent ? `1px solid ${info.color}40` : isBonusLevel ? '1px solid rgba(237,194,46,0.15)' : '1px solid rgba(255,255,255,0.03)',
                              }}>
                              <span className="text-[11px] flex-shrink-0">{info.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold" style={{ color: isAchieved ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }}>
                                    Lv.{lv}
                                  </span>
                                  <span className="text-[8px] truncate" style={{ color: isAchieved ? info.color : 'rgba(255,255,255,0.2)' }}>
                                    {info.title}
                                  </span>
                                  {isBonusLevel && (
                                    <Gift className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#EDC22E' }} />
                                  )}
                                </div>
                                {isBonusLevel && (
                                  <p className="text-[7px]" style={{ color: 'rgba(237,194,46,0.7)' }}>
                                    Bonus: {bonusCoins}💰 + 2 random abilities!
                                  </p>
                                )}
                              </div>
                              <span className="text-[9px] flex-shrink-0">
                                {isCurrent ? '⭐' : isAchieved ? '✓' : '🔒'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="px-3 py-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <p className="text-[7px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          Every 5 levels: Guaranteed coins + 2 random abilities!
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 12. How Leveling Works - Detailed SP/XP formula */}
              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.1)' }}>
                <p className="text-[10px] font-bold mb-2" style={{ color: '#00E676' }}>📊 How Leveling Works</p>
                <div style={{ borderTop: '1px solid rgba(0,230,118,0.15)', marginBottom: '8px' }} />
                <div className="space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] flex-shrink-0">🎯</span>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Every 100 tournament score = 1 SP (Skill Point)</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] flex-shrink-0">⬆️</span>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Every 3 SP = 1 XP (levels you up!)</p>
                  </div>
                  <div className="mt-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[8px] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>SP Rate by Level:</p>
                    <p className="text-[8px]" style={{ color: '#00E676' }}>Lv.1-20: 100 score → 1 SP</p>
                    <p className="text-[8px]" style={{ color: '#00E676' }}>Lv.21-50: 100 score → 1.5 SP</p>
                    <p className="text-[8px]" style={{ color: '#00E676' }}>Lv.51-150: 100 score → 2 SP</p>
                    <p className="text-[8px]" style={{ color: '#00E676' }}>Lv.150+: 100 score → 3 SP = 1 XP directly!</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] flex-shrink-0">💡</span>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>SP remainder carries over between games</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] flex-shrink-0">🎁</span>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Every 5 levels: Bonus coins + 2 random abilities!</p>
                  </div>
                </div>
              </div>

              {/* 13. Theme Toggle */}
              {isOwnProfile && (
                <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    {isDarkTheme ? <Moon className="w-4 h-4" style={{ color: '#7C4DFF' }} /> : <Sun className="w-4 h-4" style={{ color: '#FFB300' }} />}
                    <span className="text-[10px] font-bold" style={{ color: isDarkTheme ? '#7C4DFF' : '#FFB300' }}>{isDarkTheme ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <button onClick={() => {
                    const newTheme = !isDarkTheme
                    setTheme(newTheme ? 'dark' : 'light')
                  }} className="w-12 h-6 rounded-full relative transition-all" style={{ backgroundColor: isDarkTheme ? 'rgba(124,77,255,0.3)' : 'rgba(255,179,0,0.3)', border: `1px solid ${isDarkTheme ? 'rgba(124,77,255,0.5)' : 'rgba(255,179,0,0.5)'}` }}>
                    <motion.div animate={{ x: isDarkTheme ? 0 : 24 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="w-5 h-5 rounded-full absolute top-0.5 left-0.5 flex items-center justify-center" style={{ backgroundColor: isDarkTheme ? '#7C4DFF' : '#FFB300' }}>
                      {isDarkTheme ? <Moon className="w-2.5 h-2.5" style={{ color: '#FFFFFF' }} /> : <Sun className="w-2.5 h-2.5" style={{ color: '#FFFFFF' }} />}
                    </motion.div>
                  </button>
                </div>
              )}

              {/* 14. Reset Data Button */}
              {onResetAllData && isOwnProfile && (
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

              {/* Banner Ad */}
              <div className="w-full mt-3">
                <AdsterraBanner320x50 />
              </div>
            </div>
          </motion.div>

          {/* Game History Full Screen Overlay - z-[300] */}
          <AnimatePresence>
            {showGameHistory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9 }}
                  className="w-full max-w-sm h-[90vh] rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: 'linear-gradient(135deg, var(--game-bg-1), var(--game-bg-2))', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {/* Header with close */}
                  <div className="flex items-center justify-between p-4 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4" style={{ color: '#FF7A00' }} />
                      <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>Game History</h3>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,122,0,0.15)', color: '#FF7A00' }}>
                        {gameHistory.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {gameHistory.length > 0 && onClearGameHistory && isOwnProfile && (
                        <button onClick={onClearGameHistory}
                          className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[8px] font-bold transition-transform active:scale-95"
                          style={{ backgroundColor: 'rgba(246,94,59,0.12)', border: '1px solid rgba(246,94,59,0.25)', color: '#F65E3B' }}>
                          <Trash2 className="w-2.5 h-2.5" />
                          Delete All
                        </button>
                      )}
                      <button onClick={() => setShowGameHistory(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
                      </button>
                    </div>
                  </div>

                  {/* Tab Sliders */}
                  <div className="flex p-3 gap-1.5">
                    {(['today', 'yesterday', 'week'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setHistoryTab(tab)}
                        className="flex-1 py-2 rounded-lg text-[10px] font-bold text-center transition-all active:scale-95"
                        style={{
                          backgroundColor: historyTab === tab ? 'rgba(255,122,0,0.2)' : 'rgba(255,255,255,0.04)',
                          border: historyTab === tab ? '1.5px solid rgba(255,122,0,0.4)' : '1px solid rgba(255,255,255,0.06)',
                          color: historyTab === tab ? '#FF7A00' : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {tab === 'today' ? '📅 Today' : tab === 'yesterday' ? '📆 Yesterday' : '📊 This Week'}
                      </button>
                    ))}
                  </div>

                  {/* History Cards */}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                    {(() => {
                      const filtered = getFilteredHistory()
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-12">
                            <History className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No games found</p>
                            <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                              {historyTab === 'today' ? 'Play some games today!' : historyTab === 'yesterday' ? 'No games yesterday' : 'No games this week'}
                            </p>
                          </div>
                        )
                      }
                      return filtered.map((entry) => (
                        <div key={entry.id}
                          className="p-3 rounded-xl relative"
                          style={{
                            backgroundColor: entry.result === 'win' ? 'rgba(0,230,118,0.06)' : entry.result === 'lose' ? 'rgba(246,94,59,0.06)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${entry.result === 'win' ? 'rgba(0,230,118,0.15)' : entry.result === 'lose' ? 'rgba(246,94,59,0.15)' : 'rgba(255,255,255,0.06)'}`,
                          }}>
                          {/* Delete button - trash icon */}
                          {onDeleteGameHistory && (
                            <button onClick={() => onDeleteGameHistory(entry.id)}
                              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-transform active:scale-90"
                              style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)' }}>
                              <Trash2 className="w-2.5 h-2.5" style={{ color: '#F65E3B' }} />
                            </button>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getModeIcon(entry.mode)}</span>
                              <div>
                                <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>{getModeLabel(entry.mode)}</span>
                                {entry.entryFee > 0 && (
                                  <span className="text-[8px] ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>• ₹{entry.entryFee}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                              style={{
                                backgroundColor: entry.result === 'win' ? 'rgba(0,230,118,0.15)' : entry.result === 'lose' ? 'rgba(246,94,59,0.15)' : 'rgba(255,255,255,0.05)',
                                color: entry.result === 'win' ? '#00E676' : entry.result === 'lose' ? '#F65E3B' : 'rgba(255,255,255,0.4)',
                              }}>
                              {entry.result === 'win' ? '🏆 WIN' : entry.result === 'lose' ? '💀 LOSS' : '🎮 PLAYED'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Opponent</p>
                                <p className="text-[9px] font-mono font-bold" style={{ color: '#00FFFF' }}>{entry.mode === 'classic' ? '—' : (entry.opponentName || 'BOT')}</p>
                              </div>
                              <div>
                                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>You</p>
                                <p className="text-[9px] font-mono font-bold" style={{ color: '#00FFFF' }}>{userCode}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-extrabold" style={{ color: entry.result === 'win' ? '#00E676' : entry.result === 'lose' ? '#F65E3B' : '#FFFFFF' }}>
                                {entry.score.toLocaleString()}
                              </p>
                              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StatBox({ icon, label, value, subtitle, color }: { icon: React.ReactNode; label: string; value: string; subtitle?: string; color: string }) {
  return (
    <div className="p-2 rounded-xl text-center" style={{ backgroundColor: `${color}08`, border: `1px solid ${color}15` }}>
      <div className="flex items-center justify-center gap-1 mb-1">
        <div style={{ color }}>{icon}</div>
        <span className="text-[7px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      </div>
      <span className="text-sm font-extrabold block" style={{ color }}>{value}</span>
      {subtitle && (
        <span className="text-[7px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{subtitle}</span>
      )}
    </div>
  )
}

export function NotificationsPanel({
  isOpen, onClose, notifications, onMarkRead, onMarkAllRead, onDeleteNotification, onDeleteReadNotifications,
}: {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onDeleteNotification?: (id: string) => void
  onDeleteReadNotifications?: () => void
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
            style={{ background: 'linear-gradient(135deg, var(--game-bg-1), var(--game-bg-2))', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, var(--game-bg-1), var(--game-bg-2))' }}>
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
                {notifications.some(n => n.read) && (
                  <button onClick={() => onDeleteReadNotifications?.()} className="text-[8px] font-bold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(246,94,59,0.08)', color: '#F65E3B' }}>
                    Clear All
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
                    <div key={notif.id} onClick={() => onMarkRead(notif.id)}
                      className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl transition-colors cursor-pointer relative group"
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
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteNotification?.(notif.id) }}
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(246,94,59,0.1)' }}
                      >
                        <Trash2 className="w-2.5 h-2.5" style={{ color: '#F65E3B' }} />
                      </button>
                    </div>
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
