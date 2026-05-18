'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, Zap, Clock, MessageCircle, AlertCircle, Tv } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreProps {
  isOpen: boolean
  onClose: () => void
  playerId: string
  coins: number
  onAddNotification: (title: string, message: string, type: string, emoji: string) => void
  onDeductCoins: (amount: number) => void
  onAddPowerUp: (pu: 'hammer' | 'magnet' | 'blast' | 'multiplier5x' | 'multiplier2_5x' | 'extraTime', count: number) => void
  onAddUndos: (count: number) => void
}

interface CoinPack {
  id: string
  amount: number
  price: number
  tag?: { label: string; color: string }
}

interface AbilityItem {
  id: string
  emoji: string
  name: string
  quantity: number
  price: number
  tag?: { label: string; color: string }
  section: 'regular' | '5x' | '2.5x'
  currency: 'coin' | 'inr'
  abilityType?: 'hammer' | 'magnet' | 'blast' | 'timer' | 'undo'
}

interface StoreTransaction {
  id: string
  date: string
  item: string
  amount: number
  status: 'Pending' | 'Delivered' | 'Delayed - 2x Bonus!'
  transactionId: string
}

type TabId = 'coins' | 'ability' | 'history'

// ─── Data ────────────────────────────────────────────────────────────────────

const COIN_PACKS: CoinPack[] = [
  { id: 'coins-50k', amount: 50000, price: 10 },
  { id: 'coins-10k', amount: 10000, price: 19, tag: { label: 'POPULAR', color: '#00E676' } },
  { id: 'coins-30k', amount: 30000, price: 49 },
  { id: 'coins-80k', amount: 80000, price: 109, tag: { label: 'HOT', color: '#F65E3B' } },
  { id: 'coins-80k-best', amount: 80000, price: 109, tag: { label: 'BEST VALUE', color: '#EDC22E' } },
]

const REGULAR_ABILITIES: AbilityItem[] = [
  { id: 'bomb-5', emoji: '💣', name: 'Bomb', quantity: 5, price: 300, section: 'regular', currency: 'coin', abilityType: 'blast' },
  { id: 'magnet-5', emoji: '🧲', name: 'Magnet', quantity: 5, price: 150, section: 'regular', currency: 'coin', abilityType: 'magnet' },
  { id: 'hammer-5', emoji: '🔨', name: 'Hammer', quantity: 5, price: 150, section: 'regular', currency: 'coin', abilityType: 'hammer' },
  { id: 'timer-5', emoji: '⏱️', name: 'Timer (+10s)', quantity: 5, price: 200, section: 'regular', currency: 'coin', abilityType: 'timer' },
  { id: 'undo-5', emoji: '↩️', name: 'Undo', quantity: 5, price: 100, section: 'regular', currency: 'coin', abilityType: 'undo' },
]

const MULTIPLIER_5X: AbilityItem[] = [
  { id: '5x-5', emoji: '⚡', name: '5x Multiplier', quantity: 5, price: 20, section: '5x', currency: 'inr' },
  { id: '5x-15', emoji: '⚡', name: '5x Multiplier', quantity: 15, price: 55, section: '5x', tag: { label: 'HOT', color: '#F65E3B' }, currency: 'inr' },
  { id: '5x-35', emoji: '⚡', name: '5x Multiplier', quantity: 35, price: 100, section: '5x', currency: 'inr' },
  { id: '5x-80', emoji: '⚡', name: '5x Multiplier', quantity: 80, price: 189, section: '5x', tag: { label: 'HOT', color: '#F65E3B' }, currency: 'inr' },
]

const MULTIPLIER_2_5X: AbilityItem[] = [
  { id: '2.5x-5', emoji: '🔥', name: '2.5x Multiplier', quantity: 5, price: 20, section: '2.5x', currency: 'inr' },
  { id: '2.5x-15', emoji: '🔥', name: '2.5x Multiplier', quantity: 15, price: 55, section: '2.5x', tag: { label: 'HOT', color: '#F65E3B' }, currency: 'inr' },
  { id: '2.5x-35', emoji: '🔥', name: '2.5x Multiplier', quantity: 35, price: 100, section: '2.5x', currency: 'inr' },
  { id: '2.5x-80', emoji: '🔥', name: '2.5x Multiplier', quantity: 80, price: 189, section: '2.5x', tag: { label: 'HOT', color: '#F65E3B' }, currency: 'inr' },
]

