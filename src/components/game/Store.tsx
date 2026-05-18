'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Coins, Zap, Clock, Tv, Upload, Image as ImageIcon, Copy, Check } from 'lucide-react'
import { getRandomLink } from '@/components/ads/AdOverlay'

interface StoreProps {
  isOpen: boolean
  onClose: () => void
  coins: number
  hammerCount: number
  magnetCount: number
  blastCount: number
  spinTickets: number
  playerId: string
  onAddCoins: (amount: number) => void
  onAddPowerUp: (pu: 'hammer' | 'magnet' | 'blast', count: number) => void
  onAddUndos: (count: number) => void
  onAddSpinTickets: (count: number) => void
  onAddNotification: (title: string, message: string, type: string, emoji: string) => void
}

interface PurchaseHistoryEntry {
  id: string
  date: string
  item: string
  amount: string
  status: 'Pending' | 'Delivered'
  type: 'coins' | 'ability' | 'inr_ability'
  transactionId?: string
  whatsappNumber?: string
  buyerName?: string
  screenshotDataUrl?: string
  coinAmount?: number
  abilityType?: string
  abilityCount?: number
}

// Coin packages (INR prices) - Updated
const DEFAULT_COIN_PACKAGES = [
  { coins: 2500, price: 3, label: '2,500 Coins', color: '#EDC22E' },
  { coins: 4999, price: 5, label: '4,999 Coins', color: '#FF7A00' },
  { coins: 11999, price: 10, label: '11,999 Coins', color: '#00E676' },
  { coins: 25000, price: 19, label: '25,000 Coins', color: '#00FFFF', popular: true },
  { coins: 62000, price: 49, label: '62,000 Coins', color: '#FF69B4' },
  { coins: 120000, price: 99, label: '1,20,000 Coins', color: '#E040FB' },
]

// Load coin packages with admin price overrides (including coin amount overrides)
function getCoinPackages(): typeof DEFAULT_COIN_PACKAGES {
  if (typeof window === 'undefined') return DEFAULT_COIN_PACKAGES
  try {
    const data = localStorage.getItem('adminCustomPrices')
    if (!data) return DEFAULT_COIN_PACKAGES
    const overrides: { coinPackages: { coins: number; price: number; label?: string }[] } = JSON.parse(data)
    if (!overrides.coinPackages) return DEFAULT_COIN_PACKAGES
    return DEFAULT_COIN_PACKAGES.map((pkg, idx) => {
      const override = overrides.coinPackages[idx]
      if (!override) return pkg
      const newCoins = override.coins || pkg.coins
      const newLabel = newCoins !== pkg.coins ? `${newCoins.toLocaleString()} Coins` : pkg.label
      return { ...pkg, coins: newCoins, price: override.price, label: newLabel }
    })
  } catch { return DEFAULT_COIN_PACKAGES }
}

// Ability packages (coin prices) - Keep existing
const ABILITY_PACKAGES = [
  { type: 'hammer' as const, count: 5, cost: 100, emoji: '🔨', label: '5 Hammers', color: '#F59563' },
  { type: 'magnet' as const, count: 5, cost: 100, emoji: '🧲', label: '5 Magnets', color: '#00E676' },
  { type: 'blast' as const, count: 5, cost: 150, emoji: '💣', label: '5 Bombs', color: '#FF7A00' },
  { type: 'undo' as const, count: 10, cost: 50, emoji: '↩️', label: '10 Undos', color: '#00FFFF' },
  { type: 'spin' as const, count: 5, cost: 200, emoji: '🎫', label: '5 Spin Tickets', color: '#EDC22E' },
]

// INR Ability packages (5x and 2.5x)
const DEFAULT_INR_ABILITY_PACKAGES = [
  // 5x Ability
  { type: '5x' as const, uses: 1, price: 20, label: '5x × 1', emoji: '✖️', color: '#FF6D00', category: '5x' },
  { type: '5x' as const, uses: 5, price: 80, label: '5x × 5', emoji: '✖️', color: '#FF6D00', category: '5x' },
  { type: '5x' as const, uses: 10, price: 149, label: '5x × 10', emoji: '✖️', color: '#FF6D00', category: '5x' },
  // 2.5x Ability
  { type: '2.5x' as const, uses: 1, price: 10, label: '2.5x × 1', emoji: '✨', color: '#7C4DFF', category: '2.5x' },
  { type: '2.5x' as const, uses: 5, price: 40, label: '2.5x × 5', emoji: '✨', color: '#7C4DFF', category: '2.5x' },
  { type: '2.5x' as const, uses: 10, price: 75, label: '2.5x × 10', emoji: '✨', color: '#7C4DFF', category: '2.5x' },
]

