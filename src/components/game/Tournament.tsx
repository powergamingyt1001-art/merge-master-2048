'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Medal, Star, Trophy, Clock, Info, Coins, Users, Lock, Zap, Play, Timer, Target, TrendingUp } from 'lucide-react'
import { getLeaderboardPlayers, onLeaderboardUpdate, type FirebasePlayer } from '@/lib/firebase-service'

interface TournamentProps {
  isOpen: boolean
  onClose: () => void
  coins: number
  tournamentJoined: boolean
  tournamentPoints: number
  tournamentCarryOver: number
  tournamentGamesPlayed: number
  onJoinTournament: () => void
  onStartTournamentGame: () => void
  playerName: string
  playerAvatar: string
  playerId: string
  weeklyBonusClaimed?: boolean
  onClaimWeeklyBonus?: () => void
}

type TabType = 'play' | 'prize' | 'rankings'

interface TournamentPlayer {
  rank: number
  name: string
  avatar: string
  score: number
  isPlayer: boolean
  playerId?: string
}

const FAKE_TOURNAMENT_PLAYERS = [
  { name: 'Blaze 7', avatar: '🔥', score: 520 },
  { name: 'Aero 4', avatar: '🦅', score: 480 },
  { name: 'Viper 9', avatar: '🐍', score: 390 },
  { name: 'Nova 3', avatar: '💫', score: 350 },
  { name: 'Storm 6', avatar: '⚡', score: 280 },
  { name: 'Raze 2', avatar: '💥', score: 220 },
  { name: 'Fang 8', avatar: '🐺', score: 160 },
  { name: 'Drift 5', avatar: '🌪️', score: 120 },
  { name: 'Apex 1', avatar: '🏆', score: 80 },
  { name: 'Volt 11', avatar: '⚡', score: 40 },
]

// Week 1-3 prizes (7K budget)
const WEEK_PRIZES_EARLY = [
  { rank: 1, coins: 700, spins: 0, label: '1st' },
  { rank: 2, coins: 400, spins: 0, label: '2nd' },
  { rank: 3, coins: 250, spins: 0, label: '3rd' },
  { rank: 4, coins: 150, spins: 0, label: '4th' },
  { rank: 5, coins: 100, spins: 0, label: '5th' },
]

const ENTRY_FEE_EARLY = 50

function getWeekNumber(): number {
  const start = new Date(2025, 0, 6)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks + 1
}

function getTimeLeftInWeek(): string {
  const now = new Date()
  const endOfWeek = new Date(now)
  const daysUntilEnd = 7 - now.getDay()
  endOfWeek.setDate(now.getDate() + daysUntilEnd)
  endOfWeek.setHours(23, 59, 59, 999)
  const diff = endOfWeek.getTime() - now.getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  return `${days}d ${hours}h`
}

function getEarlyPoolRemaining(): number {
  const used = WEEK_PRIZES_EARLY.reduce((s, p) => s + p.coins, 0)
  return 7000 - used
}

