'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, Zap, Clock, AlertCircle, Copy, Check, Upload, FileText, ImageIcon, Trash2, ShoppingCart, Minus, Plus, Tag } from 'lucide-react'
import { getRandomLink } from '@/components/ads/AdOverlay'
import { placeOrder as firebasePlaceOrder, onUserOrdersUpdate, type FirebaseStoreOrder } from '@/lib/firebase-service'

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreProps {
  isOpen: boolean
  onClose: () => void
  playerId: string
  playerName: string
  userCode: string
  coins: number
  onAddNotification: (title: string, message: string, type: string, emoji: string) => void
  onDeductCoins: (amount: number) => void
  onAddPowerUp: (pu: 'hammer' | 'magnet' | 'blast' | 'multiplier5x' | 'multiplier2_5x' | 'extraTime', count: number) => void
  onAddUndos: (count: number) => void
  onAddRoomCards?: (count: number) => void
  onAddSpinTickets?: (count: number) => void
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

interface StoreOrder {
  id: string
  date: string
  playerId: string
  item: string
  price: number
  quantity: number
  whatsappNumber: string
  name: string
  transactionId: string
  utrNumber: string
  proofBase64?: string
  status: 'pending' | 'approved' | 'rejected'
  upiId: string
}

type TabId = 'coins' | 'ability' | 'room' | 'spins' | 'history'

// ─── Cart Types ────────────────────────────────────────────────────────────

interface CartItem {
  id: string
  emoji: string
  name: string
  price: number
  quantity: number
  currency: 'coin' | 'inr'
  abilityType?: string
  section?: string
}

interface Coupon {
  code: string
  discountPercent: number
  minPurchase: number
  used: boolean
}

const USED_COUPONS_KEY = 'mergeMaster2048_usedCoupons'

// Admin coupons stored in localStorage
const ADMIN_COUPONS_KEY = 'adminCoupons'
const ADMIN_DISCOUNT_COUPONS_KEY = 'adminDiscountCoupons'

// ─── Data ────────────────────────────────────────────────────────────────────

const COIN_PACKS: CoinPack[] = [
  { id: 'coins-50k', amount: 50000, price: 50 },
  { id: 'coins-10k', amount: 10000, price: 10, tag: { label: 'POPULAR', color: '#00E676' } },
  { id: 'coins-30k', amount: 30000, price: 30 },
  { id: 'coins-80k', amount: 80000, price: 80, tag: { label: 'HOT', color: '#F65E3B' } },
  { id: 'coins-80k-best', amount: 80000, price: 80, tag: { label: 'BEST VALUE', color: '#EDC22E' } },
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

const ROOM_CARD_PACKS: AbilityItem[] = [
  { id: 'room-1', emoji: '🃏', name: '1 Room Card', quantity: 1, price: 29, section: 'regular', currency: 'inr' },
  { id: 'room-2', emoji: '🃏', name: '2 Room Cards', quantity: 2, price: 59, section: 'regular', currency: 'inr' },
  { id: 'room-5', emoji: '🃏', name: '5 Room Cards', quantity: 5, price: 129, section: 'regular', tag: { label: 'HOT', color: '#F65E3B' }, currency: 'inr' },
  { id: 'room-10', emoji: '🃏', name: '10 Room Cards', quantity: 10, price: 199, section: 'regular', tag: { label: 'POPULAR', color: '#00E676' }, currency: 'inr' },
]

const UPI_ID = '9897186065@fam'
const ORDERS_KEY = 'mergeMaster2048_orders' // Legacy localStorage key - still used for local cache
const PURCHASE_LIMIT_KEY = 'mergeMaster2048_abilityPurchaseLimits'
const MAX_ABILITY_PER_2WEEKS = 15
const PAYMENT_DETAILS_KEY = 'mergeMaster2048_paymentDetails'

interface SavedPaymentDetails {
  name: string
  whatsappNumber: string
}

function loadSavedPaymentDetails(): SavedPaymentDetails | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(PAYMENT_DETAILS_KEY)
    return data ? JSON.parse(data) : null
  } catch { return null }
}

function savePaymentDetails(name: string, whatsappNumber: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PAYMENT_DETAILS_KEY, JSON.stringify({ name, whatsappNumber }))
}

// ─── Custom Price Overrides (from Admin Panel) ────────────────────────────────

interface CustomPriceOverride {
  coinPackages: { coins: number; price: number; label?: string }[]
  inrAbilityPackages: { type: string; uses: number; price: number }[]
}

function loadCustomPrices(): CustomPriceOverride | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem('adminCustomPrices')
    return data ? JSON.parse(data) : null
  } catch { return null }
}

interface CoinAbilityPrices {
  hammer: number
  magnet: number
  bomb: number
  timer: number
  undo: number
}

const DEFAULT_COIN_ABILITY_PRICES: CoinAbilityPrices = {
  hammer: 150,
  magnet: 150,
  bomb: 300,
  timer: 200,
  undo: 100,
}

function loadCoinAbilityPrices(): CoinAbilityPrices {
  if (typeof window === 'undefined') return DEFAULT_COIN_ABILITY_PRICES
  try {
    const data = localStorage.getItem('adminCoinAbilityPrices')
    return data ? JSON.parse(data) : DEFAULT_COIN_ABILITY_PRICES
  } catch {
    return DEFAULT_COIN_ABILITY_PRICES
  }
}

function getEffectiveCoinPacks(): CoinPack[] {
  const custom = loadCustomPrices()
  if (custom?.coinPackages && custom.coinPackages.length > 0) {
    return custom.coinPackages.map((pkg, idx) => {
      // Preserve tags from default packs if the index matches
      const defaultPack = COIN_PACKS[idx]
      return {
        id: defaultPack?.id || `coins-custom-${idx}`,
        amount: pkg.coins,
        price: pkg.price,
        tag: defaultPack?.tag,
      }
    })
  }
  return COIN_PACKS
}

function getEffectiveMultiplierItems(
  defaultItems: AbilityItem[],
  type: '5x' | '2.5x'
): AbilityItem[] {
  const custom = loadCustomPrices()
  if (custom?.inrAbilityPackages && custom.inrAbilityPackages.length > 0) {
    const filtered = custom.inrAbilityPackages.filter(p => p.type === type)
    if (filtered.length > 0) {
      return filtered.map((pkg, idx) => {
        const defaultItem = defaultItems[idx]
        return {
          id: defaultItem?.id || `${type}-custom-${idx}`,
          emoji: type === '5x' ? '⚡' : '🔥',
          name: type === '5x' ? '5x Multiplier' : '2.5x Multiplier',
          quantity: pkg.uses,
          price: pkg.price,
          section: type,
          tag: defaultItem?.tag,
          currency: 'inr' as const,
        }
      })
    }
  }
  return defaultItems
}