// Load INR ability packages with admin price overrides
function getInrAbilityPackages(): typeof DEFAULT_INR_ABILITY_PACKAGES {
  if (typeof window === 'undefined') return DEFAULT_INR_ABILITY_PACKAGES
  try {
    const data = localStorage.getItem('adminCustomPrices')
    if (!data) return DEFAULT_INR_ABILITY_PACKAGES
    const overrides: { inrAbilityPackages: { type: string; uses: number; price: number }[] } = JSON.parse(data)
    if (!overrides.inrAbilityPackages) return DEFAULT_INR_ABILITY_PACKAGES
    return DEFAULT_INR_ABILITY_PACKAGES.map((pkg, idx) => {
      const override = overrides.inrAbilityPackages[idx]
      return override ? { ...pkg, price: override.price } : pkg
    })
  } catch { return DEFAULT_INR_ABILITY_PACKAGES }
}

// Free ad reward options (basic abilities only)
const FREE_AD_REWARDS = [
  { type: 'blast', count: 1, label: '1 Bomb', emoji: '💣', weight: 30 },
  { type: 'hammer', count: 1, label: '1 Hammer', emoji: '🔨', weight: 30 },
  { type: 'magnet', count: 1, label: '1 Magnet', emoji: '🧲', weight: 25 },
  { type: 'undo', count: 3, label: '3 Undos', emoji: '↩️', weight: 15 },
]

const UPI_ID = '7668122925@mbk'
const BIWEEKLY_ABILITY_LIMIT = 20

type StoreTab = 'coins' | 'abilities' | 'history'

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

function getWeekNumber(): number {
  const now = new Date()
  const start = new Date(2025, 0, 6)
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
}

// 2-week cycle number for biweekly tracking
function getBiweeklyCycle(): number {
  const now = new Date()
  const start = new Date(2025, 0, 6)
  return Math.floor((now.getTime() - start.getTime()) / (14 * 24 * 60 * 60 * 1000)) + 1
}

function getFreeAdRewardCount(): { week: number; count: number } {
  if (typeof window === 'undefined') return { week: getWeekNumber(), count: 0 }
  try {
    const data = localStorage.getItem('freeAdRewardsWeek')
    if (!data) return { week: getWeekNumber(), count: 0 }
    const parsed = JSON.parse(data)
    const currentWeek = getWeekNumber()
    if (parsed.week !== currentWeek) {
      return { week: currentWeek, count: 0 }
    }
    return { week: currentWeek, count: parsed.count || 0 }
  } catch {
    return { week: getWeekNumber(), count: 0 }
  }
}

function saveFreeAdRewardCount(week: number, count: number) {
  localStorage.setItem('freeAdRewardsWeek', JSON.stringify({ week, count }))
}

// Biweekly INR ability purchase tracking
interface BiweeklyAbilityPurchases {
  cycle: number
  '5x': number
  '2.5x': number
}

function getBiweeklyAbilityPurchases(): BiweeklyAbilityPurchases {
  const currentCycle = getBiweeklyCycle()
  if (typeof window === 'undefined') return { cycle: currentCycle, '5x': 0, '2.5x': 0 }
  try {
    const data = localStorage.getItem('biweeklyAbilityPurchases')
    if (!data) return { cycle: currentCycle, '5x': 0, '2.5x': 0 }
    const parsed = JSON.parse(data)
    if (parsed.cycle !== currentCycle) {
      return { cycle: currentCycle, '5x': 0, '2.5x': 0 }
    }
    return { cycle: currentCycle, '5x': parsed['5x'] || 0, '2.5x': parsed['2.5x'] || 0 }
  } catch {
    return { cycle: currentCycle, '5x': 0, '2.5x': 0 }
  }
}

function saveBiweeklyAbilityPurchases(data: BiweeklyAbilityPurchases) {
  localStorage.setItem('biweeklyAbilityPurchases', JSON.stringify(data))
}

// Biweekly coin-ability purchase tracking (hammer, magnet, bomb, undo, spin)
interface BiweeklyCoinAbilityPurchases {
  cycle: number
  hammer: number
  magnet: number
  blast: number
  undo: number
  spin: number
}

function getBiweeklyCoinAbilityPurchases(): BiweeklyCoinAbilityPurchases {
  const currentCycle = getBiweeklyCycle()
  if (typeof window === 'undefined') return { cycle: currentCycle, hammer: 0, magnet: 0, blast: 0, undo: 0, spin: 0 }
  try {
    const data = localStorage.getItem('biweeklyCoinAbilityPurchases')
    if (!data) return { cycle: currentCycle, hammer: 0, magnet: 0, blast: 0, undo: 0, spin: 0 }
    const parsed = JSON.parse(data)
    if (parsed.cycle !== currentCycle) {
      return { cycle: currentCycle, hammer: 0, magnet: 0, blast: 0, undo: 0, spin: 0 }
    }
    return { cycle: currentCycle, hammer: parsed.hammer || 0, magnet: parsed.magnet || 0, blast: parsed.blast || 0, undo: parsed.undo || 0, spin: parsed.spin || 0 }
  } catch {
    return { cycle: currentCycle, hammer: 0, magnet: 0, blast: 0, undo: 0, spin: 0 }
  }
}