const WHATSAPP_NUMBER = '919999999999'
const HISTORY_KEY = 'mergeMaster2048_storeHistory'
const PURCHASE_LIMIT_KEY = 'mergeMaster2048_abilityPurchaseLimits'
const MAX_ABILITY_PER_2WEEKS = 15 // Max of each ability per 2 weeks for coin purchases

// ─── Purchase Limit Tracking ─────────────────────────────────────────────────

interface PurchaseRecord {
  [abilityType: string]: { count: number; resetAt: string } // resetAt = ISO date when 2-week window expires
}

function loadPurchaseLimits(): PurchaseRecord {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PURCHASE_LIMIT_KEY)
    if (!raw) return {}
    const data: PurchaseRecord = JSON.parse(raw)
    // Clean up expired entries
    const now = Date.now()
    const cleaned: PurchaseRecord = {}
    for (const [key, val] of Object.entries(data)) {
      if (new Date(val.resetAt).getTime() > now) {
        cleaned[key] = val
      }
    }
    return cleaned
  } catch {
    return {}
  }
}

function savePurchaseLimits(data: PurchaseRecord) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PURCHASE_LIMIT_KEY, JSON.stringify(data))
}

function getRemainingPurchase(abilityType: string): number {
  const limits = loadPurchaseLimits()
  const record = limits[abilityType]
  if (!record) return MAX_ABILITY_PER_2WEEKS
  if (new Date(record.resetAt).getTime() <= Date.now()) return MAX_ABILITY_PER_2WEEKS
  return Math.max(0, MAX_ABILITY_PER_2WEEKS - record.count)
}