function getEffectiveRegularAbilities(): AbilityItem[] {
  const prices = loadCoinAbilityPrices()
  return [
    { id: 'bomb-5', emoji: '💣', name: 'Bomb', quantity: 5, price: prices.bomb, section: 'regular', currency: 'coin', abilityType: 'blast' },
    { id: 'magnet-5', emoji: '🧲', name: 'Magnet', quantity: 5, price: prices.magnet, section: 'regular', currency: 'coin', abilityType: 'magnet' },
    { id: 'hammer-5', emoji: '🔨', name: 'Hammer', quantity: 5, price: prices.hammer, section: 'regular', currency: 'coin', abilityType: 'hammer' },
    { id: 'timer-5', emoji: '⏱️', name: 'Timer (+10s)', quantity: 5, price: prices.timer, section: 'regular', currency: 'coin', abilityType: 'timer' },
    { id: 'undo-5', emoji: '↩️', name: 'Undo', quantity: 5, price: prices.undo, section: 'regular', currency: 'coin', abilityType: 'undo' },
  ]
}

// ─── Purchase Limit Tracking ─────────────────────────────────────────────────

interface PurchaseRecord {
  [abilityType: string]: { count: number; resetAt: string }
}

function loadPurchaseLimits(): PurchaseRecord {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PURCHASE_LIMIT_KEY)
    if (!raw) return {}
    const data: PurchaseRecord = JSON.parse(raw)
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
    limits[abilityType] = { count: quantity, resetAt: new Date(now + twoWeeks).toISOString() }
  } else {
    limits[abilityType] = { ...existing, count: existing.count + quantity }
  }
  savePurchaseLimits(limits)
}

// ─── Spin Purchase Limit Tracking (15 spins via coins per 3 days) ──────────

const SPIN_PURCHASE_LIMIT_KEY = 'mergeMaster2048_spinPurchaseLimits'
const MAX_SPIN_COIN_PURCHASE_3DAYS = 15

interface SpinPurchaseRecord {
  count: number
  resetAt: string
}

