'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Swords, Clock, Trophy, Coins, X, ChevronRight, Crown, UserPlus, Megaphone, User, Bell, Zap, Lock } from 'lucide-react'
import { SpinWheel, SpinPrize } from './SpinWheel'
import { LoginStreak } from './LoginStreak'
import { WelcomeGift } from './WelcomeGift'
import { Leaderboard } from './Leaderboard'
import { Tournament } from './Tournament'
import { InvitePanel } from './InvitePanel'
import { ProfilePanel, NotificationsPanel } from './ProfilePanel'
import { PowerUp, Notification, DailyTask, getLevelInfo } from '@/hooks/useGame'

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
  gamesPlayedToday: number
  maxGamesPerDay: number
  notifications: Notification[]
  playerName: string
  playerAvatar: string
  playerLevel: number
  totalBattlesPlayed: number
  totalBattlesWon: number
  tournamentJoined: boolean
  tournamentPoints: number
  tournamentCarryOver: number
  tournamentGamesPlayed: number
  onPlayClassic: () => void
  onStartBotBattle: (timeLimit: number) => void
  onStartCoinGame: (entryFee: number) => void
  onJoinTournament: () => void
  onStartTournamentGame: () => void
  onUseSpinTicket: () => void
  onAddSpinTickets: (count: number) => void
  onClaimWelcome: () => void
  onClaimStreakDay: (day: number) => void
  onAddCoins: (amount: number) => void
  onAddPowerUp: (pu: PowerUp, count: number) => void
  onAddUndos: (count: number) => void
  onClaimCommission: () => void
  onToggleAutoClaim: () => void
  onAddNotification: (title: string, message: string, type: Notification['type'], emoji: string) => void
  onMarkNotificationRead: (id: string) => void
  onMarkAllNotificationsRead: () => void
  onUpdatePlayerName: (name: string) => void
  onUpdatePlayerAvatar: (avatar: string) => void
  dailyTasks?: DailyTask[]
  onClaimDailyTask?: (id: string) => void
  onResetAllData?: () => void
  weeklyBonusClaimed?: boolean
  onClaimWeeklyBonus?: () => void
}

const COIN_GAME_MODES = [
  { fee: 50, win: 100, color: '#00E676', label: '₹50' },
  { fee: 100, win: 200, color: '#00FFFF', label: '₹100' },
  { fee: 200, win: 400, color: '#EDC22E', label: '₹200' },
  { fee: 500, win: 1000, color: '#FF7A00', label: '₹500' },
  { fee: 1000, win: 2000, color: '#F65E3B', label: '₹1000' },
]

