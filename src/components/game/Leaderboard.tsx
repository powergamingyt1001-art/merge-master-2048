'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Medal, Star, Trophy, Swords, Coins, Wifi, WifiOff, Target, ChevronRight, Heart, Zap, Shield } from 'lucide-react'
import { getLeaderboardPlayers, onLeaderboardUpdate, type FirebasePlayer } from '@/lib/firebase-service'
import { getLevelInfo, getLevelThreshold } from '@/hooks/useGame'

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
  gamePoints: number
  bestScore: number
  coins: number
  playerName: string
  playerAvatar: string
  playerId: string
  tournamentPoints: number
}

type TabType = 'modesScore' | 'coinsRank' | 'offlineRank'

interface LeaderboardEntry {
  rank: number
  name: string
  avatar: string
  value: number
  isPlayer: boolean
  lastActive?: number
  playerId?: string
}

// Check if a player is online (active within last 2 minutes)
function isOnline(lastActive: number | undefined): boolean {
  if (!lastActive) return false
  return Date.now() - lastActive < 2 * 60 * 1000
}

// Offline rank players - progressive, beat one to advance
const OFFLINE_RANKS = [
  { name: 'Rookie Raj', avatar: '🌱', targetScore: 100 },
  { name: 'Learner Lila', avatar: '📚', targetScore: 300 },
  { name: 'Player Priti', avatar: '🎮', targetScore: 600 },
  { name: 'Skilled Sam', avatar: '⚡', targetScore: 1000 },
  { name: 'Expert Ela', avatar: '🔥', targetScore: 1500 },
  { name: 'Master Max', avatar: '🧠', targetScore: 2500 },
  { name: 'Champion Charu', avatar: '🏆', targetScore: 4000 },
  { name: 'Legend Luv', avatar: '👑', targetScore: 6000 },
  { name: 'Titan Tara', avatar: '💎', targetScore: 9000 },
  { name: 'Godlike Guru', avatar: '🌟', targetScore: 15000 },
]

function buildModesLeaderboard(playerBestScore: number, playerName: string, playerAvatar: string, firebasePlayers: FirebasePlayer[], playerId: string): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = []

  if (firebasePlayers.length > 0) {
    firebasePlayers.forEach(p => {
      if (p.id !== playerId) {
        entries.push({ rank: 0, name: p.name || 'Player', avatar: p.avatar || '😎', value: p.bestScore || 0, isPlayer: false, lastActive: p.lastActive, playerId: p.id })
      }
    })
  }

  // Deduplicate by playerId (keep highest score entry)
  const seenById = new Map<string, LeaderboardEntry>()
  for (const entry of entries) {
    const key = entry.playerId || `${entry.name}_${entry.avatar}`
    const existing = seenById.get(key)
    if (!existing || entry.value > existing.value) {
      seenById.set(key, entry)
    }
  }

  // Also deduplicate by name (case-insensitive)
  const seenByName = new Map<string, LeaderboardEntry>()
  for (const entry of seenById.values()) {
    const nameKey = entry.name.toLowerCase().trim()
    const existing = seenByName.get(nameKey)
    if (!existing || entry.value > existing.value) {
      seenByName.set(nameKey, entry)
    }
  }

  const deduped: LeaderboardEntry[] = []
  for (const entry of seenByName.values()) {
    if (entry.value === 0) continue
    if (entry.name.toLowerCase().trim() === 'player') continue
    deduped.push(entry)
  }

  deduped.push({ rank: 0, name: playerName || 'You', avatar: playerAvatar || '😎', value: playerBestScore, isPlayer: true, playerId })
  deduped.sort((a, b) => b.value - a.value)
  deduped.forEach((e, i) => { e.rank = i + 1 })
  return deduped
}

