'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Coins, Zap, Clock, Check, AlertCircle, Tv } from 'lucide-react'
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
  type: 'coins' | 'ability'
  transactionId?: string
}

// Coin packages (INR prices)
const COIN_PACKAGES = [
  { coins: 500, price: 49, label: '500 Coins', color: '#EDC22E' },
  { coins: 1500, price: 129, label: '1,500 Coins', color: '#FF7A00' },
  { coins: 5000, price: 399, label: '5,000 Coins', color: '#00E676' },
  { coins: 15000, price: 999, label: '15,000 Coins', color: '#00FFFF' },
  { coins: 50000, price: 2999, label: '50,000 Coins', color: '#FF69B4' },
]

// Ability packages (coin prices)
const ABILITY_PACKAGES = [
  { type: 'hammer' as const, count: 5, cost: 100, emoji: '🔨', label: '5 Hammers', color: '#F59563' },
  { type: 'magnet' as const, count: 5, cost: 100, emoji: '🧲', label: '5 Magnets', color: '#00E676' },
  { type: 'blast' as const, count: 5, cost: 150, emoji: '💣', label: '5 Bombs', color: '#FF7A00' },
  { type: 'undo' as const, count: 10, cost: 50, emoji: '↩️', label: '10 Undos', color: '#00FFFF' },
  { type: 'spin' as const, count: 5, cost: 200, emoji: '🎫', label: '5 Spin Tickets', color: '#EDC22E' },
]

// Free ad reward options (basic abilities only)
const FREE_AD_REWARDS = [
  { type: 'blast', count: 1, label: '1 Bomb', emoji: '💣', weight: 30 },
  { type: 'hammer', count: 1, label: '1 Hammer', emoji: '🔨', weight: 30 },
  { type: 'magnet', count: 1, label: '1 Magnet', emoji: '🧲', weight: 25 },
  { type: 'undo', count: 3, label: '3 Undos', emoji: '↩️', weight: 15 },
]

const WHATSAPP_NUMBER = '919999999999'

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
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<typeof COIN_PACKAGES[0] | null>(null)
  const [transactionInput, setTransactionInput] = useState('')
  const [adWatching, setAdWatching] = useState(false)
  const [adCountdown, setAdCountdown] = useState(0)
  const [freeAdInfo, setFreeAdInfo] = useState(() => getFreeAdRewardCount())

  // Handle coin package purchase - open WhatsApp
  const handleBuyCoins = useCallback((pkg: typeof COIN_PACKAGES[0]) => {
    const message = `Hi! I want to buy ${pkg.label} (₹${pkg.price}). My Player ID: ${playerId}`
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    try {
      window.open(url, '_blank')
    } catch { /* popup blocked */ }
    setSelectedPackage(pkg)
    setShowTransactionDialog(true)
  }, [playerId])

  // Save transaction ID
  const handleSaveTransaction = useCallback(() => {
    if (!selectedPackage || !transactionInput.trim()) return

    const entry: PurchaseHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      item: selectedPackage.label,
      amount: `₹${selectedPackage.price}`,
      status: 'Pending',
      type: 'coins',
      transactionId: transactionInput.trim(),
    }

    const updated = [entry, ...purchaseHistory].slice(0, 50)
    setPurchaseHistory(updated)
    savePurchaseHistory(updated)
    setShowTransactionDialog(false)
    setTransactionInput('')
    setSelectedPackage(null)
    onAddNotification('Order Placed! 📦', `${selectedPackage.label} - Delivery within 12 hours. Transaction ID saved.`, 'system', '🛒')
  }, [selectedPackage, transactionInput, purchaseHistory, onAddNotification])

  // Buy ability with coins
  const handleBuyAbility = useCallback((ability: typeof ABILITY_PACKAGES[0]) => {
    if (coins < ability.cost) {
      onAddNotification('Not Enough Coins', `You need ${ability.cost} coins. You have ${coins}.`, 'system', '💰')
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

  // Countdown timer for ad watching - only decrements timer, no state cascading
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
        // Speed up countdown when user returns
        setAdCountdown(prev => Math.min(prev, 2))
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [adWatching, adCountdown])

  // Claim ad reward (called from click handler, not effect)
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
                  onClick={() => setActiveTab(tab.key)}
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
                  {COIN_PACKAGES.map(pkg => (
                    <div key={pkg.coins} className="flex items-center justify-between p-2.5 rounded-lg"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${pkg.color}20` }}>
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
                      📦 Delivery within 12 hours • Double compensation if delayed
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

                  {/* Ability packages */}
                  <div className="space-y-1.5">
                    {ABILITY_PACKAGES.map(ability => {
                      const canAfford = coins >= ability.cost
                      const currentCount = ability.type === 'hammer' ? hammerCount :
                        ability.type === 'magnet' ? magnetCount :
                        ability.type === 'blast' ? blastCount :
                        ability.type === 'spin' ? spinTickets : 0
                      return (
                        <div key={ability.type + ability.count} className="flex items-center justify-between p-2 rounded-lg"
                          style={{
                            backgroundColor: canAfford ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                            border: `1px solid ${canAfford ? `${ability.color}20` : 'rgba(255,255,255,0.04)'}`,
                            opacity: canAfford ? 1 : 0.6,
                          }}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{ability.emoji}</span>
                            <div>
                              <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{ability.label}</p>
                              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Have: {currentCount} • Cost: {ability.cost} 💰
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleBuyAbility(ability)}
                            disabled={!canAfford}
                            className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                            style={{
                              background: canAfford ? `linear-gradient(135deg, ${ability.color}, ${ability.color}CC)` : 'rgba(255,255,255,0.05)',
                              color: canAfford ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
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
                      {purchaseHistory.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
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
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Transaction ID Dialog */}
            <AnimatePresence>
              {showTransactionDialog && selectedPackage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl p-4"
                  style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    className="w-full max-w-xs p-4 rounded-xl text-center"
                    style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <h4 className="text-sm font-bold mb-1" style={{ color: '#FFFFFF' }}>Enter Transaction ID</h4>
                    <p className="text-[9px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      After completing payment for {selectedPackage.label}, enter your Transaction ID / UTR Number
                    </p>
                    <input
                      type="text"
                      value={transactionInput}
                      onChange={(e) => setTransactionInput(e.target.value)}
                      placeholder="Transaction ID / UTR Number"
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold outline-none mb-3"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowTransactionDialog(false); setTransactionInput('') }}
                        className="flex-1 py-2 rounded-lg text-[10px] font-semibold"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        Skip
                      </button>
                      <button
                        onClick={handleSaveTransaction}
                        disabled={!transactionInput.trim()}
                        className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-transform active:scale-95"
                        style={{
                          background: transactionInput.trim() ? 'linear-gradient(135deg, #EDC22E, #FF7A00)' : 'rgba(255,255,255,0.06)',
                          color: transactionInput.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        SAVE
                      </button>
                    </div>
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