export function PlayDashboard({
  coins, spinTickets, streakDay, streakClaimed, welcomeClaimed,
  hammerCount, magnetCount, blastCount, modBestScore, gamePoints, bestScore,
  inviteCode, invitedUsers, commissionBalance, commissionClaimed, autoClaimCommission,
  gamesPlayedToday, maxGamesPerDay, notifications,
  playerName, playerAvatar, playerLevel, totalBattlesPlayed, totalBattlesWon,
  tournamentJoined, tournamentPoints, tournamentCarryOver, tournamentGamesPlayed,
  onPlayClassic, onStartBotBattle, onStartCoinGame,
  onJoinTournament, onStartTournamentGame,
  onUseSpinTicket, onAddSpinTickets, onClaimWelcome, onClaimStreakDay,
  onAddCoins, onAddPowerUp, onAddUndos, onClaimCommission, onToggleAutoClaim,
  onAddNotification, onMarkNotificationRead, onMarkAllNotificationsRead,
  onUpdatePlayerName, onUpdatePlayerAvatar,
  dailyTasks, onClaimDailyTask, onResetAllData,
  weeklyBonusClaimed = false, onClaimWeeklyBonus,
}: PlayDashboardProps) {
  const [showSpin, setShowSpin] = useState(false)
  const [showStreak, setShowStreak] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showBattleModes, setShowBattleModes] = useState(false)
  const [showCoinGames, setShowCoinGames] = useState(false)
  const [showTournament, setShowTournament] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : false)

  const unreadNotifications = notifications.filter(n => !n.read).length
  const gamesLeft = maxGamesPerDay - gamesPlayedToday
  const isGameLimitReached = gamesLeft <= 0

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
    onAddNotification('Spin Prize!', `You won ${prize.emoji} ${prize.label}!`, 'reward', '🎰')
  }, [onAddPowerUp, onAddUndos, onAddSpinTickets, onAddCoins, onAddNotification])



  const handlePlayClassic = useCallback(() => {
    if (isGameLimitReached) {
      onAddNotification('Daily Limit', `You've played ${maxGamesPerDay} games today. Come back tomorrow!`, 'system', '⏰')
      return
    }
    onPlayClassic()
  }, [isGameLimitReached, onPlayClassic, onAddNotification, maxGamesPerDay])

  const handleCoinGame = useCallback((fee: number) => {
    if (isGameLimitReached) {
      onAddNotification('Daily Limit', `You've played ${maxGamesPerDay} games today. Come back tomorrow!`, 'system', '⏰')
      return
    }
    if (coins < fee) {
      onAddNotification('Not Enough Coins', `You need ${fee} coins to play. You have ${coins}.`, 'system', '💰')
      return
    }
    onStartCoinGame(fee)
  }, [isGameLimitReached, coins, onStartCoinGame, onAddNotification, maxGamesPerDay])

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)' }}>
      {/* Glows */}
      <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #EDC22E, transparent)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF7A00, transparent)', filter: 'blur(70px)' }} />

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center max-w-sm w-full mx-auto px-4 py-4 gap-3">

          {/* Top bar: Profile + Title + Bell */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full flex items-center justify-between">
            {/* Profile Icon */}
            <button onClick={() => setShowProfile(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: playerLevel >= 16 ? `linear-gradient(135deg, ${getLevelInfo(playerLevel).color}, ${getLevelInfo(playerLevel).color}88)` : playerLevel >= 6 ? `linear-gradient(135deg, ${getLevelInfo(playerLevel).color}, ${getLevelInfo(playerLevel).color}44)` : 'rgba(255,255,255,0.1)',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                }}>
                <span className="text-base">{playerAvatar}</span>
              </div>
              <div className="text-left">
                <p className="text-[9px] font-bold leading-tight" style={{ color: '#FFFFFF' }}>{playerName}</p>
                <p className="text-[7px] leading-tight" style={{ color: getLevelInfo(playerLevel).color }}>Lv.{playerLevel} {getLevelInfo(playerLevel).icon}</p>
              </div>
            </button>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                <span style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5)' }}>MERGE</span>{' '}
                <span style={{ color: '#FFFFFF' }}>MASTER</span>
              </h1>
              <div className="px-2 py-0.5 rounded-full inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-[7px] font-bold tracking-widest" style={{ color: '#EDC22E' }}>2048 CHALLENGE</span>
              </div>
            </div>

            {/* Bell + Coins */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowNotifications(true)}
                className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Bell className="w-4 h-4" style={{ color: unreadNotifications > 0 ? '#EDC22E' : 'rgba(255,255,255,0.4)' }} />
                {unreadNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{ backgroundColor: '#F65E3B', color: '#FFFFFF' }}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </div>
                )}
              </button>
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl"
                style={{ backgroundColor: 'rgba(237,194,46,0.12)', border: '1px solid rgba(237,194,46,0.25)' }}>
                <Coins className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                <span className="text-xs font-extrabold" style={{ color: '#EDC22E' }}>{coins}</span>
              </div>
            </div>
          </motion.div>

          {/* Inventory bar + Games Left */}
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <InventoryItem emoji="🔨" count={hammerCount} color="#F59563" />
              <InventoryItem emoji="🧲" count={magnetCount} color="#00E676" />
              <InventoryItem emoji="💣" count={blastCount} color="#FF7A00" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg" style={{ backgroundColor: 'rgba(0,230,118,0.08)' }}>
                <span className="text-xs">🎫</span>
                <span className="text-[9px] font-bold" style={{ color: '#00E676' }}>{spinTickets}</span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg" style={{ backgroundColor: isGameLimitReached ? 'rgba(246,94,59,0.12)' : 'rgba(255,255,255,0.06)' }}>
                <span className="text-xs">{isGameLimitReached ? '🚫' : '🎮'}</span>
                <span className="text-[9px] font-bold" style={{ color: isGameLimitReached ? '#F65E3B' : 'rgba(255,255,255,0.5)' }}>{gamesLeft}</span>
              </div>
            </div>
          </motion.div>

          {/* Central PLAY Button */}
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
            <button onClick={handlePlayClassic}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 active:scale-95"
              style={{ background: isGameLimitReached ? 'linear-gradient(135deg, #555, #333)' : 'linear-gradient(135deg, #EDC22E 0%, #FF7A00 100%)', boxShadow: isGameLimitReached ? 'none' : '0 6px 30px rgba(237,194,46,0.5), 0 0 60px rgba(237,194,46,0.2), inset 0 -4px 12px rgba(0,0,0,0.2)' }}>
              {isGameLimitReached ? (
                <>
                  <Lock className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <span className="text-sm font-extrabold" style={{ color: 'rgba(255,255,255,0.5)' }}>LIMIT</span>
                  <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Tomorrow</span>
                </>
              ) : (
                <>
                  <Play className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: '#FFFFFF', marginLeft: 4 }} fill="white" />
                  <span className="text-base sm:text-lg font-extrabold" style={{ color: '#FFFFFF', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>PLAY</span>
                  <span className="text-[7px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.8)' }}>CLASSIC</span>
                </>
              )}
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
                      { time: '4 min', seconds: 240, icon: <Clock className="w-3 h-3" /> },
                      { time: '10 min', seconds: 600, icon: <Trophy className="w-3 h-3" /> },
                    ].map((mode, i) => (
                      <button key={i} onClick={() => isOnline && !isGameLimitReached && onStartBotBattle(mode.seconds)}
                        className="flex flex-col items-center gap-0.5 py-2 rounded-lg transition-transform hover:scale-105 active:scale-95"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: isOnline && !isGameLimitReached ? 1 : 0.4 }}>
                        <div style={{ color: '#F65E3B' }}>{mode.icon}</div>
                        <span className="text-[8px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{mode.time}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {isGameLimitReached ? '⚠️ Daily game limit reached' : isOnline ? '1v1 Battle — Fair play, highest score wins! 🏆' : '⚠️ Internet required for Battle Mode'}
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

          {/* Coin Games */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="w-full">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(237,194,46,0.04)', border: '1px solid rgba(237,194,46,0.08)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                  <span className="text-xs font-bold" style={{ color: '#FFFFFF' }}>Coin Games</span>
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(237,194,46,0.15)', color: '#EDC22E' }}>2x WIN</span>
                </div>
                <button onClick={() => setShowCoinGames(!showCoinGames)}
                  className="text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: 'rgba(237,194,46,0.15)', color: '#EDC22E' }}>
                  {showCoinGames ? 'HIDE' : 'SHOW'} <ChevronRight className="w-2.5 h-2.5" style={{ transform: showCoinGames ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                </button>
              </div>
              {showCoinGames && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.3 }}>
                  <div className="space-y-1.5">
                    {COIN_GAME_MODES.map((mode) => {
                      const canPlay = coins >= mode.fee && isOnline && !isGameLimitReached
                      return (
                        <button key={mode.fee} onClick={() => handleCoinGame(mode.fee)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl transition-transform hover:scale-[1.01] active:scale-95"
                          style={{
                            backgroundColor: canPlay ? `${mode.color}08` : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${canPlay ? `${mode.color}20` : 'rgba(255,255,255,0.04)'}`,
                            opacity: canPlay ? 1 : 0.4,
                          }}>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${mode.color}15`, border: `1px solid ${mode.color}25` }}>
                              <span className="text-xs font-extrabold" style={{ color: mode.color }}>{mode.fee}</span>
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-bold" style={{ color: canPlay ? mode.color : 'rgba(255,255,255,0.4)' }}>
                                Entry: {mode.fee} coins
                              </p>
                              <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                Win: {mode.win} coins
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3" style={{ color: mode.color }} />
                            <span className="text-[9px] font-bold" style={{ color: mode.color }}>PLAY</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[8px] text-center mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {isGameLimitReached ? '⚠️ Daily game limit reached' : isOnline ? '1v1 • 2 min • Win 2x your entry! 🪙' : '⚠️ Internet required for Coin Games'}
                  </p>
                </motion.div>
              )}
              {!showCoinGames && (
                <p className="text-[8px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Play with coins • Win 2x! 🪙
                </p>
              )}
            </div>
          </motion.div>

          {/* Quick Actions: Streak + Spin + Weekly + Leaderboard */}
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
            <button onClick={() => !weeklyBonusClaimed && onClaimWeeklyBonus?.()}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
              style={{
                backgroundColor: weeklyBonusClaimed ? 'rgba(255,255,255,0.03)' : 'rgba(237,194,46,0.12)',
                border: weeklyBonusClaimed ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(237,194,46,0.3)',
                opacity: weeklyBonusClaimed ? 0.5 : 1,
              }}>
              <span className="text-lg">🎁</span>
              <p className="text-[8px] font-bold" style={{ color: weeklyBonusClaimed ? 'rgba(255,255,255,0.3)' : '#EDC22E' }}>Weekly</p>
              <p className="text-[7px]" style={{ color: weeklyBonusClaimed ? 'rgba(255,255,255,0.2)' : '#00E676' }}>{weeklyBonusClaimed ? 'Claimed' : '400 💰'}</p>
            </button>
            <button onClick={() => setShowLeaderboard(true)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)' }}>
              <span className="text-lg">🏆</span>
              <p className="text-[8px] font-bold" style={{ color: '#F65E3B' }}>Rank</p>
              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Leaderboard</p>
            </button>
          </motion.div>

          {/* Invite Quick Action */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
            className="w-full">
            <button onClick={() => setShowInvite(true)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl transition-transform hover:scale-[1.01] active:scale-95"
              style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.12)' }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>
                <div className="text-left">
                  <p className="text-[9px] font-bold" style={{ color: '#00E676' }}>Invite Friends</p>
                  <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Earn 5% commission</p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
          </motion.div>

          {/* Tournament */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            className="w-full">
            <button onClick={() => isOnline && setShowTournament(true)}
              className="w-full flex items-center gap-2 p-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)', opacity: isOnline ? 1 : 0.5 }}>
              <Trophy className="w-5 h-5" style={{ color: '#EDC22E' }} />
              <div className="text-left flex-1">
                <p className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Tournament</p>
                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{isOnline ? (tournamentJoined ? `${tournamentPoints} pts` : 'Weekly Prizes!') : 'Need Internet'}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </button>
          </motion.div>

          {/* PLAY TOURNAMENT button - shows on dashboard when joined */}
          {tournamentJoined && isOnline && (
            <motion.div initial={{ y: 20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.55, type: 'spring', stiffness: 200 }}>
              <button
                onClick={() => { onStartTournamentGame() }}
                className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #00E676, #00C853)',
                  color: '#FFFFFF',
                  boxShadow: '0 6px 30px rgba(0,230,118,0.4), 0 0 60px rgba(0,230,118,0.15)',
                }}
              >
                <Play className="w-5 h-5" fill="white" />
                <span>PLAY TOURNAMENT</span>
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>90s</span>
              </button>
            </motion.div>
          )}

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

      {/* Modals */}
      <SpinWheel isOpen={showSpin} onClose={() => setShowSpin(false)} spinTickets={spinTickets}
        onUseTicket={onUseSpinTicket} onWinPrize={handleSpinPrize} onWatchAdForSpin={() => {}} isOnline={isOnline} />
      <LoginStreak isOpen={showStreak} onClose={() => setShowStreak(false)} streakDay={streakDay}
        streakClaimed={streakClaimed} onClaim={onClaimStreakDay} />
      <WelcomeGift isOpen={showWelcome} onClose={() => setShowWelcome(false)} onClaim={() => { onClaimWelcome(); setShowWelcome(false) }} />
      <Leaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)}
        gamePoints={gamePoints} bestScore={bestScore} coins={coins} />
      <Tournament isOpen={showTournament} onClose={() => setShowTournament(false)}
        coins={coins}
        tournamentJoined={tournamentJoined}
        tournamentPoints={tournamentPoints}
        tournamentCarryOver={tournamentCarryOver}
        tournamentGamesPlayed={tournamentGamesPlayed}
        onJoinTournament={onJoinTournament}
        onStartTournamentGame={onStartTournamentGame} />
      <InvitePanel isOpen={showInvite} onClose={() => setShowInvite(false)}
        inviteCode={inviteCode} invitedUsers={invitedUsers}
        commissionBalance={commissionBalance} commissionClaimed={commissionClaimed}
        autoClaimCommission={autoClaimCommission} onClaimCommission={onClaimCommission}
        onToggleAutoClaim={onToggleAutoClaim} />
      <ProfilePanel isOpen={showProfile} onClose={() => setShowProfile(false)}
        playerName={playerName} playerAvatar={playerAvatar} playerLevel={playerLevel}
        gamePoints={gamePoints} bestScore={bestScore} modBestScore={modBestScore}
        coins={coins} gamesPlayedToday={gamesPlayedToday} maxGamesPerDay={maxGamesPerDay}
        invitedUsers={invitedUsers} onUpdateName={onUpdatePlayerName} onUpdateAvatar={onUpdatePlayerAvatar}
        totalBattlesPlayed={totalBattlesPlayed} totalBattlesWon={totalBattlesWon}
        onResetAllData={onResetAllData} />
      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)}
        notifications={notifications} onMarkRead={onMarkNotificationRead} onMarkAllRead={onMarkAllNotificationsRead} />
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