function loadSpinPurchaseLimits(): SpinPurchaseRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SPIN_PURCHASE_LIMIT_KEY)
    if (!raw) return null
    const data: SpinPurchaseRecord = JSON.parse(raw)
    if (new Date(data.resetAt).getTime() <= Date.now()) {
      localStorage.removeItem(SPIN_PURCHASE_LIMIT_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

function getRemainingSpinCoinPurchase(): number {
  const record = loadSpinPurchaseLimits()
  if (!record) return MAX_SPIN_COIN_PURCHASE_3DAYS
  return Math.max(0, MAX_SPIN_COIN_PURCHASE_3DAYS - record.count)
}

function recordSpinCoinPurchase(quantity: number) {
  if (typeof window === 'undefined') return
  const existing = loadSpinPurchaseLimits()
  const now = Date.now()
  const threeDays = 3 * 24 * 60 * 60 * 1000

  if (!existing) {
    localStorage.setItem(SPIN_PURCHASE_LIMIT_KEY, JSON.stringify({ count: quantity, resetAt: new Date(now + threeDays).toISOString() }))
  } else {
    localStorage.setItem(SPIN_PURCHASE_LIMIT_KEY, JSON.stringify({ ...existing, count: existing.count + quantity }))
  }
}

// ─── Room Card Coin Purchase (once per day) ──────────────────────────────────

const ROOM_CARD_COIN_PURCHASE_KEY = 'mergeMaster2048_roomCardCoinPurchase'

function canBuyRoomCardWithCoins(): boolean {
  if (typeof window === 'undefined') return false
  const lastPurchase = localStorage.getItem(ROOM_CARD_COIN_PURCHASE_KEY)
  if (!lastPurchase) return true
  const today = new Date().toISOString().split('T')[0]
  return lastPurchase !== today
}

function markRoomCardCoinPurchased() {
  if (typeof window === 'undefined') return
  const today = new Date().toISOString().split('T')[0]
  localStorage.setItem(ROOM_CARD_COIN_PURCHASE_KEY, today)
}

// ─── Order Helpers ───────────────────────────────────────────────────────────

function loadOrders(): StoreOrder[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveOrders(orders: StoreOrder[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

// Convert StoreOrder to FirebaseStoreOrder format
function toFirebaseOrder(order: StoreOrder, playerName: string, userCode: string): Omit<FirebaseStoreOrder, 'createdAt' | 'approvedAt'> {
  const isCoinPack = !order.item.includes('5x') && !order.item.includes('2.5x') && !order.item.includes('Room') && !order.item.includes('🃏')
  return {
    id: order.id,
    date: order.date,
    playerId: order.playerId,
    playerName,
    userCode,
    items: [{ name: order.item, quantity: order.quantity, price: order.price }],
    totalAmount: order.price,
    discountCoupon: '',
    discountAmount: 0,
    finalAmount: order.price,
    whatsappNumber: order.whatsappNumber,
    name: order.name,
    transactionId: order.transactionId,
    utrNumber: order.utrNumber,
    proofBase64: order.proofBase64,
    status: order.status,
    upiId: order.upiId,
  }
}

// ─── General Helpers ─────────────────────────────────────────────────────────

// ─── Daily Free Room Card Tracker ──────────────────────────────────────────

const STORE_VISIT_KEY = 'mergeMaster2048_storeVisitDays'
const FREE_ROOM_CARD_CLAIMED_KEY = 'mergeMaster2048_freeRoomCardClaimed'

function getStoreVisitDays(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORE_VISIT_KEY)
    if (!data) return []
    const days: string[] = JSON.parse(data)
    // Clean up days older than 7 days
    const now = new Date()
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    return days.filter(d => d >= cutoff)
  } catch { return [] }
}

function saveStoreVisitDays(days: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORE_VISIT_KEY, JSON.stringify(days))
}

function recordStoreVisit() {
  const today = new Date().toISOString().split('T')[0]
  const days = getStoreVisitDays()
  if (!days.includes(today)) {
    days.push(today)
    saveStoreVisitDays(days)
  }
}

function getConsecutiveVisitCount(): number {
  const days = getStoreVisitDays()
  if (days.length === 0) return 0
  const sorted = [...days].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  // Check if today is in the list
  if (sorted[0] !== today) return 0
  let count = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = Math.floor((prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000))
    if (diff === 1) {
      count++
    } else {
      break
    }
  }
  return count
}

function canClaimFreeRoomCard(): boolean {
  if (typeof window === 'undefined') return false
  // Must have visited store 7 consecutive days
  if (getConsecutiveVisitCount() < 7) return false
  // Check if already claimed today
  const lastClaimed = localStorage.getItem(FREE_ROOM_CARD_CLAIMED_KEY)
  if (!lastClaimed) return true
  const today = new Date().toISOString().split('T')[0]
  return lastClaimed !== today
}

function markFreeRoomCardClaimed() {
  if (typeof window === 'undefined') return
  const today = new Date().toISOString().split('T')[0]
  localStorage.setItem(FREE_ROOM_CARD_CLAIMED_KEY, today)
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

// ─── Daily Purchase Streak Tracker ──────────────────────────────────────────

const DAILY_STREAK_KEY = 'mergeMaster2048_dailyStreak'

interface DailyStreakData {
  price: number
  startDate: string
  count: number
}

function loadDailyStreak(): DailyStreakData | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(DAILY_STREAK_KEY)
    if (!data) return null
    const parsed: DailyStreakData = JSON.parse(data)
    // Check if the streak is still valid (within 7 consecutive days from startDate)
    const today = new Date().toISOString().split('T')[0]
    const start = new Date(parsed.startDate)
    const now = new Date(today)
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    if (diffDays >= 7) {
      // Streak expired, reset
      localStorage.removeItem(DAILY_STREAK_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveDailyStreak(data: DailyStreakData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DAILY_STREAK_KEY, JSON.stringify(data))
}

function recordDailyStreakPurchase(price: number): { isStreakComplete: boolean; coinsToRefund: number } {
  const today = new Date().toISOString().split('T')[0]
  const existing = loadDailyStreak()

  if (!existing) {
    // Start new streak
    saveDailyStreak({ price, startDate: today, count: 1 })
    return { isStreakComplete: false, coinsToRefund: 0 }
  }

  // Check if same price
  if (existing.price !== price) {
    // Different price, reset streak
    saveDailyStreak({ price, startDate: today, count: 1 })
    return { isStreakComplete: false, coinsToRefund: 0 }
  }

  // Same price - check if we already recorded today
  const lastCount = existing.count
  const start = new Date(existing.startDate)
  const now = new Date(today)
  const dayIndex = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1

  // Only increment if we haven't already recorded for today
  if (dayIndex > lastCount) {
    const newCount = lastCount + 1
    saveDailyStreak({ price, startDate: existing.startDate, count: newCount })

    if (newCount >= 7) {
      // Streak complete! Reset after claiming
      localStorage.removeItem(DAILY_STREAK_KEY)
      return { isStreakComplete: true, coinsToRefund: price }
    }
  }

  return { isStreakComplete: false, coinsToRefund: 0 }
}

function getDailyStreakInfo(): { price: number; count: number } | null {
  const data = loadDailyStreak()
  if (!data) return null
  return { price: data.price, count: data.count }
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-IN')
}

function generateUpiLink(price: number): string {
  return `upi://pay?pa=${UPI_ID}&pn=MergeMaster2048&am=${price}&cu=INR`
}

function generateQrUrl(upiLink: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`
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
      BUY ₹
    </button>
  )
}

// ─── UPI Payment Modal ───────────────────────────────────────────────────────

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  itemName: string
  itemPrice: number
  itemQuantity: number
  playerId: string
  onOrderPlaced: (order: StoreOrder) => void
  discountCouponCode?: string
  discountAmount?: number
}

function UPIPaymentModal({
  isOpen,
  onClose,
  itemName,
  itemPrice,
  itemQuantity,
  playerId,
  onOrderPlaced,
  discountCouponCode,
  discountAmount,
}: PaymentModalProps) {
  const [whatsappNumber, setWhatsappNumber] = useState(() => {
    if (typeof window === 'undefined') return ''
    const saved = loadSavedPaymentDetails()
    return saved?.whatsappNumber ?? ''
  })
  const [name, setName] = useState(() => {
    if (typeof window === 'undefined') return ''
    const saved = loadSavedPaymentDetails()
    return saved?.name ?? ''
  })
  const [transactionId, setTransactionId] = useState('')
  const [utrNumber, setUtrNumber] = useState('')
  const [proofBase64, setProofBase64] = useState<string | undefined>(undefined)
  const [proofFileName, setProofFileName] = useState<string | null>(null)
  const [qrLoaded, setQrLoaded] = useState(true)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const upiLink = generateUpiLink(itemPrice - (discountAmount || 0))
  const qrUrl = generateQrUrl(upiLink)

  const handleCopyUpiId = useCallback(() => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback: select text approach
      const textarea = document.createElement('textarea')
      textarea.value = UPI_ID
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFileName(file.name)
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setProofBase64(result)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleBookOrder = useCallback(async () => {
    if (!whatsappNumber.trim() || !name.trim() || !transactionId.trim()) return

    setSubmitting(true)

    // Save payment details for next time
    savePaymentDetails(name.trim(), whatsappNumber.trim())

    const order: StoreOrder = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      playerId,
      item: itemName,
      price: (discountAmount && discountAmount > 0) ? itemPrice - discountAmount : itemPrice,
      quantity: itemQuantity,
      whatsappNumber: whatsappNumber.trim(),
      name: name.trim(),
      transactionId: transactionId.trim(),
      utrNumber: utrNumber.trim(),
      proofBase64,
      status: 'pending',
      upiId: UPI_ID,
    }

    onOrderPlaced(order)

    // Consume discount coupon if used (only when order is actually placed)
    if (discountCouponCode && discountAmount && discountAmount > 0) {
      try {
        const { consumeDiscountCoupon } = await import('@/components/game/CouponCode')
        consumeDiscountCoupon(discountCouponCode)
      } catch { /* ignore */ }
    }

    // Reset transaction-specific fields only (keep name & whatsapp)
    setTransactionId('')
    setUtrNumber('')
    setProofBase64(undefined)
    setProofFileName(null)
    setSubmitting(false)
  }, [whatsappNumber, name, transactionId, utrNumber, proofBase64, itemName, itemPrice, itemQuantity, playerId, onOrderPlaced, discountCouponCode, discountAmount])

  const isFormValid = whatsappNumber.trim() && name.trim() && transactionId.trim()

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center p-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9 }}
        className="w-full rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{
          background: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 pb-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h4 className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
            💳 UPI Payment
          </h4>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

          {/* ── QR Code Section ── */}
          <div className="flex flex-col items-center text-center">
            {qrLoaded ? (
              <div className="rounded-xl overflow-hidden mb-3 p-2" style={{ backgroundColor: '#FFFFFF' }}>
                <img
                  src={qrUrl}
                  alt="UPI QR Code"
                  width={180}
                  height={180}
                  className="rounded-lg"
                  onError={() => setQrLoaded(false)}
                />
              </div>
            ) : (
              <div
                className="w-[180px] h-[180px] rounded-xl flex items-center justify-center mb-3 p-3 text-center"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px dashed rgba(255,255,255,0.15)',
                }}
              >
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Please complete payment. If QR doesn&apos;t load, use UPI ID below.
                </p>
              </div>
            )}

            {/* UPI ID with Copy Button */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: '#EDC22E' }}>
                {UPI_ID}
              </span>
              <button
                onClick={handleCopyUpiId}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform active:scale-90"
                style={{ backgroundColor: 'rgba(237,194,46,0.15)', border: '1px solid rgba(237,194,46,0.3)' }}
                title="Copy UPI ID"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" style={{ color: '#00E676' }} />
                ) : (
                  <Copy className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                )}
              </button>
            </div>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              UPI ID: Copy and pay in any UPI app
            </p>
          </div>

          {/* ── Package Details (Fixed, Non-editable) ── */}
          <div
            className="p-3 rounded-xl"
            style={{
              backgroundColor: 'rgba(237,194,46,0.06)',
              border: '1px solid rgba(237,194,46,0.12)',
            }}
          >
            <h4 className="text-[10px] font-bold mb-2" style={{ color: '#EDC22E' }}>
              📦 PACKAGE DETAILS
            </h4>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Item</span>
                <span className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{itemName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Price</span>
                <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>₹{itemPrice}</span>
              </div>
              {discountAmount && discountAmount > 0 && discountCouponCode && (
                <div className="flex justify-between">
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Coupon ({discountCouponCode})</span>
                  <span className="text-[10px] font-bold" style={{ color: '#00E676' }}>-₹{discountAmount}</span>
                </div>
              )}
              {discountAmount && discountAmount > 0 && (
                <div className="flex justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Total</span>
                  <span className="text-[11px] font-bold" style={{ color: '#00E676' }}>₹{itemPrice - discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Quantity</span>
                <span className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>x{itemQuantity}</span>
              </div>
            </div>
          </div>

          {/* ── Payment Form ── */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              📝 PAYMENT DETAILS
            </h4>

            {/* WhatsApp Number */}
            <div>
              <label className="text-[9px] font-bold mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                WhatsApp Number <span style={{ color: '#F65E3B' }}>*</span>
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Enter WhatsApp number"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                }}
              />
            </div>

            {/* Name */}
            <div>
              <label className="text-[9px] font-bold mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Name <span style={{ color: '#F65E3B' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                }}
              />
            </div>

            {/* Transaction ID */}
            <div>
              <label className="text-[9px] font-bold mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Transaction ID <span style={{ color: '#F65E3B' }}>*</span>
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter UPI transaction ID"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                }}
              />
            </div>

            {/* UTR Number */}
            <div>
              <label className="text-[9px] font-bold mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                UTR Number <span style={{ color: 'rgba(255,255,255,0.25)' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="Enter UTR number (optional)"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                }}
              />
            </div>

            {/* Upload Proof */}
            <div>
              <label className="text-[9px] font-bold mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Upload Proof (Screenshot)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-95"
                style={{
                  backgroundColor: proofFileName ? 'rgba(0,230,118,0.08)' : 'rgba(255,255,255,0.06)',
                  border: proofFileName ? '1px solid rgba(0,230,118,0.2)' : '1px dashed rgba(255,255,255,0.15)',
                  color: proofFileName ? '#00E676' : 'rgba(255,255,255,0.4)',
                }}
              >
                {proofFileName ? (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    {proofFileName.length > 25 ? proofFileName.substring(0, 22) + '...' : proofFileName}
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Upload Screenshot
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="shrink-0 p-4 pt-3 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-transform active:scale-95"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleBookOrder}
            disabled={!isFormValid || submitting}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
              color: '#FFFFFF',
            }}
          >
            {submitting ? 'BOOKING...' : 'BOOK ORDER'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Coins Tab ───────────────────────────────────────────────────────────────

function CoinsTab({ onBuy }: { onBuy: (item: string, price: number, quantity: number) => void }) {
  const effectivePacks = getEffectiveCoinPacks()
  return (
    <div className="grid grid-cols-2 gap-3">
      {effectivePacks.map((pack, i) => (
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
              {formatNumber(pack.amount)} Coins = ₹{pack.price}
            </p>
            <BuyButton
              onPress={() => onBuy(`${formatNumber(pack.amount)} Coins`, pack.price, pack.amount)}
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
  cartQuantity,
  onAddToCart,
  onUpdateCartQuantity,
}: {
  item: AbilityItem
  onBuy: (item: string, price: number, quantity: number) => void
  onCoinBuy: (item: AbilityItem) => void
  coins: number
  cartQuantity: number
  onAddToCart: (item: AbilityItem) => void
  onUpdateCartQuantity: (id: string, delta: number) => void
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
        {cartQuantity > 0 ? (
          <div className="flex items-center gap-1">
            <button onClick={() => onUpdateCartQuantity(item.id, -1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <Minus className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
            <span className="text-[10px] font-bold w-5 text-center" style={{ color: '#EDC22E' }}>{cartQuantity}</span>
            <button onClick={() => onUpdateCartQuantity(item.id, 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <Plus className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (isCoinCurrency) {
                onCoinBuy(item)
              } else {
                onAddToCart(item)
              }
            }}
            disabled={isCoinCurrency && (!canAfford || isLimitReached)}
            className="px-3 py-1.5 rounded-lg font-bold text-[10px] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isCoinCurrency
                ? 'linear-gradient(135deg, #EDC22E, #FFB300)'
                : 'linear-gradient(135deg, #EDC22E, #FF7A00)',
              color: '#FFFFFF',
            }}
          >
            {isCoinCurrency ? 'BUY' : 'Add 🛒'}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Ability Tab ─────────────────────────────────────────────────────────────

function AbilityTab({ onBuy, onCoinBuy, coins, onAddNotification, onDeductCoins, cart, onAddToCart, onUpdateCartQuantity }: { onBuy: (item: string, price: number, quantity: number) => void; onCoinBuy: (item: AbilityItem) => void; coins: number; onAddNotification: (title: string, message: string, type: string, emoji: string) => void; onDeductCoins: (amount: number) => void; cart: CartItem[]; onAddToCart: (item: AbilityItem) => void; onUpdateCartQuantity: (id: string, delta: number) => void }) {
  // Daily Streak info
  const [dailyStreakInfo, setDailyStreakInfo] = useState<{ price: number; count: number } | null>(() => getDailyStreakInfo())

  return (
    <div className="space-y-4">
      {/* Daily Streak Section (replaces DAILY FREE) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🔥</span>
          <h4 className="text-xs font-extrabold tracking-wide" style={{ color: '#E040FB' }}>
            DAILY STREAK
          </h4>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(224,64,251,0.06)', border: '1px solid rgba(224,64,251,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: 'rgba(224,64,251,0.1)', border: '1px solid rgba(224,64,251,0.2)' }}>
              🔥
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold" style={{ color: '#FFFFFF' }}>7-Day Purchase Streak</p>
              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Buy the same ₹ pack 7 days in a row!
              </p>
              <p className="text-[8px] mt-0.5" style={{ color: '#E040FB' }}>
                🎁 Day 7: FREE coins + 1 Room Card!
              </p>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: dailyStreakInfo && i < dailyStreakInfo.count ? 'rgba(224,64,251,0.3)' : 'rgba(255,255,255,0.06)',
                      border: dailyStreakInfo && i < dailyStreakInfo.count ? '1px solid rgba(224,64,251,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    }}>
                    {dailyStreakInfo && i < dailyStreakInfo.count && <span className="text-[6px]" style={{ color: '#E040FB' }}>✓</span>}
                  </div>
                ))}
                <span className="text-[8px] ml-1" style={{ color: dailyStreakInfo && dailyStreakInfo.count >= 7 ? '#E040FB' : 'rgba(255,255,255,0.3)' }}>
                  {dailyStreakInfo ? `${dailyStreakInfo.count}/7` : '0/7'}
                </span>
              </div>
              {dailyStreakInfo && (
                <p className="text-[8px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Current: ₹{dailyStreakInfo.price} pack
                </p>
              )}
            </div>
          </div>
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
          {getEffectiveMultiplierItems(MULTIPLIER_5X, '5x').map((item) => (
            <AbilityCard key={item.id} item={item} onBuy={onBuy} onCoinBuy={onCoinBuy} coins={coins} cartQuantity={cart.find(c => c.id === item.id)?.quantity || 0} onAddToCart={onAddToCart} onUpdateCartQuantity={onUpdateCartQuantity} />
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
          {getEffectiveMultiplierItems(MULTIPLIER_2_5X, '2.5x').map((item) => (
            <AbilityCard key={item.id} item={item} onBuy={onBuy} onCoinBuy={onCoinBuy} coins={coins} cartQuantity={cart.find(c => c.id === item.id)?.quantity || 0} onAddToCart={onAddToCart} onUpdateCartQuantity={onUpdateCartQuantity} />
          ))}
        </div>
      </div>

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
          {getEffectiveRegularAbilities().map((item) => (
            <AbilityCard key={item.id} item={item} onBuy={onBuy} onCoinBuy={onCoinBuy} coins={coins} cartQuantity={cart.find(c => c.id === item.id)?.quantity || 0} onAddToCart={onAddToCart} onUpdateCartQuantity={onUpdateCartQuantity} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Room Tab ─────────────────────────────────────────────────────────────

function RoomTab({ onBuy, onCoinBuy, coins, onAddRoomCards, onAddNotification, onDeductCoins, cart, onAddToCart, onUpdateCartQuantity }: { onBuy: (item: string, price: number, quantity: number) => void; onCoinBuy: (item: AbilityItem) => void; coins: number; onAddRoomCards?: (count: number) => void; onAddNotification: (title: string, message: string, type: string, emoji: string) => void; onDeductCoins: (amount: number) => void; cart: CartItem[]; onAddToCart: (item: AbilityItem) => void; onUpdateCartQuantity: (id: string, delta: number) => void }) {
  const [roomCardCoinPurchased, setRoomCardCoinPurchased] = useState(() => !canBuyRoomCardWithCoins())

  const handleBuyRoomCardWithCoins = useCallback(() => {
    if (!canBuyRoomCardWithCoins()) {
      onAddNotification('Limit Reached!', 'You can only buy 1 Room Card with coins per day.', 'system', '⏳')
      return
    }
    if (coins < 3000) {
      onAddNotification('Not Enough Coins!', `You need 3,000 coins but have ${formatNumber(coins)}`, 'system', '😔')
      return
    }
    onDeductCoins(3000)
    onAddRoomCards?.(1)
    markRoomCardCoinPurchased()
    setRoomCardCoinPurchased(true)
    onAddNotification('Room Card Purchased! 🃏', 'You bought 1 Room Card for 3,000 coins!', 'reward', '🃏')
  }, [coins, onDeductCoins, onAddRoomCards, onAddNotification])

  return (
    <div className="space-y-4">
      {/* Room Cards - INR */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🃏</span>
          <h4 className="text-xs font-extrabold tracking-wide" style={{ color: '#E040FB' }}>
            ROOM CARDS (₹)
          </h4>
        </div>
        <div className="space-y-2">
          {ROOM_CARD_PACKS.map(item => (
            <AbilityCard key={item.id} item={item as any} onBuy={onBuy} onCoinBuy={onCoinBuy} coins={coins} cartQuantity={cart.find(c => c.id === item.id)?.quantity || 0} onAddToCart={onAddToCart} onUpdateCartQuantity={onUpdateCartQuantity} />
          ))}
        </div>
      </div>

      {/* Room Card - Coins (once per day) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
          <h4 className="text-xs font-extrabold tracking-wide" style={{ color: '#E040FB' }}>
            ROOM CARD (COINS)
          </h4>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(224,64,251,0.15)', color: '#E040FB' }}>
            1/day
          </span>
        </div>
        <div className="relative flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', opacity: roomCardCoinPurchased ? 0.5 : 1 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: 'rgba(224,64,251,0.1)', border: '1px solid rgba(224,64,251,0.2)' }}>
              🃏
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: '#FFFFFF' }}>1 Room Card</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>3,000 Coins</p>
              {roomCardCoinPurchased && (
                <p className="text-[8px]" style={{ color: '#F65E3B' }}>Purchased today</p>
              )}
            </div>
          </div>
          <button onClick={handleBuyRoomCardWithCoins} disabled={coins < 3000 || roomCardCoinPurchased}
            className="px-3 py-1.5 rounded-lg font-bold text-[10px] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #E040FB, #7C4DFF)', color: '#FFFFFF' }}>
            {roomCardCoinPurchased ? 'SOLD OUT' : 'BUY 💰'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── History Tab ─────────────────────────────────────────────────────────────

function HistoryTab({ orders, onDeleteAll, onDeleteSelected }: { orders: StoreOrder[]; onDeleteAll: () => void; onDeleteSelected: (ids: string[]) => void }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'rgba(255,167,38,0.15)', color: '#FFA726', label: 'Pending' },
    approved: { bg: 'rgba(0,230,118,0.15)', color: '#00E676', label: 'Approved' },
    rejected: { bg: 'rgba(246,94,59,0.15)', color: '#F65E3B', label: 'Rejected' },
  }

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div
          className="p-6 rounded-xl text-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-2xl mb-2">🛒</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            No orders yet
          </p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Your orders will appear here
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-extrabold" style={{ color: 'rgba(255,255,255,0.6)' }}>
              ORDER HISTORY ({orders.length})
            </h4>
            <div className="flex items-center gap-1.5">
              {selectedIds.size > 0 && (
                <button
                  onClick={() => {
                    onDeleteSelected(Array.from(selectedIds))
                    setSelectedIds(new Set())
                  }}
                  className="text-[8px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-transform active:scale-95"
                  style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.2)', color: '#F65E3B' }}
                >
                  <Trash2 className="w-2.5 h-2.5" /> Delete ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => {
                  onDeleteAll()
                  setSelectedIds(new Set())
                }}
                className="text-[8px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-transform active:scale-95"
                style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)', color: '#F65E3B' }}
              >
                <Trash2 className="w-2.5 h-2.5" /> Delete All
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {orders.map((order) => {
              const sc = statusConfig[order.status] || statusConfig.pending
              const isSelected = selectedIds.has(order.id)
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl"
                  style={{
                    backgroundColor: isSelected ? 'rgba(237,194,46,0.06)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isSelected ? 'rgba(237,194,46,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(order.id)}
                    className="mt-1 w-3 h-3 accent-amber-500 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: '#FFFFFF' }}>
                          {order.item}
                        </p>
                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {new Date(order.date).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs font-bold" style={{ color: '#EDC22E' }}>
                          ₹{order.price}
                        </p>
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[8px] font-bold"
                          style={{
                            backgroundColor: sc.bg,
                            color: sc.color,
                          }}
                        >
                          {sc.label}
                        </span>
                      </div>
                    </div>

                    {/* Proof thumbnail if available */}
                    {order.proofBase64 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg overflow-hidden"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <img
                            src={order.proofBase64}
                            alt="Proof"
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            Proof attached
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <p className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        TX: {order.transactionId}
                      </p>
                      {order.utrNumber && (
                        <p className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          UTR: {order.utrNumber}
                        </p>
                      )}
                      <p className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        WA: {order.whatsappNumber}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Spin Data ──────────────────────────────────────────────────────────────

interface SpinPack {
  id: string
  spins: number
  price: number
  tag?: { label: string; color: string; fireStyling?: boolean }
  currency: 'inr' | 'coin'
  bonusSpins?: number // Extra free spins (e.g. 10+2 free)
}

const SPIN_INR_PACKS: SpinPack[] = [
  { id: 'spin-9', spins: 9, price: 5, currency: 'inr' },
  { id: 'spin-20', spins: 20, price: 9, tag: { label: 'HOT', color: '#F65E3B' }, currency: 'inr' },
  { id: 'spin-33', spins: 33, price: 15, tag: { label: 'VERY HOT', color: '#FF1744', fireStyling: true }, currency: 'inr' },
  { id: 'spin-50', spins: 50, price: 25, currency: 'inr' },
]

const SPIN_COIN_PACKS: SpinPack[] = [
  { id: 'spin-coin-3', spins: 3, price: 900, currency: 'coin' },
  { id: 'spin-coin-5', spins: 5, price: 1500, currency: 'coin' },
  { id: 'spin-coin-10', spins: 10, price: 3000, tag: { label: '+2 FREE', color: '#00E676' }, currency: 'coin', bonusSpins: 2 },
]

// ─── Spins Tab ──────────────────────────────────────────────────────────────

function SpinsTab({ onBuy, coins, onDeductCoins, onAddSpinTickets, onAddNotification }: {
  onBuy: (item: string, price: number, quantity: number) => void
  coins: number
  onDeductCoins: (amount: number) => void
  onAddSpinTickets?: (count: number) => void
  onAddNotification: (title: string, message: string, type: string, emoji: string) => void
}) {
  const [remainingSpins, setRemainingSpins] = useState(() => getRemainingSpinCoinPurchase())

  const handleCoinBuy = useCallback((pack: SpinPack) => {
    if (coins < pack.price) {
      onAddNotification('Not Enough Coins!', `You need ${formatNumber(pack.price)} coins but have ${formatNumber(coins)}`, 'system', '😔')
      return
    }
    const spinsToBuy = pack.spins
    if (spinsToBuy > remainingSpins) {
      onAddNotification('Limit Reached!', `You can only buy ${remainingSpins} more spins with coins in this period.`, 'system', '⏳')
      return
    }
    // Deduct coins
    onDeductCoins(pack.price)
    // Add spin tickets (including bonus)
    const totalSpins = pack.spins + (pack.bonusSpins || 0)
    onAddSpinTickets?.(totalSpins)
    // Record limit
    recordSpinCoinPurchase(spinsToBuy)
    setRemainingSpins(getRemainingSpinCoinPurchase())

    onAddNotification(
      'Spins Purchased! 🎫',
      `You bought ${pack.spins} spin${pack.spins > 1 ? 's' : ''}${pack.bonusSpins ? ` +${pack.bonusSpins} FREE` : ''} for ${formatNumber(pack.price)} coins!`,
      'reward',
      '🎫'
    )
  }, [coins, remainingSpins, onDeductCoins, onAddSpinTickets, onAddNotification])

  return (
    <div className="space-y-4">
      {/* Spins - INR */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🎫</span>
          <h4 className="text-xs font-extrabold tracking-wide" style={{ color: '#F65E3B' }}>
            SPIN TICKETS (₹)
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SPIN_INR_PACKS.map((pack, i) => (
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
              {pack.tag && (
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide whitespace-nowrap z-10"
                  style={{
                    backgroundColor: pack.tag.color,
                    color: '#FFFFFF',
                    boxShadow: pack.tag.fireStyling
                      ? `0 0 12px ${pack.tag.color}, 0 0 24px ${pack.tag.color}66, 0 0 36px ${pack.tag.color}33`
                      : `0 2px 8px ${pack.tag.color}66`,
                    ...(pack.tag.fireStyling ? {
                      animation: 'pulse 1.5s ease-in-out infinite',
                      textShadow: '0 0 8px rgba(255,255,255,0.5)',
                    } : {}),
                  }}
                >
                  {pack.tag.fireStyling && '🔥 '}{pack.tag.label}{pack.tag.fireStyling && ' 🔥'}
                </div>
              )}
              <div className="text-center mb-3">
                <div className="text-2xl mb-1">🎫</div>
                <p className="text-sm font-extrabold" style={{ color: '#F65E3B' }}>
                  {pack.spins}
                </p>
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Spins</p>
              </div>
              <div className="w-full">
                <p className="text-center text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {pack.spins} Spins = ₹{pack.price}
                </p>
                <BuyButton
                  onPress={() => onBuy(`${pack.spins} Spin Tickets`, pack.price, pack.spins)}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Spins - Coins */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
          <h4 className="text-xs font-extrabold tracking-wide" style={{ color: '#EDC22E' }}>
            SPIN TICKETS (COINS)
          </h4>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(237,194,46,0.15)', color: '#EDC22E' }}>
            {remainingSpins}/15 per 3 days
          </span>
        </div>
        <div className="space-y-2">
          {SPIN_COIN_PACKS.map((pack) => {
            const isDisabled = coins < pack.price || remainingSpins < pack.spins
            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  opacity: remainingSpins < pack.spins ? 0.5 : 1,
                }}
              >
                {pack.tag && (
                  <div
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide whitespace-nowrap z-10"
                    style={{
                      backgroundColor: pack.tag.color,
                      color: '#FFFFFF',
                      boxShadow: `0 2px 8px ${pack.tag.color}66`,
                    }}
                  >
                    {pack.tag.label}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    🎫
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
                      {pack.spins} Spin{pack.spins > 1 ? 's' : ''}
                      {pack.bonusSpins ? <span style={{ color: '#00E676' }}> → {pack.spins + pack.bonusSpins}</span> : ''}
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      💰 {formatNumber(pack.price)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCoinBuy(pack)}
                  disabled={isDisabled}
                  className="px-3 py-1.5 rounded-lg font-bold text-[10px] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #EDC22E, #FFB300)',
                    color: '#FFFFFF',
                  }}
                >
                  BUY
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Store Component ────────────────────────────────────────────────────

export function Store({ isOpen, onClose, playerId, playerName, userCode, coins, onAddNotification, onDeductCoins, onAddPowerUp, onAddUndos, onAddRoomCards, onAddSpinTickets }: StoreProps) {
  const [activeTab, setActiveTab] = useState<TabId>('coins')
  const [orders, setOrders] = useState<StoreOrder[]>(() => loadOrders())
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; itemName: string; itemPrice: number; itemQuantity: number }>({
    open: false,
    itemName: '',
    itemPrice: 0,
    itemQuantity: 0,
  })

  // Listen for Firebase order status updates in real-time
  useEffect(() => {
    if (!playerId) return
    const unsubscribe = onUserOrdersUpdate(playerId, (firebaseOrders) => {
      // Merge Firebase order status into local orders
      setOrders(prev => {
        let updated = [...prev]
        let changed = false
        for (const fbOrder of firebaseOrders) {
          const idx = updated.findIndex(o => o.id === fbOrder.id)
          if (idx !== -1) {
            if (updated[idx].status !== fbOrder.status) {
              updated[idx] = { ...updated[idx], status: fbOrder.status }
              changed = true
              // Show notification for status changes
              if (fbOrder.status === 'approved') {
                onAddNotification('Order Approved! ✅', `Your order "${fbOrder.items.map(i => i.name).join(', ')}" has been approved!`, 'reward', '📦')
              } else if (fbOrder.status === 'rejected') {
                onAddNotification('Order Rejected ❌', `Your order "${fbOrder.items.map(i => i.name).join(', ')}" was rejected. Contact support.`, 'system', '⚠️')
              }
            }
          }
        }
        if (changed) {
          saveOrders(updated)
        }
        return changed ? updated : prev
      })
    })
    return unsubscribe
  }, [playerId, onAddNotification])

  // Track store visit (keep for visit tracking even though free room card claim removed)
  useEffect(() => {
    if (isOpen) {
      recordStoreVisit()
    }
  }, [isOpen])

  // Re-read orders when switching to history tab (reflects admin approval changes)
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab)
    if (tab === 'history') {
      setOrders(loadOrders())
    }
  }, [])

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

  // Handle real-money purchase: open payment modal
  const handleBuy = useCallback(
    (itemName: string, price: number, quantity: number) => {
      setPaymentModal({ open: true, itemName, itemPrice: price, itemQuantity: quantity })
    },
    []
  )

  // Handle order placed from payment modal
  const handleOrderPlaced = useCallback(
    (order: StoreOrder) => {
      const newOrders = [order, ...orders].slice(0, 50)
      setOrders(newOrders)
      saveOrders(newOrders) // Save to localStorage as local cache
      setPaymentModal({ open: false, itemName: '', itemPrice: 0, itemQuantity: 0 })

      // Also place order in Firebase for cross-device sync
      firebasePlaceOrder(toFirebaseOrder(order, playerName, userCode)).catch(() => {
        // Silent fail - order is still saved locally
        console.warn('Firebase placeOrder failed - order saved locally only')
      })

      // Record daily streak purchase
      const streakResult = recordDailyStreakPurchase(order.price)
      if (streakResult.isStreakComplete) {
        // 7-day streak complete! Refund coins + give free room card
        // The "coins" here represent the INR amount as game coins equivalent
        onAddNotification(
          '🔥 7-Day Streak Complete!',
          `You completed a 7-day streak for ₹${order.price}! You got ₹${streakResult.coinsToRefund} worth of coins FREE + 1 Room Card! 🎉`,
          'reward',
          '🎁'
        )
        onAddRoomCards?.(1)
      } else {
        onAddNotification(
          'Order Booked! 🛒',
          `Your order for ${order.item} (₹${order.price}) has been submitted. We'll verify and deliver soon!`,
          'system',
          '📦'
        )
      }
    },
    [orders, onAddNotification, onAddRoomCards, playerName, userCode]
  )

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'coins', label: 'Coins', icon: <Coins className="w-3.5 h-3.5" /> },
    { id: 'ability', label: 'Ability', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'spins', label: 'Spins', icon: <span className="text-xs">🎫</span> },
    { id: 'room', label: 'Room', icon: <span className="text-xs">🃏</span> },
    { id: 'history', label: 'History', icon: <Clock className="w-3.5 h-3.5" /> },
  ]

  // ─── Cart State ────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState('')

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotalINR = cart.filter(i => i.currency === 'inr').reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartTotalCoins = cart.filter(i => i.currency === 'coin').reduce((sum, item) => sum + item.price * item.quantity, 0)


  const addToCart = useCallback((item: AbilityItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { id: item.id, emoji: item.emoji, name: item.name, price: item.price, quantity: 1, currency: item.currency, abilityType: item.abilityType, section: item.section }]
    })
  }, [])

  const updateCartQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => {
        if (c.id === id) {
          const newQty = Math.max(0, c.quantity + delta)
          return newQty === 0 ? null : { ...c, quantity: newQty }
        }
        return c
      }).filter(Boolean) as CartItem[]
      return updated
    })
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(c => c.id !== id))
  }, [])

  const applyCoupon = useCallback(() => {
    if (!couponCode.trim()) return
    setCouponError('')

    // Check if already used
    try {
      const usedCoupons: string[] = JSON.parse(localStorage.getItem(USED_COUPONS_KEY) || '[]')
      if (usedCoupons.includes(couponCode.trim().toUpperCase())) {
        setCouponError('Coupon already used')
        return
      }
    } catch { /* ignore */ }

    // Check admin discount coupons (adminDiscountCoupons key - used by WELCOME60 etc.)
    try {
      const discountCoupons: Array<{ code: string; discountPercent: number; minPurchase?: number; maxUses?: number; currentUses?: number; oneTime?: boolean; oneTimePerUser?: boolean; targetUserIds?: string[]; disabled?: boolean }> = JSON.parse(localStorage.getItem(ADMIN_DISCOUNT_COUPONS_KEY) || '[]')
      const found = discountCoupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase())
      if (found) {
        if (found.disabled) {
          setCouponError('This coupon has been disabled')
          return
        }
        if (found.maxUses && found.currentUses !== undefined && found.currentUses >= found.maxUses) {
          setCouponError('This coupon has reached its max uses')
          return
        }
        const minPurchase = found.minPurchase || 0
        if (minPurchase > 0 && cartTotalINR < minPurchase) {
          setCouponError(`Minimum ₹${minPurchase} purchase required`)
          return
        }
        setAppliedCoupon({
          code: found.code,
          discountPercent: found.discountPercent || 10,
          minPurchase: minPurchase,
          used: false,
        })
        return
      }
    } catch { /* ignore */ }

    // Check admin coupons (legacy key)
    try {
      const adminCoupons: Array<{ code: string; discount: number; minPurchase?: number; oneTime?: boolean }> = JSON.parse(localStorage.getItem(ADMIN_COUPONS_KEY) || '[]')
      const found = adminCoupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase())
      if (found) {
        const minPurchase = found.minPurchase || 0
        if (minPurchase > 0 && cartTotalINR < minPurchase) {
          setCouponError(`Minimum ₹${minPurchase} purchase required`)
          return
        }
        setAppliedCoupon({
          code: found.code,
          discountPercent: found.discount || 10,
          minPurchase: minPurchase,
          used: false,
        })
        return
      }
    } catch { /* ignore */ }

    setCouponError('Invalid coupon code')
  }, [couponCode, cartTotalINR])

  const discountAmount = appliedCoupon ? Math.round(cartTotalINR * appliedCoupon.discountPercent / 100) : 0
  const finalTotal = cartTotalINR - discountAmount

  const handlePlaceOrder = useCallback(() => {
    if (cart.length === 0) return

    // Mark coupon as used
    if (appliedCoupon) {
      try {
        const usedCoupons: string[] = JSON.parse(localStorage.getItem(USED_COUPONS_KEY) || '[]')
        usedCoupons.push(appliedCoupon.code)
        localStorage.setItem(USED_COUPONS_KEY, JSON.stringify(usedCoupons))
      } catch { /* ignore */ }
      setAppliedCoupon(null)
    }

    // Process coin items immediately
    cart.filter(i => i.currency === 'coin').forEach(item => {
      onDeductCoins(item.price * item.quantity)
      if (item.abilityType === 'undo') {
        onAddUndos(item.quantity)
      } else if (item.abilityType === 'timer') {
        onAddPowerUp('extraTime', item.quantity)
      } else if (item.abilityType) {
        onAddPowerUp(item.abilityType as any, item.quantity)
      }
      onAddNotification('Ability Purchased! 🎉', `You bought ${item.emoji} ${item.name} x${item.quantity} for ${formatNumber(item.price * item.quantity)} coins`, 'reward', item.emoji)
    })

    // For INR items, open payment modal with combined total
    const inrItems = cart.filter(i => i.currency === 'inr')
    if (inrItems.length > 0) {
      const total = finalTotal
      const itemNames = inrItems.map(i => `${i.emoji} ${i.name} x${i.quantity}`).join(', ')
      setPaymentModal({ open: true, itemName: itemNames, itemPrice: total, itemQuantity: 1 })
    }

    // Clear cart
    setCart([])
    setCouponCode('')
    setShowCart(false)
  }, [cart, appliedCoupon, finalTotal, onDeductCoins, onAddPowerUp, onAddUndos, onAddNotification])

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
              <div className="flex items-center gap-2">
                {/* Cart Icon */}
                <button
                  onClick={() => setShowCart(!showCart)}
                  className="relative w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
                  style={{ backgroundColor: showCart ? 'rgba(237,194,46,0.2)' : 'rgba(255,255,255,0.1)' }}
                >
                  <ShoppingCart className="w-4 h-4" style={{ color: showCart ? '#EDC22E' : 'rgba(255,255,255,0.5)' }} />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ backgroundColor: '#F65E3B', color: '#FFFFFF' }}>
                      {cartItemCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
            </div>

            {/* Cart Slide-in Panel */}
            <AnimatePresence>
              {showCart && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute inset-0 z-20 flex"
                >
                  <div className="flex-1" onClick={() => setShowCart(false)} style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
                  <div className="w-[85%] h-full flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    {/* Cart Header */}
                    <div className="flex items-center justify-between p-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" style={{ color: '#EDC22E' }} />
                        <span className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Cart ({cartItemCount})</span>
                      </div>
                      <button onClick={() => setShowCart(false)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
                      </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                      {cart.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCart className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Cart is empty</p>
                          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Add items from the store</p>
                        </div>
                      ) : (
                        cart.map(item => (
                          <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="text-sm">{item.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold truncate" style={{ color: '#FFFFFF' }}>{item.name}</p>
                              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {item.currency === 'inr' ? `₹${item.price}` : `💰 ${formatNumber(item.price)}`} each
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateCartQuantity(item.id, -1)} className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                <Minus className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                              </button>
                              <span className="text-[10px] font-bold w-5 text-center" style={{ color: '#FFFFFF' }}>{item.quantity}</span>
                              <button onClick={() => updateCartQuantity(item.id, 1)} className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                <Plus className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                              </button>
                            </div>
                            <p className="text-[10px] font-bold ml-1" style={{ color: item.currency === 'inr' ? '#EDC22E' : '#EDC22E' }}>
                              {item.currency === 'inr' ? `₹${item.price * item.quantity}` : `💰${formatNumber(item.price * item.quantity)}`}
                            </p>
                            <button onClick={() => removeFromCart(item.id)} className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(246,94,59,0.1)' }}>
                              <X className="w-2.5 h-2.5" style={{ color: '#F65E3B' }} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Coupon & Checkout */}
                    {cart.length > 0 && (
                      <div className="shrink-0 p-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* Coupon */}
                        <div className="flex gap-1.5">
                          <div className="flex-1 flex items-center gap-1 px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Tag className="w-3 h-3" style={{ color: '#EDC22E' }} />
                            <input type="text" value={couponCode} onChange={e => { setCouponCode(e.target.value); setCouponError('') }} placeholder="Enter coupon code" className="flex-1 bg-transparent text-[9px] outline-none" style={{ color: '#FFFFFF' }} />
                          </div>
                          <button onClick={applyCoupon} disabled={!couponCode.trim()} className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold disabled:opacity-40" style={{ backgroundColor: 'rgba(237,194,46,0.15)', border: '1px solid rgba(237,194,46,0.3)', color: '#EDC22E' }}>
                            Apply
                          </button>
                        </div>
                        {couponError && <p className="text-[8px]" style={{ color: '#F65E3B' }}>{couponError}</p>}
                        {appliedCoupon && <p className="text-[8px]" style={{ color: '#00E676' }}>✅ {appliedCoupon.discountPercent}% off applied!</p>}

                        {/* Totals */}
                        <div className="space-y-1">
                          {cartTotalINR > 0 && (
                            <div className="flex justify-between">
                              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>₹ Total:</span>
                              <span className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>₹{cartTotalINR}</span>
                            </div>
                          )}
                          {cartTotalCoins > 0 && (
                            <div className="flex justify-between">
                              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>💰 Total:</span>
                              <span className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>💰 {formatNumber(cartTotalCoins)}</span>
                            </div>
                          )}
                          {discountAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-[9px]" style={{ color: '#00E676' }}>Discount:</span>
                              <span className="text-[9px] font-bold" style={{ color: '#00E676' }}>-₹{discountAmount}</span>
                            </div>
                          )}
                          {finalTotal > 0 && discountAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-[9px] font-bold" style={{ color: '#FFFFFF' }}>Final:</span>
                              <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>₹{finalTotal}</span>
                            </div>
                          )}
                        </div>

                        {/* UPI Info */}
                        {cartTotalINR > 0 && (
                          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.1)' }}>
                            <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>UPI: <span className="font-mono font-bold" style={{ color: '#EDC22E' }}>{UPI_ID}</span></p>
                          </div>
                        )}

                        <button onClick={handlePlaceOrder} className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-95" style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF', boxShadow: '0 2px 12px rgba(237,194,46,0.3)' }}>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Place Order{cartTotalINR > 0 ? ` • ₹${finalTotal || cartTotalINR}` : ''}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab Switcher */}
            <div className="flex px-4 pt-3 pb-0 shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-bold rounded-t-xl transition-all"
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
                    <CoinsTab onBuy={handleBuy} />
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
                    <AbilityTab onBuy={handleBuy} onCoinBuy={handleCoinBuy} coins={coins} onAddNotification={onAddNotification} onDeductCoins={onDeductCoins} cart={cart} onAddToCart={addToCart} onUpdateCartQuantity={updateCartQuantity} />
                  </motion.div>
                )}
                {activeTab === 'spins' && (
                  <motion.div
                    key="spins"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SpinsTab onBuy={handleBuy} coins={coins} onDeductCoins={onDeductCoins} onAddSpinTickets={onAddSpinTickets} onAddNotification={onAddNotification} />
                  </motion.div>
                )}
                {activeTab === 'room' && (
                  <motion.div
                    key="room"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RoomTab onBuy={handleBuy} onCoinBuy={handleCoinBuy} coins={coins} onAddRoomCards={onAddRoomCards} onAddNotification={onAddNotification} onDeductCoins={onDeductCoins} cart={cart} onAddToCart={addToCart} onUpdateCartQuantity={updateCartQuantity} />
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
                    <HistoryTab
                      orders={orders}
                      onDeleteAll={() => {
                        setOrders([])
                        saveOrders([])
                      }}
                      onDeleteSelected={(ids) => {
                        const idSet = new Set(ids)
                        const updated = orders.filter(o => !idSet.has(o.id))
                        setOrders(updated)
                        saveOrders(updated)
                      }}
                    />
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
                  Delivery in 1-2 hrs · Delayed beyond 24 hrs ={' '}
                  <span style={{ color: '#EDC22E', fontWeight: 'bold' }}>2x BONUS!</span>
                </p>
              </div>
            </div>

            {/* UPI Payment Modal (overlay within the store) */}
            <AnimatePresence>
              {paymentModal.open && (
                <UPIPaymentModal
                  isOpen={paymentModal.open}
                  onClose={() => setPaymentModal({ open: false, itemName: '', itemPrice: 0, itemQuantity: 0 })}
                  itemName={paymentModal.itemName}
                  itemPrice={paymentModal.itemPrice}
                  itemQuantity={paymentModal.itemQuantity}
                  playerId={playerId}
                  onOrderPlaced={handleOrderPlaced}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
