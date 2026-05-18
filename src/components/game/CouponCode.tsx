'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, Ticket, Check, AlertCircle, Shield, Clock, ChevronRight, Trash2, Plus, Settings, Eye, Ban, ThumbsUp, Sparkles } from 'lucide-react'

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
type RewardType = 'spins' | 'coins' | 'magnets' | 'bombs' | 'hammers' | '5x' | '2.5x'

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

interface AdminCodeDef {
  reward: RewardType
  label: string
  emoji: string
  uses: number
}

const BUILT_IN_ADMIN_CODES: Record<string, AdminCodeDef> = {
  '100Boom': { reward: 'bombs', label: '100 Bombs', emoji: '💣', uses: 1 },
  '1005x': { reward: '5x', label: '5x × 10 Uses', emoji: '✨', uses: 10 },
  '1002.5x': { reward: '2.5x', label: '2.5x × 10 Uses', emoji: '🌟', uses: 10 },
}

const MAX_COINS_PER_COUPON = 500
const MAX_MULTIPLIER_COUNT = 2

// Secret admin access code - NEVER displayed in UI
const ADMIN_ACCESS_CODE = 'ADMIN.IN'

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

// Purchase history type matching Store.tsx
interface PurchaseHistoryEntry {
  id: string
  date: string
  item: string
  amount: string
  status: 'Pending' | 'Delivered' | 'Denied'
  type: 'coins' | 'ability' | 'inr_ability'
  transactionId?: string
  whatsappNumber?: string
  buyerName?: string
  screenshotDataUrl?: string
  coinAmount?: number
  abilityType?: string
  abilityCount?: number
}

function loadPurchaseHistory(): PurchaseHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem('purchaseHistory')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function savePurchaseHistory(history: PurchaseHistoryEntry[]) {
  localStorage.setItem('purchaseHistory', JSON.stringify(history))
}

// Custom admin-created coupon codes
interface CustomCouponCode {
  code: string
  reward: RewardType
  rewardAmount: number
  label: string
  emoji: string
  maxUses: number
  currentUses: number
  isDayCode: boolean
  isNightCode: boolean
  createdAt: number
}

