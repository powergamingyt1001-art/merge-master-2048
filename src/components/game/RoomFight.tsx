'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Lock, Users, Swords, Shield, Clock, Check, Search, ChevronRight, Zap, AlertTriangle } from 'lucide-react'

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
}

type RoomTab = 'create' | 'join' | 'random' | 'info'
type BetItem = { id: string; label: string; emoji: string; type: 'ability' | 'coins'; abilityType?: 'hammer' | 'magnet' | 'blast'; amount: number }

const BET_ITEMS: BetItem[] = [
  { id: 'hammer', label: 'Hammer', emoji: '🔨', type: 'ability', abilityType: 'hammer', amount: 1 },
  { id: 'magnet', label: 'Magnet', emoji: '🧲', type: 'ability', abilityType: 'magnet', amount: 1 },
  { id: 'bomb', label: 'Bomb', emoji: '💣', type: 'ability', abilityType: 'blast', amount: 1 },
  { id: 'coins100', label: '100 Coins', emoji: '💰', type: 'coins', amount: 100 },
  { id: 'coins200', label: '200 Coins', emoji: '💰', type: 'coins', amount: 200 },
  { id: 'coins500', label: '500 Coins', emoji: '💰', type: 'coins', amount: 500 },
]

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
}: RoomFightProps) {
  const [activeTab, setActiveTab] = useState<RoomTab>('create')
  const [selectedBets, setSelectedBets] = useState<Set<string>>(new Set())
  const [roomPassword, setRoomPassword] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [showJoinPassword, setShowJoinPassword] = useState(false)

  // Create Room states
  const [createdRoom, setCreatedRoom] = useState<{ code: string; password: string } | null>(null)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const [createdRoomCode, setCreatedRoomCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  // Join Room states
  const [joinSearching, setJoinSearching] = useState(false)
  const [joinOpponent, setJoinOpponent] = useState<typeof MOCK_OPPONENTS[0] | null>(null)

  const toggleBet = useCallback((id: string) => {
    setSelectedBets(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  const handleCreateRoom = useCallback(() => {
    if (roomCardCount < 1) {
      onAddNotification('No Room Cards', 'You need at least 1 Room Card to create a room.', 'system', '🃏')
      return
    }
    if (selectedBets.size < 1) {
      onAddNotification('Select Bet', 'Please select at least 1 item to bet.', 'system', '🎯')
      return
    }

    // Verify the user can afford all selected bets
    for (const betId of selectedBets) {
      const item = BET_ITEMS.find(b => b.id === betId)
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
    onAddNotification('Room Created!', `Room ${code} created. Share the code with your opponent!`, 'system', '🏠')
  }, [roomCardCount, selectedBets, roomPassword, onUseRoomCard, onAddNotification, canAffordBet])

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
    setJoinSearching(true)
    // Simulate finding the room and opponent
    setTimeout(() => {
      const opponent = MOCK_OPPONENTS[Math.floor(Math.random() * MOCK_OPPONENTS.length)]
      setJoinOpponent(opponent)
    }, 2000)
  }, [joinCode, onAddNotification])

  const handleAcceptJoin = useCallback(() => {
    if (!joinOpponent) return
    // Deduct the selected abilities/coins for joining
    const abilities: string[] = []
    for (const betId of selectedBets) {
      const item = BET_ITEMS.find(b => b.id === betId)
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
  }, [])

  const handleClose = useCallback(() => {
    handleCancelCreate()
    handleCancelJoin()
    setActiveTab('create')
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
                  {/* Bet Selection */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3 h-3" style={{ color: '#EDC22E' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Select Bet Items</span>
                      <span className="text-[7px] ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>{selectedBets.size} selected</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {BET_ITEMS.map(item => {
                        const isSelected = selectedBets.has(item.id)
                        const canAfford = canAffordBet(item)
                        return (
                          <button key={item.id} onClick={() => canAfford && toggleBet(item.id)}
                            className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all"
                            style={{
                              backgroundColor: isSelected ? 'rgba(237,194,46,0.15)' : canAfford ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                              border: isSelected ? '1.5px solid rgba(237,194,46,0.5)' : canAfford ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.03)',
                              opacity: canAfford ? 1 : 0.35,
                            }}>
                            <span className="text-sm">{item.emoji}</span>
                            <span className="text-[8px] font-bold" style={{ color: isSelected ? '#EDC22E' : 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                            {item.type === 'ability' && item.abilityType && (
                              <span className="text-[6px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                x{item.abilityType === 'hammer' ? hammerCount : item.abilityType === 'magnet' ? magnetCount : blastCount}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
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
                      background: roomCardCount >= 1 && selectedBets.size >= 1
                        ? 'linear-gradient(135deg, #F65E3B, #FF7A00)' : 'rgba(255,255,255,0.06)',
                      color: roomCardCount >= 1 && selectedBets.size >= 1 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      boxShadow: roomCardCount >= 1 && selectedBets.size >= 1 ? '0 4px 15px rgba(246,94,59,0.3)' : 'none',
                    }}>
                    <Swords className="w-4 h-4" />
                    CREATE ROOM (1 🃏)
                  </button>

                  {roomCardCount < 1 && (
                    <p className="text-center text-[8px]" style={{ color: '#F65E3B' }}>
                      ⚠️ You need a Room Card to create a room. Get one from the Store!
                    </p>
                  )}
                </div>
              )}

              {/* Waiting for Opponent */}
              {activeTab === 'create' && waitingForOpponent && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                      style={{ background: 'linear-gradient(135deg, #F65E3B, #FF7A00)', boxShadow: '0 0 20px rgba(246,94,59,0.4)' }}>
                      <Search className="w-6 h-6" style={{ color: '#FFFFFF' }} />
                    </motion.div>
                    <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Waiting for opponent...</p>
                    <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Share this room code:</p>

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

                    {/* Selected bets summary */}
                    <div className="flex items-center gap-1 mt-3">
                      {Array.from(selectedBets).map(betId => {
                        const item = BET_ITEMS.find(b => b.id === betId)
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
                    <div className="grid grid-cols-3 gap-1.5">
                      {BET_ITEMS.map(item => {
                        const isSelected = selectedBets.has(item.id)
                        const canAfford = canAffordBet(item)
                        return (
                          <button key={item.id} onClick={() => canAfford && toggleBet(item.id)}
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
                  </div>

                  <button onClick={handleJoinRoom}
                    className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
                    style={{
                      background: joinCode.length === 6 ? 'linear-gradient(135deg, #00E676, #00C853)' : 'rgba(255,255,255,0.06)',
                      color: joinCode.length === 6 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      boxShadow: joinCode.length === 6 ? '0 4px 15px rgba(0,230,118,0.3)' : 'none',
                    }}>
                    <Users className="w-4 h-4" />
                    JOIN ROOM
                  </button>
                </div>
              )}

              {/* Join Searching Animation */}
              {activeTab === 'join' && joinSearching && !joinOpponent && (
                <div className="flex flex-col items-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', boxShadow: '0 0 20px rgba(0,230,118,0.4)' }}>
                    <Search className="w-6 h-6" style={{ color: '#FFFFFF' }} />
                  </motion.div>
                  <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Searching...</p>
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
                    <div className="grid grid-cols-3 gap-1.5">
                      {BET_ITEMS.map(item => {
                        const isSelected = selectedBets.has(item.id)
                        const canAfford = canAffordBet(item)
                        return (
                          <button key={item.id} onClick={() => canAfford && toggleBet(item.id)}
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
                  </div>

                  <button
                    onClick={() => {
                      if (roomCardCount < 1) {
                        onAddNotification('No Room Cards', 'You need at least 1 Room Card for Random Match.', 'system', '🃏')
                        return
                      }
                      if (selectedBets.size < 1) {
                        onAddNotification('Select Bet', 'Please select at least 1 item to bet.', 'system', '🎯')
                        return
                      }
                      // Verify affordability
                      for (const betId of selectedBets) {
                        const item = BET_ITEMS.find(b => b.id === betId)
                        if (item && !canAffordBet(item)) {
                          onAddNotification('Not Enough', `You don't have enough ${item.label}.`, 'system', '❌')
                          return
                        }
                      }
                      // Start random match
                      const abilities: string[] = []
                      for (const betId of selectedBets) {
                        const item = BET_ITEMS.find(b => b.id === betId)
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
                      background: roomCardCount >= 1 && selectedBets.size >= 1
                        ? 'linear-gradient(135deg, #E040FB, #7C4DFF)' : 'rgba(255,255,255,0.06)',
                      color: roomCardCount >= 1 && selectedBets.size >= 1 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      boxShadow: roomCardCount >= 1 && selectedBets.size >= 1 ? '0 4px 15px rgba(224,64,251,0.3)' : 'none',
                    }}>
                    🎲 FIND RANDOM OPPONENT (1 🃏)
                  </button>

                  {roomCardCount < 1 && (
                    <p className="text-center text-[8px]" style={{ color: '#F65E3B' }}>
                      ⚠️ You need a Room Card. Get one from the Store!
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
                      <span className="text-[10px] font-bold" style={{ color: '#F65E3B' }}>20% Tax Applies</span>
                    </div>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      A 20% platform tax is applied to all room game winnings. This ensures fair play and server maintenance.
                    </p>
                  </div>

                  {/* How it works */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[10px] font-bold mb-2" style={{ color: '#EDC22E' }}>📋 How Room Fight Works</p>
                    <div className="space-y-2">
                      {[
                        { step: '1', text: 'Create a room with 1 Room Card' },
                        { step: '2', text: 'Select abilities or coins to bet' },
                        { step: '3', text: 'Share the 6-digit code with your opponent' },
                        { step: '4', text: 'Both players put 2 abilities each' },
                        { step: '5', text: 'Winner takes all (minus 20% tax)' },
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
                    <p className="text-[10px] font-bold mb-1.5" style={{ color: '#00E676' }}>💡 Example: ₹55 Game</p>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Each player puts 2 abilities. Winner gets all 4 abilities minus 20% tax. Fair play guaranteed!
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
