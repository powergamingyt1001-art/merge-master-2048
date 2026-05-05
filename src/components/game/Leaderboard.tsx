'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Medal, Star, Trophy } from 'lucide-react'

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
  gamePoints: number
  bestScore: number
}

type TabType = 'gamePoints' | 'bestScore'

interface LeaderboardEntry {
  rank: number
  name: string
  avatar: string
  value: number
  isPlayer: boolean
}

const FAKE_PLAYERS_GP = [
  { name: 'Vikram Boss', avatar: '🔥', gamePoints: 5200 },
  { name: 'Rahul Pro', avatar: '🦁', gamePoints: 4800 },
  { name: 'Sneha Star', avatar: '⭐', gamePoints: 3900 },
  { name: 'Amit King', avatar: '👑', gamePoints: 3500 },
  { name: 'Pooja Queen', avatar: '👸', gamePoints: 2800 },
  { name: 'Anjali Ace', avatar: '💎', gamePoints: 2200 },
  { name: 'Priya Legend', avatar: '🌟', gamePoints: 1600 },
  { name: 'Ravi Master', avatar: '🏆', gamePoints: 1200 },
  { name: 'Karan Beast', avatar: '💪', gamePoints: 800 },
  { name: 'Neha Champ', avatar: '🎯', gamePoints: 400 },
]

const FAKE_PLAYERS_BEST = [
  { name: 'Rahul Pro', avatar: '🦁', bestScore: 15000 },
  { name: 'Vikram Boss', avatar: '🔥', bestScore: 12500 },
  { name: 'Sneha Star', avatar: '⭐', bestScore: 10200 },
  { name: 'Amit King', avatar: '👑', bestScore: 8500 },
  { name: 'Pooja Queen', avatar: '👸', bestScore: 7200 },
  { name: 'Anjali Ace', avatar: '💎', bestScore: 5800 },
  { name: 'Priya Legend', avatar: '🌟', bestScore: 4100 },
  { name: 'Ravi Master', avatar: '🏆', bestScore: 3200 },
  { name: 'Karan Beast', avatar: '💪', bestScore: 2500 },
  { name: 'Neha Champ', avatar: '🎯', bestScore: 1800 },
]

function buildLeaderboard(tab: TabType, playerGamePoints: number, playerBestScore: number): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = []
  if (tab === 'gamePoints') {
    FAKE_PLAYERS_GP.forEach(p => entries.push({ rank: 0, name: p.name, avatar: p.avatar, value: p.gamePoints, isPlayer: false }))
    entries.push({ rank: 0, name: 'You', avatar: '😎', value: playerGamePoints, isPlayer: true })
  } else {
    FAKE_PLAYERS_BEST.forEach(p => entries.push({ rank: 0, name: p.name, avatar: p.avatar, value: p.bestScore, isPlayer: false }))
    entries.push({ rank: 0, name: 'You', avatar: '😎', value: playerBestScore, isPlayer: true })
  }
  entries.sort((a, b) => b.value - a.value)
  entries.forEach((e, i) => { e.rank = i + 1 })
  return entries
}

export function Leaderboard({ isOpen, onClose, gamePoints, bestScore }: LeaderboardProps) {
  const [tab, setTab] = useState<TabType>('gamePoints')
  const entries = buildLeaderboard(tab, gamePoints, bestScore)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-4 pb-2">
              <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>🏆 Leaderboard</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
            <div className="flex mx-4 mb-3 rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setTab('gamePoints')} className="flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                style={{ backgroundColor: tab === 'gamePoints' ? 'rgba(246,94,59,0.15)' : 'transparent', color: tab === 'gamePoints' ? '#F65E3B' : 'rgba(255,255,255,0.4)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <Trophy className="w-3.5 h-3.5" /> Game Points
              </button>
              <button onClick={() => setTab('bestScore')} className="flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                style={{ backgroundColor: tab === 'bestScore' ? 'rgba(237,194,46,0.15)' : 'transparent', color: tab === 'bestScore' ? '#EDC22E' : 'rgba(255,255,255,0.4)' }}>
                <Crown className="w-3.5 h-3.5" /> Best Score
              </button>
            </div>
            <div className="flex items-end justify-center gap-2 px-4 mb-3">
              {entries[1] && (
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-0.5">{entries[1].avatar}</span>
                  <div className="w-16 py-1.5 rounded-t-lg text-center" style={{ backgroundColor: entries[1].isPlayer ? 'rgba(237,194,46,0.2)' : 'rgba(192,192,192,0.15)', border: entries[1].isPlayer ? '1px solid rgba(237,194,46,0.3)' : '1px solid rgba(192,192,192,0.2)' }}>
                    <Medal className="w-3 h-3 mx-auto mb-0.5" style={{ color: '#C0C0C0' }} />
                    <p className="text-[8px] font-bold truncate" style={{ color: entries[1].isPlayer ? '#EDC22E' : '#C0C0C0' }}>{entries[1].name}</p>
                    <p className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{entries[1].value.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {entries[0] && (
                <div className="flex flex-col items-center">
                  <span className="text-3xl mb-0.5">{entries[0].avatar}</span>
                  <div className="w-18 py-2 rounded-t-lg text-center" style={{ backgroundColor: entries[0].isPlayer ? 'rgba(237,194,46,0.25)' : 'rgba(237,194,46,0.12)', border: '1px solid rgba(237,194,46,0.3)' }}>
                    <Crown className="w-4 h-4 mx-auto mb-0.5" style={{ color: '#FFD700' }} />
                    <p className="text-[9px] font-bold truncate" style={{ color: entries[0].isPlayer ? '#EDC22E' : '#FFD700' }}>{entries[0].name}</p>
                    <p className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>{entries[0].value.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {entries[2] && (
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-0.5">{entries[2].avatar}</span>
                  <div className="w-16 py-1 rounded-t-lg text-center" style={{ backgroundColor: entries[2].isPlayer ? 'rgba(237,194,46,0.2)' : 'rgba(205,127,50,0.12)', border: entries[2].isPlayer ? '1px solid rgba(237,194,46,0.3)' : '1px solid rgba(205,127,50,0.2)' }}>
                    <Star className="w-3 h-3 mx-auto mb-0.5" style={{ color: '#CD7F32' }} />
                    <p className="text-[8px] font-bold truncate" style={{ color: entries[2].isPlayer ? '#EDC22E' : '#CD7F32' }}>{entries[2].name}</p>
                    <p className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{entries[2].value.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 pb-4 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              {entries.slice(3).map((entry) => (
                <div key={entry.rank} className="flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1"
                  style={{ backgroundColor: entry.isPlayer ? 'rgba(237,194,46,0.12)' : 'rgba(255,255,255,0.03)', border: entry.isPlayer ? '1px solid rgba(237,194,46,0.2)' : '1px solid transparent' }}>
                  <span className="text-[10px] font-bold w-5 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>#{entry.rank}</span>
                  <span className="text-sm">{entry.avatar}</span>
                  <span className="text-[10px] font-semibold flex-1 truncate" style={{ color: entry.isPlayer ? '#EDC22E' : 'rgba(255,255,255,0.7)' }}>
                    {entry.name} {entry.isPlayer && '(You)'}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: tab === 'gamePoints' ? '#F65E3B' : '#EDC22E' }}>
                    {entry.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
