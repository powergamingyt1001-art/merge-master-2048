'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Lock, Users, Swords, Shield, Clock, Check, Search, ChevronRight, Zap, AlertTriangle, UserPlus } from 'lucide-react'
import { onFriendsUpdate } from '@/lib/firebase-service'

interface RoomFightProps {
  isOpen: boolean
  onClose: () => void
  roomCardCount: number
  userCode: string
  coins: number
  hammerCount: number
  magnetCount: number
  blastCount: number
  onUseRoomCard: () => void
  onAddNotification: (title: string, message: string, type: string, emoji: string) => void
  onDeductCoins: (amount: number) => void
  onDeductAbility: (type: 'hammer' | 'magnet' | 'blast', count: number) => void
  onStartRoomGame: (betAmount: number, abilities: string[]) => void
  playerId: string
  playerName?: string
  playerAvatar?: string
  playerLevel?: number
}

type RoomTab = 'create' | 'join' | 'random' | 'info'

interface CoinOption {
  id: string
  label: string
  emoji: string
  type: 'coins'
  amount: number
}

interface AbilityOption {
  id: string
  label: string
  emoji: string
  type: 'ability'
  abilityType: 'hammer' | 'magnet' | 'blast'
  amount: number
}

type BetItem = CoinOption | AbilityOption

const COIN_OPTIONS: CoinOption[] = [
  { id: 'coins1000', label: '1K', emoji: '💰', type: 'coins', amount: 1000 },
  { id: 'coins5000', label: '5K', emoji: '💰', type: 'coins', amount: 5000 },
  { id: 'coins10000', label: '10K', emoji: '💰', type: 'coins', amount: 10000 },
  { id: 'coins15000', label: '15K', emoji: '💰', type: 'coins', amount: 15000 },
  { id: 'coins20000', label: '20K', emoji: '💰', type: 'coins', amount: 20000 },
  { id: 'coins30000', label: '30K', emoji: '💰', type: 'coins', amount: 30000 },
  { id: 'coins50000', label: '50K', emoji: '💰', type: 'coins', amount: 50000 },
  { id: 'coins75000', label: '75K', emoji: '💰', type: 'coins', amount: 75000 },
  { id: 'coins100000', label: '1L', emoji: '💰', type: 'coins', amount: 100000 },
]

const ABILITY_OPTIONS: AbilityOption[] = [
  { id: 'hammer', label: 'Hammer', emoji: '🔨', type: 'ability', abilityType: 'hammer', amount: 1 },
  { id: 'magnet', label: 'Magnet', emoji: '🧲', type: 'ability', abilityType: 'magnet', amount: 1 },
  { id: 'bomb', label: 'Bomb', emoji: '💣', type: 'ability', abilityType: 'blast', amount: 1 },
]

const ALL_BET_ITEMS: BetItem[] = [...COIN_OPTIONS, ...ABILITY_OPTIONS]

const TIMER_OPTIONS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '120s', seconds: 120 },
]

const TIME_MODE_OPTIONS = [
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
]

type GameMode = 'coin' | 'time'

// Mock opponent data for the "searching" animation
const MOCK_OPPONENTS = [
  { name: 'BlazeKing', avatar: '🔥', level: 12 },
  { name: 'ViperStrike', avatar: '🐍', level: 8 },
  { name: 'StormRider', avatar: '⚡', level: 15 },
  { name: 'NovaFlare', avatar: '💫', level: 6 },
  { name: 'FangWolf', avatar: '🐺', level: 10 },
]

