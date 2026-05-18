'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, Ticket, Check, AlertCircle } from 'lucide-react'

interface CouponCodeProps {
  isOpen: boolean
  onClose: () => void
  coins: number
  hammerCount: number
  magnetCount: number
  blastCount: number
  spinTickets: number
  onAddCoins: (amount: number) => void
  onAddPowerUp: (pu: 'hammer' | 'magnet' | 'blast', count: number) => void
  onAddSpinTickets: (count: number) => void
  onAddNotification: (title: string, message: string, type: string, emoji: string) => void
}

interface ClaimedCoupon {
  code: string
  date: string
  reward: string
  timestamp: number
}

// Reward types
type RewardType = 'spins' | 'coins' | 'magnets' | 'bombs' | '5x' | '2.5x'

interface RewardOption {
  type: RewardType
  label: string
  emoji: string
  weight: number
}

const REWARD_POOL: RewardOption[] = [
  { type: 'spins', label: '5 Spin Tickets', emoji: '🎫', weight: 30 },
  { type: 'coins', label: '300 Coins', emoji: '💰', weight: 25 },
  { type: 'magnets', label: '5 Magnets', emoji: '🧲', weight: 15 },
  { type: 'bombs', label: '5 Bombs', emoji: '💣', weight: 15 },
  { type: '5x', label: '5x Multiplier', emoji: '✨', weight: 7.5 },
  { type: '2.5x', label: '2.5x Multiplier', emoji: '🌟', weight: 7.5 },
]

const ADMIN_CODES: Record<string, { reward: RewardType; label: string; emoji: string; uses: number }> = {
  '100Boom': { reward: 'bombs', label: '100 Bombs', emoji: '💣', uses: 1 },
  '1005x': { reward: '5x', label: '5x × 10 Uses', emoji: '✨', uses: 10 },
  '1002.5x': { reward: '2.5x', label: '2.5x × 10 Uses', emoji: '🌟', uses: 10 },
}

const MAX_COINS_PER_COUPON = 500
const MAX_MULTIPLIER_COUNT = 2

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// Generate day/night codes based on date
function generateDayCode(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `DAY${y}${m}${d}`
}

function generateNightCode(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `NIGHT${y}${m}${d}`
}

// 7-day rotation - offset the code by day of week
function getDayRotationIndex(): number {
  const now = new Date()
  return now.getDay() // 0-6
}

function getRotationSuffix(): string {
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return dayNames[getDayRotationIndex()]
}

function getTodayValidCodes(): string[] {
  const dayCode = generateDayCode()
  const nightCode = generateNightCode()
  return [dayCode, nightCode]
}

function getRandomReward(): RewardOption {
  const totalWeight = REWARD_POOL.reduce((sum, r) => sum + r.weight, 0)
  let random = Math.random() * totalWeight
  for (const reward of REWARD_POOL) {
    random -= reward.weight
    if (random <= 0) return reward
  }
  return REWARD_POOL[0]
}

