'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Swords, Clock, Trophy, Coins, X, ChevronRight, Crown, UserPlus, Megaphone } from 'lucide-react'
import { SpinWheel, SpinPrize } from './SpinWheel'
import { LoginStreak } from './LoginStreak'
import { WelcomeGift } from './WelcomeGift'
import { Leaderboard } from './Leaderboard'
import { Tournament } from './Tournament'
import { InvitePanel } from './InvitePanel'
import { BannerAd } from './BannerAd'
import { PowerUp } from '@/hooks/useGame'

interface PlayDashboardProps {
  coins: number
  spinTickets: number
  streakDay: number
  streakClaimed: boolean[]
  welcomeClaimed: boolean
  hammerCount: number
  magnetCount: number
  blastCount: number
  modBestScore: number
  gamePoints: number
  bestScore: number
  inviteCode: string
  invitedUsers: { id: string; name: string; joinedAt: string; commissionEarned: number }[]
  commissionBalance: number
  commissionClaimed: number
  autoClaimCommission: boolean
  onPlayClassic: () => void
  onStartBotBattle: (timeLimit: number) => void
  onUseSpinTicket: () => void
  onAddSpinTickets: (count: number) => void
  onClaimWelcome: () => void
  onClaimStreakDay: (day: number) => void
  onAddCoins: (amount: number) => void
  onAddPowerUp: (pu: PowerUp, count: number) => void
  onAddUndos: (count: number) => void
  onClaimCommission: () => void
  onToggleAutoClaim: () => void
}