function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function RoomFight({
  isOpen, onClose, roomCardCount, userCode, coins,
  hammerCount, magnetCount, blastCount,
  onUseRoomCard, onAddNotification, onDeductCoins, onDeductAbility, onStartRoomGame,
  playerId, playerName, playerAvatar, playerLevel,
}: RoomFightProps) {
  const [activeTab, setActiveTab] = useState<RoomTab>('create')
  const [selectedBets, setSelectedBets] = useState<Set<string>>(new Set())
  const [roomPassword, setRoomPassword] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [showJoinPassword, setShowJoinPassword] = useState(false)

  // Timer state
  const [selectedTimer, setSelectedTimer] = useState(60)

  // Create Room states
  const [createdRoom, setCreatedRoom] = useState<{ code: string; password: string } | null>(null)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const [createdRoomCode, setCreatedRoomCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  // Game mode selector
  const [gameMode, setGameMode] = useState<GameMode>('coin')
  const [selectedTimeMode, setSelectedTimeMode] = useState(60)

  // Player count (2-4)
  const [playerCount, setPlayerCount] = useState(2)

  // Opponent UIDs for friend invite (multi-player)
  const [invitedFriends, setInvitedFriends] = useState<Array<{ friendId: string; name: string; avatar: string; inviteCode: string; status: 'pending' | 'accepted' | 'cancelled' }>>([])
  const [showFriendList, setShowFriendList] = useState(false)
  const [activeSlotIndex, setActiveSlotIndex] = useState(0)
  const [friends, setFriends] = useState<Array<{ friendId: string; name: string; avatar: string; inviteCode: string }>>([])

  // Join Room states
  const [joinSearching, setJoinSearching] = useState(false)
  const [joinOpponent, setJoinOpponent] = useState<typeof MOCK_OPPONENTS[0] | null>(null)

  // Listen to friends list
  useEffect(() => {
    if (!isOpen || !playerId) return
    const unsubscribe = onFriendsUpdate(playerId, (friendsList) => {
      setFriends(friendsList.map(f => ({
        friendId: f.friendId,
        name: f.name,
        avatar: f.avatar,
        inviteCode: f.inviteCode,
      })))
    })
    return () => unsubscribe()
  }, [isOpen, playerId])

  const getSelectedAbilityCount = useCallback(() => {
    let count = 0
    for (const betId of selectedBets) {
      const item = ALL_BET_ITEMS.find(b => b.id === betId)
      if (item && item.type === 'ability') count++
    }
    return count
  }, [selectedBets])

  const toggleBet = useCallback((id: string) => {
    setSelectedBets(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        // Check if adding an ability would exceed max 2
        const item = ALL_BET_ITEMS.find(b => b.id === id)
        if (item && item.type === 'ability') {
          // Count current abilities
          let currentAbilityCount = 0
          for (const betId of prev) {
            const existing = ALL_BET_ITEMS.find(b => b.id === betId)
            if (existing && existing.type === 'ability') currentAbilityCount++
          }
          if (currentAbilityCount >= 2) {
            // Will show notification outside setState
            return prev
          }
        }
        next.add(id)
      }
      return next
    })
  }, [])

  const canAffordBet = useCallback((item: BetItem): boolean => {
    if (item.type === 'ability') {
      if (item.abilityType === 'hammer') return hammerCount >= item.amount
      if (item.abilityType === 'magnet') return magnetCount >= item.amount
      if (item.abilityType === 'blast') return blastCount >= item.amount
    }
    if (item.type === 'coins') return coins >= item.amount
    return false
  }, [hammerCount, magnetCount, blastCount, coins])

  const handleBetClick = useCallback((id: string) => {
    const item = ALL_BET_ITEMS.find(b => b.id === id)
    if (!item || !canAffordBet(item)) return

    // If selecting (not deselecting) an ability, check max 2 limit
    if (!selectedBets.has(id) && item.type === 'ability') {
      if (getSelectedAbilityCount() >= 2) {
        onAddNotification('Max Abilities', 'You can select a maximum of 2 abilities.', 'system', '⚠️')
        return
      }
    }
    toggleBet(id)
  }, [canAffordBet, selectedBets, getSelectedAbilityCount, toggleBet, onAddNotification])

  // Calculate 5% tax on coin bets
  const getCoinBetTotal = useCallback(() => {
    let total = 0
    for (const betId of selectedBets) {
      const item = ALL_BET_ITEMS.find(b => b.id === betId)
      if (item && item.type === 'coins') total += item.amount
    }
    return total
  }, [selectedBets])

  const getTaxAmount = useCallback(() => {
    return Math.ceil(getCoinBetTotal() * 0.05)
  }, [getCoinBetTotal])

  const getTotalWithTax = useCallback(() => {
    return getCoinBetTotal() + getTaxAmount()
  }, [getCoinBetTotal, getTaxAmount])

  const handleCreateRoom = useCallback(() => {
    if (roomCardCount < 1) {
      onAddNotification('No Room Cards', 'You need at least 1 Room Card to create a room.', 'system', '🃏')
      return
    }
    if (selectedBets.size < 1) {
      onAddNotification('Select Bet', 'Please select at least 1 item to bet.', 'system', '🎯')
      return
    }

    // Check minimum 100 coins
    if (coins < 100) {
      onAddNotification('Insufficient Coins', 'All players need at least 100 coins to play.', 'system', '💰')
      return
    }

    // Verify the user can afford all selected bets + 5% tax on coins
    const coinTotal = getCoinBetTotal()
    const tax = Math.ceil(coinTotal * 0.05)
    const totalCoinCost = coinTotal + tax
    if (coinTotal > 0 && coins < totalCoinCost) {
      onAddNotification('Not Enough', `You need ${totalCoinCost.toLocaleString()} coins (incl. 5% tax). You have ${coins.toLocaleString()}.`, 'system', '❌')
      return
    }

    // Verify the user can afford all selected bets
    for (const betId of selectedBets) {
      const item = ALL_BET_ITEMS.find(b => b.id === betId)
      if (item && !canAffordBet(item)) {
        onAddNotification('Not Enough', `You don't have enough ${item.label} to bet.`, 'system', '❌')
        return
      }
    }

    const code = generateRoomCode()
    setCreatedRoomCode(code)
    setCreatedRoom({ code, password: roomPassword })
    setWaitingForOpponent(true)
    onUseRoomCard()
    // Deduct 5% tax immediately on room creation
    if (coinTotal > 0) {
      onDeductCoins(tax)
    }
    onAddNotification('Room Created!', `Room ${code} created. Share the code with your opponent!${tax > 0 ? ` (5% tax: ${tax.toLocaleString()} 💰)` : ''}`, 'system', '🏠')
  }, [roomCardCount, selectedBets, roomPassword, onUseRoomCard, onAddNotification, canAffordBet, coins, getCoinBetTotal, onDeductCoins])

  const handleCopyRoomCode = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(createdRoomCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }, [createdRoomCode])

  const handleJoinRoom = useCallback(() => {
    if (!joinCode || joinCode.length < 6) {
      onAddNotification('Invalid Code', 'Please enter a valid 6-digit room code.', 'system', '❌')
      return
    }

    // Check minimum 100 coins
    if (coins < 100) {
      onAddNotification('Insufficient Coins', 'Both players need at least 100 coins to play.', 'system', '💰')
      return
    }

    setJoinSearching(true)
    // Simulate finding the room and opponent
    setTimeout(() => {
      const opponent = MOCK_OPPONENTS[Math.floor(Math.random() * MOCK_OPPONENTS.length)]
      setJoinOpponent(opponent)
    }, 2000)
  }, [joinCode, onAddNotification, coins])

  const handleAcceptJoin = useCallback(() => {
    if (!joinOpponent) return
    // Deduct the selected abilities/coins for joining
    const abilities: string[] = []
    for (const betId of selectedBets) {
      const item = ALL_BET_ITEMS.find(b => b.id === betId)
      if (item) {
        if (item.type === 'ability' && item.abilityType) {
          onDeductAbility(item.abilityType, item.amount)
          abilities.push(item.abilityType)
        } else if (item.type === 'coins') {
          onDeductCoins(item.amount)
          abilities.push(`coins_${item.amount}`)
        }
      }
    }
    onStartRoomGame(55, abilities)
    setJoinSearching(false)
    setJoinOpponent(null)
    setJoinCode('')
    setJoinPassword('')
    setShowJoinPassword(false)
  }, [joinOpponent, selectedBets, onDeductAbility, onDeductCoins, onStartRoomGame])

  const handleCancelJoin = useCallback(() => {
    setJoinSearching(false)
    setJoinOpponent(null)
    setJoinCode('')
    setJoinPassword('')
    setShowJoinPassword(false)
  }, [])

  const handleCancelCreate = useCallback(() => {
    setWaitingForOpponent(false)
    setCreatedRoom(null)
    setCreatedRoomCode('')
    setRoomPassword('')
    setSelectedBets(new Set())
    setInvitedFriends([])
  }, [])

  const handleClose = useCallback(() => {
    handleCancelCreate()
    handleCancelJoin()
    setActiveTab('create')
    setShowFriendList(false)
    onClose()
  }, [onClose, handleCancelCreate, handleCancelJoin])

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
                <Swords className="w-4 h-4" style={{ color: '#F65E3B' }} />
                <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>🃏 Room Fight</h3>
              </div>
              <button onClick={handleClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Room Cards indicator */}
            <div className="mx-4 mb-2 flex items-center gap-1.5">
              <span className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>🃏 Room Cards: {roomCardCount}</span>
              {roomCardCount < 1 && (
                <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(246,94,59,0.2)', color: '#F65E3B' }}>Need 1</span>
              )}
            </div>

            {/* Tab Switcher */}
            {!waitingForOpponent && !joinSearching && (
              <div className="mx-4 mb-3 flex items-center gap-1.5">
                {(['create', 'join', 'random', 'info'] as RoomTab[]).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all text-center"
                    style={{
                      backgroundColor: activeTab === tab ? 'rgba(246,94,59,0.2)' : 'rgba(255,255,255,0.06)',
                      border: activeTab === tab ? '1px solid rgba(246,94,59,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: activeTab === tab ? '#F65E3B' : 'rgba(255,255,255,0.5)',
                    }}>
                    {tab === 'create' ? '🏠 Create' : tab === 'join' ? '🚪 Join' : tab === 'random' ? '🎲 Random' : 'ℹ️ Info'}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 pb-4">
              {/* ===== CREATE ROOM TAB ===== */}
              {activeTab === 'create' && !waitingForOpponent && (
                <div className="space-y-3">
                  {/* Own UID Display */}
                  <div className="p-2.5 rounded-xl flex items-center gap-2" style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.12)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)' }}>
                      <span className="text-sm">🎮</span>
                    </div>
                    <div>
                      <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Your UID</p>
                      <p className="text-[11px] font-mono font-bold" style={{ color: '#00E676' }}>{userCode || '—'}</p>
                    </div>
                    <span className="text-[7px] ml-auto px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(0,230,118,0.15)', color: '#00E676' }}>YOU</span>
                  </div>

                  {/* Mode Selector - Coin vs Time */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3 h-3" style={{ color: '#E040FB' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#E040FB' }}>Game Mode</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setGameMode('coin')}
                        className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all text-center"
                        style={{
                          backgroundColor: gameMode === 'coin' ? 'rgba(237,194,46,0.2)' : 'rgba(255,255,255,0.04)',
                          border: gameMode === 'coin' ? '1px solid rgba(237,194,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
                          color: gameMode === 'coin' ? '#EDC22E' : 'rgba(255,255,255,0.5)',
                        }}>
                        💰 Coin Mode
                      </button>
                      <button onClick={() => setGameMode('time')}
                        className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all text-center"
                        style={{
                          backgroundColor: gameMode === 'time' ? 'rgba(224,64,251,0.2)' : 'rgba(255,255,255,0.04)',
                          border: gameMode === 'time' ? '1px solid rgba(224,64,251,0.5)' : '1px solid rgba(255,255,255,0.08)',
                          color: gameMode === 'time' ? '#E040FB' : 'rgba(255,255,255,0.5)',
                        }}>
                        ⏱️ Time Mode
                      </button>
                    </div>
                    {gameMode === 'time' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {TIME_MODE_OPTIONS.map(opt => (
                          <button key={opt.seconds} onClick={() => setSelectedTimeMode(opt.seconds)}
                            className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all text-center"
                            style={{
                              backgroundColor: selectedTimeMode === opt.seconds ? 'rgba(224,64,251,0.2)' : 'rgba(255,255,255,0.04)',
                              border: selectedTimeMode === opt.seconds ? '1px solid rgba(224,64,251,0.5)' : '1px solid rgba(255,255,255,0.08)',
                              color: selectedTimeMode === opt.seconds ? '#E040FB' : 'rgba(255,255,255,0.5)',
                            }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Coin Bet Selection */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3 h-3" style={{ color: '#EDC22E' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Select Coin Bet</span>
                      <span className="text-[7px] ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>{selectedBets.size} selected</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {COIN_OPTIONS.map(item => {
                        const isSelected = selectedBets.has(item.id)
                        const canAfford = canAffordBet(item)
                        return (
                          <button key={item.id} onClick={() => canAfford && handleBetClick(item.id)}
                            className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all"
                            style={{
                              backgroundColor: isSelected ? 'rgba(237,194,46,0.15)' : canAfford ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                              border: isSelected ? '1.5px solid rgba(237,194,46,0.5)' : canAfford ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.03)',
                              opacity: canAfford ? 1 : 0.35,
                            }}>
                            <span className="text-sm">{item.emoji}</span>
                            <span className="text-[8px] font-bold" style={{ color: isSelected ? '#EDC22E' : 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {/* 5% Tax Info */}
                    {getCoinBetTotal() > 0 && (
                      <div className="mt-2 p-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'rgba(246,94,59,0.06)', border: '1px solid rgba(246,94,59,0.12)' }}>
                        <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.5)' }}>💰 Bet: {getCoinBetTotal().toLocaleString()}</span>
                        <span className="text-[8px]" style={{ color: '#F65E3B' }}>+5% tax: {getTaxAmount().toLocaleString()}</span>
                        <span className="text-[8px] font-bold" style={{ color: '#EDC22E' }}>Total: {getTotalWithTax().toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Ability Bet Selection */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3 h-3" style={{ color: '#00E676' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#00E676' }}>Select Abilities (Max 2)</span>
                      <span className="text-[7px] ml-auto" style={{ color: getSelectedAbilityCount() >= 2 ? '#F65E3B' : 'rgba(255,255,255,0.3)' }}>
                        {getSelectedAbilityCount()}/2
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ABILITY_OPTIONS.map(item => {
                        const isSelected = selectedBets.has(item.id)
                        const canAfford = canAffordBet(item)
                        return (
                          <button key={item.id} onClick={() => canAfford && handleBetClick(item.id)}
                            className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all"
                            style={{
                              backgroundColor: isSelected ? 'rgba(0,230,118,0.15)' : canAfford ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                              border: isSelected ? '1.5px solid rgba(0,230,118,0.5)' : canAfford ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.03)',
                              opacity: canAfford ? 1 : 0.35,
                            }}>
                            <span className="text-sm">{item.emoji}</span>
                            <span className="text-[8px] font-bold" style={{ color: isSelected ? '#00E676' : 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                            {item.abilityType && (
                              <span className="text-[6px]" style={{ color: canAfford ? 'rgba(255,255,255,0.3)' : 'rgba(246,94,59,0.5)' }}>
                                {canAfford ? `x${item.abilityType === 'hammer' ? hammerCount : item.abilityType === 'magnet' ? magnetCount : blastCount}` : 'Unavailable'}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Timer Selection */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="w-3 h-3" style={{ color: '#E040FB' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#E040FB' }}>Game Timer</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {TIMER_OPTIONS.map(opt => (
                        <button key={opt.seconds} onClick={() => setSelectedTimer(opt.seconds)}
                          className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all text-center"
                          style={{
                            backgroundColor: selectedTimer === opt.seconds ? 'rgba(224,64,251,0.2)' : 'rgba(255,255,255,0.04)',
                            border: selectedTimer === opt.seconds ? '1px solid rgba(224,64,251,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            color: selectedTimer === opt.seconds ? '#E040FB' : 'rgba(255,255,255,0.5)',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Player Count Selector */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3 h-3" style={{ color: '#00E676' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#00E676' }}>Players</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[2, 3, 4].map(count => (
                        <button key={count} onClick={() => setPlayerCount(count)}
                          className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all text-center"
                          style={{
                            backgroundColor: playerCount === count ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.04)',
                            border: playerCount === count ? '1px solid rgba(0,230,118,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            color: playerCount === count ? '#00E676' : 'rgba(255,255,255,0.5)',
                          }}>
                          {count}P 🎮
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Opponent Slots with Friend Invite */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
                      <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Invite Opponents ({invitedFriends.filter(f => f.status !== 'cancelled').length}/{playerCount - 1})</span>
                    </div>
                    <div className="space-y-1.5">
                      {Array.from({ length: playerCount - 1 }).map((_, idx) => {
                        const invited = invitedFriends.find((f, i) => f.status !== 'cancelled' && invitedFriends.indexOf(f) === idx) || invitedFriends[idx]
                        return (
                          <div key={idx} className="relative">
                            {invited && invited.status !== 'cancelled' ? (
                              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                                style={{ backgroundColor: invited.status === 'accepted' ? 'rgba(0,230,118,0.08)' : 'rgba(237,194,46,0.08)', border: `1px solid ${invited.status === 'accepted' ? 'rgba(0,230,118,0.2)' : 'rgba(237,194,46,0.2)'}` }}>
                                <span className="text-sm">{invited.avatar || '👤'}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] font-bold truncate" style={{ color: '#FFFFFF' }}>{invited.name}</p>
                                  <p className="text-[7px]" style={{ color: invited.status === 'accepted' ? '#00E676' : '#EDC22E' }}>
                                    {invited.status === 'accepted' ? '✓ Accepted' : '⏳ Pending...'}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  {invited.status === 'pending' && (
                                    <button onClick={() => {
                                      setInvitedFriends(prev => prev.map((f, i) => i === idx ? { ...f, status: 'accepted' as const } : f))
                                    }} className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ backgroundColor: 'rgba(0,230,118,0.15)', color: '#00E676' }}>
                                      Accept
                                    </button>
                                  )}
                                  <button onClick={() => {
                                    setInvitedFriends(prev => prev.map((f, i) => i === idx ? { ...f, status: 'cancelled' as const } : f))
                                  }} className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ backgroundColor: 'rgba(246,94,59,0.15)', color: '#F65E3B' }}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setActiveSlotIndex(idx); setShowFriendList(true) }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all"
                                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)' }}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                  <UserPlus className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                                </div>
                                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Tap to invite friend</span>
                                <span className="text-[10px] ml-auto font-bold" style={{ color: 'rgba(0,230,118,0.4)' }}>+</span>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Friend List Dropdown */}
                    <AnimatePresence>
                      {showFriendList && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="mt-2 rounded-lg overflow-hidden z-20 max-h-40 overflow-y-auto"
                          style={{ backgroundColor: '#1a0a30', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          {friends.length === 0 ? (
                            <div className="p-3 text-center">
                              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>No friends yet. Add friends to invite them!</p>
                            </div>
                          ) : (
                            friends.filter(f => !invitedFriends.some(inv => inv.friendId === f.friendId && inv.status !== 'cancelled')).map(friend => (
                              <button
                                key={friend.friendId}
                                onClick={() => {
                                  const newInvited = [...invitedFriends]
                                  newInvited[activeSlotIndex] = { ...friend, status: 'pending' }
                                  setInvitedFriends(newInvited)
                                  setShowFriendList(false)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <span className="text-sm">{friend.avatar || '👤'}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] font-bold truncate" style={{ color: '#FFFFFF' }}>{friend.name}</p>
                                  <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{friend.inviteCode}</p>
                                </div>
                                <span className="text-[12px] px-2 py-1 rounded-full font-bold" style={{ backgroundColor: 'rgba(0,230,118,0.15)', color: '#00E676' }}>
                                  +
                                </span>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* No Rank Points Info */}
                  <div className="p-2 rounded-lg flex items-center gap-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <AlertTriangle className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Room Fight mode does not award rank points</span>
                  </div>

                  {/* Password */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
                      <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Password (Optional)</span>
                    </div>
                    <input type="text" value={roomPassword} onChange={e => setRoomPassword(e.target.value)}
                      placeholder="Leave empty for public room"
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }} />
                  </div>

                  {/* Create Button */}
                  <button onClick={handleCreateRoom}
                    className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
                    style={{
                      background: roomCardCount >= 1 && selectedBets.size >= 1 && coins >= 100 && coins >= getTotalWithTax()
                        ? 'linear-gradient(135deg, #F65E3B, #FF7A00)' : 'rgba(255,255,255,0.06)',
                      color: roomCardCount >= 1 && selectedBets.size >= 1 && coins >= 100 && coins >= getTotalWithTax() ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      boxShadow: roomCardCount >= 1 && selectedBets.size >= 1 && coins >= 100 && coins >= getTotalWithTax() ? '0 4px 15px rgba(246,94,59,0.3)' : 'none',
                    }}>
                    <Swords className="w-4 h-4" />
                    CREATE ROOM (1 🃏)
                  </button>

                  {roomCardCount < 1 && (
                    <p className="text-center text-[8px]" style={{ color: '#F65E3B' }}>
                      ⚠️ You need a Room Card to create a room. Get one from the Store!
                    </p>
                  )}
                  {coins < 100 && (
                    <p className="text-center text-[8px]" style={{ color: '#F65E3B' }}>
                      ⚠️ You need at least 100 coins to play. Earn more coins!
                    </p>
                  )}
                  {coins >= 100 && coins < getTotalWithTax() && getCoinBetTotal() > 0 && (
                    <p className="text-center text-[8px]" style={{ color: '#F65E3B' }}>
                      ⚠️ You need {getTotalWithTax().toLocaleString()} coins (incl. 5% tax) to create this room.
                    </p>
                  )}
                </div>
              )}

              {/* Waiting for Opponent / Searching Animation */}
              {activeTab === 'create' && waitingForOpponent && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                      style={{ background: 'linear-gradient(135deg, #F65E3B, #FF7A00)', boxShadow: '0 0 25px rgba(246,94,59,0.5)' }}>
                      <Search className="w-7 h-7" style={{ color: '#FFFFFF' }} />
                    </motion.div>
                    <motion.p
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                      Searching for players...
                    </motion.p>
                    <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Waiting for {playerCount - 1} opponent{playerCount > 2 ? 's' : ''} • Share code:</p>

                    {/* Room Code Display */}
                    <div className="flex items-center gap-2 mt-2 px-4 py-2 rounded-xl"
                      style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1.5px solid rgba(237,194,46,0.3)' }}>
                      <span className="text-xl font-mono font-extrabold tracking-widest" style={{ color: '#EDC22E' }}>{createdRoomCode}</span>
                      <button onClick={handleCopyRoomCode} className="p-1.5 rounded-lg transition-transform active:scale-90"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        {copiedCode ? <Check className="w-3.5 h-3.5" style={{ color: '#00E676' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />}
                      </button>
                    </div>

                    {createdRoom?.password && (
                      <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Password: {createdRoom.password}</span>
                      </div>
                    )}

                    {/* Timer display */}
                    <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: 'rgba(224,64,251,0.08)', border: '1px solid rgba(224,64,251,0.15)' }}>
                      <Clock className="w-3 h-3" style={{ color: '#E040FB' }} />
                      <span className="text-[8px]" style={{ color: '#E040FB' }}>Timer: {selectedTimer}s • Mode: {gameMode === 'coin' ? '💰 Coin' : '⏱️ Time'}</span>
                    </div>

                    {/* Players display */}
                    <div className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}>
                      <Users className="w-3 h-3" style={{ color: '#00E676' }} />
                      <span className="text-[8px]" style={{ color: '#00E676' }}>Players: {playerCount}P • No rank points</span>
                    </div>

                    {/* Selected bets summary */}
                    <div className="flex items-center gap-1 mt-3">
                      {Array.from(selectedBets).map(betId => {
                        const item = ALL_BET_ITEMS.find(b => b.id === betId)
                        return item ? <span key={betId} className="text-sm">{item.emoji}</span> : null
                      })}
                    </div>
                  </div>

                  <button onClick={handleCancelCreate}
                    className="w-full py-2.5 rounded-xl font-bold text-[10px] transition-transform active:scale-95"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                    CANCEL ROOM
                  </button>
                </div>
              )}

              {/* ===== JOIN ROOM TAB ===== */}
              {activeTab === 'join' && !joinSearching && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Search className="w-3 h-3" style={{ color: '#00E676' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#00E676' }}>Enter Room Code</span>
                    </div>
                    <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      className="w-full px-4 py-3 rounded-lg text-center text-lg font-mono font-bold tracking-widest outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }} />
                  </div>

                  {/* Password (show after code entered) */}
                  {joinCode.length === 6 && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
                          <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Password Protected?</span>
                        </div>
                        <button onClick={() => setShowJoinPassword(!showJoinPassword)}
                          className="text-[8px] px-2 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: showJoinPassword ? 'rgba(237,194,46,0.15)' : 'rgba(255,255,255,0.06)', color: showJoinPassword ? '#EDC22E' : 'rgba(255,255,255,0.4)', border: `1px solid ${showJoinPassword ? 'rgba(237,194,46,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                          {showJoinPassword ? 'Yes' : 'No'}
                        </button>
                      </div>
                      {showJoinPassword && (
                        <input type="text" value={joinPassword} onChange={e => setJoinPassword(e.target.value)}
                          placeholder="Enter room password"
                          className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }} />
                      )}
                    </div>
                  )}

                  {/* Bet Selection for Join too */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3 h-3" style={{ color: '#EDC22E' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Your Bet</span>
                    </div>
                    {/* Coin options */}
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {COIN_OPTIONS.map(item => {
                        const isSelected = selectedBets.has(item.id)
                        const canAfford = canAffordBet(item)
                        return (
                          <button key={item.id} onClick={() => canAfford && handleBetClick(item.id)}
                            className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all"
                            style={{
                              backgroundColor: isSelected ? 'rgba(237,194,46,0.15)' : 'rgba(255,255,255,0.03)',
                              border: isSelected ? '1.5px solid rgba(237,194,46,0.5)' : '1px solid rgba(255,255,255,0.06)',
                              opacity: canAfford ? 1 : 0.35,
                            }}>
                            <span className="text-xs">{item.emoji}</span>
                            <span className="text-[7px] font-bold" style={{ color: isSelected ? '#EDC22E' : 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {/* Ability options */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {ABILITY_OPTIONS.map(item => {
                        const isSelected = selectedBets.has(item.id)
                        const canAfford = canAffordBet(item)
                        return (
                          <button key={item.id} onClick={() => canAfford && handleBetClick(item.id)}
                            className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all"
                            style={{
                              backgroundColor: isSelected ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.03)',
                              border: isSelected ? '1.5px solid rgba(0,230,118,0.5)' : '1px solid rgba(255,255,255,0.06)',
                              opacity: canAfford ? 1 : 0.35,
                            }}>
                            <span className="text-xs">{item.emoji}</span>
                            <span className="text-[7px] font-bold" style={{ color: isSelected ? '#00E676' : 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <button onClick={handleJoinRoom}
                    className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
                    style={{
                      background: joinCode.length === 6 && coins >= 100 ? 'linear-gradient(135deg, #00E676, #00C853)' : 'rgba(255,255,255,0.06)',
                      color: joinCode.length === 6 && coins >= 100 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      boxShadow: joinCode.length === 6 && coins >= 100 ? '0 4px 15px rgba(0,230,118,0.3)' : 'none',
                    }}>
                    <Users className="w-4 h-4" />
                    JOIN ROOM
                  </button>

                  {coins < 100 && (
                    <p className="text-center text-[8px]" style={{ color: '#F65E3B' }}>
                      ⚠️ You need at least 100 coins to join a room.
                    </p>
                  )}
                </div>
              )}

              {/* Join Searching Animation */}
              {activeTab === 'join' && joinSearching && !joinOpponent && (
                <div className="flex flex-col items-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                    style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', boxShadow: '0 0 25px rgba(0,230,118,0.5)' }}>
                    <Search className="w-7 h-7" style={{ color: '#FFFFFF' }} />
                  </motion.div>
                  <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                    Searching for players...
                  </motion.p>
                  <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Connecting to room {joinCode}</p>
                </div>
              )}

              {/* Join Opponent Found */}
              {activeTab === 'join' && joinSearching && joinOpponent && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center py-3">
                    <p className="text-[10px] font-bold mb-3" style={{ color: '#00E676' }}>🎉 Opponent Found!</p>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', border: '2px solid rgba(255,255,255,0.3)' }}>
                          <span className="text-2xl">🎮</span>
                        </div>
                        <p className="text-[9px] font-bold mt-1" style={{ color: '#FFFFFF' }}>You</p>
                      </div>

                      <span className="text-xl font-black" style={{ color: '#F65E3B' }}>VS</span>

                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #F65E3B, #FF7A00)', border: '2px solid rgba(255,255,255,0.3)' }}>
                          <span className="text-2xl">{joinOpponent.avatar}</span>
                        </div>
                        <p className="text-[9px] font-bold mt-1" style={{ color: '#FFFFFF' }}>{joinOpponent.name}</p>
                        <p className="text-[7px]" style={{ color: '#F65E3B' }}>Lv.{joinOpponent.level}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleCancelJoin}
                      className="flex-1 py-2.5 rounded-xl font-bold text-[10px] transition-transform active:scale-95"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                      CANCEL
                    </button>
                    <button onClick={handleAcceptJoin}
                      className="flex-1 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(0,230,118,0.3)' }}>
                      <Check className="w-3.5 h-3.5" /> ACCEPT
                    </button>
                  </div>
                </div>
              )}

              {/* ===== RANDOM MATCH TAB ===== */}
              {activeTab === 'random' && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center py-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                      style={{ background: 'linear-gradient(135deg, #E040FB, #7C4DFF)', boxShadow: '0 0 20px rgba(224,64,251,0.4)' }}>
                      <span className="text-2xl">🎲</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Random Match</p>
                    <p className="text-[9px] mt-1 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Get matched with a random opponent instantly!
                    </p>
                  </div>

                  {/* Bet Selection for Random */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3 h-3" style={{ color: '#EDC22E' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Your Bet</span>
                    </div>
                    {/* Coin options */}
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {COIN_OPTIONS.map(item => {
                        const isSelected = selectedBets.has(item.id)
                        const canAfford = canAffordBet(item)
                        return (
                          <button key={item.id} onClick={() => canAfford && handleBetClick(item.id)}
                            className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all"
                            style={{
                              backgroundColor: isSelected ? 'rgba(237,194,46,0.15)' : canAfford ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                              border: isSelected ? '1.5px solid rgba(237,194,46,0.5)' : canAfford ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.03)',
                              opacity: canAfford ? 1 : 0.35,
                            }}>
                            <span className="text-sm">{item.emoji}</span>
                            <span className="text-[8px] font-bold" style={{ color: isSelected ? '#EDC22E' : 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {/* Ability options */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {ABILITY_OPTIONS.map(item => {
                        const isSelected = selectedBets.has(item.id)
                        const canAfford = canAffordBet(item)
                        return (
                          <button key={item.id} onClick={() => canAfford && handleBetClick(item.id)}
                            className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all"
                            style={{
                              backgroundColor: isSelected ? 'rgba(0,230,118,0.15)' : canAfford ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                              border: isSelected ? '1.5px solid rgba(0,230,118,0.5)' : canAfford ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.03)',
                              opacity: canAfford ? 1 : 0.35,
                            }}>
                            <span className="text-sm">{item.emoji}</span>
                            <span className="text-[8px] font-bold" style={{ color: isSelected ? '#00E676' : 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (roomCardCount < 1) {
                        onAddNotification('No Room Cards', 'You need at least 1 Room Card for Random Match.', 'system', '🃏')
                        return
                      }
                      if (coins < 100) {
                        onAddNotification('Insufficient Coins', 'Both players need at least 100 coins to play.', 'system', '💰')
                        return
                      }
                      if (selectedBets.size < 1) {
                        onAddNotification('Select Bet', 'Please select at least 1 item to bet.', 'system', '🎯')
                        return
                      }
                      // Verify affordability
                      for (const betId of selectedBets) {
                        const item = ALL_BET_ITEMS.find(b => b.id === betId)
                        if (item && !canAffordBet(item)) {
                          onAddNotification('Not Enough', `You don't have enough ${item.label}.`, 'system', '❌')
                          return
                        }
                      }
                      // Start random match
                      const abilities: string[] = []
                      for (const betId of selectedBets) {
                        const item = ALL_BET_ITEMS.find(b => b.id === betId)
                        if (item) {
                          if (item.type === 'ability' && item.abilityType) {
                            onDeductAbility(item.abilityType, item.amount)
                            abilities.push(item.abilityType)
                          } else if (item.type === 'coins') {
                            onDeductCoins(item.amount)
                            abilities.push(`coins_${item.amount}`)
                          }
                        }
                      }
                      onUseRoomCard()
                      onStartRoomGame(55, abilities)
                      onAddNotification('🎲 Random Match!', 'Searching for a random opponent...', 'system', '🎲')
                    }}
                    className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
                    style={{
                      background: roomCardCount >= 1 && selectedBets.size >= 1 && coins >= 100
                        ? 'linear-gradient(135deg, #E040FB, #7C4DFF)' : 'rgba(255,255,255,0.06)',
                      color: roomCardCount >= 1 && selectedBets.size >= 1 && coins >= 100 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      boxShadow: roomCardCount >= 1 && selectedBets.size >= 1 && coins >= 100 ? '0 4px 15px rgba(224,64,251,0.3)' : 'none',
                    }}>
                    🎲 FIND RANDOM OPPONENT (1 🃏)
                  </button>

                  {roomCardCount < 1 && (
                    <p className="text-center text-[8px]" style={{ color: '#F65E3B' }}>
                      ⚠️ You need a Room Card. Get one from the Store!
                    </p>
                  )}
                  {coins < 100 && (
                    <p className="text-center text-[8px]" style={{ color: '#F65E3B' }}>
                      ⚠️ You need at least 100 coins to play.
                    </p>
                  )}
                </div>
              )}

              {/* ===== INFO TAB ===== */}
              {activeTab === 'info' && (
                <div className="space-y-3">
                  {/* Tax Info */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#F65E3B' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#F65E3B' }}>5% Tax Applies</span>
                    </div>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      A 5% platform tax is applied to all room game winnings. This ensures fair play and server maintenance.
                    </p>
                  </div>

                  {/* How it works */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[10px] font-bold mb-2" style={{ color: '#EDC22E' }}>📋 How Room Fight Works</p>
                    <div className="space-y-2">
                      {[
                        { step: '1', text: 'Create a room with 1 Room Card' },
                        { step: '2', text: 'Select coins or abilities to bet' },
                        { step: '3', text: 'Share the 6-digit code with your opponent' },
                        { step: '4', text: 'Both players put up their bets' },
                        { step: '5', text: 'Winner takes all (minus 5% tax)' },
                      ].map(item => (
                        <div key={item.step} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0"
                            style={{ backgroundColor: 'rgba(237,194,46,0.15)', color: '#EDC22E' }}>
                            {item.step}
                          </span>
                          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Example */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.12)' }}>
                    <p className="text-[10px] font-bold mb-1.5" style={{ color: '#00E676' }}>💡 Example: Coin Bet Game</p>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Each player bets coins. Winner gets all coins minus 5% tax. Fair play guaranteed!
                    </p>
                  </div>

                  {/* Fair Play */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Shield className="w-3.5 h-3.5" style={{ color: '#00E676' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#00E676' }}>Fair Play Rules</span>
                    </div>
                    <ul className="space-y-1">
                      {[
                        'Anti-cheat system monitors all games',
                        'Both players must accept before starting',
                        'Room codes expire after 10 minutes',
                        'Disconnections result in automatic loss',
                        'Minimum 100 coins required to play',
                        'Max 2 abilities can be selected per game',
                      ].map((rule, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <ChevronRight className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
                          <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{rule}</span>
                        </li>
                      ))}
                    </ul>
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