function loadClaimedCoupons(): ClaimedCoupon[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem('claimedCoupons')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveClaimedCoupons(coupons: ClaimedCoupon[]) {
  localStorage.setItem('claimedCoupons', JSON.stringify(coupons))
}

function loadAdminCodesClaimed(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const data = localStorage.getItem('claimedAdminCoupons')
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveAdminCodesClaimed(codes: Record<string, boolean>) {
  localStorage.setItem('claimedAdminCoupons', JSON.stringify(codes))
}

function loadMultiplierCount(): { '5x': number; '2.5x': number } {
  if (typeof window === 'undefined') return { '5x': 0, '2.5x': 0 }
  try {
    const data = localStorage.getItem('multiplierCouponCount')
    return data ? JSON.parse(data) : { '5x': 0, '2.5x': 0 }
  } catch {
    return { '5x': 0, '2.5x': 0 }
  }
}

function saveMultiplierCount(counts: { '5x': number; '2.5x': number }) {
  localStorage.setItem('multiplierCouponCount', JSON.stringify(counts))
}

export function CouponCode({
  isOpen,
  onClose,
  coins,
  hammerCount,
  magnetCount,
  blastCount,
  spinTickets,
  onAddCoins,
  onAddPowerUp,
  onAddSpinTickets,
  onAddNotification,
}: CouponCodeProps) {
  const [codeInput, setCodeInput] = useState('')
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showReward, setShowReward] = useState<{ label: string; emoji: string } | null>(null)
  const [claimHistory, setClaimHistory] = useState<ClaimedCoupon[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('claimedCoupons')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  // Pick a random reward based on weights
  const pickRandomReward = useCallback((): RewardOption => {
    const totalWeight = REWARD_POOL.reduce((sum, r) => sum + r.weight, 0)
    let random = Math.random() * totalWeight
    for (const reward of REWARD_POOL) {
      random -= reward.weight
      if (random <= 0) return reward
    }
    return REWARD_POOL[0]
  }, [])

  // Apply a reward
  const applyReward = useCallback((reward: RewardOption) => {
    const multiplierCounts = loadMultiplierCount()

    switch (reward.type) {
      case 'spins':
        onAddSpinTickets(5)
        break
      case 'coins': {
        const coinAmount = Math.min(300, MAX_COINS_PER_COUPON)
        onAddCoins(coinAmount)
        break
      }
      case 'magnets':
        onAddPowerUp('magnet', 5)
        break
      case 'bombs':
        onAddPowerUp('blast', 5)
        break
      case '5x': {
        if (multiplierCounts['5x'] >= MAX_MULTIPLIER_COUNT) {
          // Already at max, give coins instead
          onAddCoins(200)
          onAddNotification('Coupon Reward', '5x multiplier max reached! Got 200 coins instead.', 'reward', '💰')
          return
        }
        multiplierCounts['5x']++
        saveMultiplierCount(multiplierCounts)
        // 5x multiplier - give as coins equivalent (500 coins)
        onAddCoins(500)
        onAddNotification('5x Multiplier!', 'You received a 5x multiplier reward! (+500 coins)', 'reward', '✨')
        break
      }
      case '2.5x': {
        if (multiplierCounts['2.5x'] >= MAX_MULTIPLIER_COUNT) {
          // Already at max, give coins instead
          onAddCoins(150)
          onAddNotification('Coupon Reward', '2.5x multiplier max reached! Got 150 coins instead.', 'reward', '💰')
          return
        }
        multiplierCounts['2.5x']++
        saveMultiplierCount(multiplierCounts)
        // 2.5x multiplier - give as coins equivalent (250 coins)
        onAddCoins(250)
        onAddNotification('2.5x Multiplier!', 'You received a 2.5x multiplier reward! (+250 coins)', 'reward', '🌟')
        break
      }
    }

    if (reward.type !== '5x' && reward.type !== '2.5x') {
      onAddNotification('Coupon Reward! 🎉', `You received ${reward.emoji} ${reward.label}!`, 'reward', '🎁')
    }
  }, [onAddCoins, onAddPowerUp, onAddSpinTickets, onAddNotification])

  // Handle admin code rewards
  const applyAdminReward = useCallback((code: string) => {
    const adminCode = ADMIN_CODES[code]
    if (!adminCode) return false

    // Check if already used
    try {
      const usedAdminCodes = JSON.parse(localStorage.getItem('usedAdminCoupons') || '{}')
      if (usedAdminCodes[code]) {
        setStatusMessage({ text: 'This admin code has already been used!', type: 'error' })
        return true
      }
      usedAdminCodes[code] = Date.now()
      localStorage.setItem('usedAdminCoupons', JSON.stringify(usedAdminCodes))
    } catch { /* ignore */ }

    // Apply reward based on admin code type
    switch (adminCode.reward) {
      case 'bombs':
        onAddPowerUp('blast', 100)
        break
      case '5x':
        onAddCoins(5000)
        break
      case '2.5x':
        onAddCoins(2500)
        break
    }

    setShowReward({ label: adminCode.label, emoji: adminCode.emoji })
    onAddNotification('Admin Reward! 🎉', `You received ${adminCode.emoji} ${adminCode.label}!`, 'reward', '🎁')
    return true
  }, [onAddCoins, onAddPowerUp, onAddNotification])

  // Handle claim
  const handleClaim = useCallback(() => {
    const code = codeInput.trim().toUpperCase()
    if (!code) {
      setStatusMessage({ text: 'Please enter a coupon code', type: 'error' })
      return
    }

    // Check admin codes first
    if (ADMIN_CODES[code]) {
      const handled = applyAdminReward(code)
      if (handled) {
        setCodeInput('')
        return
      }
    }

    // Check daily codes
    const validCodes = getTodayValidCodes()
    if (!validCodes.includes(code)) {
      setStatusMessage({ text: 'Invalid coupon code! Try today\'s code.', type: 'error' })
      return
    }

    // Check if already claimed today
    const today = getTodayStr()
    const alreadyClaimed = claimHistory.some(c => c.code === code && c.date === today)
    if (alreadyClaimed) {
      setStatusMessage({ text: 'You already claimed this code today!', type: 'error' })
      return
    }

    // Pick and apply random reward
    const reward = pickRandomReward()
    applyReward(reward)

    // Save to history (only daily codes, not admin codes)
    const newClaim: ClaimedCoupon = {
      code,
      date: today,
      reward: `${reward.emoji} ${reward.label}`,
      timestamp: Date.now(),
    }
    const updatedHistory = [newClaim, ...claimHistory].slice(0, 50)
    setClaimHistory(updatedHistory)
    localStorage.setItem('claimedCoupons', JSON.stringify(updatedHistory))

    // Show reward animation
    setShowReward({ label: reward.label, emoji: reward.emoji })
    setStatusMessage({ text: `Code redeemed! ${reward.emoji} ${reward.label}`, type: 'success' })
    setCodeInput('')
  }, [codeInput, claimHistory, pickRandomReward, applyReward, applyAdminReward])

  const dayCode = generateDayCode()
  const nightCode = generateNightCode()
  const rotationDay = getRotationSuffix()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4" style={{ color: '#EDC22E' }} />
                <h3 className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Coupon Code</h3>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Reward animation overlay */}
            <AnimatePresence>
              {showReward && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
                  style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
                  onClick={() => setShowReward(null)}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="text-center p-6"
                  >
                    <span className="text-6xl block mb-3">{showReward.emoji}</span>
                    <p className="text-lg font-bold" style={{ color: '#EDC22E' }}>{showReward.label}</p>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Tap to continue</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-3 space-y-3">
              {/* Today's codes hint */}
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.12)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Gift className="w-3 h-3" style={{ color: '#EDC22E' }} />
                  <p className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>Today&apos;s Codes ({rotationDay})</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 px-2 py-1.5 rounded text-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(237,194,46,0.2)' }}>
                    <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Day Code</p>
                    <p className="text-[10px] font-bold tracking-wide" style={{ color: '#FFD700' }}>{dayCode}</p>
                  </div>
                  <div className="flex-1 px-2 py-1.5 rounded text-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(237,194,46,0.2)' }}>
                    <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Night Code</p>
                    <p className="text-[10px] font-bold tracking-wide" style={{ color: '#00E676' }}>{nightCode}</p>
                  </div>
                </div>
              </div>

              {/* Input + Claim button */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase())
                    setStatusMessage(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleClaim()}
                  placeholder="Enter code here..."
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                  }}
                />
                <button
                  onClick={handleClaim}
                  className="px-4 py-2 rounded-lg text-[10px] font-bold transition-transform active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 10px rgba(237,194,46,0.3)',
                  }}
                >
                  CLAIM
                </button>
              </div>

              {/* Status message */}
              {statusMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  style={{
                    backgroundColor: statusMessage.type === 'success' ? 'rgba(0,230,118,0.08)' :
                      statusMessage.type === 'error' ? 'rgba(246,94,59,0.08)' : 'rgba(237,194,46,0.08)',
                    border: `1px solid ${statusMessage.type === 'success' ? 'rgba(0,230,118,0.15)' :
                      statusMessage.type === 'error' ? 'rgba(246,94,59,0.15)' : 'rgba(237,194,46,0.15)'}`,
                  }}
                >
                  {statusMessage.type === 'success' ? (
                    <Check className="w-3 h-3" style={{ color: '#00E676' }} />
                  ) : statusMessage.type === 'error' ? (
                    <AlertCircle className="w-3 h-3" style={{ color: '#F65E3B' }} />
                  ) : (
                    <AlertCircle className="w-3 h-3" style={{ color: '#EDC22E' }} />
                  )}
                  <p className="text-[9px] font-semibold" style={{
                    color: statusMessage.type === 'success' ? '#00E676' :
                      statusMessage.type === 'error' ? '#F65E3B' : '#EDC22E',
                  }}>
                    {statusMessage.text}
                  </p>
                </motion.div>
              )}

              {/* Info */}
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  • One claim per day per code • 7-day rotation of daily codes
                  <br />• Max {MAX_COINS_PER_COUPON} coins per coupon • Max {MAX_MULTIPLIER_COUNT}x multiplier rewards
                  <br />• Rewards: 🎫 Spins / 💰 Coins / 🧲 Magnets / 💣 Bombs / ✨ 5x / 🌟 2.5x
                </p>
              </div>

              {/* Claim History */}
              {claimHistory.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Claim History</p>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {claimHistory.slice(0, 20).map((claim, i) => (
                      <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono" style={{ color: '#EDC22E' }}>{claim.code}</span>
                          <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{claim.date}</span>
                        </div>
                        <span className="text-[8px] font-semibold" style={{ color: '#00E676' }}>{claim.reward}</span>
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
