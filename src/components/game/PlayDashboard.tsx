'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Swords, Clock, Trophy, Coins, Crown, Bell, Lock, Search, Loader2, Users, X, UserPlus, Heart } from 'lucide-react'
import { SpinWheel, SpinPrize } from './SpinWheel'
import { LoginStreak } from './LoginStreak'
import { WelcomeGift } from './WelcomeGift'
import { Leaderboard } from './Leaderboard'
import { Tournament } from './Tournament'
import { InvitePanel } from './InvitePanel'
import { ProfilePanel, NotificationsPanel } from './ProfilePanel'
import { PrivacyPolicy, AboutPage, ContactPage } from './FooterPages'
import { Store } from './Store'
import { CouponCode } from './CouponCode'
import { RoomFight } from './RoomFight'
import {
  AdsterraNativeBanner,
  AdsterraBanner728x90,
  AdsterraBanner300x250,
  AdsterraBanner320x50,
  getDashboardBigBannerSlot,
} from '@/components/ads/AdsterraAds'
import { PowerUp, Notification, DailyTask, DailyTaskReward, GameHistoryEntry, getLevelInfo } from '@/hooks/useGame'
import { sendFriendRequest, getFriendRequests, onFriendRequestsUpdate, acceptFriendRequest, declineFriendRequest, getFriends, onFriendsUpdate, searchPlayerByUserCode, removeFriend, onLikeCountUpdate, type FriendData, type FriendRequestData } from '@/lib/firebase-service'


interface PlayDashboardProps {
  coins: number
  spinTickets: number
  streakDay: number
  streakClaimed: boolean[]
  welcomeClaimed: boolean
  hammerCount: number
  magnetCount: number
  blastCount: number
  multiplier5xCount: number
  multiplier2_5xCount: number
  extraTimeCount: number
  undoTotal: number
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
  firebaseReferrals: { id: string; name: string; avatar: string; joinedAt: number; commissionEarned: number }[]
  firebaseCommissionPending: number
  totalBattlesPlayed: number
  totalBattlesWon: number
  tournamentJoined: boolean
  tournamentPoints: number
  tournamentCarryOver: number
  tournamentGamesPlayed: number
  levelXP: number
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
  onDeductCoins: (amount: number) => void
  onAddPowerUp: (pu: PowerUp, count: number) => void
  onAddUndos: (count: number) => void
  onClaimCommission: () => void
  onClaimFirebaseCommission: () => void
  onToggleAutoClaim: () => void
  onAddNotification: (title: string, message: string, type: Notification['type'], emoji: string) => void
  onMarkNotificationRead: (id: string) => void
  onMarkAllNotificationsRead: () => void
  onDeleteNotification?: (id: string) => void
  onDeleteReadNotifications?: () => void
  onUpdatePlayerName: (name: string) => void
  onUpdatePlayerAvatar: (avatar: string) => void
  dailyTasks?: DailyTask[]
  onClaimDailyTask?: (id: string) => void
  onCompleteVisitWebsiteTask?: () => void
  onResetAllData?: () => void
  weeklyBonusClaimed?: boolean
  onClaimWeeklyBonus?: () => void
  userCode: string
  totalCoinsEarned: number
  winningCoins: number
  roomCardCount: number
  gameHistory: GameHistoryEntry[]
  streakWeek: number
  onAddRoomCards: (count: number) => void
  onDeleteGameHistory?: (id: string) => void
  onClearGameHistory?: () => void
  likeCount?: number
  onLikeProfile?: (targetPlayerId: string) => void
  likedProfileId?: string | null
  classicBestScore?: number
  tournamentBestScore?: number
  battleBestScore?: number
  skillPoints?: number
  saveGame?: () => void
  saveAll?: () => void
  setAutoSaveEnabled?: (enabled: boolean) => void
}

const COIN_GAME_MODES = [
  { fee: 50, win: 100, color: '#00E676', label: '₹50' },
  { fee: 200, win: 400, color: '#00FFFF', label: '₹200' },
  { fee: 500, win: 1000, color: '#EDC22E', label: '₹500' },
  { fee: 1000, win: 2000, color: '#FF7A00', label: '₹1K' },
  { fee: 3000, win: 6000, color: '#F65E3B', label: '₹3K' },
  { fee: 5000, win: 10000, color: '#FF4081', label: '₹5K' },
  { fee: 7000, win: 14000, color: '#E040FB', label: '₹7K' },
  { fee: 15000, win: 30000, color: '#7C4DFF', label: '₹15K' },
  { fee: 20000, win: 40000, color: '#FFD700', label: '₹20K' },
  { fee: 50000, win: 100000, color: '#FF1744', label: '₹50K' },
]

