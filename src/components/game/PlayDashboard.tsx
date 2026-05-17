'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Swords, Clock, Trophy, Coins, Crown, Bell, Lock } from 'lucide-react'
import { SpinWheel, SpinPrize } from './SpinWheel'
import { LoginStreak } from './LoginStreak'
import { WelcomeGift } from './WelcomeGift'
import { Leaderboard } from './Leaderboard'
import { Tournament } from './Tournament'
import { InvitePanel } from './InvitePanel'
import { ProfilePanel, NotificationsPanel } from './ProfilePanel'
import { PrivacyPolicy, AboutPage, ContactPage } from './FooterPages'
import {
  AdsterraNativeBanner,
  AdsterraBanner728x90,
  AdsterraBanner300x250,
  AdsterraBanner320x50,
} from '@/components/ads/AdsterraAds'
import { PowerUp, Notification, DailyTask, getLevelInfo } from '@/hooks/useGame'
import { getRandomLink } from '@/components/ads/AdOverlay'

// ===== BANNER ROTATION: One big banner per page per session =====
type BannerSlot = 'top' | 'middle' | 'footer'
function getDashboardBigBannerSlot(): BannerSlot {
  if (typeof window === 'undefined') return 'top'
  const stored = sessionStorage.getItem('dashboard_big_banner_slot')
  if (stored && ['top', 'middle', 'footer'].includes(stored)) return stored as BannerSlot
  const slots: BannerSlot[] = ['top', 'middle', 'footer']
  const picked = slots[Math.floor(Math.random() * slots.length)]
  sessionStorage.setItem('dashboard_big_banner_slot', picked)
  return picked
}

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
  playerId: string
  firebaseReferrals: { id: string; name: string; avatar?: string; joinedAt: number; commissionEarned: number }[]
  firebaseCommissionPending: number
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
  onClaimFirebaseCommission: () => void
  onToggleAutoClaim: () => void
  onAddNotification: (title: string, message: string, type: Notification['type'], emoji: string) => void
  onMarkNotificationRead: (id: string) => void
  onMarkAllNotificationsRead: () => void
  onUpdatePlayerName: (name: string) => void
  onUpdatePlayerAvatar: (avatar: string) => void
  dailyTasks?: DailyTask[]
  onClaimDailyTask?: (id: string) => void
  onCompleteVisitWebsiteTask?: () => void
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
  playerName, playerAvatar, playerLevel, playerId, firebaseReferrals, firebaseCommissionPending,
  totalBattlesPlayed, totalBattlesWon,
  tournamentJoined, tournamentPoints, tournamentCarryOver, tournamentGamesPlayed,
  onPlayClassic, onStartBotBattle, onStartCoinGame,
  onJoinTournament, onStartTournamentGame,
  onUseSpinTicket, onAddSpinTickets, onClaimWelcome, onClaimStreakDay,
  onAddCoins, onAddPowerUp, onAddUndos, onClaimCommission, onClaimFirebaseCommission, onToggleAutoClaim,
  onAddNotification, onMarkNotificationRead, onMarkAllNotificationsRead,
  onUpdatePlayerName, onUpdatePlayerAvatar,
  dailyTasks, onClaimDailyTask, onCompleteVisitWebsiteTask, onResetAllData,
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
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : false)
  const [bigBannerSlot] = useState<BannerSlot>(() => getDashboardBigBannerSlot())

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
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #EDC22E, transparent)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF7A00, transparent)', filter: 'blur(70px)' }} />

      {/* ====== HEADER AD - Big banner if 'top' slot, else small ====== */}
      <div className="flex-shrink-0 relative z-10 w-full">
        {bigBannerSlot === 'top' ? <AdsterraBanner728x90 /> : <AdsterraBanner320x50 />}
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center max-w-sm w-full mx-auto px-3 pt-2 pb-2 gap-2">

          {/* Top bar: Profile + Title + Bell */}
          <div className="w-full flex items-center justify-between">
            <button onClick={() => setShowProfile(true)}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg transition-transform active:scale-95"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: playerLevel >= 16 ? `linear-gradient(135deg, ${getLevelInfo(playerLevel).color}, ${getLevelInfo(playerLevel).color}88)` : playerLevel >= 6 ? `linear-gradient(135deg, ${getLevelInfo(playerLevel).color}, ${getLevelInfo(playerLevel).color}44)` : 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                <span className="text-sm">{playerAvatar}</span>
              </div>
              <div className="text-left">
                <p className="text-[8px] font-bold leading-tight" style={{ color: '#FFFFFF' }}>{playerName}</p>
                <p className="text-[6px] leading-tight" style={{ color: getLevelInfo(playerLevel).color }}>Lv.{playerLevel} {getLevelInfo(playerLevel).icon}</p>
              </div>
            </button>

            <div className="text-center">
              <h1 className="text-base font-extrabold tracking-tight leading-none">
                <span style={{ color: '#FFD700', textShadow: '0 0 15px rgba(255,215,0,0.4)' }}>MERGE</span>{' '}
                <span style={{ color: '#FFFFFF' }}>MASTER</span>
              </h1>
              <span className="text-[6px] font-bold tracking-widest" style={{ color: '#EDC22E' }}>2048 CHALLENGE</span>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setShowNotifications(true)}
                className="relative w-7 h-7 rounded-lg flex items-center justify-center transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Bell className="w-3.5 h-3.5" style={{ color: unreadNotifications > 0 ? '#EDC22E' : 'rgba(255,255,255,0.4)' }} />
                {unreadNotifications > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold"
                    style={{ backgroundColor: '#F65E3B', color: '#FFFFFF' }}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </div>
                )}
              </button>
              <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg"
                style={{ backgroundColor: 'rgba(237,194,46,0.12)', border: '1px solid rgba(237,194,46,0.25)' }}>
                <Coins className="w-3 h-3" style={{ color: '#EDC22E' }} />
                <span className="text-[10px] font-extrabold" style={{ color: '#EDC22E' }}>{coins}</span>
              </div>
            </div>
          </div>

          {/* Inventory bar + Games Left */}
          <div className="w-full flex items-center justify-between px-2 py-1 rounded-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5">
              <InventoryItem emoji="🔨" count={hammerCount} color="#F59563" />
              <InventoryItem emoji="🧲" count={magnetCount} color="#00E676" />
              <InventoryItem emoji="💣" count={blastCount} color="#FF7A00" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,230,118,0.08)' }}>
                <span className="text-[10px]">🎫</span>
                <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>{spinTickets}</span>
              </div>
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded" style={{ backgroundColor: isGameLimitReached ? 'rgba(246,94,59,0.12)' : 'rgba(255,255,255,0.06)' }}>
                <span className="text-[10px]">{isGameLimitReached ? '🚫' : '🎮'}</span>
                <span className="text-[8px] font-bold" style={{ color: isGameLimitReached ? '#F65E3B' : 'rgba(255,255,255,0.5)' }}>{gamesLeft}</span>
              </div>
            </div>
          </div>

          {/* Central PLAY Button */}
          <div className="flex items-center gap-3 w-full justify-center">
            <button onClick={handlePlayClassic}
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-transform active:scale-95"
              style={{ background: isGameLimitReached ? 'linear-gradient(135deg, #555, #333)' : 'linear-gradient(135deg, #EDC22E 0%, #FF7A00 100%)', boxShadow: isGameLimitReached ? 'none' : '0 4px 20px rgba(237,194,46,0.5), 0 0 40px rgba(237,194,46,0.15), inset 0 -3px 8px rgba(0,0,0,0.2)' }}>
              {isGameLimitReached ? (
                <>
                  <Lock className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <span className="text-[10px] font-extrabold" style={{ color: 'rgba(255,255,255,0.5)' }}>LIMIT</span>
                </>
              ) : (
                <>
                  <Play className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: '#FFFFFF', marginLeft: 2 }} fill="white" />
                  <span className="text-xs sm:text-sm font-extrabold" style={{ color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>PLAY</span>
                  <span className="text-[6px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>CLASSIC</span>
                </>
              )}
            </button>

            {/* Quick mode buttons */}
            <div className="flex flex-col gap-1.5">
              <button onClick={() => setShowBattleModes(!showBattleModes)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(246,94,59,0.12)', border: '1px solid rgba(246,94,59,0.25)' }}>
                <Swords className="w-3 h-3" style={{ color: '#F65E3B' }} />
                <span className="text-[9px] font-bold" style={{ color: '#F65E3B' }}>Battle</span>
              </button>
              <button onClick={() => setShowCoinGames(!showCoinGames)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(237,194,46,0.12)', border: '1px solid rgba(237,194,46,0.25)' }}>
                <Coins className="w-3 h-3" style={{ color: '#EDC22E' }} />
                <span className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>Coins</span>
              </button>
              <button onClick={() => isOnline && setShowTournament(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)', opacity: isOnline ? 1 : 0.5 }}>
                <Trophy className="w-3 h-3" style={{ color: '#00E676' }} />
                <span className="text-[9px] font-bold" style={{ color: '#00E676' }}>Tour</span>
              </button>
            </div>
          </div>

          {/* Battle Mode - Expandable */}
          <AnimatePresence>
            {showBattleModes && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="w-full overflow-hidden">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { time: '1m', seconds: 60, icon: <Clock className="w-2.5 h-2.5" /> },
                      { time: '2m', seconds: 120, icon: <Clock className="w-2.5 h-2.5" /> },
                      { time: '4m', seconds: 240, icon: <Clock className="w-2.5 h-2.5" /> },
                      { time: '10m', seconds: 600, icon: <Trophy className="w-2.5 h-2.5" /> },
                    ].map((mode, i) => (
                      <button key={i} onClick={() => isOnline && !isGameLimitReached && onStartBotBattle(mode.seconds)}
                        className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-transform active:scale-95"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: isOnline && !isGameLimitReached ? 1 : 0.4 }}>
                        <div style={{ color: '#F65E3B' }}>{mode.icon}</div>
                        <span className="text-[7px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{mode.time}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[7px] text-center mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    1v1 Battle — Highest score wins! 🏆
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Coin Games - Expandable */}
          <AnimatePresence>
            {showCoinGames && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="w-full overflow-hidden">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(237,194,46,0.04)', border: '1px solid rgba(237,194,46,0.08)' }}>
                  <div className="grid grid-cols-5 gap-1">
                    {COIN_GAME_MODES.map((mode) => {
                      const canPlay = coins >= mode.fee && isOnline && !isGameLimitReached
                      return (
                        <button key={mode.fee} onClick={() => handleCoinGame(mode.fee)}
                          className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-transform active:scale-95"
                          style={{
                            backgroundColor: canPlay ? `${mode.color}10` : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${canPlay ? `${mode.color}25` : 'rgba(255,255,255,0.04)'}`,
                            opacity: canPlay ? 1 : 0.4,
                          }}>
                          <span className="text-[8px] font-extrabold" style={{ color: mode.color }}>{mode.fee}</span>
                          <span className="text-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>→{mode.win}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[7px] text-center mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    1v1 • 2 min • Win 2x your entry! 🪙
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PLAY TOURNAMENT button */}
          {tournamentJoined && isOnline && (
            <button onClick={() => onStartTournamentGame()}
              className="w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF', boxShadow: '0 4px 15px rgba(0,230,118,0.3)' }}>
              <Play className="w-3.5 h-3.5" fill="white" />
              PLAY TOURNAMENT
              <span className="text-[8px] font-normal px-1 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>90s</span>
            </button>
          )}

          {/* Native Banner Ad - compact */}
          <div className="w-full">
            <AdsterraNativeBanner />
          </div>

          {/* Quick Actions: Streak + Spin + Weekly + Leaderboard */}
          <div className="w-full grid grid-cols-4 gap-1.5">
            <button onClick={() => setShowStreak(true)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-lg transition-transform active:scale-95"
              style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)' }}>
              <span className="text-base">📅</span>
              <p className="text-[7px] font-bold" style={{ color: '#EDC22E' }}>Daily</p>
              <p className="text-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Day {Math.min(streakDay + 1, 7)}/7</p>
            </button>
            <button onClick={() => setShowSpin(true)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-lg transition-transform active:scale-95"
              style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.12)' }}>
              <span className="text-base">🎰</span>
              <p className="text-[7px] font-bold" style={{ color: '#00E676' }}>Spin</p>
              <p className="text-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{spinTickets}🎫</p>
            </button>
            <button onClick={() => !weeklyBonusClaimed && onClaimWeeklyBonus?.()}
              className="flex flex-col items-center gap-0.5 py-2 rounded-lg transition-transform active:scale-95"
              style={{
                backgroundColor: weeklyBonusClaimed ? 'rgba(255,255,255,0.02)' : 'rgba(237,194,46,0.1)',
                border: weeklyBonusClaimed ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(237,194,46,0.2)',
                opacity: weeklyBonusClaimed ? 0.5 : 1,
              }}>
              <span className="text-base">🎁</span>
              <p className="text-[7px] font-bold" style={{ color: weeklyBonusClaimed ? 'rgba(255,255,255,0.3)' : '#EDC22E' }}>Weekly</p>
              <p className="text-[6px]" style={{ color: weeklyBonusClaimed ? 'rgba(255,255,255,0.2)' : '#00E676' }}>{weeklyBonusClaimed ? '✓' : '400💰'}</p>
            </button>
            <button onClick={() => setShowLeaderboard(true)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-lg transition-transform active:scale-95"
              style={{ backgroundColor: 'rgba(246,94,59,0.06)', border: '1px solid rgba(246,94,59,0.12)' }}>
              <span className="text-base">🏆</span>
              <p className="text-[7px] font-bold" style={{ color: '#F65E3B' }}>Rank</p>
              <p className="text-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Board</p>
            </button>
          </div>

          {/* 300x250 Banner Ad - Only show if 'middle' is the big banner slot */}
          {bigBannerSlot === 'middle' && (
            <div className="w-full">
              <AdsterraBanner300x250 />
            </div>
          )}

          {/* Daily Tasks */}
          {dailyTasks && dailyTasks.length > 0 && (
            <div className="w-full rounded-lg p-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[9px]">📋</span>
                <p className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>Daily Tasks</p>
              </div>
              <div className="flex flex-col gap-1">
                {dailyTasks.map(task => {
                  const isComplete = task.progress >= task.target
                  const isVisitTask = task.id.startsWith('visit-')
                  return (
                    <div key={task.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                      style={{ backgroundColor: isComplete ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isComplete ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.04)'}` }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">{task.emoji}</span>
                        <div>
                          <p className="text-[8px] font-semibold" style={{ color: isComplete ? '#00E676' : 'rgba(255,255,255,0.7)' }}>{task.description}</p>
                          <p className="text-[6px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{task.progress}/{task.target} • +{task.reward}💰</p>
                        </div>
                      </div>
                      {task.claimed ? (
                        <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>✓</span>
                      ) : isComplete ? (
                        <button onClick={() => onClaimDailyTask?.(task.id)}
                          className="px-2 py-0.5 rounded text-[7px] font-bold transition-transform active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                          CLAIM
                        </button>
                      ) : isVisitTask && isOnline ? (
                        <button onClick={() => {
                          try { window.open(getRandomLink(), '_blank') } catch { /* popup blocked */ }
                          onCompleteVisitWebsiteTask?.()
                        }}
                          className="px-2 py-0.5 rounded text-[7px] font-bold transition-transform active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #F65E3B, #FF7A00)', color: '#FFFFFF' }}>
                          VISIT
                        </button>
                      ) : (
                        <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{task.progress}/{task.target}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Invite row */}
          <div className="w-full flex gap-1.5">
            <button onClick={() => setShowInvite(true)}
              className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-transform active:scale-95"
              style={{ backgroundColor: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.1)' }}>
              <span className="text-sm">🤝</span>
              <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>Invite</span>
              <span className="text-[6px]" style={{ color: 'rgba(255,255,255,0.3)' }}>5%</span>
            </button>
            {modBestScore > 0 && (
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Crown className="w-3 h-3" style={{ color: '#EDC22E' }} />
                <span className="text-[8px] font-bold" style={{ color: '#EDC22E' }}>{modBestScore}</span>
              </div>
            )}
            {invitedUsers.length > 0 && commissionBalance > 0 && (
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg"
                style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)' }}>
                <span className="text-[8px] font-bold" style={{ color: '#EDC22E' }}>{commissionBalance}💰</span>
              </div>
            )}
          </div>

          {/* Footer links */}
          <div className="w-full flex items-center justify-center gap-2 pt-1 pb-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <button onClick={() => setShowPrivacy(true)} className="text-[7px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Privacy</button>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <button onClick={() => setShowAbout(true)} className="text-[7px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>About</button>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <button onClick={() => setShowContact(true)} className="text-[7px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Contact</button>
          </div>

          {/* ====== ITCH.IO HTML DOWNLOAD BUTTON ====== */}
          <button
            onClick={() => {
              const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Merge Master 2048 Challenge</title>
<meta name="description" content="Merge tiles, reach 2048! The ultimate puzzle challenge. Play now for free!">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#1a0533 0%,#0d1b3e 50%,#1a0533 100%);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;color:#fff;position:relative;}
.glow1{position:absolute;top:15%;left:20%;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,#EDC22E,transparent);opacity:0.2;filter:blur(60px);pointer-events:none;}
.glow2{position:absolute;bottom:20%;right:15%;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,#FF7A00,transparent);opacity:0.15;filter:blur(70px);pointer-events:none;}
.particles{position:absolute;inset:0;overflow:hidden;pointer-events:none;}
.particle{position:absolute;width:4px;height:4px;border-radius:50%;background:#EDC22E;opacity:0.3;animation:floatUp linear infinite;}
@keyframes floatUp{0%{transform:translateY(100vh) scale(0);opacity:0;}10%{opacity:0.3;}90%{opacity:0.3;}100%{transform:translateY(-10vh) scale(1);opacity:0;}}
.title-container{text-align:center;margin-bottom:20px;position:relative;z-index:2;}
.title{font-size:36px;font-weight:900;letter-spacing:-1px;line-height:1.1;}
.title .merge{color:#FFD700;text-shadow:0 0 20px rgba(255,215,0,0.4);}
.title .master{color:#FFFFFF;}
.subtitle{font-size:11px;font-weight:700;letter-spacing:4px;color:#EDC22E;margin-top:4px;}
.tiles-preview{display:flex;gap:8px;margin-bottom:30px;position:relative;z-index:2;}
.tile{width:60px;height:60px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;animation:tilePop 0.5s ease-out forwards;opacity:0;box-shadow:0 4px 15px rgba(0,0,0,0.3);}
.tile:nth-child(1){background:#776E65;color:#FFF;animation-delay:0.1s;}
.tile:nth-child(2){background:#EDC22E;color:#FFF;animation-delay:0.2s;}
.tile:nth-child(3){background:#F59563;color:#FFF;animation-delay:0.3s;}
.tile:nth-child(4){background:#F65E3B;color:#FFF;animation-delay:0.4s;font-size:14px;}
@keyframes tilePop{0%{transform:scale(0);opacity:0;}60%{transform:scale(1.1);}100%{transform:scale(1);opacity:1;}}
.stats{display:flex;gap:12px;margin-bottom:25px;position:relative;z-index:2;}
.stat{padding:8px 16px;border-radius:12px;text-align:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);}
.stat-value{font-size:16px;font-weight:900;color:#EDC22E;}
.stat-label{font-size:8px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;}
.play-btn{position:relative;z-index:2;width:120px;height:120px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#EDC22E 0%,#FF7A00 100%);box-shadow:0 6px 30px rgba(237,194,46,0.5),0 0 50px rgba(237,194,46,0.15),inset 0 -4px 10px rgba(0,0,0,0.2);display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform 0.15s ease;animation:pulse 2s ease-in-out infinite;text-decoration:none;color:#FFF;}
.play-btn:hover{transform:scale(1.05);}
.play-btn:active{transform:scale(0.95);}
.play-btn .play-icon{font-size:36px;margin-bottom:2px;}
.play-btn .play-text{font-size:16px;font-weight:900;text-shadow:0 2px 4px rgba(0,0,0,0.3);}
.play-btn .play-sub{font-size:7px;font-weight:600;letter-spacing:2px;opacity:0.7;}
@keyframes pulse{0%,100%{box-shadow:0 6px 30px rgba(237,194,46,0.5),0 0 50px rgba(237,194,46,0.15);}50%{box-shadow:0 6px 40px rgba(237,194,46,0.7),0 0 70px rgba(237,194,46,0.25);}}
.features{display:flex;gap:8px;margin-top:25px;position:relative;z-index:2;flex-wrap:wrap;justify-content:center;max-width:350px;}
.feature{padding:6px 12px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:4px;}
.feature .emoji{font-size:12px;}
.bottom-text{margin-top:20px;font-size:9px;color:rgba(255,255,255,0.25);text-align:center;position:relative;z-index:2;}
@media(max-width:400px){.title{font-size:28px;}.tile{width:50px;height:50px;font-size:15px;}.play-btn{width:100px;height:100px;}.play-btn .play-icon{font-size:28px;}.play-btn .play-text{font-size:14px;}}
</style>
</head>
<body>
<div class="glow1"></div><div class="glow2"></div>
<div class="particles" id="particles"></div>
<div class="title-container"><div class="title"><span class="merge">MERGE</span> <span class="master">MASTER</span></div><div class="subtitle">2048 CHALLENGE</div></div>
<div class="tiles-preview"><div class="tile">2</div><div class="tile">8</div><div class="tile">64</div><div class="tile">2048</div></div>
<div class="stats"><div class="stat"><div class="stat-value">10M+</div><div class="stat-label">Players</div></div><div class="stat"><div class="stat-value">4.8\\u2605</div><div class="stat-label">Rating</div></div><div class="stat"><div class="stat-value">#1</div><div class="stat-label">Puzzle</div></div></div>
<a href="https://merge-master-2048.vercel.app" target="_blank" rel="noopener noreferrer" class="play-btn"><div class="play-icon">\\u25B6</div><div class="play-text">PLAY</div><div class="play-sub">FREE NOW</div></a>
<div class="features"><div class="feature"><span class="emoji">\\uD83C\\uDFAE</span> Classic Mode</div><div class="feature"><span class="emoji">\\u2694\\uFE0F</span> 1v1 Battles</div><div class="feature"><span class="emoji">\\uD83C\\uDFC6</span> Tournaments</div><div class="feature"><span class="emoji">\\uD83C\\uDFB0</span> Spin Wheel</div><div class="feature"><span class="emoji">\\uD83D\\uDCC5</span> Daily Rewards</div><div class="feature"><span class="emoji">\\uD83C\\uDF0D</span> Global Rank</div></div>
<div class="bottom-text">Play in browser \\u2022 No download required \\u2022 Free forever</div>
<script>const p=document.getElementById('particles');for(let i=0;i<20;i++){const d=document.createElement('div');d.className='particle';d.style.left=Math.random()*100+'%';d.style.animationDuration=(4+Math.random()*6)+'s';d.style.animationDelay=Math.random()*5+'s';d.style.width=(2+Math.random()*4)+'px';d.style.height=d.style.width;if(Math.random()>0.5)d.style.background='#FF7A00';p.appendChild(d);}</script>
</body></html>`
              const blob = new Blob([htmlContent], { type: 'text/html' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'merge-master-2048-itch.html'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            className="w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: '#FFFFFF', boxShadow: '0 4px 15px rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.4)' }}
          >
            📥 Download Itch.io HTML
          </button>

        </div>
      </div>

      {/* ====== FOOTER AD - Big banner if 'footer' slot, else small ====== */}
      <div className="flex-shrink-0 relative z-10 w-full">
        {bigBannerSlot === 'footer' ? <AdsterraBanner728x90 /> : <AdsterraBanner320x50 />}
      </div>

      {/* Modals */}
      <SpinWheel isOpen={showSpin} onClose={() => setShowSpin(false)} spinTickets={spinTickets}
        onUseTicket={onUseSpinTicket} onWinPrize={handleSpinPrize} onWatchAdForSpin={() => { onAddSpinTickets(1) }} isOnline={isOnline} />
      <LoginStreak isOpen={showStreak} onClose={() => setShowStreak(false)} streakDay={streakDay}
        streakClaimed={streakClaimed} onClaim={onClaimStreakDay} />
      <WelcomeGift isOpen={showWelcome} onClose={() => setShowWelcome(false)} onClaim={() => { onClaimWelcome(); setShowWelcome(false) }} />
      <Leaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)}
        gamePoints={gamePoints} bestScore={bestScore} coins={coins}
        playerName={playerName} playerAvatar={playerAvatar} playerId={playerId} tournamentPoints={tournamentPoints} />
      <Tournament isOpen={showTournament} onClose={() => setShowTournament(false)}
        coins={coins}
        tournamentJoined={tournamentJoined}
        tournamentPoints={tournamentPoints}
        tournamentCarryOver={tournamentCarryOver}
        tournamentGamesPlayed={tournamentGamesPlayed}
        onJoinTournament={onJoinTournament}
        onStartTournamentGame={onStartTournamentGame}
        playerName={playerName} playerAvatar={playerAvatar} playerId={playerId} />
      <InvitePanel isOpen={showInvite} onClose={() => setShowInvite(false)}
        inviteCode={inviteCode} invitedUsers={invitedUsers}
        commissionBalance={commissionBalance} commissionClaimed={commissionClaimed}
        autoClaimCommission={autoClaimCommission} onClaimCommission={onClaimCommission}
        onClaimFirebaseCommission={onClaimFirebaseCommission}
        onToggleAutoClaim={onToggleAutoClaim}
        firebaseReferrals={firebaseReferrals} firebaseCommissionPending={firebaseCommissionPending} />
      <ProfilePanel isOpen={showProfile} onClose={() => setShowProfile(false)}
        playerName={playerName} playerAvatar={playerAvatar} playerLevel={playerLevel}
        gamePoints={gamePoints} bestScore={bestScore} modBestScore={modBestScore}
        coins={coins} gamesPlayedToday={gamesPlayedToday} maxGamesPerDay={maxGamesPerDay}
        invitedUsers={invitedUsers} onUpdateName={onUpdatePlayerName} onUpdateAvatar={onUpdatePlayerAvatar}
        totalBattlesPlayed={totalBattlesPlayed} totalBattlesWon={totalBattlesWon}
        onResetAllData={onResetAllData} />
      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)}
        notifications={notifications} onMarkRead={onMarkNotificationRead} onMarkAllRead={onMarkAllNotificationsRead} />
      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <AboutPage isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <ContactPage isOpen={showContact} onClose={() => setShowContact(false)} />
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