function loadCustomCouponCodes(): CustomCouponCode[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem('adminCustomCouponCodes')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveCustomCouponCodes(codes: CustomCouponCode[]) {
  localStorage.setItem('adminCustomCouponCodes', JSON.stringify(codes))
}

// Night code settings
interface NightCodeSettings {
  rewardType: RewardType
  rewardAmount: number
  label: string
  emoji: string
}

function loadNightCodeSettings(): NightCodeSettings {
  if (typeof window === 'undefined') return { rewardType: 'coins', rewardAmount: 300, label: '300 Coins', emoji: '💰' }
  try {
    const data = localStorage.getItem('adminNightCodeSettings')
    return data ? JSON.parse(data) : { rewardType: 'coins', rewardAmount: 300, label: '300 Coins', emoji: '💰' }
  } catch {
    return { rewardType: 'coins', rewardAmount: 300, label: '300 Coins', emoji: '💰' }
  }
}

function saveNightCodeSettings(settings: NightCodeSettings) {
  localStorage.setItem('adminNightCodeSettings', JSON.stringify(settings))
}

// Coin amount mapping for purchases
function getCoinAmountFromItem(item: string): number {
  // New INR coin packages
  if (item.includes('1,20,000')) return 120000
  if (item.includes('62,000')) return 62000
  if (item.includes('25,000')) return 25000
  if (item.includes('11,999')) return 11999
  if (item.includes('4,999')) return 4999
  if (item.includes('2,500')) return 2500
  // Legacy coin packages (kept for backward compatibility)
  if (item.includes('50,000')) return 50000
  if (item.includes('15,000')) return 15000
  if (item.includes('5,000')) return 5000
  if (item.includes('1,500')) return 1500
  if (item.includes('500')) return 500
  // Default: try to parse number from item string
  const match = item.match(/(\d[\d,]*)/)
  if (match) return parseInt(match[1].replace(/,/g, ''), 10)
  return 500
}

type AdminTab = 'payments' | 'coupons' | 'nightcode'

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

  // Admin panel state
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminTab, setAdminTab] = useState<AdminTab>('payments')
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryEntry[]>(() => loadPurchaseHistory())
  const [customCodes, setCustomCodes] = useState<CustomCouponCode[]>(() => loadCustomCouponCodes())
  const [nightCodeSettings, setNightCodeSettings] = useState<NightCodeSettings>(() => loadNightCodeSettings())

  // New coupon form state
  const [newCodeInput, setNewCodeInput] = useState('')
  const [newCodeRewardType, setNewCodeRewardType] = useState<RewardType>('coins')
  const [newCodeRewardAmount, setNewCodeRewardAmount] = useState(300)
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(1)
  const [newCodeIsDay, setNewCodeIsDay] = useState(false)
  const [newCodeIsNight, setNewCodeIsNight] = useState(false)

  // Night code settings form
  const [ncRewardType, setNcRewardType] = useState<RewardType>(nightCodeSettings.rewardType)
  const [ncRewardAmount, setNcRewardAmount] = useState(nightCodeSettings.rewardAmount)

  // Refresh admin data when panel opens
  useEffect(() => {
    if (showAdminPanel) {
      setPurchaseHistory(loadPurchaseHistory())
      setCustomCodes(loadCustomCouponCodes())
      setNightCodeSettings(loadNightCodeSettings())
      setNcRewardType(loadNightCodeSettings().rewardType)
      setNcRewardAmount(loadNightCodeSettings().rewardAmount)
    }
  }, [showAdminPanel])

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
          onAddCoins(200)
          onAddNotification('Coupon Reward', '5x multiplier max reached! Got 200 coins instead.', 'reward', '💰')
          return
        }
        multiplierCounts['5x']++
        saveMultiplierCount(multiplierCounts)
        onAddCoins(500)
        onAddNotification('5x Multiplier!', 'You received a 5x multiplier reward! (+500 coins)', 'reward', '✨')
        break
      }
      case '2.5x': {
        if (multiplierCounts['2.5x'] >= MAX_MULTIPLIER_COUNT) {
          onAddCoins(150)
          onAddNotification('Coupon Reward', '2.5x multiplier max reached! Got 150 coins instead.', 'reward', '💰')
          return
        }
        multiplierCounts['2.5x']++
        saveMultiplierCount(multiplierCounts)
        onAddCoins(250)
        onAddNotification('2.5x Multiplier!', 'You received a 2.5x multiplier reward! (+250 coins)', 'reward', '🌟')
        break
      }
    }

    if (reward.type !== '5x' && reward.type !== '2.5x') {
      onAddNotification('Coupon Reward! 🎉', `You received ${reward.emoji} ${reward.label}!`, 'reward', '🎁')
    }
  }, [onAddCoins, onAddPowerUp, onAddSpinTickets, onAddNotification])

  // Apply custom coupon reward
  const applyCustomReward = useCallback((code: CustomCouponCode) => {
    switch (code.reward) {
      case 'spins':
        onAddSpinTickets(code.rewardAmount)
        break
      case 'coins':
        onAddCoins(code.rewardAmount)
        break
      case 'magnets':
        onAddPowerUp('magnet', code.rewardAmount)
        break
      case 'bombs':
        onAddPowerUp('blast', code.rewardAmount)
        break
      case 'hammers':
        onAddPowerUp('hammer', code.rewardAmount)
        break
      case '5x':
        onAddCoins(code.rewardAmount)
        break
      case '2.5x':
        onAddCoins(code.rewardAmount)
        break
    }
    onAddNotification('Coupon Reward! 🎉', `You received ${code.emoji} ${code.label}!`, 'reward', '🎁')
  }, [onAddCoins, onAddPowerUp, onAddSpinTickets, onAddNotification])

  // Handle admin code rewards (built-in)
  const applyAdminReward = useCallback((code: string) => {
    const adminCode = BUILT_IN_ADMIN_CODES[code]
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
      case 'hammers':
        onAddPowerUp('hammer', 100)
        break
      case 'magnets':
        onAddPowerUp('magnet', 100)
        break
      case 'spins':
        onAddSpinTickets(50)
        break
      case 'coins':
        onAddCoins(5000)
        break
    }

    setShowReward({ label: adminCode.label, emoji: adminCode.emoji })
    onAddNotification('Admin Reward! 🎉', `You received ${adminCode.emoji} ${adminCode.label}!`, 'reward', '🎁')
    return true
  }, [onAddCoins, onAddPowerUp, onAddSpinTickets, onAddNotification])

  // Handle claim
  const handleClaim = useCallback(() => {
    const code = codeInput.trim().toUpperCase()
    if (!code) {
      setStatusMessage({ text: 'Please enter a coupon code', type: 'error' })
      return
    }

    // Check for admin access code FIRST (before any other check)
    if (code === ADMIN_ACCESS_CODE) {
      setShowAdminPanel(true)
      setCodeInput('')
      setStatusMessage(null)
      return
    }

    // Check built-in admin codes
    if (BUILT_IN_ADMIN_CODES[code]) {
      const handled = applyAdminReward(code)
      if (handled) {
        setCodeInput('')
        return
      }
    }

    // Check custom coupon codes
    const customCode = customCodes.find(c => c.code.toUpperCase() === code)
    if (customCode) {
      if (customCode.currentUses >= customCode.maxUses) {
        setStatusMessage({ text: 'This code has reached its max uses!', type: 'error' })
        return
      }
      // Apply the custom reward
      applyCustomReward(customCode)
      // Update usage count
      const updatedCodes = customCodes.map(c =>
        c.code === customCode.code ? { ...c, currentUses: c.currentUses + 1 } : c
      )
      setCustomCodes(updatedCodes)
      saveCustomCouponCodes(updatedCodes)

      // Save to claim history
      const today = getTodayStr()
      const newClaim: ClaimedCoupon = {
        code,
        date: today,
        reward: `${customCode.emoji} ${customCode.label}`,
        timestamp: Date.now(),
      }
      const updatedHistory = [newClaim, ...claimHistory].slice(0, 50)
      setClaimHistory(updatedHistory)
      saveClaimedCoupons(updatedHistory)

      setShowReward({ label: customCode.label, emoji: customCode.emoji })
      setStatusMessage({ text: `Code redeemed! ${customCode.emoji} ${customCode.label}`, type: 'success' })
      setCodeInput('')
      return
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

    // Save to history
    const newClaim: ClaimedCoupon = {
      code,
      date: today,
      reward: `${reward.emoji} ${reward.label}`,
      timestamp: Date.now(),
    }
    const updatedHistory = [newClaim, ...claimHistory].slice(0, 50)
    setClaimHistory(updatedHistory)
    saveClaimedCoupons(updatedHistory)

    // Show reward animation
    setShowReward({ label: reward.label, emoji: reward.emoji })
    setStatusMessage({ text: `Code redeemed! ${reward.emoji} ${reward.label}`, type: 'success' })
    setCodeInput('')
  }, [codeInput, claimHistory, customCodes, pickRandomReward, applyReward, applyAdminReward, applyCustomReward])

  // ===== ADMIN PANEL HANDLERS =====

  // Approve a purchase
  const handleApprovePurchase = useCallback((entry: PurchaseHistoryEntry) => {
    const purchaseDate = new Date(entry.date).getTime()
    const now = Date.now()
    const hoursSincePurchase = (now - purchaseDate) / (1000 * 60 * 60)
    const isDelayed = hoursSincePurchase > 12

    if (entry.type === 'inr_ability') {
      // INR ability purchase (5x/2.5x) - mark as delivered
      const updated = purchaseHistory.map(p =>
        p.id === entry.id ? { ...p, status: 'Delivered' as const } : p
      )
      setPurchaseHistory(updated)
      savePurchaseHistory(updated)

      const bonusText = isDelayed ? ` (+50% bonus for ${Math.floor(hoursSincePurchase)}hr delay!)` : ''
      onAddNotification(
        'Ability Approved! ✅',
        `${entry.item} delivered!${bonusText}`,
        'reward',
        '📦'
      )
    } else {
      // Coin or coin-price ability purchase
      let coinAmount = entry.coinAmount || getCoinAmountFromItem(entry.item)
      if (isDelayed) {
        coinAmount = Math.floor(coinAmount * 1.5) // 50% bonus for delayed
      }

      onAddCoins(coinAmount)

      // Update purchase status
      const updated = purchaseHistory.map(p =>
        p.id === entry.id ? { ...p, status: 'Delivered' as const } : p
      )
      setPurchaseHistory(updated)
      savePurchaseHistory(updated)

      const bonusText = isDelayed ? ` (+50% bonus for ${Math.floor(hoursSincePurchase)}hr delay!)` : ''
      onAddNotification(
        'Order Approved! ✅',
        `${entry.item} delivered! ${coinAmount} coins added${bonusText}`,
        'reward',
        '📦'
      )
    }
  }, [purchaseHistory, onAddCoins, onAddNotification])

  // Deny a purchase
  const handleDenyPurchase = useCallback((entry: PurchaseHistoryEntry) => {
    const updated = purchaseHistory.map(p =>
      p.id === entry.id ? { ...p, status: 'Denied' as const } : p
    )
    setPurchaseHistory(updated)
    savePurchaseHistory(updated)
  }, [purchaseHistory])

  // Create a custom coupon code
  const handleCreateCoupon = useCallback(() => {
    const code = newCodeInput.trim().toUpperCase()
    if (!code) return
    if (BUILT_IN_ADMIN_CODES[code]) return
    if (customCodes.some(c => c.code === code)) return

    const emojiMap: Record<RewardType, string> = {
      coins: '💰', spins: '🎫', magnets: '🧲', bombs: '💣', hammers: '🔨', '5x': '✨', '2.5x': '🌟',
    }
    const labelMap: Record<RewardType, string> = {
      coins: `${newCodeRewardAmount} Coins`,
      spins: `${newCodeRewardAmount} Spin Tickets`,
      magnets: `${newCodeRewardAmount} Magnets`,
      bombs: `${newCodeRewardAmount} Bombs`,
      hammers: `${newCodeRewardAmount} Hammers`,
      '5x': `5x × ${newCodeRewardAmount} Uses`,
      '2.5x': `2.5x × ${newCodeRewardAmount} Uses`,
    }

    const newCode: CustomCouponCode = {
      code,
      reward: newCodeRewardType,
      rewardAmount: newCodeRewardAmount,
      label: labelMap[newCodeRewardType],
      emoji: emojiMap[newCodeRewardType],
      maxUses: newCodeMaxUses,
      currentUses: 0,
      isDayCode: newCodeIsDay,
      isNightCode: newCodeIsNight,
      createdAt: Date.now(),
    }

    const updated = [...customCodes, newCode]
    setCustomCodes(updated)
    saveCustomCouponCodes(updated)

    // Reset form
    setNewCodeInput('')
    setNewCodeRewardType('coins')
    setNewCodeRewardAmount(300)
    setNewCodeMaxUses(1)
    setNewCodeIsDay(false)
    setNewCodeIsNight(false)
  }, [newCodeInput, newCodeRewardType, newCodeRewardAmount, newCodeMaxUses, newCodeIsDay, newCodeIsNight, customCodes])

  // Delete a custom coupon code
  const handleDeleteCoupon = useCallback((code: string) => {
    const updated = customCodes.filter(c => c.code !== code)
    setCustomCodes(updated)
    saveCustomCouponCodes(updated)
  }, [customCodes])

  // Save night code settings
  const handleSaveNightCodeSettings = useCallback(() => {
    const emojiMap: Record<RewardType, string> = {
      coins: '💰', spins: '🎫', magnets: '🧲', bombs: '💣', hammers: '🔨', '5x': '✨', '2.5x': '🌟',
    }
    const labelMap: Record<RewardType, string> = {
      coins: `${ncRewardAmount} Coins`,
      spins: `${ncRewardAmount} Spin Tickets`,
      magnets: `${ncRewardAmount} Magnets`,
      bombs: `${ncRewardAmount} Bombs`,
      hammers: `${ncRewardAmount} Hammers`,
      '5x': `5x × ${ncRewardAmount} Uses`,
      '2.5x': `2.5x × ${ncRewardAmount} Uses`,
    }
    const settings: NightCodeSettings = {
      rewardType: ncRewardType,
      rewardAmount: ncRewardAmount,
      label: labelMap[ncRewardType],
      emoji: emojiMap[ncRewardType],
    }
    setNightCodeSettings(settings)
    saveNightCodeSettings(settings)
  }, [ncRewardType, ncRewardAmount])

  const dayCode = generateDayCode()
  const nightCode = generateNightCode()
  const rotationDay = getRotationSuffix()

  const pendingPurchases = purchaseHistory.filter(p => p.status === 'Pending')
  const allPurchases = purchaseHistory

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

            {/* Admin Panel Overlay */}
            <AnimatePresence>
              {showAdminPanel && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 rounded-2xl overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)' }}
                >
                  {/* Admin Header */}
                  <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" style={{ color: '#FF7A00' }} />
                      <h3 className="text-sm font-bold" style={{ color: '#FF7A00' }}>Admin Panel</h3>
                    </div>
                    <button onClick={() => setShowAdminPanel(false)} className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                      <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                    </button>
                  </div>

                  {/* Admin Tabs */}
                  <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {[
                      { key: 'payments' as AdminTab, label: 'Payments', icon: <Clock className="w-3 h-3" /> },
                      { key: 'coupons' as AdminTab, label: 'Coupons', icon: <Ticket className="w-3 h-3" /> },
                      { key: 'nightcode' as AdminTab, label: 'Night Code', icon: <Sparkles className="w-3 h-3" /> },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setAdminTab(tab.key)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 transition-all"
                        style={{
                          borderBottom: adminTab === tab.key ? '2px solid #FF7A00' : '2px solid transparent',
                          color: adminTab === tab.key ? '#FF7A00' : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        {tab.icon}
                        <span className="text-[8px] font-bold">{tab.label}</span>
                        {tab.key === 'payments' && pendingPurchases.length > 0 && (
                          <span className="text-[6px] px-1 py-0.5 rounded-full" style={{ backgroundColor: '#F65E3B', color: '#FFFFFF' }}>
                            {pendingPurchases.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 100px)' }}>
                    {/* ====== PAYMENTS TAB ====== */}
                    {adminTab === 'payments' && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          Pending Approvals ({pendingPurchases.length})
                        </p>

                        {pendingPurchases.length === 0 ? (
                          <div className="text-center py-4">
                            <span className="text-2xl block mb-1">✅</span>
                            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No pending purchases</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                            {pendingPurchases.map(entry => {
                              const hoursSince = (Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60)
                              const isDelayed = hoursSince > 12
                              const coinAmount = entry.coinAmount || getCoinAmountFromItem(entry.item)
                              const bonusAmount = isDelayed ? Math.floor(coinAmount * 0.5) : 0

                              return (
                                <div key={entry.id} className="p-2.5 rounded-lg"
                                  style={{
                                    backgroundColor: isDelayed ? 'rgba(246,94,59,0.08)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isDelayed ? 'rgba(246,94,59,0.25)' : 'rgba(255,255,255,0.06)'}`,
                                  }}>
                                  {/* Delayed warning */}
                                  {isDelayed && (
                                    <div className="flex items-center gap-1 mb-1.5 px-1.5 py-1 rounded"
                                      style={{ backgroundColor: 'rgba(246,94,59,0.1)' }}>
                                      <span className="text-[10px]">⚠️</span>
                                      <span className="text-[7px] font-bold" style={{ color: '#F65E3B' }}>
                                        12hr+ delay - give 50% bonus! (+{bonusAmount} coins)
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-start justify-between mb-1.5">
                                    <div>
                                      <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{entry.item}</p>
                                      <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {entry.amount} • {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                                      style={{ backgroundColor: 'rgba(237,194,46,0.1)', color: '#EDC22E' }}>
                                      {Math.floor(hoursSince)}h ago
                                    </span>
                                  </div>

                                  {/* Details */}
                                  <div className="space-y-0.5 mb-2">
                                    {entry.transactionId && (
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        📋 TXN: <span className="font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.transactionId}</span>
                                      </p>
                                    )}
                                    {entry.whatsappNumber && (
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        📱 WhatsApp: <span style={{ color: '#00E676' }}>{entry.whatsappNumber}</span>
                                      </p>
                                    )}
                                    {(entry.buyerName || entry.name) && (
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        👤 Name: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.buyerName || entry.name}</span>
                                      </p>
                                    )}
                                    {entry.type === 'inr_ability' ? (
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        ⚡ Ability: <span style={{ color: '#FF6D00' }}>{entry.abilityType}</span>
                                        {entry.abilityCount && <span style={{ color: 'rgba(255,255,255,0.5)' }}> × {entry.abilityCount}</span>}
                                      </p>
                                    ) : (
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        💰 Coins: <span style={{ color: '#EDC22E' }}>{coinAmount}</span>
                                        {isDelayed && <span style={{ color: '#00E676' }}> + {bonusAmount} bonus</span>}
                                      </p>
                                    )}
                                    {entry.screenshotDataUrl && (
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        📸 Screenshot: <span style={{ color: '#00E676' }}>Uploaded</span>
                                      </p>
                                    )}
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => handleApprovePurchase(entry)}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                                      style={{
                                        background: 'linear-gradient(135deg, #00E676, #00C853)',
                                        color: '#FFFFFF',
                                        boxShadow: '0 2px 8px rgba(0,230,118,0.3)',
                                      }}
                                    >
                                      <ThumbsUp className="w-3 h-3" /> APPROVE
                                    </button>
                                    <button
                                      onClick={() => handleDenyPurchase(entry)}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                                      style={{
                                        background: 'linear-gradient(135deg, #F65E3B, #D32F2F)',
                                        color: '#FFFFFF',
                                        boxShadow: '0 2px 8px rgba(246,94,59,0.3)',
                                      }}
                                    >
                                      <Ban className="w-3 h-3" /> DENY
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* All purchase history (non-pending) */}
                        {allPurchases.filter(p => p.status !== 'Pending').length > 0 && (
                          <div className="mt-3">
                            <p className="text-[9px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              Recent Processed
                            </p>
                            <div className="max-h-32 overflow-y-auto space-y-1" style={{ scrollbarWidth: 'thin' }}>
                              {allPurchases.filter(p => p.status !== 'Pending').slice(0, 15).map(entry => (
                                <div key={entry.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  <div>
                                    <p className="text-[8px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.item}</p>
                                    <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                      {new Date(entry.date).toLocaleDateString()} • {entry.amount}
                                    </p>
                                  </div>
                                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: entry.status === 'Delivered' ? 'rgba(0,230,118,0.1)' : 'rgba(246,94,59,0.1)',
                                      color: entry.status === 'Delivered' ? '#00E676' : '#F65E3B',
                                    }}>
                                    {entry.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ====== COUPONS TAB ====== */}
                    {adminTab === 'coupons' && (
                      <div className="space-y-3">
                        {/* Built-in admin codes */}
                        <div>
                          <p className="text-[9px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Built-in Admin Codes
                          </p>
                          <div className="space-y-1">
                            {Object.entries(BUILT_IN_ADMIN_CODES).map(([code, def]) => {
                              const usedCount = (() => {
                                try {
                                  const used = JSON.parse(localStorage.getItem('usedAdminCoupons') || '{}')
                                  return used[code] ? 1 : 0
                                } catch { return 0 }
                              })()
                              return (
                                <div key={code} className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{def.emoji}</span>
                                    <div>
                                      <p className="text-[9px] font-bold font-mono" style={{ color: '#EDC22E' }}>{code}</p>
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {def.label} • Uses: {usedCount}/{def.uses}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: usedCount >= def.uses ? 'rgba(246,94,59,0.1)' : 'rgba(0,230,118,0.1)',
                                      color: usedCount >= def.uses ? '#F65E3B' : '#00E676',
                                    }}>
                                    {usedCount >= def.uses ? 'Used' : 'Active'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Create new coupon code */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Plus className="w-3 h-3" style={{ color: '#FF7A00' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#FF7A00' }}>Create New Code</p>
                          </div>

                          <div className="space-y-1.5">
                            {/* Code name */}
                            <input
                              type="text"
                              value={newCodeInput}
                              onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
                              placeholder="Code name (e.g. FREE500)"
                              className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-semibold outline-none"
                              style={{
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#FFFFFF',
                              }}
                            />

                            {/* Reward type */}
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Reward:</p>
                              <select
                                value={newCodeRewardType}
                                onChange={(e) => setNewCodeRewardType(e.target.value as RewardType)}
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#FFFFFF',
                                }}
                              >
                                <option value="coins">💰 Coins</option>
                                <option value="spins">🎫 Spin Tickets</option>
                                <option value="magnets">🧲 Magnets</option>
                                <option value="bombs">💣 Bombs</option>
                                <option value="hammers">🔨 Hammers</option>
                                <option value="5x">✨ 5x Multiplier</option>
                                <option value="2.5x">🌟 2.5x Multiplier</option>
                              </select>
                            </div>

                            {/* Reward amount */}
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Amount:</p>
                              <input
                                type="number"
                                value={newCodeRewardAmount}
                                onChange={(e) => setNewCodeRewardAmount(parseInt(e.target.value) || 0)}
                                min={1}
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#FFFFFF',
                                }}
                              />
                            </div>

                            {/* Max uses */}
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Max Uses:</p>
                              <input
                                type="number"
                                value={newCodeMaxUses}
                                onChange={(e) => setNewCodeMaxUses(parseInt(e.target.value) || 1)}
                                min={1}
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#FFFFFF',
                                }}
                              />
                            </div>

                            {/* Day/Night code toggles */}
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newCodeIsDay}
                                  onChange={(e) => setNewCodeIsDay(e.target.checked)}
                                  className="w-3 h-3 accent-yellow-500"
                                />
                                <span className="text-[7px] font-semibold" style={{ color: '#FFD700' }}>Day Code</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newCodeIsNight}
                                  onChange={(e) => setNewCodeIsNight(e.target.checked)}
                                  className="w-3 h-3 accent-green-500"
                                />
                                <span className="text-[7px] font-semibold" style={{ color: '#00E676' }}>Night Code</span>
                              </label>
                            </div>

                            <button
                              onClick={handleCreateCoupon}
                              disabled={!newCodeInput.trim()}
                              className="w-full py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                              style={{
                                background: newCodeInput.trim() ? 'linear-gradient(135deg, #FF7A00, #EDC22E)' : 'rgba(255,255,255,0.06)',
                                color: newCodeInput.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                                boxShadow: newCodeInput.trim() ? '0 2px 10px rgba(255,165,0,0.3)' : 'none',
                              }}
                            >
                              CREATE CODE
                            </button>
                          </div>
                        </div>

                        {/* Custom codes list */}
                        {customCodes.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              Custom Codes ({customCodes.length})
                            </p>
                            <div className="space-y-1 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                              {customCodes.map(code => (
                                <div key={code.code} className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{code.emoji}</span>
                                    <div>
                                      <div className="flex items-center gap-1">
                                        <p className="text-[9px] font-bold font-mono" style={{ color: '#EDC22E' }}>{code.code}</p>
                                        {code.isDayCode && (
                                          <span className="text-[6px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,215,0,0.1)', color: '#FFD700' }}>DAY</span>
                                        )}
                                        {code.isNightCode && (
                                          <span className="text-[6px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,230,118,0.1)', color: '#00E676' }}>NIGHT</span>
                                        )}
                                      </div>
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {code.label} • Uses: {code.currentUses}/{code.maxUses}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteCoupon(code.code)}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform active:scale-95"
                                    style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.2)' }}
                                  >
                                    <Trash2 className="w-3 h-3" style={{ color: '#F65E3B' }} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ====== NIGHT CODE TAB ====== */}
                    {adminTab === 'nightcode' && (
                      <div className="space-y-3">
                        {/* Today's night code preview */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Eye className="w-3 h-3" style={{ color: '#00E676' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#00E676' }}>Tonight&apos;s Code Preview</p>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(0,230,118,0.2)' }}>
                            <div>
                              <p className="text-[10px] font-bold font-mono" style={{ color: '#00E676' }}>{nightCode}</p>
                              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Will distribute: {nightCodeSettings.emoji} {nightCodeSettings.label}
                              </p>
                            </div>
                            <span className="text-lg">{nightCodeSettings.emoji}</span>
                          </div>
                        </div>

                        {/* Night code reward settings */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Settings className="w-3 h-3" style={{ color: '#FF7A00' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#FF7A00' }}>Night Code Reward Settings</p>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Type:</p>
                              <select
                                value={ncRewardType}
                                onChange={(e) => setNcRewardType(e.target.value as RewardType)}
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#FFFFFF',
                                }}
                              >
                                <option value="coins">💰 Coins</option>
                                <option value="spins">🎫 Spin Tickets</option>
                                <option value="magnets">🧲 Magnets</option>
                                <option value="bombs">💣 Bombs</option>
                                <option value="hammers">🔨 Hammers</option>
                                <option value="5x">✨ 5x Multiplier</option>
                                <option value="2.5x">🌟 2.5x Multiplier</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Amount:</p>
                              <input
                                type="number"
                                value={ncRewardAmount}
                                onChange={(e) => setNcRewardAmount(parseInt(e.target.value) || 0)}
                                min={1}
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#FFFFFF',
                                }}
                              />
                            </div>

                            <button
                              onClick={handleSaveNightCodeSettings}
                              className="w-full py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                              style={{
                                background: 'linear-gradient(135deg, #00E676, #00C853)',
                                color: '#FFFFFF',
                                boxShadow: '0 2px 10px rgba(0,230,118,0.3)',
                              }}
                            >
                              SAVE NIGHT CODE SETTINGS
                            </button>
                          </div>
                        </div>

                        {/* Current settings display */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-[9px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Current Night Code Distribution
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="px-2 py-1.5 rounded-lg text-center"
                              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-lg">{nightCodeSettings.emoji}</p>
                              <p className="text-[8px] font-bold" style={{ color: '#FFFFFF' }}>{nightCodeSettings.label}</p>
                            </div>
                            <div className="px-2 py-1.5 rounded-lg text-center"
                              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-lg">🌙</p>
                              <p className="text-[8px] font-bold" style={{ color: '#00E676' }}>Night Code</p>
                              <p className="text-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Changes daily</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