export function PlayDashboard({
  coins, spinTickets, streakDay, streakClaimed, welcomeClaimed,
  hammerCount, magnetCount, blastCount, modBestScore, gamePoints, bestScore,
  inviteCode, invitedUsers, commissionBalance, commissionClaimed, autoClaimCommission,
  onPlayClassic, onStartBotBattle,
  onUseSpinTicket, onAddSpinTickets, onClaimWelcome, onClaimStreakDay,
  onAddCoins, onAddPowerUp, onAddUndos, onClaimCommission, onToggleAutoClaim,
}: PlayDashboardProps) {
  const [showSpin, setShowSpin] = useState(false)
  const [showStreak, setShowStreak] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showBattleModes, setShowBattleModes] = useState(false)
  const [showTournament, setShowTournament] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : false)

  // Show welcome gift for new users
  useEffect(() => {
    if (!welcomeClaimed) {
      const timer = setTimeout(() => setShowWelcome(true), 800)
      return () => clearTimeout(timer)
    }
  }, [welcomeClaimed])

  // Internet detection
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const handleSpinPrize = useCallback((prize: SpinPrize) => {
    switch (prize.type) {
      case 'blast': onAddPowerUp('blast', prize.count); break
      case 'magnet': onAddPowerUp('magnet', prize.count); break
      case 'hammer': onAddPowerUp('hammer', prize.count); break
      case 'undo': onAddUndos(prize.count); break
      case 'spin': onAddSpinTickets(prize.count); break
      case 'coin': onAddCoins(prize.count); break
      case 'respin': onAddSpinTickets(1); break
    }
  }, [onAddPowerUp, onAddUndos, onAddSpinTickets, onAddCoins])

  const handleAdForSpin = useCallback(() => {
    onAddSpinTickets(1)
  }, [onAddSpinTickets])

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)' }}>
      {/* Glows */}
      <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #EDC22E, transparent)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF7A00, transparent)', filter: 'blur(70px)' }} />

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center max-w-sm w-full mx-auto px-4 py-4 gap-3">

          {/* Top bar: Coins + Title */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                <span style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5)' }}>MERGE</span>{' '}
                <span style={{ color: '#FFFFFF' }}>MASTER</span>
              </h1>
              <div className="px-2 py-0.5 rounded-full inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-[8px] font-bold tracking-widest" style={{ color: '#EDC22E' }}>2048 CHALLENGE</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ backgroundColor: 'rgba(237,194,46,0.12)', border: '1px solid rgba(237,194,46,0.25)' }}>
              <Coins className="w-4 h-4" style={{ color: '#EDC22E' }} />
              <span className="text-sm font-extrabold" style={{ color: '#EDC22E' }}>{coins}</span>
            </div>
          </motion.div>

          {/* Inventory bar */}
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <InventoryItem emoji="🔨" count={hammerCount} color="#F59563" />
              <InventoryItem emoji="🧲" count={magnetCount} color="#00E676" />
              <InventoryItem emoji="💣" count={blastCount} color="#FF7A00" />
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'rgba(0,230,118,0.08)' }}>
              <span className="text-sm">🎫</span>
              <span className="text-[10px] font-bold" style={{ color: '#00E676' }}>{spinTickets} Spins</span>
            </div>
          </motion.div>

          {/* Central PLAY Button */}
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
            <button onClick={onPlayClassic}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #EDC22E 0%, #FF7A00 100%)', boxShadow: '0 6px 30px rgba(237,194,46,0.5), 0 0 60px rgba(237,194,46,0.2), inset 0 -4px 12px rgba(0,0,0,0.2)' }}>
              <Play className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: '#FFFFFF', marginLeft: 4 }} fill="white" />
              <span className="text-base sm:text-lg font-extrabold" style={{ color: '#FFFFFF', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>PLAY</span>
              <span className="text-[7px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.8)' }}>CLASSIC</span>
            </button>
          </motion.div>

          {/* Battle Mode */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="w-full">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5" style={{ color: '#F65E3B' }} />
                  <span className="text-xs font-bold" style={{ color: '#FFFFFF' }}>Battle Mode</span>
                </div>
                <button onClick={() => setShowBattleModes(!showBattleModes)}
                  className="text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: 'rgba(255,122,0,0.2)', color: '#FF7A00' }}>
                  {showBattleModes ? 'HIDE' : 'SHOW'} <ChevronRight className="w-2.5 h-2.5" style={{ transform: showBattleModes ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                </button>
              </div>
              {showBattleModes && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.3 }}>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[
                      { time: '1 min', seconds: 60, icon: <Clock className="w-3 h-3" /> },
                      { time: '2 min', seconds: 120, icon: <Clock className="w-3 h-3" /> },
                      { time: '5 min', seconds: 300, icon: <Clock className="w-3 h-3" /> },
                      { time: '10 min', seconds: 600, icon: <Trophy className="w-3 h-3" /> },
                    ].map((mode, i) => (
                      <button key={i} onClick={() => isOnline && onStartBotBattle(mode.seconds)}
                        className="flex flex-col items-center gap-0.5 py-2 rounded-lg transition-transform hover:scale-105 active:scale-95"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: isOnline ? 1 : 0.4 }}>
                        <div style={{ color: '#F65E3B' }}>{mode.icon}</div>
                        <span className="text-[8px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{mode.time}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {isOnline ? '1v1 Battle — Highest score wins! 50/50 chance 🏆' : '⚠️ Internet required for Battle Mode'}
                  </p>
                </motion.div>
              )}
              {!showBattleModes && (
                <p className="text-[8px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  1v1 Battle — Highest score wins! 🏆
                </p>
              )}
            </div>
          </motion.div>

          {/* Quick Actions: Streak + Spin + Leaderboard */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="w-full grid grid-cols-4 gap-2">
            <button onClick={() => setShowStreak(true)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1px solid rgba(237,194,46,0.2)' }}>
              <span className="text-lg">📅</span>
              <p className="text-[8px] font-bold" style={{ color: '#EDC22E' }}>Daily</p>
              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Day {Math.min(streakDay + 1, 7)}/7</p>
            </button>
            <button onClick={() => setShowSpin(true)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}>
              <span className="text-lg">🎰</span>
              <p className="text-[8px] font-bold" style={{ color: '#00E676' }}>Spin</p>
              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{spinTickets} tickets</p>
            </button>
            <button onClick={() => setShowLeaderboard(true)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)' }}>
              <span className="text-lg">🏆</span>
              <p className="text-[8px] font-bold" style={{ color: '#F65E3B' }}>Rank</p>
              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Leaderboard</p>
            </button>
            <button onClick={() => setShowInvite(true)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}>
              <span className="text-lg">🤝</span>
              <p className="text-[8px] font-bold" style={{ color: '#00E676' }}>Invite</p>
              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Earn 5%</p>
            </button>
          </motion.div>

          {/* Tournament + Game Points */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            className="w-full grid grid-cols-2 gap-2">
            <button onClick={() => isOnline && setShowTournament(true)}
              className="flex items-center gap-2 p-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)', opacity: isOnline ? 1 : 0.5 }}>
              <Trophy className="w-5 h-5" style={{ color: '#EDC22E' }} />
              <div className="text-left">
                <p className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Tournament</p>
                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{isOnline ? 'Weekly Prizes!' : 'Need Internet'}</p>
              </div>
            </button>
            <div className="flex items-center gap-2 p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Crown className="w-5 h-5" style={{ color: '#EDC22E' }} />
              <div className="text-left">
                <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>Game Points</p>
                <p className="text-xs font-extrabold" style={{ color: '#EDC22E' }}>{gamePoints}</p>
              </div>
            </div>
          </motion.div>

          {/* Mod Best Score */}
          {modBestScore > 0 && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Crown className="w-4 h-4" style={{ color: '#EDC22E' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Mod Best Score:</span>
              <span className="text-xs font-bold" style={{ color: '#EDC22E' }}>{modBestScore}</span>
            </motion.div>
          )}

          {/* Invite quick info */}
          {invitedUsers.length > 0 && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.1)' }}>
              <div className="flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5" style={{ color: '#00E676' }} />
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{invitedUsers.length} invited</span>
              </div>
              {commissionBalance > 0 && (
                <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>{commissionBalance} 💰 pending</span>
              )}
            </motion.div>
          )}

        </div>
      </div>

      {/* Banner Ad footer */}
      <BannerAd position="bottom" isOnline={isOnline} />

      {/* Modals */}
      <SpinWheel isOpen={showSpin} onClose={() => setShowSpin(false)} spinTickets={spinTickets}
        onUseTicket={onUseSpinTicket} onWinPrize={handleSpinPrize} onWatchAdForSpin={handleAdForSpin} isOnline={isOnline} />
      <LoginStreak isOpen={showStreak} onClose={() => setShowStreak(false)} streakDay={streakDay}
        streakClaimed={streakClaimed} onClaim={onClaimStreakDay} />
      <WelcomeGift isOpen={showWelcome} onClose={() => setShowWelcome(false)} onClaim={() => { onClaimWelcome(); setShowWelcome(false) }} />
      <Leaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)}
        gamePoints={gamePoints} bestScore={bestScore} />
      <Tournament isOpen={showTournament} onClose={() => setShowTournament(false)}
        gamePoints={gamePoints} coins={coins} />
      <InvitePanel isOpen={showInvite} onClose={() => setShowInvite(false)}
        inviteCode={inviteCode} invitedUsers={invitedUsers}
        commissionBalance={commissionBalance} commissionClaimed={commissionClaimed}
        autoClaimCommission={autoClaimCommission} onClaimCommission={onClaimCommission}
        onToggleAutoClaim={onToggleAutoClaim} />
    </div>
  )
}

function InventoryItem({ emoji, count, color }: { emoji: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-sm">{emoji}</span>
      <span className="text-[10px] font-bold" style={{ color: count > 0 ? color : 'rgba(255,255,255,0.2)' }}>{count}</span>
    </div>
  )
}