export function Tournament({
  isOpen, onClose, coins,
  tournamentJoined, tournamentPoints, tournamentCarryOver, tournamentGamesPlayed,
  onJoinTournament, onStartTournamentGame,
  playerName, playerAvatar, playerId,
  weeklyBonusClaimed = false, onClaimWeeklyBonus,
}: TournamentProps) {
  const [tab, setTab] = useState<TabType>('play')
  const [firebasePlayers, setFirebasePlayers] = useState<FirebasePlayer[]>([])
  const weekNum = getWeekNumber()
  const timeLeft = getTimeLeftInWeek()
  const prizes = WEEK_PRIZES_EARLY
  const totalPool = 7000
  const entryFee = ENTRY_FEE_EARLY
  const earlyPoolRemaining = getEarlyPoolRemaining()
  const coinRanksCount = Math.floor(earlyPoolRemaining / 50)
  const coinRankSpins = 2
  const noCoinSpins = 3
  const canJoin = coins >= entryFee

  // Listen to Firebase tournament rankings in real-time
  useEffect(() => {
    const unsubscribe = onLeaderboardUpdate('tournamentPoints', 50, (players) => {
      setFirebasePlayers(players)
    })
    return unsubscribe
  }, [])

  // Build rankings based on tournament points (Firebase + player)
  const rawPlayers: TournamentPlayer[] = []

  if (firebasePlayers.length > 0) {
    firebasePlayers.forEach(p => {
      if (p.id !== playerId) {
        rawPlayers.push({
          rank: 0,
          name: p.name || 'Player',
          avatar: p.avatar || '😎',
          score: p.tournamentPoints || 0,
          isPlayer: false,
          playerId: p.id,
        })
      }
    })
  } else {
    FAKE_TOURNAMENT_PLAYERS.forEach(p => {
      rawPlayers.push({ rank: 0, name: p.name, avatar: p.avatar, score: p.score, isPlayer: false })
    })
  }

  // Deduplicate by playerId (keep highest score entry)
  const seen = new Map<string, TournamentPlayer>()
  for (const entry of rawPlayers) {
    const key = entry.playerId || `${entry.name}_${entry.avatar}`
    const existing = seen.get(key)
    if (!existing || entry.score > existing.score) {
      seen.set(key, entry)
    }
  }
  // Filter out zero-score entries (they clutter the leaderboard)
  const players: TournamentPlayer[] = [...seen.values()].filter(entry => entry.score > 0)

  players.push({ rank: 0, name: playerName || 'You', avatar: playerAvatar || '😎', score: tournamentPoints, isPlayer: true, playerId })
  players.sort((a, b) => b.score - a.score)
  players.forEach((p, i) => { p.rank = i + 1 })

  const handlePlay = () => {
    onStartTournamentGame()
    onClose()
  }

  const handleJoin = () => {
    onJoinTournament()
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
            className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)' }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" style={{ color: '#EDC22E' }} />
                <div>
                  <h3 className="text-base font-bold" style={{ color: '#FFFFFF' }}>Weekly Tournament</h3>
                  <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Week {weekNum}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Live indicator */}
            {firebasePlayers.length > 0 && (
              <div className="mx-4 mb-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#00E676' }} />
                <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>LIVE</span>
                <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>• {firebasePlayers.length} players</span>
              </div>
            )}

            {/* Timer bar */}
            <div className="mx-4 mb-2 p-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.15)' }}>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" style={{ color: '#F65E3B' }} />
                <span className="text-[9px] font-bold" style={{ color: '#F65E3B' }}>Ends in</span>
              </div>
              <span className="text-[10px] font-extrabold" style={{ color: '#FFFFFF' }}>{timeLeft}</span>
            </div>

            {/* Pool + Entry Fee */}
            <div className="mx-4 mb-2 flex gap-2">
              <div className="flex-1 p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)' }}>
                <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Prize Pool</p>
                <p className="text-xs font-extrabold" style={{ color: '#EDC22E' }}>{totalPool.toLocaleString()} 💰</p>
              </div>
              <div className="flex-1 p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)' }}>
                <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Entry Fee</p>
                <p className="text-xs font-extrabold" style={{ color: '#F65E3B' }}>{entryFee} 🪙</p>
              </div>
              {tournamentJoined && (
                <div className="flex-1 p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}>
                  <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Your Points</p>
                  <p className="text-xs font-extrabold" style={{ color: '#00E676' }}>{tournamentPoints} 🏆</p>
                </div>
              )}
            </div>

            {/* Join button or PLAY button */}
            {!tournamentJoined ? (
              <div className="mx-4 mb-3">
                <button
                  onClick={() => canJoin && handleJoin()}
                  className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95"
                  style={{
                    background: canJoin ? 'linear-gradient(135deg, #EDC22E, #FF7A00)' : 'rgba(255,255,255,0.06)',
                    color: canJoin ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                    boxShadow: canJoin ? '0 4px 20px rgba(237,194,46,0.3)' : 'none',
                  }}
                  disabled={!canJoin}
                >
                  {canJoin ? <><Zap className="w-5 h-5" /> Join Tournament ({entryFee} coins)</> : <><Lock className="w-5 h-5" /> Need {entryFee} coins to join</>}
                </button>
              </div>
            ) : (
              <div className="mx-4 mb-2">
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}>
                    <p className="text-xs font-extrabold" style={{ color: '#00E676' }}>{tournamentPoints}</p>
                    <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Points</p>
                  </div>
                  <div className="flex-1 p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)' }}>
                    <p className="text-xs font-extrabold" style={{ color: '#EDC22E' }}>{tournamentCarryOver}</p>
                    <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Carry Over</p>
                  </div>
                  <div className="flex-1 p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-extrabold" style={{ color: '#FFFFFF' }}>{tournamentGamesPlayed}</p>
                    <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Games</p>
                  </div>
                </div>

                <button
                  onClick={handlePlay}
                  className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #00E676, #00C853)',
                    color: '#FFFFFF',
                    boxShadow: '0 6px 30px rgba(0,230,118,0.4), 0 0 60px rgba(0,230,118,0.15)',
                  }}
                >
                  <Play className="w-6 h-6" fill="white" />
                  <span>PLAY TOURNAMENT</span>
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>90s</span>
                </button>
              </div>
            )}

            {/* Tab Switch */}
            <div className="flex mx-4 mb-3 rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { key: 'play' as TabType, icon: <Play className="w-3 h-3" />, label: 'Play' },
                { key: 'prize' as TabType, icon: <Coins className="w-3 h-3" />, label: 'Prize' },
                { key: 'rankings' as TabType, icon: <Users className="w-3 h-3" />, label: 'Rank' },
              ].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex-1 py-1.5 text-[9px] font-bold flex items-center justify-center gap-1 transition-all"
                  style={{
                    backgroundColor: tab === t.key ? 'rgba(237,194,46,0.15)' : 'transparent',
                    color: tab === t.key ? '#EDC22E' : 'rgba(255,255,255,0.4)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="px-4 pb-4">
              {tab === 'play' && (
                <div>
                  {/* Weekly Claim Section */}
                  <div className="p-3 rounded-xl mb-2" style={{ backgroundColor: weeklyBonusClaimed ? 'rgba(255,255,255,0.02)' : 'rgba(0,230,118,0.08)', border: weeklyBonusClaimed ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,230,118,0.15)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎁</span>
                        <div>
                          <p className="text-[10px] font-bold" style={{ color: weeklyBonusClaimed ? 'rgba(255,255,255,0.3)' : '#00E676' }}>Weekly Claim</p>
                          <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Bonus 400 coins every week!</p>
                        </div>
                      </div>
                      {weeklyBonusClaimed ? (
                        <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>✓ Claimed</span>
                      ) : (
                        <button onClick={() => onClaimWeeklyBonus?.()}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-transform active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF', boxShadow: '0 2px 10px rgba(0,230,118,0.3)' }}>
                          🎁 400💰
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl mb-2" style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)' }}>
                    <p className="text-[10px] font-bold mb-1" style={{ color: '#EDC22E' }}>🏆 How Tournament Works</p>
                    <ul className="space-y-1">
                      {[
                        `Entry fee: ${entryFee} coins to join`,
                        'Each game is 90 seconds',
                        '20 score = 1 tournament point',
                        '50% points → Level upgrade (permanent)',
                        '50% points → Tournament leaderboard (weekly)',
                        'Partial scores carry over to next game',
                        'Only tournament points count for ranking',
                        `Prize pool: 7K coins weekly`,
                        'Rankings reset every Monday',
                        'Daily limit: 20 games',
                        'Fair play: 50/50 chance, highest score wins!',
                      ].map((item, i) => (
                        <li key={i} className="text-[9px] flex items-start gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <span style={{ color: '#EDC22E' }}>•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Your Coins:</span>
                      <span className="text-xs font-bold" style={{ color: '#EDC22E' }}>{coins}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Pool:</span>
                      <span className="text-xs font-bold" style={{ color: '#00E676' }}>{totalPool.toLocaleString()} Coins</span>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'prize' && (
                <div className="space-y-1.5">
                  {prizes.map((prize) => (
                    <div key={prize.rank} className="flex items-center justify-between p-2.5 rounded-xl"
                      style={{
                        backgroundColor: prize.rank === 1 ? 'rgba(237,194,46,0.12)' : prize.rank === 2 ? 'rgba(192,192,192,0.08)' : prize.rank === 3 ? 'rgba(205,127,50,0.08)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${prize.rank === 1 ? 'rgba(237,194,46,0.2)' : prize.rank === 2 ? 'rgba(192,192,192,0.15)' : prize.rank === 3 ? 'rgba(205,127,50,0.15)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {prize.rank === 1 ? '🥇' : prize.rank === 2 ? '🥈' : prize.rank === 3 ? '🥉' : `#${prize.rank}`}
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: prize.rank === 1 ? '#FFD700' : prize.rank === 2 ? '#C0C0C0' : prize.rank === 3 ? '#CD7F32' : 'rgba(255,255,255,0.5)' }}>
                          {prize.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: '#EDC22E' }}>{prize.coins} 💰</span>
                        {prize.spins > 0 && <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>+{prize.spins} 🎫</span>}
                      </div>
                    </div>
                  ))}

                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.1)' }}>
                    <p className="text-[10px] font-bold mb-1" style={{ color: '#00E676' }}>
                      #{prizes.length + 1} to #{prizes.length + coinRanksCount} — 50 coins + {coinRankSpins} spins each
                    </p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Until 7K pool is exhausted
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      All other players: {noCoinSpins} spins each 🎫
                    </p>
                  </div>
                </div>
              )}

              {tab === 'rankings' && (
                <div>
                  <div className="flex items-end justify-center gap-2 mb-3">
                    {players[1] && (
                      <div className="flex flex-col items-center" style={{ minWidth: 68 }}>
                        <span className="text-2xl mb-0.5">{players[1].avatar}</span>
                        <div className="w-full py-1.5 rounded-t-lg text-center"
                          style={{ backgroundColor: players[1].isPlayer ? 'rgba(237,194,46,0.2)' : 'rgba(192,192,192,0.15)', border: players[1].isPlayer ? '1px solid rgba(237,194,46,0.3)' : '1px solid rgba(192,192,192,0.2)' }}>
                          <Medal className="w-3 h-3 mx-auto mb-0.5" style={{ color: '#C0C0C0' }} />
                          <p className="text-[8px] font-bold truncate px-1" style={{ color: players[1].isPlayer ? '#EDC22E' : '#C0C0C0' }}>{players[1].name}</p>
                          <p className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{players[1].score.toLocaleString()} pts</p>
                        </div>
                      </div>
                    )}
                    {players[0] && (
                      <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
                        <span className="text-3xl mb-0.5">{players[0].avatar}</span>
                        <div className="w-full py-2.5 rounded-t-lg text-center"
                          style={{ backgroundColor: players[0].isPlayer ? 'rgba(237,194,46,0.25)' : 'rgba(237,194,46,0.12)', border: '1px solid rgba(237,194,46,0.3)' }}>
                          <Crown className="w-4 h-4 mx-auto mb-0.5" style={{ color: '#FFD700' }} />
                          <p className="text-[9px] font-bold truncate px-1" style={{ color: players[0].isPlayer ? '#EDC22E' : '#FFD700' }}>{players[0].name}</p>
                          <p className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>{players[0].score.toLocaleString()} pts</p>
                        </div>
                      </div>
                    )}
                    {players[2] && (
                      <div className="flex flex-col items-center" style={{ minWidth: 68 }}>
                        <span className="text-2xl mb-0.5">{players[2].avatar}</span>
                        <div className="w-full py-1 rounded-t-lg text-center"
                          style={{ backgroundColor: players[2].isPlayer ? 'rgba(237,194,46,0.2)' : 'rgba(205,127,50,0.12)', border: players[2].isPlayer ? '1px solid rgba(237,194,46,0.3)' : '1px solid rgba(205,127,50,0.2)' }}>
                          <Star className="w-3 h-3 mx-auto mb-0.5" style={{ color: '#CD7F32' }} />
                          <p className="text-[8px] font-bold truncate px-1" style={{ color: players[2].isPlayer ? '#EDC22E' : '#CD7F32' }}>{players[2].name}</p>
                          <p className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{players[2].score.toLocaleString()} pts</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                    {players.slice(3).map((entry) => (
                      <div key={entry.rank}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1"
                        style={{
                          backgroundColor: entry.isPlayer ? 'rgba(237,194,46,0.12)' : 'rgba(255,255,255,0.03)',
                          border: entry.isPlayer ? '1px solid rgba(237,194,46,0.2)' : '1px solid transparent',
                        }}>
                        <span className="text-[10px] font-bold w-5 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>#{entry.rank}</span>
                        <span className="text-sm">{entry.avatar}</span>
                        <span className="text-[10px] font-semibold flex-1 truncate" style={{ color: entry.isPlayer ? '#EDC22E' : 'rgba(255,255,255,0.7)' }}>
                          {entry.name} {entry.isPlayer && '(You)'}
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: '#F65E3B' }}>
                          {entry.score.toLocaleString()} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