function recordPurchase(abilityType: string, quantity: number) {
  const limits = loadPurchaseLimits()
  const existing = limits[abilityType]
  const now = Date.now()
  const twoWeeks = 14 * 24 * 60 * 60 * 1000

  if (!existing || new Date(existing.resetAt).getTime() <= now) {
    // Start new 2-week window
    limits[abilityType] = { count: quantity, resetAt: new Date(now + twoWeeks).toISOString() }
  } else {
    limits[abilityType] = { ...existing, count: existing.count + quantity }
  }
  savePurchaseLimits(limits)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadHistory(): StoreTransaction[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(history: StoreTransaction[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function canWatchFreeAd(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const lastAd = localStorage.getItem('mergeMaster2048_lastFreeAd')
    if (!lastAd) return true
    const last = new Date(lastAd).getTime()
    const now = Date.now()
    const threeDays = 3 * 24 * 60 * 60 * 1000
    return now - last >= threeDays
  } catch {
    return true
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-IN')
}

function openWhatsApp(item: string, price: number, playerId: string) {
  const message = encodeURIComponent(
    `Hi! I want to purchase ${item} for ₹${price}. My Player ID: ${playerId}`
  )
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank')
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TagBadge({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide whitespace-nowrap z-10"
      style={{
        backgroundColor: color,
        color: '#FFFFFF',
        boxShadow: `0 2px 8px ${color}66`,
      }}
    >
      {label}
    </div>
  )
}

function BuyButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
        color: '#FFFFFF',
        boxShadow: '0 2px 12px rgba(237,194,46,0.3)',
      }}
    >
      <Zap className="w-3.5 h-3.5" />
      BUY
    </button>
  )
}

// ─── Coins Tab ───────────────────────────────────────────────────────────────

function CoinsTab({ playerId, onBuy }: { playerId: string; onBuy: (item: string, price: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {COIN_PACKS.map((pack, i) => (
        <motion.div
          key={pack.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
          className="relative flex flex-col items-center justify-between p-4 pt-5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: pack.tag ? `0 0 20px ${pack.tag.color}15` : 'none',
          }}
        >
          {pack.tag && <TagBadge label={pack.tag.label} color={pack.tag.color} />}
          <div className="text-center mb-3">
            <div className="text-2xl mb-1">💰</div>
            <p className="text-sm font-extrabold" style={{ color: '#EDC22E' }}>
              {formatNumber(pack.amount)}
            </p>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Coins</p>
          </div>
          <div className="w-full">
            <p className="text-center text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              ₹{pack.price}
            </p>
            <BuyButton
              onPress={() => onBuy(`${formatNumber(pack.amount)} Coins`, pack.price)}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Ability Card ────────────────────────────────────────────────────────────

function AbilityCard({
  item,
  onBuy,
  onCoinBuy,
  coins,
}: {
  item: AbilityItem
  onBuy: (item: string, price: number) => void
  onCoinBuy: (item: AbilityItem) => void
  coins: number
}) {
  const isCoinCurrency = item.currency === 'coin'
  const remaining = isCoinCurrency && item.abilityType ? getRemainingPurchase(item.abilityType) : null
  const canAfford = isCoinCurrency ? coins >= item.price : true
  const isLimitReached = remaining !== null && remaining <= 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex items-center justify-between p-3 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: isLimitReached ? 0.5 : 1,
      }}
    >
      {item.tag && <TagBadge label={item.tag.label} color={item.tag.color} />}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {item.emoji}
        </div>
        <div>
          <p className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
            {item.name}
          </p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            x{item.quantity}
          </p>
          {remaining !== null && (
            <p className="text-[8px]" style={{ color: remaining > 0 ? '#00E676' : '#F65E3B' }}>
              {remaining > 0 ? `${remaining} left this period` : 'Limit reached (2 weeks)'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold" style={{ color: isCoinCurrency ? '#EDC22E' : 'rgba(255,255,255,0.6)' }}>
          {isCoinCurrency ? `💰 ${formatNumber(item.price)}` : `₹${item.price}`}
        </span>
        <button
          onClick={() => isCoinCurrency ? onCoinBuy(item) : onBuy(`${item.emoji} ${item.name} x${item.quantity}`, item.price)}
          disabled={isCoinCurrency && (!canAfford || isLimitReached)}
          className="px-3 py-1.5 rounded-lg font-bold text-[10px] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isCoinCurrency
              ? 'linear-gradient(135deg, #EDC22E, #FFB300)'
              : 'linear-gradient(135deg, #EDC22E, #FF7A00)',
            color: '#FFFFFF',
          }}
        >
          {isCoinCurrency ? 'BUY' : 'BUY ₹'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Ability Tab ─────────────────────────────────────────────────────────────

function AbilityTab({ playerId, onBuy, onCoinBuy, coins }: { playerId: string; onBuy: (item: string, price: number) => void; onCoinBuy: (item: AbilityItem) => void; coins: number }) {
  const [canWatchAd, setCanWatchAd] = useState(() => canWatchFreeAd())

  const handleWatchAd = useCallback(() => {
    localStorage.setItem('mergeMaster2048_lastFreeAd', new Date().toISOString())
    setCanWatchAd(false)
  }, [])

  return (
    <div className="space-y-4">
      {/* Regular Abilities - Coin Purchases */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
          <h4 className="text-xs font-extrabold tracking-wide" style={{ color: '#EDC22E' }}>
            ABILITIES (COINS)
          </h4>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(237,194,46,0.15)', color: '#EDC22E' }}>
            15 per 2 weeks
          </span>
        </div>
        <div className="space-y-2">
          {REGULAR_ABILITIES.map((item) => (
            <AbilityCard key={item.id} item={item} onBuy={onBuy} onCoinBuy={onCoinBuy} coins={coins} />
          ))}
        </div>
      </div>

      {/* 5x Multiplier - Real Money */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">⚡</span>
          <h4 className="text-xs font-extrabold tracking-wide" style={{ color: '#F65E3B' }}>
            5x MULTIPLIER (₹)
          </h4>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(246,94,59,0.15)', color: '#F65E3B' }}>
            No limit
          </span>
        </div>
        <div className="space-y-2">
          {MULTIPLIER_5X.map((item) => (
            <AbilityCard key={item.id} item={item} onBuy={onBuy} onCoinBuy={onCoinBuy} coins={coins} />
          ))}
        </div>
      </div>

      {/* 2.5x Multiplier - Real Money */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🔥</span>
          <h4 className="text-xs font-extrabold tracking-wide" style={{ color: '#00E676' }}>
            2.5x MULTIPLIER (₹)
          </h4>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,230,118,0.15)', color: '#00E676' }}>
            No limit
          </span>
        </div>
        <div className="space-y-2">
          {MULTIPLIER_2_5X.map((item) => (
            <AbilityCard key={item.id} item={item} onBuy={onBuy} onCoinBuy={onCoinBuy} coins={coins} />
          ))}
        </div>
      </div>

      {/* Free Ad Section */}
      <div
        className="p-4 rounded-xl text-center"
        style={{
          backgroundColor: 'rgba(0,230,118,0.06)',
          border: '1px solid rgba(0,230,118,0.12)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Tv className="w-4 h-4" style={{ color: '#00E676' }} />
          <h4 className="text-xs font-extrabold" style={{ color: '#00E676' }}>
            FREE REWARD
          </h4>
        </div>
        <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Watch an ad for 1 free spin ticket. Available every 3 days.
        </p>
        <p className="text-[9px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Not available for 5x and 2.5x multipliers
        </p>
        {canWatchAd ? (
          <button
            onClick={handleWatchAd}
            className="px-5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 mx-auto transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00E676, #00C853)',
              color: '#FFFFFF',
              boxShadow: '0 2px 12px rgba(0,230,118,0.3)',
            }}
          >
            📺 Watch Ad for 1 Free Spin
          </button>
        ) : (
          <div
            className="px-5 py-2 rounded-xl font-bold text-[10px] mx-auto inline-flex items-center gap-1.5"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Clock className="w-3 h-3" />
            Cooldown active — come back in 3 days
          </div>
        )}
      </div>
    </div>
  )
}

// ─── History Tab ─────────────────────────────────────────────────────────────

function HistoryTab({
  history,
  onSubmitTransactionId,
}: {
  history: StoreTransaction[]
  onSubmitTransactionId: (txId: string) => void
}) {
  const [txInput, setTxInput] = useState('')

  const handleSubmit = useCallback(() => {
    if (!txInput.trim()) return
    onSubmitTransactionId(txInput.trim())
    setTxInput('')
  }, [txInput, onSubmitTransactionId])

  return (
    <div className="space-y-4">
      {/* Transaction ID input */}
      <div
        className="p-3 rounded-xl"
        style={{
          backgroundColor: 'rgba(237,194,46,0.06)',
          border: '1px solid rgba(237,194,46,0.12)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
          <h4 className="text-xs font-extrabold" style={{ color: '#EDC22E' }}>
            SUBMIT TRANSACTION ID
          </h4>
        </div>
        <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
          After completing your purchase on WhatsApp, enter the transaction ID here to track your order.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={txInput}
            onChange={(e) => setTxInput(e.target.value)}
            placeholder="Enter Transaction ID"
            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#FFFFFF',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!txInput.trim()}
            className="px-4 py-2 rounded-lg font-bold text-[10px] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
              color: '#FFFFFF',
            }}
          >
            SUBMIT
          </button>
        </div>
      </div>

      {/* Transaction list */}
      <div>
        <h4 className="text-xs font-extrabold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
          PURCHASE HISTORY
        </h4>
        {history.length === 0 ? (
          <div
            className="p-6 rounded-xl text-center"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p className="text-2xl mb-2">🛒</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No purchases yet
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Your transactions will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {history.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
                      {tx.item}
                    </p>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(tx.date).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: '#EDC22E' }}>
                      ₹{tx.amount}
                    </p>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[8px] font-bold"
                      style={{
                        backgroundColor:
                          tx.status === 'Delivered'
                            ? 'rgba(0,230,118,0.15)'
                            : tx.status === 'Delayed - 2x Bonus!'
                              ? 'rgba(237,194,46,0.15)'
                              : 'rgba(255,255,255,0.08)',
                        color:
                          tx.status === 'Delivered'
                            ? '#00E676'
                            : tx.status === 'Delayed - 2x Bonus!'
                              ? '#EDC22E'
                              : '#FFA726',
                      }}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
                <p className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  TX: {tx.transactionId}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Transaction ID Modal ────────────────────────────────────────────────────

function TransactionModal({
  isOpen,
  onClose,
  itemName,
  itemPrice,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  itemName: string
  itemPrice: number
  onSubmit: (txId: string) => void
}) {
  const [txId, setTxId] = useState('')

  const handleSubmit = useCallback(() => {
    if (!txId.trim()) return
    onSubmit(txId.trim())
    setTxId('')
  }, [txId, onSubmit])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9 }}
        className="w-full rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <h4 className="text-sm font-bold mb-1" style={{ color: '#FFFFFF' }}>
          📋 Submit Transaction ID
        </h4>
        <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Item: <span style={{ color: '#EDC22E' }}>{itemName}</span> — ₹{itemPrice}
        </p>
        <p className="text-[9px] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Your order will be delivered in 1-2 hours. If delayed beyond 12 hours, you&apos;ll receive DOUBLE the amount!
        </p>
        <input
          type="text"
          value={txId}
          onChange={(e) => setTxId(e.target.value)}
          placeholder="Enter Transaction ID from WhatsApp"
          className="w-full px-3 py-2.5 rounded-xl text-xs outline-none mb-3"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#FFFFFF',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-transform active:scale-95"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Later
          </button>
          <button
            onClick={handleSubmit}
            disabled={!txId.trim()}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
              color: '#FFFFFF',
            }}
          >
            Submit
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Store Component ────────────────────────────────────────────────────

export function Store({ isOpen, onClose, playerId, coins, onAddNotification, onDeductCoins, onAddPowerUp, onAddUndos }: StoreProps) {
  const [activeTab, setActiveTab] = useState<TabId>('coins')
  const [history, setHistory] = useState<StoreTransaction[]>(() => loadHistory())
  const [txModal, setTxModal] = useState<{ open: boolean; itemName: string; itemPrice: number }>({
    open: false,
    itemName: '',
    itemPrice: 0,
  })

  // Handle coin-based ability purchase
  const handleCoinBuy = useCallback(
    (item: AbilityItem) => {
      if (item.currency !== 'coin') return
      if (coins < item.price) {
        onAddNotification('Not Enough Coins!', `You need ${formatNumber(item.price)} coins but have ${formatNumber(coins)}`, 'system', '😔')
        return
      }
      if (item.abilityType) {
        const remaining = getRemainingPurchase(item.abilityType)
        if (remaining <= 0) {
          onAddNotification('Limit Reached!', `You've reached the 2-week limit for ${item.name}. Try again later.`, 'system', '⏳')
          return
        }
        if (item.quantity > remaining) {
          onAddNotification('Almost at Limit!', `You can only buy ${remaining} more ${item.name} this period.`, 'system', '⚠️')
          return
        }
        recordPurchase(item.abilityType, item.quantity)
      }
      // Deduct coins
      onDeductCoins(item.price)
      // Add ability
      if (item.abilityType === 'undo') {
        onAddUndos(item.quantity)
      } else if (item.abilityType === 'timer') {
        onAddPowerUp('extraTime', item.quantity)
      } else if (item.abilityType) {
        onAddPowerUp(item.abilityType, item.quantity)
      }
      onAddNotification(
        'Ability Purchased! 🎉',
        `You bought ${item.emoji} ${item.name} x${item.quantity} for ${formatNumber(item.price)} coins`,
        'reward',
        item.emoji
      )
    },
    [coins, onAddNotification, onDeductCoins, onAddPowerUp, onAddUndos]
  )

  const handleBuy = useCallback(
    (itemName: string, price: number) => {
      // 1. Open WhatsApp
      openWhatsApp(itemName, price, playerId)
      // 2. After a short delay, show the transaction ID form
      setTimeout(() => {
        setTxModal({ open: true, itemName, itemPrice: price })
      }, 1500)
    },
    [playerId]
  )

  const handleTransactionSubmit = useCallback(
    (txId: string) => {
      const tx: StoreTransaction = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        item: txModal.itemName,
        amount: txModal.itemPrice,
        status: 'Pending',
        transactionId: txId,
      }
      const newHistory = [tx, ...history].slice(0, 50)
      setHistory(newHistory)
      saveHistory(newHistory)
      setTxModal({ open: false, itemName: '', itemPrice: 0 })
      onAddNotification(
        'Order Placed! 🛒',
        `Your order for ${tx.item} (₹${tx.amount}) has been submitted. Transaction ID: ${txId}`,
        'system',
        '📦'
      )
    },
    [txModal, history, onAddNotification]
  )

  const handleHistoryTxSubmit = useCallback(
    (txId: string) => {
      // When submitting a transaction ID from the History tab,
      // update the most recent "Pending" transaction
      const pendingIdx = history.findIndex((tx) => tx.status === 'Pending' && tx.transactionId === '')
      if (pendingIdx >= 0) {
        const updated = [...history]
        updated[pendingIdx] = { ...updated[pendingIdx], transactionId: txId }
        setHistory(updated)
        saveHistory(updated)
      } else {
        // Create a generic pending entry
        const tx: StoreTransaction = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          item: 'Manual Entry',
          amount: 0,
          status: 'Pending',
          transactionId: txId,
        }
        const newHistory = [tx, ...history].slice(0, 50)
        setHistory(newHistory)
        saveHistory(newHistory)
      }
      onAddNotification('Transaction ID Submitted 📋', `Transaction ID: ${txId} has been recorded.`, 'system', '✅')
    },
    [history, onAddNotification]
  )

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'coins', label: 'Coins', icon: <Coins className="w-3.5 h-3.5" /> },
    { id: 'ability', label: 'Ability', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'History', icon: <Clock className="w-3.5 h-3.5" /> },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="relative w-full max-w-sm rounded-2xl overflow-hidden max-h-[88vh] flex flex-col"
            style={{
              background: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 pb-3 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div>
                <h3 className="text-base font-bold" style={{ color: '#FFFFFF' }}>
                  🏪 Store
                </h3>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Balance:{' '}
                  <span style={{ color: '#EDC22E', fontWeight: 'bold' }}>
                    💰 {formatNumber(coins)}
                  </span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex px-4 pt-3 pb-0 shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold rounded-t-xl transition-all"
                  style={{
                    backgroundColor:
                      activeTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color:
                      activeTab === tab.id ? '#EDC22E' : 'rgba(255,255,255,0.4)',
                    borderBottom:
                      activeTab === tab.id ? '2px solid #EDC22E' : '2px solid transparent',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'coins' && (
                  <motion.div
                    key="coins"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CoinsTab playerId={playerId} onBuy={handleBuy} />
                  </motion.div>
                )}
                {activeTab === 'ability' && (
                  <motion.div
                    key="ability"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AbilityTab playerId={playerId} onBuy={handleBuy} onCoinBuy={handleCoinBuy} coins={coins} />
                  </motion.div>
                )}
                {activeTab === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HistoryTab history={history} onSubmitTransactionId={handleHistoryTxSubmit} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Delivery info bar */}
            <div
              className="shrink-0 px-4 py-2.5 text-center"
              style={{
                backgroundColor: 'rgba(237,194,46,0.06)',
                borderTop: '1px solid rgba(237,194,46,0.08)',
              }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3 h-3" style={{ color: '#EDC22E' }} />
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Delivery in 1-2 hrs · Delayed beyond 12 hrs ={' '}
                  <span style={{ color: '#EDC22E', fontWeight: 'bold' }}>2x BONUS!</span>
                </p>
              </div>
            </div>

            {/* Transaction ID Modal (overlay within the store) */}
            <AnimatePresence>
              {txModal.open && (
                <TransactionModal
                  isOpen={txModal.open}
                  onClose={() => setTxModal({ open: false, itemName: '', itemPrice: 0 })}
                  itemName={txModal.itemName}
                  itemPrice={txModal.itemPrice}
                  onSubmit={handleTransactionSubmit}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