function buildCoinsLeaderboard(playerCoins: number, playerName: string, playerAvatar: string, firebasePlayers: FirebasePlayer[], playerId: string): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = []

  if (firebasePlayers.length > 0) {
    firebasePlayers.forEach(p => {
      if (p.id !== playerId) {
        entries.push({ rank: 0, name: p.name || 'Player', avatar: p.avatar || '😎', value: p.coins || 0, isPlayer: false, lastActive: p.lastActive, playerId: p.id })
      }
    })
  }

  // Deduplicate by playerId (keep highest coins entry)
  const seenById = new Map<string, LeaderboardEntry>()
  for (const entry of entries) {
    const key = entry.playerId || `${entry.name}_${entry.avatar}`
    const existing = seenById.get(key)
    if (!existing || entry.value > existing.value) {
      seenById.set(key, entry)
    }
  }

  // Also deduplicate by name (case-insensitive)
  const seenByName = new Map<string, LeaderboardEntry>()
  for (const entry of seenById.values()) {
    const nameKey = entry.name.toLowerCase().trim()
    const existing = seenByName.get(nameKey)
    if (!existing || entry.value > existing.value) {
      seenByName.set(nameKey, entry)
    }
  }

  const deduped: LeaderboardEntry[] = []
  for (const entry of seenByName.values()) {
    if (entry.value === 0) continue
    if (entry.name.toLowerCase().trim() === 'player') continue
    deduped.push(entry)
  }

  deduped.push({ rank: 0, name: playerName || 'You', avatar: playerAvatar || '😎', value: playerCoins, isPlayer: true, playerId })
  deduped.sort((a, b) => b.value - a.value)
  deduped.forEach((e, i) => { e.rank = i + 1 })
  return deduped
}

function getOfflineRank(playerBestScore: number): { currentRank: number; nextTarget: typeof OFFLINE_RANKS[0] | null; beatenRanks: number } {
  let beaten = 0
  for (const rank of OFFLINE_RANKS) {
    if (playerBestScore >= rank.targetScore) {
      beaten++
    } else {
      break
    }
  }
  return {
    currentRank: beaten,
    nextTarget: beaten < OFFLINE_RANKS.length ? OFFLINE_RANKS[beaten] : null,
    beatenRanks: beaten,
  }
}