/** Format large numbers: 1000 → 1K, 1000000 → 1M */
function formatCoinCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export function PlayDashboard({
  coins, spinTickets, streakDay, streakClaimed, welcomeClaimed,
  hammerCount, magnetCount, blastCount, multiplier5xCount, multiplier2_5xCount, extraTimeCount, undoTotal,
  modBestScore, gamePoints, bestScore,
  inviteCode, invitedUsers, commissionBalance, commissionClaimed, autoClaimCommission,
  gamesPlayedToday, maxGamesPerDay, notifications,
  playerName, playerAvatar, playerLevel, playerId, firebaseReferrals, firebaseCommissionPending,
  totalBattlesPlayed, totalBattlesWon,
  tournamentJoined, tournamentPoints, tournamentCarryOver, tournamentGamesPlayed,
  levelXP,
  onPlayClassic, onStartBotBattle, onStartCoinGame,
  onJoinTournament, onStartTournamentGame,
  onUseSpinTicket, onAddSpinTickets, onClaimWelcome, onClaimStreakDay,
  onAddCoins, onDeductCoins, onAddPowerUp, onAddUndos, onClaimCommission, onClaimFirebaseCommission, onToggleAutoClaim,
  onAddNotification, onMarkNotificationRead, onMarkAllNotificationsRead,
  onDeleteNotification, onDeleteReadNotifications,
  onUpdatePlayerName, onUpdatePlayerAvatar,
  dailyTasks, onClaimDailyTask, onCompleteVisitWebsiteTask, onResetAllData,
  weeklyBonusClaimed = false, onClaimWeeklyBonus,
  userCode, totalCoinsEarned, winningCoins, roomCardCount, gameHistory,
  streakWeek = 1, onAddRoomCards,
  onDeleteGameHistory, onClearGameHistory,
  likeCount = 0, onLikeProfile,
  likedProfileId = null, classicBestScore = 0, tournamentBestScore = 0, battleBestScore = 0,
  skillPoints = 0, saveGame, saveAll, setAutoSaveEnabled,
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
  const [showStore, setShowStore] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [showRoomFight, setShowRoomFight] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : false)
  // Friends state
  const [friendsList, setFriendsList] = useState<Array<{ friendId: string } & FriendData>>([])
  const [friendRequests, setFriendRequests] = useState<Array<{ fromPlayerId: string } & FriendRequestData>>([])
  const [friendSearchUid, setFriendSearchUid] = useState('')
  const [friendSearchResult, setFriendSearchResult] = useState<{ id: string; name: string; avatar: string; level: number; userCode: string } | null>(null)
  const [friendSearchLoading, setFriendSearchLoading] = useState(false)
  const [friendRequestSending, setFriendRequestSending] = useState(false)
  // Friend mode selection modal - stores the friend ID when selecting a mode
  const [friendModeSelect, setFriendModeSelect] = useState<{ friendId: string; friendName: string; friendAvatar: string } | null>(null)
  // Friend request popup on dashboard
  const [showFriendRequestPopup, setShowFriendRequestPopup] = useState(false)
  // Local like count from Firebase
  const [localLikeCount, setLocalLikeCount] = useState(likeCount)
  // Searching animation for Battle/Coin/Classic modes
  const [searching, setSearching] = useState<{ active: boolean; type: 'battle' | 'coins' | 'classic'; timeLimit?: number; coinFee?: number; opponent?: { name: string; avatar: string } } | null>(null)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Decide which big banner to show (only 1 per session) - lazy init
  const [bigBannerSlot] = useState<string>(() => getDashboardBigBannerSlot())

  const unreadNotifications = notifications.filter(n => !n.read).length
  const gamesLeft = maxGamesPerDay - gamesPlayedToday
  const isGameLimitReached = gamesLeft <= 0

  // Friends real-time listeners
  useEffect(() => {
    if (!playerId) return
    const unsubFriends = onFriendsUpdate(playerId, (friends) => setFriendsList(friends))
    const unsubRequests = onFriendRequestsUpdate(playerId, (requests) => setFriendRequests(requests))
    return () => { unsubFriends(); unsubRequests() }
  }, [playerId])

  // Show friend request popup when new requests arrive
  useEffect(() => {
    if (friendRequests.length > 0 && !showFriends && !showFriendRequestPopup) {
      const timer = setTimeout(() => setShowFriendRequestPopup(true), 500)
      return () => clearTimeout(timer)
    }
  }, [friendRequests.length, showFriends])

  // Real-time like count listener
  useEffect(() => {
    if (!playerId) return
    const unsub = onLikeCountUpdate(playerId, (count) => setLocalLikeCount(count))
    return unsub
  }, [playerId])

  // Search friend by UID
  const handleFriendSearch = useCallback(async () => {
    if (!friendSearchUid.trim()) return
    setFriendSearchLoading(true)
    setFriendSearchResult(null)
    try {
      const player = await searchPlayerByUserCode(friendSearchUid.trim())
      if (player && player.id !== playerId) {
        setFriendSearchResult({ id: player.id, name: player.name || 'Player', avatar: player.avatar || '😎', level: player.level || 1, userCode: player.userCode || '' })
      }
    } catch { /* ignore */ }
    setFriendSearchLoading(false)
  }, [friendSearchUid, playerId])

  // Send friend request
  const handleSendFriendReq = useCallback(async (targetPlayerId: string) => {
    setFriendRequestSending(true)
    try {
      const result = await sendFriendRequest(playerId, playerName, playerAvatar, playerLevel, userCode, targetPlayerId)
      if (result.success) {
        onAddNotification('Friend Request Sent! 🎉', `Request sent successfully!`, 'invite', '👤')
      } else {
        onAddNotification('Friend Request', result.reason || 'Could not send request', 'system', '⚠️')
      }
    } catch { /* ignore */ }
    setFriendRequestSending(false)
  }, [playerId, playerName, playerAvatar, playerLevel, userCode, onAddNotification])

  // Accept/decline friend request
  const handleAcceptRequest = useCallback(async (fromPlayerId: string) => {
    await acceptFriendRequest(playerId, fromPlayerId)
    onAddNotification('New Friend! 🤝', 'Friend request accepted!', 'invite', '🤝')
  }, [playerId, onAddNotification])

  const handleDeclineRequest = useCallback(async (fromPlayerId: string) => {
    await declineFriendRequest(playerId, fromPlayerId)
  }, [playerId])

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
      case 'multiply5': onAddPowerUp('multiplier5x', prize.count); break
      case 'multiply2_5': onAddPowerUp('multiplier2_5x', prize.count); break
      case 'timeExtend': onAddPowerUp('extraTime', prize.count); break
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
    // Show searching animation, then call onStartCoinGame (which handles matchmaking internally)
    if (isOnline) {
      setSearching({ active: true, type: 'coins', coinFee: fee })
    } else {
      onStartCoinGame(fee)
    }
  }, [isGameLimitReached, coins, onStartCoinGame, onAddNotification, maxGamesPerDay, isOnline])

  // Searching animation effect - start the game (which includes matchmaking)
  // The game start functions are async and handle Firebase matchmaking + fallback to bot
  useEffect(() => {
    if (!searching?.active) return
    // Call the game start function immediately - it will search for a real player
    // and fall back to a bot if no match found within 5 seconds
    // The searching overlay shows while this async operation runs
    if (searching.type === 'battle' && searching.timeLimit) {
      onStartBotBattle(searching.timeLimit)
      // Dismiss searching overlay after a short delay to allow matchmaking
      const timer = setTimeout(() => setSearching(null), 6000)
      searchTimerRef.current = timer
    } else if (searching.type === 'coins' && searching.coinFee) {
      onStartCoinGame(searching.coinFee)
      const timer = setTimeout(() => setSearching(null), 6000)
      searchTimerRef.current = timer
    } else if (searching.type === 'classic') {
      onPlayClassic()
      const timer = setTimeout(() => setSearching(null), 6000)
      searchTimerRef.current = timer
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searching?.active])

  const handleBattleMode = useCallback((seconds: number) => {
    if (!isOnline || isGameLimitReached) return
    setSearching({ active: true, type: 'battle', timeLimit: seconds })
  }, [isOnline, isGameLimitReached])

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--game-bg-1) 0%, var(--game-bg-2) 50%, var(--game-bg-3) 100%)' }}>
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #EDC22E, transparent)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF7A00, transparent)', filter: 'blur(70px)' }} />

      {/* ====== HEADER AD - Only big banner if 'top' slot chosen ====== */}
      <div className="flex-shrink-0 relative z-10 w-full">
        {bigBannerSlot === 'top' ? <AdsterraBanner728x90 /> : <AdsterraBanner320x50 />}
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center max-w-sm w-full mx-auto px-3 pt-2 pb-2 gap-2">

          {/* Top bar: Profile + Title + Bell */}
          <div className="w-full flex items-center justify-between">
            <button onClick={() => setShowProfile(true)}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg transition-transform active:scale-95 relative"
              style={{ backgroundColor: 'var(--game-glass)', border: '1px solid var(--game-glass-border)' }}>
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
              {/* Like count badge */}
              {localLikeCount > 0 && (
                <div className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1 py-0 rounded-full"
                  style={{ backgroundColor: 'rgba(246,94,59,0.9)', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <Heart className="w-2 h-2" fill="white" style={{ color: '#FFFFFF' }} />
                  <span className="text-[6px] font-bold" style={{ color: '#FFFFFF' }}>{localLikeCount > 99 ? '99+' : localLikeCount}</span>
                </div>
              )}
            </button>

            <div className="text-center">
              <h1 className="text-base font-extrabold tracking-tight leading-none">
                <span style={{ color: '#FFD700', textShadow: '0 0 15px rgba(255,215,0,0.4)' }}>MERGE</span>{' '}
                <span style={{ color: 'var(--game-text)' }}>MASTER</span>
              </h1>
              <span className="text-[6px] font-bold tracking-widest" style={{ color: '#EDC22E' }}>2048 CHALLENGE</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Friend Requests Indicator */}
              <button onClick={() => setShowFriends(true)}
                className="relative w-7 h-7 rounded-lg flex items-center justify-center transition-transform active:scale-95"
                style={{ backgroundColor: 'var(--game-glass)', border: '1px solid var(--game-glass-border)' }}>
                <Users className="w-3.5 h-3.5" style={{ color: friendRequests.length > 0 ? '#00E676' : 'rgba(255,255,255,0.4)' }} />
                {friendRequests.length > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold"
                    style={{ backgroundColor: '#00E676', color: '#FFFFFF' }}>
                    {friendRequests.length > 9 ? '9+' : friendRequests.length}
                  </div>
                )}
              </button>
              <button onClick={() => setShowNotifications(true)}
                className="relative w-7 h-7 rounded-lg flex items-center justify-center transition-transform active:scale-95"
                style={{ backgroundColor: 'var(--game-glass)', border: '1px solid var(--game-glass-border)' }}>
                <Bell className="w-3.5 h-3.5" style={{ color: unreadNotifications > 0 ? '#EDC22E' : 'rgba(255,255,255,0.4)' }} />
                {unreadNotifications > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold"
                    style={{ backgroundColor: '#F65E3B', color: '#FFFFFF' }}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </div>
                )}
              </button>
              <button
                onClick={() => setShowStore(true)}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg cursor-pointer transition-transform active:scale-95"
                style={{
                  backgroundColor: coins === 0 ? 'rgba(246,94,59,0.15)' : 'rgba(237,194,46,0.12)',
                  border: coins === 0 ? '1px solid rgba(246,94,59,0.35)' : '1px solid rgba(237,194,46,0.25)',
                  animation: coins === 0 ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
                }}
                title={coins === 0 ? 'Add coins!' : 'Open Store'}
              >
                <Coins className="w-3 h-3" style={{ color: coins === 0 ? '#F65E3B' : '#EDC22E' }} />
                <span className={`text-[10px] font-extrabold ${coins === 0 ? 'animate-pulse' : ''}`} style={{ color: coins === 0 ? '#F65E3B' : '#EDC22E' }}>
                  {formatCoinCount(coins)}
                </span>
              </button>
            </div>
          </div>

          {/* Inventory / Abilities Bar - 3-column grid */}
          <div className="w-full px-1.5 py-1.5 rounded-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.2)' }}>
            <div className="grid grid-cols-3 gap-1.5">
              {/* Left Column: Tools - 2x2 grid */}
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-2 gap-1">
                  <AbilityBtn emoji="🧲" count={magnetCount} color="#00E676" />
                  <AbilityBtn emoji="💣" count={blastCount} color="#FF7A00" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <AbilityBtn emoji="🔨" count={hammerCount} color="#F59563" />
                  <AbilityBtn emoji="↩️" count={undoTotal} color="#00BCD4" />
                </div>
              </div>

              {/* Center Column: Capsule/Pill Code Button */}
              <div className="flex flex-col items-center justify-center">
                <button onClick={() => setShowCoupon(true)}
                  className="flex items-center justify-center gap-1 px-3 py-3 rounded-full transition-transform active:scale-95"
                  style={{
                    width: '100%',
                    minWidth: '80px',
                    backgroundColor: 'rgba(237,194,46,0.15)',
                    border: '2px solid rgba(237,194,46,0.5)',
                    boxShadow: '0 0 14px rgba(237,194,46,0.25)',
                    borderRadius: '9999px',
                    transition: 'transform 0.15s, box-shadow 0.2s, background-color 0.2s',
                  }}>
                  <span className="text-[12px]">🎟️</span>
                  <span className="text-[10px] font-extrabold" style={{ color: '#EDC22E' }}>Code</span>
                </button>
              </div>

              {/* Right Column: Multipliers + Spin/Timer - 2x2 grid (mirrors left) */}
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-2 gap-1">
                  <AbilityBtn emoji="⚡" count={multiplier5xCount} color="#F65E3B" label="5x" />
                  <AbilityBtn emoji="🔥" count={multiplier2_5xCount} color="#FF7A00" label="2.5x" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <AbilityBtn emoji="🎫" count={spinTickets} color="#00E676" />
                  <AbilityBtn emoji="⏱️" count={extraTimeCount} color="#00FFFF" />
                </div>
              </div>
            </div>
          </div>

          {/* Banner Ad - Between abilities and Play */}
          <div className="w-full">
            <AdsterraBanner320x50 />
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
              <button onClick={() => { setShowBattleModes(!showBattleModes); if (!showBattleModes) setShowCoinGames(false) }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(246,94,59,0.12)', border: '1px solid rgba(246,94,59,0.25)' }}>
                <Swords className="w-3 h-3" style={{ color: '#F65E3B' }} />
                <span className="text-[9px] font-bold" style={{ color: '#F65E3B' }}>Battle</span>
              </button>
              <button onClick={() => { setShowCoinGames(!showCoinGames); if (!showCoinGames) setShowBattleModes(false) }}
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
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="w-full overflow-hidden">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { time: '1m', seconds: 60, icon: <Clock className="w-2.5 h-2.5" /> },
                      { time: '2m', seconds: 120, icon: <Clock className="w-2.5 h-2.5" /> },
                      { time: '4m', seconds: 240, icon: <Clock className="w-2.5 h-2.5" /> },
                      { time: '10m', seconds: 600, icon: <Trophy className="w-2.5 h-2.5" /> },
                    ].map((mode, i) => (
                      <button key={i} onClick={() => handleBattleMode(mode.seconds)}
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
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="w-full overflow-hidden">
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
                          <span className="text-[7px] font-extrabold" style={{ color: mode.color }}>{mode.label}</span>
                          <span className="text-[5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>→{mode.win >= 1000 ? `${(mode.win/1000).toFixed(mode.win%1000===0?0:1)}K` : mode.win}</span>
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

          {/* Quick Actions Row 1: Daily/Streak + Spin + Store */}
          <div className="w-full grid grid-cols-3 gap-1.5">
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
            <button onClick={() => setShowStore(true)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-lg transition-transform active:scale-95"
              style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1px solid rgba(237,194,46,0.2)' }}>
              <span className="text-base">🏪</span>
              <p className="text-[7px] font-bold" style={{ color: '#EDC22E' }}>Store</p>
              <p className="text-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Add</p>
            </button>
          </div>

          {/* Quick Actions Row 2: Rank + Invite + Room Fight */}
          <div className="w-full grid grid-cols-3 gap-1.5">
            <button onClick={() => setShowLeaderboard(true)}
              className="flex items-center justify-center gap-1.5 py-3 rounded-lg transition-transform active:scale-95"
              style={{ backgroundColor: 'rgba(246,94,59,0.06)', border: '1px solid rgba(246,94,59,0.12)' }}>
              <span className="text-lg">🏆</span>
              <div className="text-left">
                <p className="text-[9px] font-bold" style={{ color: '#F65E3B' }}>Rank</p>
                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Leaderboard</p>
              </div>
            </button>
            <button onClick={() => setShowInvite(true)}
              className="flex items-center justify-center gap-1.5 py-3 rounded-lg transition-transform active:scale-95"
              style={{ backgroundColor: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.1)' }}>
              <span className="text-lg">🤝</span>
              <div className="text-left">
                <p className="text-[9px] font-bold" style={{ color: '#00E676' }}>Invite</p>
                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>20% Win / 2% Loss</p>
              </div>
            </button>
            <button onClick={() => setShowRoomFight(true)}
              className="flex items-center justify-center gap-1.5 py-3 rounded-lg transition-transform active:scale-95"
              style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.18)' }}>
              <span className="text-lg">⚔️</span>
              <div className="text-left">
                <p className="text-[9px] font-bold" style={{ color: '#F65E3B' }}>Room</p>
                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Room Fight</p>
              </div>
            </button>
          </div>

          {/* Big Banner Ad - Only shown if 'middle' slot chosen */}
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
                  const isVisitTask = task.actionType === 'visit'
                  const isClaimTask = task.actionType === 'claim'
                  const isSpinTask = task.actionType === 'spin'
                  const rewardDisplay = task.reward.emoji + ' ' + task.reward.label
                  return (
                    <div key={task.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                      style={{ backgroundColor: isComplete ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isComplete ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.04)'}` }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">{task.emoji}</span>
                        <div>
                          <p className="text-[8px] font-semibold" style={{ color: isComplete ? '#00E676' : 'rgba(255,255,255,0.7)' }}>{task.description}</p>
                          <p className="text-[6px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{task.progress}/{task.target} • {rewardDisplay}</p>
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
                          onCompleteVisitWebsiteTask?.()
                        }}
                          className="px-2 py-0.5 rounded text-[7px] font-bold transition-transform active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #F65E3B, #FF7A00)', color: '#FFFFFF' }}>
                          VISIT
                        </button>
                      ) : isClaimTask ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => {
                            // Mark as complete immediately for claim tasks
                            onClaimDailyTask?.(task.id)
                          }}
                            className="px-2 py-0.5 rounded text-[7px] font-bold transition-transform active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF' }}>
                            CLAIM 💰
                          </button>
                          <button onClick={() => {
                            // Give +100 bonus coins without redirect
                            onAddCoins(100)
                            onAddNotification('Bonus Coins!', 'You got +100 bonus coins! 🎉', 'reward', '💰')
                          }}
                            className="px-1.5 py-0.5 rounded text-[6px] font-bold transition-transform active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)' }}>
                          +100 📺
                          </button>
                        </div>
                      ) : isSpinTask ? (
                        <button onClick={() => setShowSpin(true)}
                          className="px-2 py-0.5 rounded text-[7px] font-bold transition-transform active:scale-95"
                          style={{ background: 'rgba(0,230,118,0.15)', color: '#00E676', border: '1px solid rgba(0,230,118,0.3)' }}>
                          SPIN
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

          {/* Best Score + Commission row */}
          <div className="w-full flex gap-1.5">
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
            <button onClick={() => setShowPrivacy(true)} className="text-[7px] font-medium" style={{ color: 'var(--game-text-secondary)' }}>Privacy</button>
            <span style={{ color: 'var(--game-text-secondary)' }}>·</span>
            <button onClick={() => setShowAbout(true)} className="text-[7px] font-medium" style={{ color: 'var(--game-text-secondary)' }}>About</button>
            <span style={{ color: 'var(--game-text-secondary)' }}>·</span>
            <button onClick={() => setShowContact(true)} className="text-[7px] font-medium" style={{ color: 'var(--game-text-secondary)' }}>Contact</button>
          </div>

        </div>
      </div>

      {/* ====== FOOTER AD - Only big banner if 'footer' slot chosen ====== */}
      <div className="flex-shrink-0 relative z-10 w-full">
        {bigBannerSlot === 'footer' ? <AdsterraBanner728x90 /> : <AdsterraBanner320x50 />}
      </div>

      {/* Searching Opponent Overlay */}
      <AnimatePresence>
        {searching?.active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          >
            <div className="flex flex-col items-center gap-4">
              {/* Your profile */}
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${getLevelInfo(playerLevel).color}, ${getLevelInfo(playerLevel).color}88)`, border: '2px solid rgba(255,255,255,0.3)' }}>
                    <span className="text-3xl">{playerAvatar}</span>
                  </div>
                  <p className="text-[10px] font-bold mt-1" style={{ color: '#FFFFFF' }}>{playerName}</p>
                  <p className="text-[8px]" style={{ color: getLevelInfo(playerLevel).color }}>Lv.{playerLevel}</p>
                </div>

                {/* VS / Searching indicator */}
                <div className="flex flex-col items-center">
                  {searching.opponent ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                      <span className="text-2xl font-black" style={{ color: '#F65E3B' }}>VS</span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                        <Search className="w-8 h-8" style={{ color: '#EDC22E' }} />
                      </motion.div>
                      <p className="text-[9px] font-bold mt-1" style={{ color: '#EDC22E' }}>Searching...</p>
                    </div>
                  )}
                </div>

                {/* Opponent profile */}
                {searching.opponent ? (
                  <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #F65E3B, #FF7A00)', border: '2px solid rgba(255,255,255,0.3)' }}>
                      <span className="text-3xl">{searching.opponent.avatar}</span>
                    </div>
                    <p className="text-[10px] font-bold mt-1" style={{ color: '#FFFFFF' }}>{searching.opponent.name}</p>
                    <p className="text-[8px]" style={{ color: '#F65E3B' }}>Opponent</p>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '2px dashed rgba(255,255,255,0.2)' }}>
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <span className="text-2xl">❓</span>
                      </motion.div>
                    </div>
                    <p className="text-[10px] font-bold mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>???</p>
                  </div>
                )}
              </div>

              {/* Mode info */}
              <div className="text-center">
                <p className="text-xs font-bold" style={{ color: searching.type === 'battle' ? '#F65E3B' : searching.type === 'classic' ? '#00E676' : '#EDC22E' }}>
                  {searching.type === 'battle' ? `⚔️ Battle Mode` : searching.type === 'classic' ? `🎮 Classic Mode` : `🪙 Coin Game`}
                </p>
                {searching.type === 'battle' && searching.timeLimit && (
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{searching.timeLimit}s Time Limit</p>
                )}
                {searching.type === 'classic' && (
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Finding opponent...</p>
                )}
                {searching.type === 'coins' && searching.coinFee && (
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Entry: {searching.coinFee} coins</p>
                )}
              </div>

              {/* Cancel button */}
              <button onClick={() => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); setSearching(null) }}
                className="px-6 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends Panel Modal */}
      <AnimatePresence>
        {showFriends && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center px-4"
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
                  <Users className="w-4 h-4" style={{ color: '#00E676' }} />
                  <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>Friends</h3>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,230,118,0.15)', color: '#00E676' }}>
                    {friendsList.length}
                  </span>
                </div>
                <button onClick={() => { setShowFriends(false); setFriendModeSelect(null) }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              <div className="px-4 pb-4">
                {/* Search by UID */}
                <div className="mb-3">
                  <p className="text-[9px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>🔍 Search by UID to Add Friend</p>
                  <div className="flex gap-1.5">
                    <input
                      value={friendSearchUid}
                      onChange={(e) => setFriendSearchUid(e.target.value)}
                      placeholder="Enter UID..."
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-mono"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', outline: 'none' }}
                      onKeyDown={(e) => e.key === 'Enter' && handleFriendSearch()}
                    />
                    <button onClick={handleFriendSearch}
                      className="px-3 py-2 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF' }}>
                      {friendSearchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {/* Search Result */}
                  {friendSearchResult && (
                    <div className="mt-2 p-2.5 rounded-lg flex items-center justify-between"
                      style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.15)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                          <span className="text-sm">{friendSearchResult.avatar}</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{friendSearchResult.name}</p>
                          <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Lv.{friendSearchResult.level} • UID: {friendSearchResult.userCode}</p>
                        </div>
                      </div>
                      <button onClick={() => handleSendFriendReq(friendSearchResult.id)} disabled={friendRequestSending}
                        className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[8px] font-bold transition-transform active:scale-95"
                        style={{ backgroundColor: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', color: '#00E676' }}>
                        <UserPlus className="w-2.5 h-2.5" />
                        Add
                      </button>
                    </div>
                  )}
                  {friendSearchUid && !friendSearchLoading && !friendSearchResult && (
                    <p className="text-[8px] mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>No player found with this UID</p>
                  )}
                </div>

                {/* Friend Requests */}
                {friendRequests.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] font-bold mb-1.5" style={{ color: '#EDC22E' }}>📨 Friend Requests ({friendRequests.length})</p>
                    <div className="space-y-1.5">
                      {friendRequests.map((req) => (
                        <div key={req.fromPlayerId}
                          className="p-2.5 rounded-lg flex items-center justify-between"
                          style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.15)' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                              <span className="text-sm">{req.avatar}</span>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{req.name}</p>
                              <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Lv.{req.level}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleAcceptRequest(req.fromPlayerId)}
                              className="px-2 py-1 rounded-lg text-[8px] font-bold transition-transform active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF' }}>
                              ✓ Accept
                            </button>
                            <button onClick={() => handleDeclineRequest(req.fromPlayerId)}
                              className="px-2 py-1 rounded-lg text-[8px] font-bold transition-transform active:scale-95"
                              style={{ backgroundColor: 'rgba(246,94,59,0.15)', border: '1px solid rgba(246,94,59,0.3)', color: '#F65E3B' }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends List */}
                <div>
                  <p className="text-[9px] font-bold mb-1.5" style={{ color: '#00E676' }}>👥 Friends ({friendsList.length})</p>
                  {friendsList.length === 0 ? (
                    <div className="text-center py-6">
                      <span className="text-2xl">👥</span>
                      <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>No friends yet</p>
                      <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Search by UID to add friends!</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                      {friendsList.map((friend) => (
                        <div key={friend.friendId}
                          className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                <span className="text-sm">{friend.avatar}</span>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{friend.name}</p>
                                <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Lv.{friend.level}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Play button - opens mode selection modal */}
                              <div className="relative">
                                <button onClick={() => setFriendModeSelect({ friendId: friend.friendId, friendName: friend.name, friendAvatar: friend.avatar })}
                                  className="px-2.5 py-1 rounded-lg text-[8px] font-bold transition-transform active:scale-95 flex items-center gap-0.5"
                                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                                  ▶ Play
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <SpinWheel isOpen={showSpin} onClose={() => setShowSpin(false)} spinTickets={spinTickets}
        onUseTicket={onUseSpinTicket} onWinPrize={handleSpinPrize} onWatchAdForSpin={() => { onAddSpinTickets(1) }} isOnline={isOnline} coins={coins} onDeductCoins={onDeductCoins} onAddSpinTickets={onAddSpinTickets}
        playerId={playerId} playerName={playerName} userCode={userCode} onAddNotification={(title, message, type, emoji) => onAddNotification(title, message, type as Notification['type'], emoji)} />
      <LoginStreak isOpen={showStreak} onClose={() => setShowStreak(false)} streakDay={streakDay}
        streakClaimed={streakClaimed} onClaim={onClaimStreakDay} streakWeek={streakWeek} />
      <WelcomeGift isOpen={showWelcome} onClose={() => setShowWelcome(false)} onClaim={() => { onClaimWelcome(); setShowWelcome(false) }} />
      <Leaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)}
        gamePoints={gamePoints} bestScore={bestScore} coins={coins} totalCoinsEarned={totalCoinsEarned} winningCoins={winningCoins}
        playerName={playerName} playerAvatar={playerAvatar} playerId={playerId} tournamentPoints={tournamentPoints}
        classicBestScore={classicBestScore} tournamentBestScore={tournamentBestScore} battleBestScore={battleBestScore}
        onLikeProfile={onLikeProfile} likedProfileId={likedProfileId}
      />
      <Tournament isOpen={showTournament} onClose={() => setShowTournament(false)}
        coins={coins}
        tournamentJoined={tournamentJoined}
        tournamentPoints={tournamentPoints}
        tournamentCarryOver={tournamentCarryOver}
        tournamentGamesPlayed={tournamentGamesPlayed}
        onJoinTournament={onJoinTournament}
        onStartTournamentGame={onStartTournamentGame}
        playerName={playerName} playerAvatar={playerAvatar} playerId={playerId}
        weeklyBonusClaimed={weeklyBonusClaimed}
        onClaimWeeklyBonus={onClaimWeeklyBonus} />
      <InvitePanel isOpen={showInvite} onClose={() => setShowInvite(false)} userCode={userCode}
        inviteCode={inviteCode} invitedUsers={invitedUsers}
        commissionBalance={commissionBalance} commissionClaimed={commissionClaimed}
        autoClaimCommission={autoClaimCommission} onClaimCommission={onClaimCommission}
        onClaimFirebaseCommission={onClaimFirebaseCommission}
        onToggleAutoClaim={onToggleAutoClaim}
        firebaseReferrals={firebaseReferrals} firebaseCommissionPending={firebaseCommissionPending}
        playerId={playerId} playerName={playerName} playerAvatar={playerAvatar} playerLevel={playerLevel}
        onAddNotification={onAddNotification as (title: string, message: string, type: string, emoji: string) => void} />
      <ProfilePanel isOpen={showProfile} onClose={() => setShowProfile(false)}
        playerName={playerName} playerAvatar={playerAvatar} playerLevel={playerLevel}
        gamePoints={gamePoints} levelXP={levelXP} bestScore={bestScore} modBestScore={modBestScore}
        coins={coins} gamesPlayedToday={gamesPlayedToday} maxGamesPerDay={maxGamesPerDay}
        invitedUsers={invitedUsers} onUpdateName={onUpdatePlayerName} onUpdateAvatar={onUpdatePlayerAvatar}
        totalBattlesPlayed={totalBattlesPlayed} totalBattlesWon={totalBattlesWon}
        onResetAllData={onResetAllData}
        userCode={userCode} totalCoinsEarned={totalCoinsEarned} roomCardCount={roomCardCount}
        battleBestScore={battleBestScore}
        classicBestScore={classicBestScore}
        tournamentBestScore={tournamentBestScore}
        gameHistory={gameHistory}
        onOpenRoomFight={() => { setShowProfile(false); setShowRoomFight(true) }}
        onAddNotification={(title, message, type, emoji) => onAddNotification(title, message, type as Notification['type'], emoji)}
        onDeleteGameHistory={onDeleteGameHistory}
        onClearGameHistory={onClearGameHistory}
        playerId={playerId} viewerPlayerId={playerId}
        likeCount={localLikeCount}
        isLiked={likedProfileId === playerId}
        onToggleLike={() => onLikeProfile?.(playerId)}
        skillPoints={skillPoints}
      />
      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)}
        notifications={notifications} onMarkRead={onMarkNotificationRead} onMarkAllRead={onMarkAllNotificationsRead}
        onDeleteNotification={onDeleteNotification} onDeleteReadNotifications={onDeleteReadNotifications} />
      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <AboutPage isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <ContactPage isOpen={showContact} onClose={() => setShowContact(false)} />
      <Store isOpen={showStore} onClose={() => setShowStore(false)} playerId={playerId} playerName={playerName} userCode={userCode} coins={coins} onAddNotification={(title, message, type, emoji) => onAddNotification(title, message, type as Notification['type'], emoji)} onDeductCoins={onDeductCoins} onAddPowerUp={onAddPowerUp} onAddUndos={onAddUndos} onAddRoomCards={onAddRoomCards} onAddSpinTickets={onAddSpinTickets} />
      <CouponCode isOpen={showCoupon} onClose={() => setShowCoupon(false)} coins={coins} hammerCount={hammerCount} magnetCount={magnetCount} blastCount={blastCount} spinTickets={spinTickets} onAddCoins={onAddCoins} onAddPowerUp={onAddPowerUp} onAddSpinTickets={onAddSpinTickets} onAddNotification={(title, message, type, emoji) => onAddNotification(title, message, type as Notification['type'], emoji)} saveGame={saveGame} saveAll={saveAll} setAutoSaveEnabled={setAutoSaveEnabled} />

      <RoomFight
        isOpen={showRoomFight}
        onClose={() => setShowRoomFight(false)}
        roomCardCount={roomCardCount}
        userCode={userCode}
        coins={coins}
        hammerCount={hammerCount}
        magnetCount={magnetCount}
        blastCount={blastCount}
        onUseRoomCard={() => onAddNotification('Room Card Used', 'Room card consumed!', 'system', '🃏')}
        onAddNotification={(title, message, type, emoji) => onAddNotification(title, message, type as Notification['type'], emoji)}
        onDeductCoins={onDeductCoins}
        onDeductAbility={(type, count) => onAddPowerUp(type === 'hammer' ? 'hammer' : type === 'magnet' ? 'magnet' : 'blast', -count)}
        onStartRoomGame={(betAmount, abilities) => {
          onAddNotification('Room Game!', `Starting room game (bet: ${betAmount}). Abilities: ${abilities.join(', ')}`, 'system', '🏠')
        }}
        playerId={playerId}
        playerName={playerName}
        playerAvatar={playerAvatar}
        playerLevel={playerLevel}
      />
      <AnimatePresence>
        {friendModeSelect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={() => setFriendModeSelect(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8 }}
              className="w-full max-w-xs rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with friend info */}
              <div className="p-4 pb-2 text-center">
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-2"
                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', border: '2px solid rgba(255,255,255,0.3)' }}>
                  <span className="text-2xl">{friendModeSelect.friendAvatar}</span>
                </div>
                <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Play with {friendModeSelect.friendName}</p>
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Select game mode</p>
              </div>

              {/* Mode buttons */}
              <div className="px-4 pb-4 flex flex-col gap-2">
                {/* Battle Mode */}
                <button onClick={() => {
                  setFriendModeSelect(null)
                  if (isOnline && !isGameLimitReached) {
                    setSearching({ active: true, type: 'battle', timeLimit: 120 })
                  }
                }}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-transform active:scale-95"
                  style={{ background: 'linear-gradient(135deg, rgba(246,94,59,0.15), rgba(246,94,59,0.05))', border: '1.5px solid rgba(246,94,59,0.3)', color: '#F65E3B' }}>
                  <span className="text-lg">⚔️</span>
                  <div className="text-left">
                    <p className="text-xs font-bold" style={{ color: '#F65E3B' }}>Battle Mode</p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>1v1 timed battle • 2 min</p>
                  </div>
                </button>

                {/* Classic Mode */}
                <button onClick={() => {
                  setFriendModeSelect(null)
                  if (!isGameLimitReached) {
                    if (isOnline) {
                      setSearching({ active: true, type: 'classic' })
                    } else {
                      onPlayClassic()
                    }
                  }
                }}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-transform active:scale-95"
                  style={{ background: 'linear-gradient(135deg, rgba(0,230,118,0.12), rgba(0,230,118,0.03))', border: '1.5px solid rgba(0,230,118,0.25)', color: '#00E676' }}>
                  <span className="text-lg">🎮</span>
                  <div className="text-left">
                    <p className="text-xs font-bold" style={{ color: '#00E676' }}>Classic Mode</p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Relaxed play • No timer</p>
                  </div>
                </button>

                {/* Coin Mode */}
                <button onClick={() => {
                  setFriendModeSelect(null)
                  if (isOnline && !isGameLimitReached && coins >= 50) {
                    setSearching({ active: true, type: 'coins', coinFee: 50 })
                  }
                }}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-transform active:scale-95"
                  style={{ background: 'linear-gradient(135deg, rgba(237,194,46,0.12), rgba(237,194,46,0.03))', border: '1.5px solid rgba(237,194,46,0.25)', color: '#EDC22E' }}>
                  <span className="text-lg">🪙</span>
                  <div className="text-left">
                    <p className="text-xs font-bold" style={{ color: '#EDC22E' }}>Coin Mode</p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Win 2x entry • ₹50</p>
                  </div>
                </button>

                {/* Cancel */}
                <button onClick={() => setFriendModeSelect(null)}
                  className="w-full py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend Request Popup on Dashboard */}
      <AnimatePresence>
        {showFriendRequestPopup && friendRequests.length > 0 && !showFriends && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[280] w-[90%] max-w-sm"
          >
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1.5px solid rgba(237,194,46,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(237,194,46,0.1)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" style={{ color: '#EDC22E' }} />
                  <p className="text-xs font-bold" style={{ color: '#EDC22E' }}>Friend Requests</p>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(246,94,59,0.2)', color: '#F65E3B' }}>
                    {friendRequests.length}
                  </span>
                </div>
                <button onClick={() => setShowFriendRequestPopup(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              {/* Request items */}
              <div className="px-4 pb-3 max-h-40 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {friendRequests.slice(0, 3).map((req) => (
                  <div key={req.fromPlayerId}
                    className="flex items-center justify-between py-2"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <span className="text-sm">{req.avatar}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{req.name}</p>
                        <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Lv.{req.level}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleAcceptRequest(req.fromPlayerId)}
                        className="px-2.5 py-1 rounded-lg text-[8px] font-bold transition-transform active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF' }}>
                        ✓ Accept
                      </button>
                      <button onClick={() => handleDeclineRequest(req.fromPlayerId)}
                        className="px-2 py-1 rounded-lg text-[8px] font-bold transition-transform active:scale-95"
                        style={{ backgroundColor: 'rgba(246,94,59,0.15)', border: '1px solid rgba(246,94,59,0.3)', color: '#F65E3B' }}>
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ))}
                {friendRequests.length > 3 && (
                  <button onClick={() => { setShowFriendRequestPopup(false); setShowFriends(true) }}
                    className="w-full py-1.5 text-[8px] font-bold text-center"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                    +{friendRequests.length - 3} more requests →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AbilityBtn({ emoji, count, color, label }: { emoji: string; count: number; color: string; label?: string }) {
  const isActive = count > 0
  return (
    <button
      className="flex flex-col items-center justify-center gap-0 rounded-lg transition-transform active:scale-90 hover:scale-105 hover:shadow-lg"
      style={{
        minWidth: '48px',
        minHeight: '36px',
        padding: '5px 6px',
        backgroundColor: isActive ? `${color}20` : 'rgba(255,255,255,0.04)',
        border: `2px solid ${isActive ? `${color}55` : 'rgba(255,255,255,0.15)'}`,
        boxShadow: isActive ? `0 0 10px ${color}40, inset 0 0 8px ${color}15` : 'none',
        transition: 'transform 0.15s, background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
      }}
    >
      <span className="text-[12px] leading-none">{emoji}</span>
      <span className="text-[8px] font-bold leading-tight" style={{ color: isActive ? color : 'rgba(255,255,255,0.2)' }}>
        {label ? `${label} ${formatCoinCount(count)}` : formatCoinCount(count)}
      </span>
    </button>
  )
}