function saveBiweeklyCoinAbilityPurchases(data: BiweeklyCoinAbilityPurchases) {
  localStorage.setItem('biweeklyCoinAbilityPurchases', JSON.stringify(data))
}

// Check if a pending purchase is older than 12 hours
function isPendingOver12Hours(dateStr: string): boolean {
  const purchaseDate = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - purchaseDate.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours > 12
}

export function Store({
  isOpen,
  onClose,
  coins,
  hammerCount,
  magnetCount,
  blastCount,
  spinTickets,
  playerId,
  onAddCoins,
  onAddPowerUp,
  onAddUndos,
  onAddSpinTickets,
  onAddNotification,
}: StoreProps) {
  const [activeTab, setActiveTab] = useState<StoreTab>('coins')
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryEntry[]>(() => loadPurchaseHistory())
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentItem, setPaymentItem] = useState<{
    label: string
    price: number
    type: 'coins' | '5x' | '2.5x'
    coins?: number
    uses?: number
  } | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    whatsappNumber: '',
    name: '',
    amountPaid: '',
    screenshotFile: null as File | null,
  })
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [adWatching, setAdWatching] = useState(false)
  const [adCountdown, setAdCountdown] = useState(0)
  const [freeAdInfo, setFreeAdInfo] = useState(() => getFreeAdRewardCount())
  const [biweeklyAbilities, setBiweeklyAbilities] = useState(() => getBiweeklyAbilityPurchases())
  const [biweeklyCoinAbilities, setBiweeklyCoinAbilities] = useState(() => getBiweeklyCoinAbilityPurchases())
  const [upiCopied, setUpiCopied] = useState(false)

  // Handle coin package purchase - open payment dialog
  const handleBuyCoins = useCallback((pkg: typeof DEFAULT_COIN_PACKAGES[0]) => {
    setPaymentItem({
      label: pkg.label,
      price: pkg.price,
      type: 'coins',
      coins: pkg.coins,
    })
    setPaymentForm(prev => ({ ...prev, amountPaid: String(pkg.price) }))
    setScreenshotPreview(null)
    setShowPaymentDialog(true)
  }, [])

  // Handle INR ability purchase - open payment dialog
  const handleBuyInrAbility = useCallback((ability: typeof DEFAULT_INR_ABILITY_PACKAGES[0]) => {
    const biweeklyData = getBiweeklyAbilityPurchases()
    const currentCount = biweeklyData[ability.category] || 0
    if (currentCount >= BIWEEKLY_ABILITY_LIMIT) {
      onAddNotification('Purchase Limit Reached', '2-week limit reached (20/cycle). Come back next cycle!', 'system', '⏰')
      return
    }

    setPaymentItem({
      label: ability.label,
      price: ability.price,
      type: ability.type,
      uses: ability.uses,
    })
    setPaymentForm(prev => ({ ...prev, amountPaid: String(ability.price) }))
    setScreenshotPreview(null)
    setShowPaymentDialog(true)
  }, [onAddNotification])

  // Handle screenshot file selection
  const handleScreenshotChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPaymentForm(prev => ({ ...prev, screenshotFile: file }))

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Resize to save localStorage space - max 200x200
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 200
        let w = img.width
        let h = img.height
        if (w > h) { h = (h / w) * maxSize; w = maxSize }
        else { w = (w / h) * maxSize; h = maxSize }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, w, h)
        setScreenshotPreview(canvas.toDataURL('image/jpeg', 0.5))
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  }, [])

  // Submit payment form
  const handleSubmitPayment = useCallback(() => {
    if (!paymentItem) return
    if (!paymentForm.whatsappNumber.trim() || !paymentForm.name.trim()) return

    const entry: PurchaseHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      item: paymentItem.label,
      amount: `₹${paymentItem.price}`,
      status: 'Pending',
      type: paymentItem.type === 'coins' ? 'coins' : 'inr_ability',
      whatsappNumber: paymentForm.whatsappNumber.trim(),
      buyerName: paymentForm.name.trim(),
      screenshotDataUrl: screenshotPreview || undefined,
      coinAmount: paymentItem.type === 'coins' ? paymentItem.coins : undefined,
      abilityType: paymentItem.type !== 'coins' ? paymentItem.type : undefined,
      abilityCount: paymentItem.uses,
    }

    const updated = [entry, ...purchaseHistory].slice(0, 50)
    setPurchaseHistory(updated)
    savePurchaseHistory(updated)

    // Update biweekly ability purchases if applicable
    if (paymentItem.type === '5x' || paymentItem.type === '2.5x') {
      const biweeklyData = getBiweeklyAbilityPurchases()
      biweeklyData[paymentItem.type] = (biweeklyData[paymentItem.type] || 0) + (paymentItem.uses || 1)
      saveBiweeklyAbilityPurchases(biweeklyData)
      setBiweeklyAbilities(biweeklyData)
    }

    setShowPaymentDialog(false)
    setPaymentItem(null)
    setPaymentForm({ whatsappNumber: '', name: '', amountPaid: '', screenshotFile: null })
    setScreenshotPreview(null)

    onAddNotification(
      'Order Placed! 📦',
      `Your order will be delivered within 12 hours. If delayed, you'll get 50% extra coins!`,
      'system',
      '🛒'
    )
  }, [paymentItem, paymentForm, screenshotPreview, purchaseHistory, onAddNotification])

  // Buy ability with coins
  const handleBuyAbility = useCallback((ability: typeof ABILITY_PACKAGES[0]) => {
    if (coins < ability.cost) {
      onAddNotification('Not Enough Coins', `You need ${ability.cost} coins. You have ${coins}.`, 'system', '💰')
      return
    }

    // Check biweekly limit for coin-ability purchases (3 purchases per 2 weeks = max 15 items)
    const coinAbilityData = getBiweeklyCoinAbilityPurchases()
    const maxCoinAbilityPurchases = 3 // 3 purchases per 2-week cycle
    const currentPurchases = coinAbilityData[ability.type] || 0
    if (currentPurchases >= maxCoinAbilityPurchases) {
      onAddNotification('Purchase Limit', `${ability.label}: 3 purchases per 2 weeks max. Come back next cycle!`, 'system', '⏰')
      return
    }

    // Deduct coins
    onAddCoins(-ability.cost)

    // Add the ability
    switch (ability.type) {
      case 'hammer':
        onAddPowerUp('hammer', ability.count)
        break
      case 'magnet':
        onAddPowerUp('magnet', ability.count)
        break
      case 'blast':
        onAddPowerUp('blast', ability.count)
        break
      case 'undo':
        onAddUndos(ability.count)
        break
      case 'spin':
        onAddSpinTickets(ability.count)
        break
    }

    // Track coin-ability purchase
    const updatedCoinAbilities = { ...coinAbilityData }
    updatedCoinAbilities[ability.type] = (updatedCoinAbilities[ability.type] || 0) + 1
    saveBiweeklyCoinAbilityPurchases(updatedCoinAbilities)
    setBiweeklyCoinAbilities(updatedCoinAbilities)

    // Save to history
    const entry: PurchaseHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      item: `${ability.emoji} ${ability.label}`,
      amount: `${ability.cost} 💰`,
      status: 'Delivered',
      type: 'ability',
    }
    const updated = [entry, ...purchaseHistory].slice(0, 50)
    setPurchaseHistory(updated)
    savePurchaseHistory(updated)

    onAddNotification('Purchase Complete!', `You bought ${ability.emoji} ${ability.label} for ${ability.cost} coins!`, 'reward', '🛒')
  }, [coins, purchaseHistory, onAddCoins, onAddPowerUp, onAddUndos, onAddSpinTickets, onAddNotification])

  // Free ad reward
  const handleWatchAd = useCallback(() => {
    const info = getFreeAdRewardCount()
    if (info.count >= 2) {
      onAddNotification('Weekly Limit', 'You\'ve used 2 free ad rewards this week. Come back next week!', 'system', '⏰')
      return
    }

    // Open ad link
    try {
      window.open(getRandomLink(), '_blank')
    } catch { /* popup blocked */ }

    // Start countdown
    setAdWatching(true)
    setAdCountdown(5)
  }, [onAddNotification])

  // Countdown timer for ad watching
  useEffect(() => {
    if (!adWatching || adCountdown <= 0) return
    const timer = setTimeout(() => {
      setAdCountdown(prev => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [adWatching, adCountdown])

  // Detect return from ad tab
  useEffect(() => {
    if (!adWatching) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && adCountdown > 0) {
        setAdCountdown(prev => Math.min(prev, 2))
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [adWatching, adCountdown])

  // Claim ad reward
  const handleClaimAdReward = useCallback(() => {
    const totalWeight = FREE_AD_REWARDS.reduce((s, r) => s + r.weight, 0)
    let random = Math.random() * totalWeight
    let reward = FREE_AD_REWARDS[0]
    for (const r of FREE_AD_REWARDS) {
      random -= r.weight
      if (random <= 0) { reward = r; break }
    }

    // Apply reward
    switch (reward.type) {
      case 'hammer':
        onAddPowerUp('hammer', reward.count)
        break
      case 'magnet':
        onAddPowerUp('magnet', reward.count)
        break
      case 'blast':
        onAddPowerUp('blast', reward.count)
        break
      case 'undo':
        onAddUndos(reward.count)
        break
    }

    // Update free ad count
    const info = getFreeAdRewardCount()
    const newCount = info.count + 1
    saveFreeAdRewardCount(getWeekNumber(), newCount)
    setFreeAdInfo({ week: getWeekNumber(), count: newCount })

    onAddNotification('Free Reward! 🎁', `You got ${reward.emoji} ${reward.label} for watching an ad!`, 'reward', '📺')
    setAdWatching(false)
  }, [onAddPowerUp, onAddUndos, onAddNotification])

  // Refresh data on tab change
  const handleTabChange = useCallback((tab: StoreTab) => {
    setActiveTab(tab)
    setBiweeklyAbilities(getBiweeklyAbilityPurchases())
    setBiweeklyCoinAbilities(getBiweeklyCoinAbilityPurchases())
    setPurchaseHistory(loadPurchaseHistory())
  }, [])

  const tabs: { key: StoreTab; label: string; icon: React.ReactNode }[] = [
    { key: 'coins', label: 'Coins', icon: <Coins className="w-3 h-3" /> },
    { key: 'abilities', label: 'Abilities', icon: <Zap className="w-3 h-3" /> },
    { key: 'history', label: 'History', icon: <Clock className="w-3 h-3" /> },
  ]

  const freeAdUsesLeft = 2 - freeAdInfo.count

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
                <ShoppingCart className="w-4 h-4" style={{ color: '#EDC22E' }} />
                <h3 className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Store</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg"
                  style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1px solid rgba(237,194,46,0.2)' }}>
                  <Coins className="w-3 h-3" style={{ color: '#EDC22E' }} />
                  <span className="text-[10px] font-extrabold" style={{ color: '#EDC22E' }}>{coins}</span>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 transition-all"
                  style={{
                    borderBottom: activeTab === tab.key ? '2px solid #EDC22E' : '2px solid transparent',
                    color: activeTab === tab.key ? '#EDC22E' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {tab.icon}
                  <span className="text-[9px] font-bold">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-3">
              {/* ====== COINS TAB ====== */}
              {activeTab === 'coins' && (
                <div className="space-y-2">
                  {getCoinPackages().map(pkg => (
                    <div key={pkg.coins} className="flex items-center justify-between p-2.5 rounded-lg relative"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${pkg.color}20` }}>
                      {pkg.popular && (
                        <div className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full text-[7px] font-extrabold"
                          style={{ backgroundColor: '#EDC22E', color: '#000000' }}>
                          POPULAR
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${pkg.color}15`, border: `1px solid ${pkg.color}30` }}>
                          <Coins className="w-4 h-4" style={{ color: pkg.color }} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{pkg.label}</p>
                          <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>₹{pkg.price}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBuyCoins(pkg)}
                        className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                        style={{
                          background: `linear-gradient(135deg, ${pkg.color}, ${pkg.color}CC)`,
                          color: '#FFFFFF',
                          boxShadow: `0 2px 8px ${pkg.color}40`,
                        }}
                      >
                        BUY ₹{pkg.price}
                      </button>
                    </div>
                  ))}

                  {/* Delivery info */}
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(0,230,118,0.04)', border: '1px solid rgba(0,230,118,0.1)' }}>
                    <p className="text-[8px]" style={{ color: '#00E676' }}>
                      📦 Delivery within 12 hours • 50% extra coins if delayed!
                    </p>
                  </div>
                </div>
              )}

              {/* ====== ABILITIES TAB ====== */}
              {activeTab === 'abilities' && (
                <div className="space-y-2">
                  {/* Free Ad Reward Section */}
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.12)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5" style={{ color: '#00E676' }} />
                        <p className="text-[9px] font-bold" style={{ color: '#00E676' }}>Free Ad Reward</p>
                      </div>
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,230,118,0.1)', color: '#00E676' }}>
                        {freeAdUsesLeft}/2 this week
                      </span>
                    </div>
                    <p className="text-[7px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Watch a short ad to get a free ability! 💣🔨🧲↩️
                    </p>

                    {adWatching ? (
                      adCountdown > 0 ? (
                        <div className="w-full py-2.5 rounded-lg text-center"
                          style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1px solid rgba(237,194,46,0.2)' }}>
                          <p className="text-[10px] font-semibold" style={{ color: '#EDC22E' }}>
                            ⏳ Watching... {adCountdown}s
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={handleClaimAdReward}
                          className="w-full py-2.5 rounded-lg text-[10px] font-bold transition-transform active:scale-95"
                          style={{
                            background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
                            color: '#FFFFFF',
                            boxShadow: '0 2px 10px rgba(237,194,46,0.3)',
                          }}
                        >
                          🎁 CLAIM REWARD
                        </button>
                      )
                    ) : (
                      <button
                        onClick={handleWatchAd}
                        disabled={freeAdUsesLeft <= 0}
                        className="w-full py-2 rounded-lg text-[10px] font-bold transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                        style={{
                          background: freeAdUsesLeft > 0 ? 'linear-gradient(135deg, #00E676, #00C853)' : 'rgba(255,255,255,0.05)',
                          color: freeAdUsesLeft > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                          opacity: freeAdUsesLeft > 0 ? 1 : 0.5,
                        }}
                      >
                        <Tv className="w-3 h-3" />
                        {freeAdUsesLeft > 0 ? 'Watch Ad for Free Reward' : 'Limit Reached (Next Week)'}
                      </button>
                    )}
                  </div>

                  {/* INR Ability Packages - 5x Section */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1 pt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]">✖️</span>
                        <p className="text-[9px] font-bold" style={{ color: '#FF6D00' }}>5x Multiplier</p>
                      </div>
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,109,0,0.1)', color: '#FF6D00' }}>
                        {BIWEEKLY_ABILITY_LIMIT - (biweeklyAbilities['5x'] || 0)} left (2wk)
                      </span>
                    </div>
                    {getInrAbilityPackages().filter(a => a.category === '5x').map((ability, idx) => {
                      const remaining = BIWEEKLY_ABILITY_LIMIT - (biweeklyAbilities['5x'] || 0)
                      const disabled = remaining <= 0
                      return (
                        <div key={`5x-${idx}`} className="flex items-center justify-between p-2 rounded-lg"
                          style={{
                            backgroundColor: disabled ? 'rgba(255,255,255,0.01)' : 'rgba(255,109,0,0.03)',
                            border: `1px solid ${disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,109,0,0.12)'}`,
                            opacity: disabled ? 0.5 : 1,
                          }}>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{ability.emoji}</span>
                            <div>
                              <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{ability.label}</p>
                              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>₹{ability.price}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleBuyInrAbility(ability)}
                            disabled={disabled}
                            className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                            style={{
                              background: disabled ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #FF6D00, #E65100)',
                              color: disabled ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
                              boxShadow: disabled ? 'none' : '0 2px 8px rgba(255,109,0,0.3)',
                            }}
                          >
                            BUY ₹{ability.price}
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* INR Ability Packages - 2.5x Section */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1 pt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]">✨</span>
                        <p className="text-[9px] font-bold" style={{ color: '#7C4DFF' }}>2.5x Multiplier</p>
                      </div>
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(124,77,255,0.1)', color: '#7C4DFF' }}>
                        {BIWEEKLY_ABILITY_LIMIT - (biweeklyAbilities['2.5x'] || 0)} left (2wk)
                      </span>
                    </div>
                    {getInrAbilityPackages().filter(a => a.category === '2.5x').map((ability, idx) => {
                      const remaining = BIWEEKLY_ABILITY_LIMIT - (biweeklyAbilities['2.5x'] || 0)
                      const disabled = remaining <= 0
                      return (
                        <div key={`2.5x-${idx}`} className="flex items-center justify-between p-2 rounded-lg"
                          style={{
                            backgroundColor: disabled ? 'rgba(255,255,255,0.01)' : 'rgba(124,77,255,0.03)',
                            border: `1px solid ${disabled ? 'rgba(255,255,255,0.04)' : 'rgba(124,77,255,0.12)'}`,
                            opacity: disabled ? 0.5 : 1,
                          }}>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{ability.emoji}</span>
                            <div>
                              <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{ability.label}</p>
                              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>₹{ability.price}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleBuyInrAbility(ability)}
                            disabled={disabled}
                            className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                            style={{
                              background: disabled ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7C4DFF, #651FFF)',
                              color: disabled ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
                              boxShadow: disabled ? 'none' : '0 2px 8px rgba(124,77,255,0.3)',
                            }}
                          >
                            BUY ₹{ability.price}
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    <span className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>COIN PRICES</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                  </div>

                  {/* Coin-price Ability packages */}
                  <div className="space-y-1.5">
                    {ABILITY_PACKAGES.map(ability => {
                      const canAfford = coins >= ability.cost
                      const currentCount = ability.type === 'hammer' ? hammerCount :
                        ability.type === 'magnet' ? magnetCount :
                        ability.type === 'blast' ? blastCount :
                        ability.type === 'spin' ? spinTickets : 0
                      const maxCoinPurchases = 3
                      const coinPurchasesLeft = maxCoinPurchases - (biweeklyCoinAbilities[ability.type] || 0)
                      const isCoinLimited = coinPurchasesLeft <= 0
                      return (
                        <div key={ability.type + ability.count} className="flex items-center justify-between p-2 rounded-lg"
                          style={{
                            backgroundColor: canAfford && !isCoinLimited ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                            border: `1px solid ${canAfford && !isCoinLimited ? `${ability.color}20` : 'rgba(255,255,255,0.04)'}`,
                            opacity: canAfford && !isCoinLimited ? 1 : 0.6,
                          }}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{ability.emoji}</span>
                            <div>
                              <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{ability.label}</p>
                              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Have: {currentCount} • Cost: {ability.cost} 💰
                              </p>
                              <p className="text-[6px]" style={{ color: isCoinLimited ? '#F65E3B' : 'rgba(255,255,255,0.25)' }}>
                                {isCoinLimited ? 'Limit reached (2wk)' : `${coinPurchasesLeft} buys left (2wk)`}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleBuyAbility(ability)}
                            disabled={!canAfford || isCoinLimited}
                            className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                            style={{
                              background: canAfford && !isCoinLimited ? `linear-gradient(135deg, ${ability.color}, ${ability.color}CC)` : 'rgba(255,255,255,0.05)',
                              color: canAfford && !isCoinLimited ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                            }}
                          >
                            {ability.cost} 💰
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ====== HISTORY TAB ====== */}
              {activeTab === 'history' && (
                <div>
                  {purchaseHistory.length === 0 ? (
                    <div className="text-center py-6">
                      <span className="text-3xl block mb-2">📋</span>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>No purchase history yet</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                      {purchaseHistory.map(entry => {
                        const over12h = entry.status === 'Pending' && isPendingOver12Hours(entry.date)
                        return (
                          <div key={entry.id} className="p-2 rounded-lg"
                            style={{
                              backgroundColor: over12h ? 'rgba(237,194,46,0.04)' : 'rgba(255,255,255,0.02)',
                              border: over12h ? '1px solid rgba(237,194,46,0.15)' : '1px solid rgba(255,255,255,0.04)',
                            }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[9px] font-semibold" style={{ color: '#FFFFFF' }}>{entry.item}</p>
                                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  {new Date(entry.date).toLocaleDateString()} • {entry.amount}
                                </p>
                              </div>
                              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: entry.status === 'Delivered' ? 'rgba(0,230,118,0.1)' : 'rgba(237,194,46,0.1)',
                                  color: entry.status === 'Delivered' ? '#00E676' : '#EDC22E',
                                }}>
                                {entry.status}
                              </span>
                            </div>
                            {over12h && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-[8px]" style={{ color: '#EDC22E' }}>⏰</span>
                                <span className="text-[7px] font-bold" style={{ color: '#EDC22E' }}>
                                  Eligible for 50% bonus!
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Dialog */}
            <AnimatePresence>
              {showPaymentDialog && paymentItem && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl p-3"
                  style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    className="w-full max-w-xs p-4 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <h4 className="text-sm font-bold mb-1 text-center" style={{ color: '#FFFFFF' }}>Complete Payment</h4>
                    <p className="text-[9px] mb-3 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {paymentItem.label} — ₹{paymentItem.price}
                    </p>

                    {/* UPI Payment Info */}
                    <div className="p-3 rounded-lg mb-3 text-center"
                      style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.15)' }}>
                      {/* QR Code Placeholder - styled to look like a QR code area */}
                      <div className="w-20 h-20 mx-auto mb-2 rounded-lg relative overflow-hidden"
                        style={{ backgroundColor: '#FFFFFF', border: '2px solid rgba(0,0,0,0.05)' }}>
                        {/* QR code pattern simulation */}
                        <div className="absolute inset-0 p-1.5">
                          <div className="w-full h-full relative">
                            {/* Corner squares */}
                            <div className="absolute top-0 left-0 w-5 h-5" style={{ border: '2px solid #1a0533' }}>
                              <div className="absolute top-1 left-1 w-2 h-2" style={{ backgroundColor: '#1a0533' }} />
                            </div>
                            <div className="absolute top-0 right-0 w-5 h-5" style={{ border: '2px solid #1a0533' }}>
                              <div className="absolute top-1 right-1 w-2 h-2" style={{ backgroundColor: '#1a0533' }} />
                            </div>
                            <div className="absolute bottom-0 left-0 w-5 h-5" style={{ border: '2px solid #1a0533' }}>
                              <div className="absolute bottom-1 left-1 w-2 h-2" style={{ backgroundColor: '#1a0533' }} />
                            </div>
                            {/* Data area dots */}
                            <div className="absolute top-1 left-7 grid grid-cols-3 gap-[2px]">
                              {[1,0,1,0,1,0,1,1,0].map((v, i) => (
                                <div key={i} className="w-[3px] h-[3px]" style={{ backgroundColor: v ? '#1a0533' : 'transparent' }} />
                              ))}
                            </div>
                            <div className="absolute top-7 left-1 grid grid-cols-4 gap-[2px]">
                              {[0,1,0,1,1,0,1,0,0,1,1,1].map((v, i) => (
                                <div key={i} className="w-[3px] h-[3px]" style={{ backgroundColor: v ? '#1a0533' : 'transparent' }} />
                              ))}
                            </div>
                            <div className="absolute bottom-1 right-1 grid grid-cols-3 gap-[2px]">
                              {[1,0,1,0,0,1,1,1,0].map((v, i) => (
                                <div key={i} className="w-[3px] h-[3px]" style={{ backgroundColor: v ? '#1a0533' : 'transparent' }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[8px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Pay via UPI to:</p>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded" style={{ color: '#EDC22E', backgroundColor: 'rgba(237,194,46,0.1)' }}>
                          {UPI_ID}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(UPI_ID)
                            setUpiCopied(true)
                            setTimeout(() => setUpiCopied(false), 2000)
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-90"
                          style={{ backgroundColor: upiCopied ? 'rgba(0,230,118,0.2)' : 'rgba(237,194,46,0.15)', border: '1px solid ' + (upiCopied ? 'rgba(0,230,118,0.3)' : 'rgba(237,194,46,0.25)') }}
                        >
                          {upiCopied ? (
                            <Check className="w-2.5 h-2.5" style={{ color: '#00E676' }} />
                          ) : (
                            <Copy className="w-2.5 h-2.5" style={{ color: '#EDC22E' }} />
                          )}
                        </button>
                      </div>
                      <p className="text-[8px] font-bold" style={{ color: '#FF7A00' }}>
                        Amount: ₹{paymentItem.price}
                      </p>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-2 mb-3">
                      <div>
                        <label className="text-[8px] font-semibold block mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          WhatsApp Number *
                        </label>
                        <input
                          type="tel"
                          value={paymentForm.whatsappNumber}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                          placeholder="Your WhatsApp number"
                          className="w-full px-3 py-1.5 rounded-lg text-[10px] font-semibold outline-none"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#FFFFFF',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-semibold block mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          Name *
                        </label>
                        <input
                          type="text"
                          value={paymentForm.name}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Your name"
                          className="w-full px-3 py-1.5 rounded-lg text-[10px] font-semibold outline-none"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#FFFFFF',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-semibold block mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          Amount (₹)
                        </label>
                        <div
                          className="w-full px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-between"
                          style={{
                            backgroundColor: 'rgba(237,194,46,0.06)',
                            border: '1px solid rgba(237,194,46,0.15)',
                            color: '#EDC22E',
                          }}
                        >
                          <span>₹{paymentItem.price}</span>
                          <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>🔒 Locked</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-semibold block mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          Screenshot (optional)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-semibold transition-transform active:scale-95"
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.5)',
                            }}
                          >
                            <Upload className="w-3 h-3" />
                            Upload
                          </button>
                          {screenshotPreview && (
                            <div className="w-8 h-8 rounded overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                              <img src={screenshotPreview} alt="Screenshot" className="w-full h-full object-cover" />
                            </div>
                          )}
                          {paymentForm.screenshotFile && !screenshotPreview && (
                            <div className="w-8 h-8 rounded flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)' }}>
                              <ImageIcon className="w-4 h-4" style={{ color: '#00E676' }} />
                            </div>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowPaymentDialog(false)
                          setPaymentItem(null)
                          setPaymentForm({ whatsappNumber: '', name: '', amountPaid: '', screenshotFile: null })
                          setScreenshotPreview(null)
                        }}
                        className="flex-1 py-2 rounded-lg text-[10px] font-semibold"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitPayment}
                        disabled={!paymentForm.whatsappNumber.trim() || !paymentForm.name.trim()}
                        className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-transform active:scale-95"
                        style={{
                          background: (paymentForm.whatsappNumber.trim() && paymentForm.name.trim())
                            ? 'linear-gradient(135deg, #EDC22E, #FF7A00)'
                            : 'rgba(255,255,255,0.06)',
                          color: (paymentForm.whatsappNumber.trim() && paymentForm.name.trim())
                            ? '#FFFFFF'
                            : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        SUBMIT
                      </button>
                    </div>

                    <p className="text-[7px] text-center mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      Your order will be delivered within 12 hours. If delayed, you&apos;ll get 50% extra coins!
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