export function Leaderboard({ isOpen, onClose, gamePoints, bestScore, coins, playerName, playerAvatar, playerId, tournamentPoints }: LeaderboardProps) {
  const [tab, setTab] = useState<TabType>('modesScore')
  const [firebasePlayers, setFirebasePlayers] = useState<FirebasePlayer[]>([])
  const [selectedPlayer, setSelectedPlayerRaw] = useState<LeaderboardEntry | null>(null)
  const [liked, setLiked] = useState(false)

  // Wrapper to reset liked when selectedPlayer changes
  const setSelectedPlayer = (player: LeaderboardEntry | null) => {
    setSelectedPlayerRaw(player)
    setLiked(false)
  }

  // Listen to Firebase leaderboard in real-time
  useEffect(() => {
    const unsubscribe = onLeaderboardUpdate('bestScore', 50, (players) => {
      setFirebasePlayers(players)
    })
    return unsubscribe
  }, [])

  const modesEntries = buildModesLeaderboard(bestScore, playerName, playerAvatar, firebasePlayers, playerId)
  const coinsEntries = buildCoinsLeaderboard(coins, playerName, playerAvatar, firebasePlayers, playerId)
  const { currentRank, nextTarget, beatenRanks } = getOfflineRank(bestScore)

  // Look up full FirebasePlayer data for the selected player
  const selectedFirebasePlayer = selectedPlayer?.playerId
    ? firebasePlayers.find(p => p.id === selectedPlayer.playerId)
    : null

  // Get level info for the selected player
  const selectedLevel = selectedFirebasePlayer?.level || (selectedPlayer?.isPlayer ? 1 : 1)
  const selectedLevelInfo = getLevelInfo(selectedLevel)
  const onlineStatus = isOnline(selectedPlayer?.lastActive)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)' }}>
              <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>🏆 Leaderboard</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Live indicator */}
            {firebasePlayers.length > 0 && (
              <div className="mx-4 mb-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#00E676' }} />
                <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>LIVE</span>
                <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>• {firebasePlayers.length} players online</span>
              </div>
            )}

            {/* Tab Switch - 3 sections */}
            <div className="flex mx-4 mb-3 rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { key: 'modesScore' as TabType, icon: <Swords className="w-3 h-3" />, label: 'Battle' },
                { key: 'coinsRank' as TabType, icon: <Coins className="w-3 h-3" />, label: 'Coins' },
                { key: 'offlineRank' as TabType, icon: <WifiOff className="w-3 h-3" />, label: 'Classic' },
              ].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex-1 py-2 text-[9px] font-bold flex items-center justify-center gap-1 transition-all"
                  style={{
                    backgroundColor: tab === t.key
                      ? t.key === 'modesScore' ? 'rgba(246,94,59,0.15)' : t.key === 'coinsRank' ? 'rgba(237,194,46,0.15)' : 'rgba(0,230,118,0.15)'
                      : 'transparent',
                    color: tab === t.key
                      ? t.key === 'modesScore' ? '#F65E3B' : t.key === 'coinsRank' ? '#EDC22E' : '#00E676'
                      : 'rgba(255,255,255,0.4)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="px-4 pb-4">
              {/* BATTLE SCORE TAB */}
              {tab === 'modesScore' && (
                <div>
                  {/* Reset period indicator */}
                  <div className="flex items-center justify-center gap-1.5 mb-2 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.12)' }}>
                    <span className="text-[8px] font-bold" style={{ color: '#F65E3B' }}>⚔️ Battle Mode — Resets every Monday</span>
                  </div>
                  {modesEntries.length <= 1 && !modesEntries.some(e => !e.isPlayer) ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <span className="text-3xl mb-2">⚔️</span>
                      <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>No players yet</p>
                      <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Play battles to rank up!</p>
                    </div>
                  ) : (
                    <>
                      {/* Top 3 Podium */}
                      <div className="flex items-end justify-center gap-2 mb-3">
                        {modesEntries[1] && <PodiumSlot entry={modesEntries[1]} place={2} onClick={() => setSelectedPlayer(modesEntries[1])} />}
                        {modesEntries[0] && <PodiumSlot entry={modesEntries[0]} place={1} onClick={() => setSelectedPlayer(modesEntries[0])} />}
                        {modesEntries[2] && <PodiumSlot entry={modesEntries[2]} place={3} onClick={() => setSelectedPlayer(modesEntries[2])} />}
                      </div>

                      {/* List below */}
                      <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                        {modesEntries.slice(3).map((entry) => (
                          <RankRow key={entry.rank} entry={entry} color="#F65E3B" onClick={() => setSelectedPlayer(entry)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* COINS RANK TAB */}
              {tab === 'coinsRank' && (
                <div>
                  {/* Reset period indicator */}
                  <div className="flex items-center justify-center gap-1.5 mb-2 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.12)' }}>
                    <span className="text-[8px] font-bold" style={{ color: '#EDC22E' }}>🔄 Resets 1st of every month</span>
                  </div>
                  {coinsEntries.length <= 1 && !coinsEntries.some(e => !e.isPlayer) ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <span className="text-3xl mb-2">💰</span>
                      <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>No players yet</p>
                      <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Earn coins to rank up!</p>
                    </div>
                  ) : (
                    <>
                      {/* Top 3 Podium */}
                      <div className="flex items-end justify-center gap-2 mb-3">
                        {coinsEntries[1] && <PodiumSlot entry={coinsEntries[1]} place={2} onClick={() => setSelectedPlayer(coinsEntries[1])} />}
                        {coinsEntries[0] && <PodiumSlot entry={coinsEntries[0]} place={1} onClick={() => setSelectedPlayer(coinsEntries[0])} />}
                        {coinsEntries[2] && <PodiumSlot entry={coinsEntries[2]} place={3} onClick={() => setSelectedPlayer(coinsEntries[2])} />}
                      </div>

                      {/* List below */}
                      <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                        {coinsEntries.slice(3).map((entry) => (
                          <RankRow key={entry.rank} entry={entry} color="#EDC22E" onClick={() => setSelectedPlayer(entry)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* OFFLINE RANK TAB */}
              {tab === 'offlineRank' && (
                <div>
                  {/* Reset period indicator */}
                  <div className="flex items-center justify-center gap-1.5 mb-2 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.12)' }}>
                    <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>🔄 Resets every January 1st</span>
                  </div>
                  {/* Current Progress */}
                  <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4" style={{ color: '#00E676' }} />
                      <span className="text-xs font-bold" style={{ color: '#00E676' }}>Your Progress</span>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Rank:</span>
                      <span className="text-sm font-extrabold" style={{ color: '#00E676' }}>
                        {currentRank > 0 ? OFFLINE_RANKS[currentRank - 1].name : 'Unranked'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Best Score:</span>
                      <span className="text-xs font-bold" style={{ color: '#FFFFFF' }}>{bestScore.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Ranks Beaten:</span>
                      <span className="text-xs font-bold" style={{ color: '#EDC22E' }}>{beatenRanks}/{OFFLINE_RANKS.length}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${(beatenRanks / OFFLINE_RANKS.length) * 100}%`, background: 'linear-gradient(90deg, #00E676, #00C853)' }} />
                    </div>
                    {nextTarget && (
                      <div className="mt-2 p-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{nextTarget.avatar}</span>
                          <div>
                            <p className="text-[9px] font-bold" style={{ color: '#FFFFFF' }}>Next: {nextTarget.name}</p>
                            <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Beat {nextTarget.targetScore.toLocaleString()} to advance</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3" style={{ color: '#00E676' }} />
                      </div>
                    )}
                    {!nextTarget && (
                      <p className="text-[9px] text-center mt-2 font-bold" style={{ color: '#FF00FF' }}>🎉 MAX RANK! You&apos;re the GOAT!</p>
                    )}
                  </div>

                  {/* All ranks list */}
                  <div className="space-y-1">
                    {OFFLINE_RANKS.map((rank, i) => {
                      const isBeaten = bestScore >= rank.targetScore
                      const isCurrent = i === beatenRanks && !isBeaten
                      return (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg"
                          style={{
                            backgroundColor: isCurrent ? 'rgba(237,194,46,0.1)' : isBeaten ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.02)',
                            border: isCurrent ? '1px solid rgba(237,194,46,0.2)' : isBeaten ? '1px solid rgba(0,230,118,0.1)' : '1px solid rgba(255,255,255,0.04)',
                            opacity: isBeaten ? 0.7 : 1,
                          }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: isBeaten ? 'rgba(0,230,118,0.15)' : isCurrent ? 'rgba(237,194,46,0.15)' : 'rgba(255,255,255,0.06)',
                              border: isBeaten ? '1px solid rgba(0,230,118,0.3)' : isCurrent ? '1px solid rgba(237,194,46,0.3)' : '1px solid rgba(255,255,255,0.08)',
                            }}>
                            {isBeaten ? <span className="text-[8px]">✓</span> : <span className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>}
                          </div>
                          <span className="text-base flex-shrink-0">{rank.avatar}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold truncate" style={{ color: isBeaten ? 'rgba(255,255,255,0.5)' : isCurrent ? '#EDC22E' : '#FFFFFF' }}>
                              {rank.name}
                            </p>
                            <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {isBeaten ? 'Beaten!' : `Score ${rank.targetScore.toLocaleString()}+`}
                            </p>
                          </div>
                          {isCurrent && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(237,194,46,0.2)', color: '#EDC22E' }}>
                              NEXT
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Player Profile Overlay - READ-ONLY */}
            <AnimatePresence>
              {selectedPlayer && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
                >
                  <motion.div
                    initial={{ scale: 0.8, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 10 }}
                    className="w-72 rounded-2xl p-5 text-center relative max-h-[80vh] overflow-y-auto"
                    style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {/* Close button */}
                    <button onClick={() => setSelectedPlayer(null)} className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center z-10" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
                    </button>

                    {/* Avatar + Level Badge */}
                    <div className="w-18 h-18 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl relative"
                      style={{
                        width: '72px',
                        height: '72px',
                        background: `linear-gradient(135deg, ${selectedLevelInfo.color}, ${selectedLevelInfo.color}88)`,
                        border: '3px solid rgba(255,255,255,0.2)',
                        boxShadow: `0 0 16px ${selectedLevelInfo.color}40`,
                      }}>
                      <span className="text-3xl">{selectedPlayer.avatar}</span>
                      {/* Level badge */}
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: selectedLevelInfo.color, color: '#FFFFFF', border: '2px solid #1a0533' }}>
                        {selectedLevel}
                      </div>
                    </div>

                    {/* Name */}
                    <p className="text-base font-bold mb-1" style={{ color: '#FFFFFF' }}>
                      {selectedPlayer.name}
                      {selectedPlayer.isPlayer && <span className="text-[9px] ml-1" style={{ color: '#EDC22E' }}>(You)</span>}
                    </p>

                    {/* Level Title */}
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full mb-2"
                      style={{ backgroundColor: `${selectedLevelInfo.color}15`, border: `1px solid ${selectedLevelInfo.color}30` }}>
                      <span className="text-sm">{selectedLevelInfo.icon}</span>
                      <span className="text-[9px] font-bold" style={{ color: selectedLevelInfo.color }}>Lv.{selectedLevel} {selectedLevelInfo.title}</span>
                    </div>

                    {/* Online Indicator */}
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: onlineStatus ? '#00E676' : '#666' }} />
                      <span className="text-[9px] font-bold" style={{ color: onlineStatus ? '#00E676' : '#666' }}>
                        {onlineStatus ? 'Online Now' : 'Offline'}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* Best Score (Classic) */}
                      <div className="p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.12)' }}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Trophy className="w-3 h-3" style={{ color: '#EDC22E' }} />
                          <span className="text-[7px] font-bold" style={{ color: '#EDC22E' }}>Classic Best</span>
                        </div>
                        <span className="text-sm font-extrabold" style={{ color: '#EDC22E' }}>
                          {(selectedFirebasePlayer?.bestScore || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Battle Best Score */}
                      <div className="p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(246,94,59,0.06)', border: '1px solid rgba(246,94,59,0.12)' }}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Swords className="w-3 h-3" style={{ color: '#F65E3B' }} />
                          <span className="text-[7px] font-bold" style={{ color: '#F65E3B' }}>Battle Best</span>
                        </div>
                        <span className="text-sm font-extrabold" style={{ color: '#F65E3B' }}>
                          {(selectedFirebasePlayer?.modBestScore || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Coins */}
                      <div className="p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.12)' }}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Coins className="w-3 h-3" style={{ color: '#EDC22E' }} />
                          <span className="text-[7px] font-bold" style={{ color: '#EDC22E' }}>Coins</span>
                        </div>
                        <span className="text-sm font-extrabold" style={{ color: '#EDC22E' }}>
                          {(selectedFirebasePlayer?.coins || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Total Battles */}
                      <div className="p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.12)' }}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Swords className="w-3 h-3" style={{ color: '#00E676' }} />
                          <span className="text-[7px] font-bold" style={{ color: '#00E676' }}>Total Battles</span>
                        </div>
                        <span className="text-sm font-extrabold" style={{ color: '#00E676' }}>
                          {(selectedFirebasePlayer?.totalBattlesPlayed || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Win Rate */}
                      <div className="p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(224,64,251,0.06)', border: '1px solid rgba(224,64,251,0.12)' }}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Zap className="w-3 h-3" style={{ color: '#E040FB' }} />
                          <span className="text-[7px] font-bold" style={{ color: '#E040FB' }}>Win Rate</span>
                        </div>
                        <span className="text-sm font-extrabold" style={{ color: '#E040FB' }}>
                          {selectedFirebasePlayer?.totalBattlesPlayed
                            ? `${Math.round((selectedFirebasePlayer.totalBattlesWon / selectedFirebasePlayer.totalBattlesPlayed) * 100)}%`
                            : '0%'}
                        </span>
                      </div>

                      {/* Level XP */}
                      <div className="p-2 rounded-xl text-center" style={{ backgroundColor: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.12)' }}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Zap className="w-3 h-3" style={{ color: '#00BCD4' }} />
                          <span className="text-[7px] font-bold" style={{ color: '#00BCD4' }}>Level XP</span>
                        </div>
                        <span className="text-sm font-extrabold" style={{ color: '#00BCD4' }}>
                          {(selectedFirebasePlayer?.levelXP || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Tournament Points */}
                    <div className="p-2 rounded-xl mb-3" style={{ backgroundColor: 'rgba(224,64,251,0.06)', border: '1px solid rgba(224,64,251,0.12)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" style={{ color: '#E040FB' }} />
                          <span className="text-[8px] font-bold" style={{ color: '#E040FB' }}>Tournament Points</span>
                        </div>
                        <span className="text-sm font-extrabold" style={{ color: '#E040FB' }}>
                          {(selectedFirebasePlayer?.tournamentPoints || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Level Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Level Progress</span>
                        <span className="text-[8px] font-bold" style={{ color: selectedLevelInfo.color }}>
                          {selectedFirebasePlayer?.levelXP || 0} / {getLevelThreshold(selectedLevel + 1).toLocaleString()} XP
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${Math.min(100, ((selectedFirebasePlayer?.levelXP || 0) / getLevelThreshold(selectedLevel + 1)) * 100)}%`,
                          background: `linear-gradient(90deg, ${selectedLevelInfo.color}, ${selectedLevelInfo.color}CC)`,
                        }} />
                      </div>
                    </div>

                    {/* Like Button */}
                    <button onClick={() => { setLiked(!liked) }}
                      className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
                      style={{
                        backgroundColor: liked ? 'rgba(246,94,59,0.15)' : 'rgba(255,255,255,0.06)',
                        border: liked ? '1px solid rgba(246,94,59,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        color: liked ? '#F65E3B' : 'rgba(255,255,255,0.5)',
                      }}>
                      <Heart fill={liked ? '#F65E3B' : 'none'} className="w-4 h-4" />
                      {liked ? 'Liked ❤️' : 'Like'}
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PodiumSlot({ entry, place, onClick }: { entry: LeaderboardEntry; place: 1 | 2 | 3; onClick?: () => void }) {
  const medalColor = place === 1 ? '#FFD700' : place === 2 ? '#C0C0C0' : '#CD7F32'
  const bgColor = entry.isPlayer ? 'rgba(237,194,46,0.2)' : place === 1 ? 'rgba(255,215,0,0.12)' : place === 2 ? 'rgba(192,192,192,0.12)' : 'rgba(205,127,50,0.12)'
  const borderColor = entry.isPlayer ? 'rgba(237,194,46,0.3)' : `${medalColor}30`
  const height = place === 1 ? 'py-2.5' : 'py-1.5'
  const avatarSize = place === 1 ? 'text-3xl' : 'text-2xl'
  const playerOnline = isOnline(entry.lastActive)

  return (
    <div className="flex flex-col items-center cursor-pointer" style={{ minWidth: place === 1 ? 80 : 68 }} onClick={onClick}>
      <div className="relative">
        <span className={`${avatarSize} mb-0.5`}>{entry.avatar}</span>
        {/* Online indicator dot on avatar */}
        {!entry.isPlayer && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: playerOnline ? '#00E676' : '#666',
              border: '1.5px solid #1a0533',
            }} />
        )}
      </div>
      <div className={`w-full ${height} rounded-t-lg text-center`} style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}>
        {place === 1 ? (
          <Crown className="w-4 h-4 mx-auto mb-0.5" style={{ color: '#FFD700' }} />
        ) : place === 2 ? (
          <Medal className="w-3 h-3 mx-auto mb-0.5" style={{ color: '#C0C0C0' }} />
        ) : (
          <Star className="w-3 h-3 mx-auto mb-0.5" style={{ color: '#CD7F32' }} />
        )}
        <p className="text-[9px] font-bold truncate px-1" style={{ color: entry.isPlayer ? '#EDC22E' : medalColor }}>
          {entry.name}
        </p>
        <p className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {entry.value.toLocaleString()}
        </p>
        {entry.isPlayer && <p className="text-[7px]" style={{ color: '#EDC22E' }}>(You)</p>}
      </div>
    </div>
  )
}

function RankRow({ entry, color, onClick }: { entry: LeaderboardEntry; color: string; onClick?: () => void }) {
  const playerOnline = isOnline(entry.lastActive)

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1 cursor-pointer transition-colors hover:bg-white/5"
      style={{ backgroundColor: entry.isPlayer ? 'rgba(237,194,46,0.12)' : 'rgba(255,255,255,0.03)', border: entry.isPlayer ? '1px solid rgba(237,194,46,0.2)' : '1px solid transparent' }}
      onClick={onClick}>
      <span className="text-[10px] font-bold w-5 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>#{entry.rank}</span>
      <span className="text-sm">{entry.avatar}</span>
      {/* Online indicator */}
      <div className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: playerOnline ? '#00E676' : entry.isPlayer ? '#EDC22E' : '#F65E3B' }} />
      <span className="text-[10px] font-semibold flex-1 truncate" style={{ color: entry.isPlayer ? '#EDC22E' : 'rgba(255,255,255,0.7)' }}>
        {entry.name} {entry.isPlayer && '(You)'}
      </span>
      <span className="text-[10px] font-bold" style={{ color }}>{entry.value.toLocaleString()}</span>
    </div>
  )
}
