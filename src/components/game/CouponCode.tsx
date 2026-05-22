'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Ticket, Check, AlertCircle, Shield, Clock, ChevronRight, Trash2, Plus, Settings, Eye, Ban, ThumbsUp, Sparkles, Coins, RotateCcw, Zap, Minus, RefreshCw, Users as UsersIcon, Copy, Percent, Package, TrendingUp, DollarSign, Send, Lock, UserCheck } from 'lucide-react'
import { getTotalUserCount, getOnlineUserCount, getTotalReferralsCount, checkAdminPassword, setAdminPassword as firebaseSetAdminPassword, authenticatePartner, getPartners as firebaseGetPartners, savePartner as firebaseSavePartner, deletePartner as firebaseDeletePartner, onOrdersUpdate, updateOrderStatus as firebaseUpdateOrderStatus, deliverOrderItems, type FirebaseStoreOrder, type PartnerData } from '@/lib/firebase-service'

interface CouponCodeProps {
  isOpen: boolean
  onClose: () => void
  coins: number
  hammerCount: number
  magnetCount: number
  blastCount: number
  spinTickets: number
  onAddCoins: (amount: number) => void
  onAddPowerUp: (pu: 'hammer' | 'magnet' | 'blast' | 'multiplier5x' | 'multiplier2_5x' | 'extraTime', count: number) => void
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

// Admin access code is now stored in Firebase at adminConfig/adminPassword
// Default password: 'ADMIN.IN' - can be changed by admin

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

// Store order type (matching Store.tsx)
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

function loadStoreOrders(): StoreOrder[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem('mergeMaster2048_orders')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveStoreOrders(orders: StoreOrder[]) {
  localStorage.setItem('mergeMaster2048_orders', JSON.stringify(orders))
}

// Coin-ability pricing
interface CoinAbilityPrice {
  hammer: number
  magnet: number
  bomb: number
  timer: number
  undo: number
}

const DEFAULT_COIN_ABILITY_PRICES: CoinAbilityPrice = {
  hammer: 150,
  magnet: 150,
  bomb: 300,
  timer: 200,
  undo: 100,
}

function loadCoinAbilityPrices(): CoinAbilityPrice {
  if (typeof window === 'undefined') return DEFAULT_COIN_ABILITY_PRICES
  try {
    const data = localStorage.getItem('adminCoinAbilityPrices')
    return data ? JSON.parse(data) : DEFAULT_COIN_ABILITY_PRICES
  } catch {
    return DEFAULT_COIN_ABILITY_PRICES
  }
}

function saveCoinAbilityPrices(prices: CoinAbilityPrice) {
  localStorage.setItem('adminCoinAbilityPrices', JSON.stringify(prices))
}

// Lock duration
function loadLockDuration(): number {
  if (typeof window === 'undefined') return 2
  try {
    const data = localStorage.getItem('adminLockDuration')
    return data ? parseInt(data, 10) : 2
  } catch {
    return 2
  }
}

function saveLockDuration(weeks: number) {
  localStorage.setItem('adminLockDuration', String(weeks))
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

type AdminTab = 'dashboard' | 'payments' | 'coupons' | 'prices' | 'history' | 'users' | 'partner' | 'security'

// Custom price overrides stored in localStorage
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

function saveCustomPrices(prices: CustomPriceOverride) {
  localStorage.setItem('adminCustomPrices', JSON.stringify(prices))
}

// ============================================================
// PARTNER LINKS - Stored in localStorage
// ============================================================

interface PartnerLink {
  id: string
  role: 'payment' | 'skill' | 'coupon'
  token: string
  name: string
  createdAt: number
  lastUsedAt: number | null
  active: boolean
}

const PARTNER_LINKS_KEY = 'adminPartnerLinks'

function loadPartnerLinks(): PartnerLink[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(PARTNER_LINKS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function savePartnerLinks(links: PartnerLink[]) {
  localStorage.setItem(PARTNER_LINKS_KEY, JSON.stringify(links))
}

// ============================================================
// TOURNAMENT PRIZES - Stored in localStorage
// ============================================================

interface TournamentPrizes {
  rank1: number
  rank2: number
  rank3: number
  rank4: number
  rank5: number
  entryFee: number
  weeklyBonus: number
}

const TOURNAMENT_PRIZES_KEY = 'adminTournamentPrizes'

const DEFAULT_TOURNAMENT_PRIZES: TournamentPrizes = {
  rank1: 700,
  rank2: 400,
  rank3: 250,
  rank4: 150,
  rank5: 100,
  entryFee: 50,
  weeklyBonus: 400,
}

function loadTournamentPrizes(): TournamentPrizes {
  if (typeof window === 'undefined') return DEFAULT_TOURNAMENT_PRIZES
  try {
    const data = localStorage.getItem(TOURNAMENT_PRIZES_KEY)
    return data ? JSON.parse(data) : DEFAULT_TOURNAMENT_PRIZES
  } catch {
    return DEFAULT_TOURNAMENT_PRIZES
  }
}

function saveTournamentPrizes(prizes: TournamentPrizes) {
  localStorage.setItem(TOURNAMENT_PRIZES_KEY, JSON.stringify(prizes))
}

// ============================================================
// BANNED USERS - Stored in localStorage
// ============================================================

interface BannedUser {
  playerId: string
  reason: string
  bannedAt: number // timestamp
  banDuration: 'weekly' | 'monthly' | 'yearly' | 'permanent'
  expiresAt: number | null // null for permanent
}

const BANNED_USERS_KEY = 'adminBannedUsers'

function loadBannedUsers(): BannedUser[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(BANNED_USERS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveBannedUsers(users: BannedUser[]) {
  localStorage.setItem(BANNED_USERS_KEY, JSON.stringify(users))
}

function isUserBanned(playerId: string): boolean {
  const users = loadBannedUsers()
  const now = Date.now()
  // Auto-remove expired bans and check if the player is banned
  const activeBans = users.filter(u => {
    if (u.playerId !== playerId) return true // keep other users
    if (u.expiresAt === null) return true // permanent ban
    if (u.expiresAt > now) return true // not yet expired
    return false // expired, remove
  })
  // Save cleaned list if any were removed
  if (activeBans.length !== users.length) {
    saveBannedUsers(activeBans)
  }
  return activeBans.some(u => u.playerId === playerId)
}

function banUser(playerId: string, reason: string, duration: 'weekly' | 'monthly' | 'yearly' | 'permanent'): void {
  const users = loadBannedUsers()
  // Remove existing ban for this player if any
  const filtered = users.filter(u => u.playerId !== playerId)
  const now = Date.now()
  let expiresAt: number | null = null
  switch (duration) {
    case 'weekly':
      expiresAt = now + 7 * 24 * 60 * 60 * 1000
      break
    case 'monthly':
      expiresAt = now + 30 * 24 * 60 * 60 * 1000
      break
    case 'yearly':
      expiresAt = now + 365 * 24 * 60 * 60 * 1000
      break
    case 'permanent':
      expiresAt = null
      break
  }
  filtered.push({ playerId, reason, bannedAt: now, banDuration: duration, expiresAt })
  saveBannedUsers(filtered)
}

function unbanUser(playerId: string): void {
  const users = loadBannedUsers()
  const filtered = users.filter(u => u.playerId !== playerId)
  saveBannedUsers(filtered)
}

// Export for use in other files
export { isUserBanned, loadBannedUsers }

// ============================================================
// DISCOUNT COUPONS - Stored in localStorage
// ============================================================

export interface DiscountCoupon {
  code: string
  discountPercent: number
  minPurchase: number
  maxUses: number
  currentUses: number
  oneTime: boolean
  targetUserIds: string[] // empty = available to all users
  createdAt: number
  createdBy: string // 'admin' or 'system'
  description: string
  disabled?: boolean
}

const DISCOUNT_COUPONS_KEY = 'adminDiscountCoupons'

export function loadDiscountCoupons(): DiscountCoupon[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(DISCOUNT_COUPONS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveDiscountCoupons(coupons: DiscountCoupon[]) {
  localStorage.setItem(DISCOUNT_COUPONS_KEY, JSON.stringify(coupons))
}

// Validate a discount coupon for a given user and cart total
export function validateDiscountCoupon(code: string, userCode: string, cartTotal: number): { valid: boolean; coupon?: DiscountCoupon; error?: string } {
  const coupons = loadDiscountCoupons()
  const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase())
  if (!coupon) return { valid: false, error: 'Invalid coupon code' }
  if (coupon.disabled) return { valid: false, error: 'This coupon has been disabled' }
  if (coupon.currentUses >= coupon.maxUses) return { valid: false, error: 'This coupon has reached its max uses' }
  if (coupon.minPurchase > 0 && cartTotal < coupon.minPurchase) return { valid: false, error: `Minimum purchase of ₹${coupon.minPurchase} required` }
  if (coupon.targetUserIds.length > 0 && !coupon.targetUserIds.includes(userCode)) return { valid: false, error: 'This coupon is not available for your account' }
  return { valid: true, coupon }
}

// Apply discount coupon - only call when purchase is actually completed
export function consumeDiscountCoupon(code: string): boolean {
  const coupons = loadDiscountCoupons()
  const idx = coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase())
  if (idx === -1) return false
  coupons[idx].currentUses++
  saveDiscountCoupons(coupons)
  return true
}

// Restore discount coupon count (when order is cancelled/rejected)
export function restoreDiscountCoupon(code: string): boolean {
  const coupons = loadDiscountCoupons()
  const idx = coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase())
  if (idx === -1) return false
  if (coupons[idx].currentUses > 0) coupons[idx].currentUses--
  saveDiscountCoupons(coupons)
  return true
}

// Default COIN_PACKAGES (matching Store.tsx)
const DEFAULT_COIN_PACKAGES = [
  { coins: 10000, price: 10 },
  { coins: 30000, price: 30 },
  { coins: 50000, price: 50 },
  { coins: 80000, price: 80 },
  { coins: 80000, price: 80 },
]

// Default INR_ABILITY_PACKAGES (matching Store.tsx)
const DEFAULT_INR_ABILITY_PACKAGES = [
  { type: '5x', uses: 5, price: 20 },
  { type: '5x', uses: 15, price: 55 },
  { type: '5x', uses: 35, price: 100 },
  { type: '5x', uses: 80, price: 189 },
  { type: '2.5x', uses: 5, price: 20 },
  { type: '2.5x', uses: 15, price: 55 },
  { type: '2.5x', uses: 35, price: 100 },
  { type: '2.5x', uses: 80, price: 189 },
]

// Copy button component for coupon codes
function CodeCopyButton({ code, active, label }: { code: string; active: boolean; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-bold transition-transform active:scale-95"
      style={{
        backgroundColor: copied ? 'rgba(0,230,118,0.15)' : active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
        border: copied ? '1px solid rgba(0,230,118,0.3)' : '1px solid rgba(255,255,255,0.08)',
        color: copied ? '#00E676' : active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
      }}>
      {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function DayCodeCopyButton({ code, active }: { code: string; active: boolean }) {
  return <CodeCopyButton code={code} active={active} label="Day" />
}

function NightCodeCopyButton({ code, active }: { code: string; active: boolean }) {
  return <CodeCopyButton code={code} active={active} label="Night" />
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

  // Admin panel state
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard')
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryEntry[]>(() => loadPurchaseHistory())
  const [customCodes, setCustomCodes] = useState<CustomCouponCode[]>(() => loadCustomCouponCodes())
  const [nightCodeSettings, setNightCodeSettings] = useState<NightCodeSettings>(() => loadNightCodeSettings())
  const [customPrices, setCustomPrices] = useState<CustomPriceOverride | null>(() => loadCustomPrices())
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>(() => loadStoreOrders())
  const [coinAbilityPrices, setCoinAbilityPrices] = useState<CoinAbilityPrice>(() => loadCoinAbilityPrices())
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set())
  const [lockDuration, setLockDuration] = useState<number>(() => loadLockDuration())

  // Admin role & partner state
  const [adminRole, setAdminRole] = useState<'admin' | 'partner'>('admin')
  const [partnerPermissions, setPartnerPermissions] = useState<string[]>([])
  const [partnerName, setPartnerName] = useState('')
  // Firebase orders (synced across devices)
  const [firebaseOrders, setFirebaseOrders] = useState<FirebaseStoreOrder[]>([])
  // Admin password change
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [adminPasswordMsg, setAdminPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  // Partner management
  const [partnerList, setPartnerList] = useState<Array<{ id: string } & PartnerData>>([])
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newPartnerPassword, setNewPartnerPassword] = useState('')
  const [newPartnerPermissions, setNewPartnerPermissions] = useState<string[]>(['view_orders'])

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

  // Day/Night code toggle in Coupons tab
  const [dnToggle, setDnToggle] = useState<'day' | 'night'>('day')
  const [dayCodeCustom, setDayCodeCustom] = useState('')
  const [nightCodeCustom, setNightCodeCustom] = useState('')
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  // Timer for day/night countdown
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Partner state
  const [partnerRole, setPartnerRole] = useState<string | null>(null)
  const [partnerMode, setPartnerMode] = useState(false)
  const [partnerLinks, setPartnerLinks] = useState<PartnerLink[]>(() => loadPartnerLinks())
  const [partnerNewRole, setPartnerNewRole] = useState<'payment' | 'skill' | 'coupon'>('payment')
  const [partnerNewName, setPartnerNewName] = useState('')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [tournamentPrizes, setTournamentPrizes] = useState<TournamentPrizes>(() => loadTournamentPrizes())

  // Discount coupon state
  const [discountCoupons, setDiscountCoupons] = useState<DiscountCoupon[]>(() => loadDiscountCoupons())
  const [newDiscountCode, setNewDiscountCode] = useState('')
  const [newDiscountPercent, setNewDiscountPercent] = useState(10)
  const [newDiscountMinPurchase, setNewDiscountMinPurchase] = useState(0)
  const [newDiscountMaxUses, setNewDiscountMaxUses] = useState(100)
  const [newDiscountOneTime, setNewDiscountOneTime] = useState(false)
  const [newDiscountTargetUsers, setNewDiscountTargetUsers] = useState('')
  const [newDiscountDescription, setNewDiscountDescription] = useState('')

  // Total revenue tracker
  const [totalRevenue, setTotalRevenue] = useState<number>(0)
  const [pendingOrderCount, setPendingOrderCount] = useState<number>(0)

  // Check for partner access from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const partnerParam = params.get('partner')
      if (partnerParam) {
        setPartnerRole(partnerParam)
        setPartnerMode(true)
        // Auto-open admin panel with restricted access
        setShowAdminPanel(true)
        // Set the correct tab based on role
        if (partnerParam.startsWith('PAY')) {
          setAdminTab('payments')
        } else if (partnerParam.startsWith('SKILL')) {
          setAdminTab('prices')
        } else if (partnerParam.startsWith('COUPON')) {
          setAdminTab('coupons')
        }
        // Update lastUsedAt for this partner link
        const links = loadPartnerLinks()
        const updatedLinks = links.map(l =>
          l.token === partnerParam ? { ...l, lastUsedAt: Date.now() } : l
        )
        savePartnerLinks(updatedLinks)
        setPartnerLinks(updatedLinks)
      }
    }
  }, [])

  // Users tab state
  const [banPlayerId, setBanPlayerId] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState<'weekly' | 'monthly' | 'yearly' | 'permanent'>('weekly')
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>(() => loadBannedUsers())
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [onlineUsers, setOnlineUsers] = useState<number>(0)
  const [totalReferrals, setTotalReferrals] = useState<number>(0)
  const [userStatsLoading, setUserStatsLoading] = useState(false)

  // Day code settings (for real-time update when admin changes it)
  interface DayCodeSettings {
    rewardType: RewardType
    rewardAmount: number
    label: string
    emoji: string
  }
  const [dayCodeSettings, setDayCodeSettings] = useState<DayCodeSettings>(() => {
    if (typeof window === 'undefined') return { rewardType: 'coins', rewardAmount: 300, label: '300 Coins', emoji: '💰' }
    try {
      const data = localStorage.getItem('adminDayCodeSettings')
      return data ? JSON.parse(data) : { rewardType: 'coins', rewardAmount: 300, label: '300 Coins', emoji: '💰' }
    } catch { return { rewardType: 'coins', rewardAmount: 300, label: '300 Coins', emoji: '💰' } }
  })
  const [dcRewardType, setDcRewardType] = useState<RewardType>(dayCodeSettings.rewardType)
  const [dcRewardAmount, setDcRewardAmount] = useState(dayCodeSettings.rewardAmount)

  function saveDayCodeSettings(settings: DayCodeSettings) {
    localStorage.setItem('adminDayCodeSettings', JSON.stringify(settings))
    setDayCodeSettings(settings)
  }

  // Refresh store orders, purchase history, and custom codes when CouponCode modal opens
  useEffect(() => {
    if (isOpen) {
      setStoreOrders(loadStoreOrders())
      setPurchaseHistory(loadPurchaseHistory())
      setCustomCodes(loadCustomCouponCodes())
    }
  }, [isOpen])

  // Refresh admin data when panel opens
  useEffect(() => {
    if (showAdminPanel) {
      setPurchaseHistory(loadPurchaseHistory())
      setCustomCodes(loadCustomCouponCodes())
      setNightCodeSettings(loadNightCodeSettings())
      setNcRewardType(loadNightCodeSettings().rewardType)
      setNcRewardAmount(loadNightCodeSettings().rewardAmount)
      setCustomPrices(loadCustomPrices())
      setStoreOrders(loadStoreOrders())
      setCoinAbilityPrices(loadCoinAbilityPrices())
      setLockDuration(loadLockDuration())
      setSelectedHistoryIds(new Set())
      setBannedUsers(loadBannedUsers())
      setDiscountCoupons(loadDiscountCoupons())
      // Load partners from Firebase
      firebaseGetPartners().then(p => setPartnerList(p)).catch(() => {})
      // Load user stats from Firebase
      setUserStatsLoading(true)
      Promise.all([getTotalUserCount(), getOnlineUserCount(), getTotalReferralsCount()])
        .then(([total, online, refs]) => {
          setTotalUsers(total)
          setOnlineUsers(online)
          setTotalReferrals(refs)
        })
        .catch(() => { /* silent */ })
        .finally(() => setUserStatsLoading(false))
      // Revenue and pending count are computed from Firebase orders via the real-time listener
      // (onOrdersUpdate useEffect), not from localStorage
      // Also reload day code settings
      try {
        const dcData = localStorage.getItem('adminDayCodeSettings')
        if (dcData) {
          const parsed = JSON.parse(dcData)
          setDayCodeSettings(parsed)
          setDcRewardType(parsed.rewardType)
          setDcRewardAmount(parsed.rewardAmount)
        }
      } catch { /* ignore */ }
    }
  }, [showAdminPanel])

  // When switching to payments/history tabs, orders come from Firebase real-time listener
  // No need to reload from localStorage - Firebase is the source of truth for admin panel
  // We still reload localStorage storeOrders as fallback for unsynced orders
  useEffect(() => {
    if (showAdminPanel && (adminTab === 'payments' || adminTab === 'history')) {
      setStoreOrders(loadStoreOrders()) // Fallback data for unsynced orders only
    }
  }, [adminTab, showAdminPanel])

  // Listen for Firebase orders in real-time when admin panel is open
  useEffect(() => {
    if (!showAdminPanel) return
    const unsubscribe = onOrdersUpdate((orders) => {
      setFirebaseOrders(orders)
      // Compute revenue and pending count from Firebase orders
      const approvedRevenue = orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.finalAmount, 0)
      setTotalRevenue(approvedRevenue)
      setPendingOrderCount(orders.filter(o => o.status === 'pending').length)
    })
    return unsubscribe
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
  const handleClaim = useCallback(async () => {
    const code = codeInput.trim().toUpperCase()
    if (!code) {
      setStatusMessage({ text: 'Please enter a coupon code', type: 'error' })
      return
    }

      // Check for admin access code FIRST (before any other check)
    // Check against Firebase admin password and partner passwords
    if (code.length >= 4) {
      // Try admin password check
      try {
        const isAdmin = await checkAdminPassword(code)
        if (isAdmin) {
          setAdminRole('admin')
          setShowAdminPanel(true)
          setCodeInput('')
          setStatusMessage(null)
          return
        }
      } catch { /* ignore */ }

      // Try partner password check
      try {
        const partner = await authenticatePartner(code)
        if (partner) {
          setAdminRole('partner')
          setPartnerPermissions(partner.data.permissions)
          setPartnerName(partner.data.name)
          // Set the correct tab based on permissions
          if (partner.data.permissions.includes('approve_orders') || partner.data.permissions.includes('view_orders')) {
            setAdminTab('payments')
          } else if (partner.data.permissions.includes('manage_coupons')) {
            setAdminTab('coupons')
          } else if (partner.data.permissions.includes('manage_prices')) {
            setAdminTab('prices')
          } else if (partner.data.permissions.includes('view_users') || partner.data.permissions.includes('ban_users')) {
            setAdminTab('users')
          } else {
            setAdminTab('dashboard')
          }
          setShowAdminPanel(true)
          setCodeInput('')
          setStatusMessage(null)
          return
        }
      } catch { /* ignore */ }
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

    // Use admin-configured reward for day/night codes (real-time)
    // If admin didn't set a custom reward, auto-generate one with lower reward
    const isDayCode = code.startsWith('DAY')
    const isNightCode = code.startsWith('NIGHT')

    if (isDayCode) {
      // Check if it's day time (6AM to 6PM)
      const currentHour = new Date().getHours()
      if (currentHour < 6 || currentHour >= 18) {
        setStatusMessage({ text: 'Day code is only available from 6AM to 6PM!', type: 'error' })
        return
      }
      const daySettings = dayCodeSettings
      // Auto-generate lower reward if admin forgot to configure
      const rewardToUse: RewardOption = daySettings.rewardAmount > 0
        ? { type: daySettings.rewardType, label: daySettings.label, emoji: daySettings.emoji, weight: 100 }
        : { type: 'coins', label: '150 Coins (Auto)', emoji: '💰', weight: 100 } // Auto-generated with lower reward
      applyReward(rewardToUse)
      const newClaim: ClaimedCoupon = {
        code,
        date: today,
        reward: `${rewardToUse.emoji} ${rewardToUse.label}`,
        timestamp: Date.now(),
      }
      const updatedHistory = [newClaim, ...claimHistory].slice(0, 50)
      setClaimHistory(updatedHistory)
      saveClaimedCoupons(updatedHistory)
      setShowReward({ label: rewardToUse.label, emoji: rewardToUse.emoji })
      setStatusMessage({ text: `Day code redeemed! ${rewardToUse.emoji} ${rewardToUse.label}`, type: 'success' })
      setCodeInput('')
      return
    }

    if (isNightCode) {
      // Check if it's night time (6PM to 6AM)
      const currentHour = new Date().getHours()
      if (currentHour >= 6 && currentHour < 18) {
        setStatusMessage({ text: 'Night code is only available from 6PM to 6AM!', type: 'error' })
        return
      }
      const nightSettings = nightCodeSettings
      const rewardToUse: RewardOption = nightSettings.rewardAmount > 0
        ? { type: nightSettings.rewardType, label: nightSettings.label, emoji: nightSettings.emoji, weight: 100 }
        : { type: 'coins', label: '150 Coins (Auto)', emoji: '💰', weight: 100 }
      applyReward(rewardToUse)
      const newClaim: ClaimedCoupon = {
        code,
        date: today,
        reward: `${rewardToUse.emoji} ${rewardToUse.label}`,
        timestamp: Date.now(),
      }
      const updatedHistory = [newClaim, ...claimHistory].slice(0, 50)
      setClaimHistory(updatedHistory)
      saveClaimedCoupons(updatedHistory)
      setShowReward({ label: rewardToUse.label, emoji: rewardToUse.emoji })
      setStatusMessage({ text: `Night code redeemed! ${rewardToUse.emoji} ${rewardToUse.label}`, type: 'success' })
      setCodeInput('')
      return
    }

    // Fallback: Pick and apply random reward
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

  // Approve a purchase (works with both purchaseHistory and storeOrders)
  const handleApprovePurchase = useCallback((entry: PurchaseHistoryEntry) => {
    const purchaseDate = new Date(entry.date).getTime()
    const now = Date.now()
    const hoursSincePurchase = (now - purchaseDate) / (1000 * 60 * 60)
    const isDelayed = hoursSincePurchase > 24

    // Check if it's a store order
    const isStoreOrder = entry.id.startsWith('store_')
    const storeOrderId = isStoreOrder ? entry.id.replace('store_', '') : null

    if (isStoreOrder && storeOrderId) {
      const isInrAbility = entry.item.includes('5x') || entry.item.includes('2.5x')

      if (isInrAbility) {
        // Add the actual ability instead of coins
        if (entry.item.includes('5x')) {
          onAddPowerUp('multiplier5x', entry.abilityCount || entry.coinAmount || 5)
        } else if (entry.item.includes('2.5x')) {
          onAddPowerUp('multiplier2_5x', entry.abilityCount || entry.coinAmount || 5)
        }
        onAddNotification('Ability Delivered! ✅', `${entry.item} has been delivered to your inventory!`, 'reward', '📦')
      } else {
        // Coin pack - add coins
        let coinAmount = entry.coinAmount || getCoinAmountFromItem(entry.item)
        if (isDelayed) coinAmount = Math.floor(coinAmount * 2)
        onAddCoins(coinAmount)
        const bonusText = isDelayed ? ` (2x bonus for ${Math.floor(hoursSincePurchase)}hr delay!)` : ''
        onAddNotification('Order Approved! ✅', `${entry.item} delivered! ${coinAmount} coins added${bonusText}`, 'reward', '📦')
      }

      // Update store order status locally
      const updatedOrders = storeOrders.map(o =>
        o.id === storeOrderId ? { ...o, status: 'approved' as const } : o
      )
      setStoreOrders(updatedOrders)
      saveStoreOrders(updatedOrders)

      // Update order in Firebase
      firebaseUpdateOrderStatus(storeOrderId, 'approved').catch(() => {})

      // Deliver items to user via Firebase notification
      const fbOrder = firebaseOrders.find(o => o.id === storeOrderId)
      if (fbOrder) {
        const deliveryItems: { coins?: number; abilities?: Array<{ type: string; count: number }>; roomCards?: number; spinTickets?: number } = {}
        if (entry.item.includes('5x')) {
          deliveryItems.abilities = [{ type: 'multiplier5x', count: entry.abilityCount || 5 }]
        } else if (entry.item.includes('2.5x')) {
          deliveryItems.abilities = [{ type: 'multiplier2_5x', count: entry.abilityCount || 5 }]
        } else {
          let coinAmt = entry.coinAmount || getCoinAmountFromItem(entry.item)
          if (isDelayed) coinAmt = Math.floor(coinAmt * 2)
          deliveryItems.coins = coinAmt
        }
        deliverOrderItems(storeOrderId, fbOrder.playerId, deliveryItems).catch(() => {})
      }
    } else if (entry.type === 'inr_ability') {
      // INR ability purchase (5x/2.5x) - add the actual ability
      if (entry.item.includes('5x')) {
        onAddPowerUp('multiplier5x', entry.abilityCount || 5)
      } else if (entry.item.includes('2.5x')) {
        onAddPowerUp('multiplier2_5x', entry.abilityCount || 5)
      }
      const updated = purchaseHistory.map(p =>
        p.id === entry.id ? { ...p, status: 'Delivered' as const } : p
      )
      setPurchaseHistory(updated)
      savePurchaseHistory(updated)
      onAddNotification('Ability Approved! ✅', `${entry.item} delivered to your inventory!`, 'reward', '📦')
    } else {
      // Coin or coin-price ability purchase
      let coinAmount = entry.coinAmount || getCoinAmountFromItem(entry.item)
      if (isDelayed) {
        coinAmount = Math.floor(coinAmount * 2) // 2x bonus for delayed
      }

      onAddCoins(coinAmount)

      // Update purchase status
      const updated = purchaseHistory.map(p =>
        p.id === entry.id ? { ...p, status: 'Delivered' as const } : p
      )
      setPurchaseHistory(updated)
      savePurchaseHistory(updated)

      const bonusText = isDelayed ? ` (2x bonus for ${Math.floor(hoursSincePurchase)}hr delay!)` : ''
      onAddNotification('Order Approved! ✅', `${entry.item} delivered! ${coinAmount} coins added${bonusText}`, 'reward', '📦')
    }
  }, [purchaseHistory, storeOrders, onAddCoins, onAddPowerUp, onAddNotification, firebaseOrders])

  // Deny a purchase (works with both purchaseHistory and storeOrders)
  const handleDenyPurchase = useCallback((entry: PurchaseHistoryEntry) => {
    const isStoreOrder = entry.id.startsWith('store_')
    const storeOrderId = isStoreOrder ? entry.id.replace('store_', '') : null

    if (isStoreOrder && storeOrderId) {
      const updatedOrders = storeOrders.map(o =>
        o.id === storeOrderId ? { ...o, status: 'rejected' as const } : o
      )
      setStoreOrders(updatedOrders)
      saveStoreOrders(updatedOrders)
      // Update in Firebase
      firebaseUpdateOrderStatus(storeOrderId, 'rejected').catch(() => {})
    } else {
      const updated = purchaseHistory.map(p =>
        p.id === entry.id ? { ...p, status: 'Denied' as const } : p
      )
      setPurchaseHistory(updated)
      savePurchaseHistory(updated)
    }
  }, [purchaseHistory, storeOrders])

  // Disapprove (undo) a previously approved purchase - only within 24 hours
  const handleDisapprovePurchase = useCallback((entry: PurchaseHistoryEntry) => {
    const hoursSince = (Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60)
    if (hoursSince > 24) return // Can only undo within 24 hours

    const isStoreOrder = entry.id.startsWith('store_')
    const storeOrderId = isStoreOrder ? entry.id.replace('store_', '') : null

    if (isStoreOrder && storeOrderId) {
      const updatedOrders = storeOrders.map(o =>
        o.id === storeOrderId ? { ...o, status: 'rejected' as const } : o
      )
      setStoreOrders(updatedOrders)
      saveStoreOrders(updatedOrders)
      // Update in Firebase
      firebaseUpdateOrderStatus(storeOrderId, 'rejected').catch(() => {})
    } else {
      const updated = purchaseHistory.map(p =>
        p.id === entry.id ? { ...p, status: 'Denied' as const } : p
      )
      setPurchaseHistory(updated)
      savePurchaseHistory(updated)
    }
  }, [purchaseHistory, storeOrders])

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

  // Save day code settings (real-time update)
  const handleSaveDayCodeSettings = useCallback(() => {
    const emojiMap: Record<RewardType, string> = {
      coins: '💰', spins: '🎫', magnets: '🧲', bombs: '💣', hammers: '🔨', '5x': '✨', '2.5x': '🌟',
    }
    const labelMap: Record<RewardType, string> = {
      coins: `${dcRewardAmount} Coins`,
      spins: `${dcRewardAmount} Spin Tickets`,
      magnets: `${dcRewardAmount} Magnets`,
      bombs: `${dcRewardAmount} Bombs`,
      hammers: `${dcRewardAmount} Hammers`,
      '5x': `5x × ${dcRewardAmount} Uses`,
      '2.5x': `2.5x × ${dcRewardAmount} Uses`,
    }
    const settings: DayCodeSettings = {
      rewardType: dcRewardType,
      rewardAmount: dcRewardAmount,
      label: labelMap[dcRewardType],
      emoji: emojiMap[dcRewardType],
    }
    saveDayCodeSettings(settings)
  }, [dcRewardType, dcRewardAmount])

  // Create a discount coupon
  const handleCreateDiscountCoupon = useCallback(() => {
    const code = newDiscountCode.trim().toUpperCase()
    if (!code) return
    if (discountCoupons.some(c => c.code.toUpperCase() === code)) return

    const targetUsers = newDiscountTargetUsers
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const newCoupon: DiscountCoupon = {
      code,
      discountPercent: newDiscountPercent,
      minPurchase: newDiscountMinPurchase,
      maxUses: newDiscountMaxUses,
      currentUses: 0,
      oneTime: newDiscountOneTime,
      targetUserIds: targetUsers,
      createdAt: Date.now(),
      createdBy: 'admin',
      description: newDiscountDescription || `${newDiscountPercent}% off${newDiscountMinPurchase > 0 ? ` on ₹${newDiscountMinPurchase}+` : ''}`,
    }

    const updated = [...discountCoupons, newCoupon]
    setDiscountCoupons(updated)
    saveDiscountCoupons(updated)

    // Reset form
    setNewDiscountCode('')
    setNewDiscountPercent(10)
    setNewDiscountMinPurchase(0)
    setNewDiscountMaxUses(100)
    setNewDiscountOneTime(false)
    setNewDiscountTargetUsers('')
    setNewDiscountDescription('')
  }, [newDiscountCode, newDiscountPercent, newDiscountMinPurchase, newDiscountMaxUses, newDiscountOneTime, newDiscountTargetUsers, newDiscountDescription, discountCoupons])

  // Delete/disable a discount coupon
  const handleDeleteDiscountCoupon = useCallback((code: string) => {
    const updated = discountCoupons.filter(c => c.code !== code)
    setDiscountCoupons(updated)
    saveDiscountCoupons(updated)
  }, [discountCoupons])

  const handleToggleDiscountCoupon = useCallback((code: string) => {
    const updated = discountCoupons.map(c =>
      c.code === code ? { ...c, disabled: !c.disabled } : c
    )
    setDiscountCoupons(updated)
    saveDiscountCoupons(updated)
  }, [discountCoupons])

  const dayCode = generateDayCode()
  const nightCode = generateNightCode()
  const rotationDay = getRotationSuffix()

  // Day/Night time logic (6AM-6PM day, 6PM-6AM night)
  const currentHour = now.getHours()
  const isDayTime = currentHour >= 6 && currentHour < 18 // 6:00 AM to 5:59 PM = day
  const isNightTime = currentHour >= 18 || currentHour < 6 // 6:00 PM to 5:59 AM = night

  const getTimeUntilSwitch = () => {
    if (isDayTime) {
      // Countdown to 6:00 PM (night start)
      const switchTime = new Date(now)
      switchTime.setHours(18, 0, 0, 0)
      const diff = switchTime.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      return `${h}h ${m}m ${s}s`
    } else {
      // Countdown to 6:00 AM (day start)
      const switchTime = new Date(now)
      if (currentHour >= 18) {
        switchTime.setDate(switchTime.getDate() + 1)
      }
      switchTime.setHours(6, 0, 0, 0)
      const diff = switchTime.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      return `${h}h ${m}m ${s}s`
    }
  }

  // Admin panel: Firebase orders are the PRIMARY source for cross-device access.
  // localStorage storeOrders are only used as fallback for orders that haven't synced to Firebase yet.
  // purchaseHistory (local coupon claims) is NOT included in admin view - admin only sees store orders.
  const mergedAllPurchases: PurchaseHistoryEntry[] = [
    // Firebase orders first (cross-device, real-time, source of truth)
    ...firebaseOrders.map(fo => {
      const itemStr = fo.items.map(i => `${i.name} x${i.quantity}`).join(', ')
      const isInrAbility = itemStr.includes('5x') || itemStr.includes('2.5x')
      return {
        id: `store_${fo.id}`,
        date: fo.date,
        item: itemStr,
        amount: `₹${fo.finalAmount}`,
        status: (fo.status === 'pending' ? 'Pending' : fo.status === 'approved' ? 'Delivered' : 'Denied') as 'Pending' | 'Delivered' | 'Denied',
        type: (isInrAbility ? 'inr_ability' : 'coins') as 'coins' | 'ability' | 'inr_ability',
        transactionId: fo.transactionId,
        whatsappNumber: fo.whatsappNumber,
        buyerName: fo.name,
        screenshotDataUrl: fo.proofBase64,
        coinAmount: isInrAbility ? undefined : fo.items.reduce((s, i) => s + i.quantity, 0),
        abilityType: isInrAbility ? (itemStr.includes('5x') ? '5x' : '2.5x') : undefined,
        abilityCount: isInrAbility ? fo.items.reduce((s, i) => s + i.quantity, 0) : undefined,
      }
    }),
    // Fallback: localStorage storeOrders that haven't synced to Firebase yet
    ...storeOrders
      .filter(o => !firebaseOrders.some(fo => fo.id === o.id))
      .map(order => {
        const isInrAbility = order.item.includes('5x') || order.item.includes('2.5x')
        return {
          id: `store_${order.id}`,
          date: order.date,
          item: order.item,
          amount: `₹${order.price}`,
          status: (order.status === 'pending' ? 'Pending' : order.status === 'approved' ? 'Delivered' : 'Denied') as 'Pending' | 'Delivered' | 'Denied',
          type: (isInrAbility ? 'inr_ability' : 'coins') as 'coins' | 'ability' | 'inr_ability',
          transactionId: order.transactionId,
          whatsappNumber: order.whatsappNumber,
          buyerName: order.name,
          screenshotDataUrl: order.proofBase64,
          coinAmount: isInrAbility ? undefined : order.quantity,
          abilityType: isInrAbility ? (order.item.includes('5x') ? '5x' : '2.5x') : undefined,
          abilityCount: isInrAbility ? order.quantity : undefined,
        }
      }),
  ]

  const pendingPurchases = mergedAllPurchases.filter(p => p.status === 'Pending')
  const allPurchases = mergedAllPurchases

  // Approve a store order (from Firebase)
  const handleApproveStoreOrder = useCallback((order: StoreOrder) => {
    const updated = storeOrders.map(o =>
      o.id === order.id ? { ...o, status: 'approved' as const } : o
    )
    setStoreOrders(updated)
    saveStoreOrders(updated)
    // Update in Firebase
    firebaseUpdateOrderStatus(order.id, 'approved').catch(() => {})
    // Deliver items via Firebase notification
    const fbOrder = firebaseOrders.find(o => o.id === order.id)
    if (fbOrder) {
      const isInrAbility = order.item.includes('5x') || order.item.includes('2.5x')
      const deliveryItems: { coins?: number; abilities?: Array<{ type: string; count: number }>; roomCards?: number; spinTickets?: number } = {}
      if (isInrAbility) {
        if (order.item.includes('5x')) {
          deliveryItems.abilities = [{ type: 'multiplier5x', count: order.quantity }]
        } else {
          deliveryItems.abilities = [{ type: 'multiplier2_5x', count: order.quantity }]
        }
      } else {
        deliveryItems.coins = order.quantity
      }
      deliverOrderItems(order.id, fbOrder.playerId, deliveryItems).catch(() => {})
    }
  }, [storeOrders, firebaseOrders])

  // Deny a store order (from Firebase)
  const handleDenyStoreOrder = useCallback((order: StoreOrder) => {
    const updated = storeOrders.map(o =>
      o.id === order.id ? { ...o, status: 'rejected' as const } : o
    )
    setStoreOrders(updated)
    saveStoreOrders(updated)
    // Update in Firebase
    firebaseUpdateOrderStatus(order.id, 'rejected').catch(() => {})
  }, [storeOrders])

  // Delete selected history items
  const handleDeleteSelectedHistory = useCallback(() => {
    // Filter out selected items from both sources
    const updatedPurchaseHistory = purchaseHistory.filter(p => !selectedHistoryIds.has(p.id))
    const updatedStoreOrders = storeOrders.filter(o => !selectedHistoryIds.has(`store_${o.id}`))
    setPurchaseHistory(updatedPurchaseHistory)
    savePurchaseHistory(updatedPurchaseHistory)
    setStoreOrders(updatedStoreOrders)
    saveStoreOrders(updatedStoreOrders)
    setSelectedHistoryIds(new Set())
  }, [purchaseHistory, storeOrders, selectedHistoryIds])

  // Delete all history
  const handleDeleteAllHistory = useCallback(() => {
    setPurchaseHistory([])
    savePurchaseHistory([])
    setStoreOrders([])
    saveStoreOrders([])
    setSelectedHistoryIds(new Set())
  }, [])

  // Toggle history item selection
  const toggleHistorySelection = useCallback((id: string) => {
    setSelectedHistoryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <>
      {/* Coupon Modal */}
      <AnimatePresence>
        {isOpen && !showAdminPanel && (
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
            style={{ background: 'linear-gradient(135deg, var(--game-bg-1), var(--game-bg-2))', border: '1px solid rgba(255,255,255,0.1)' }}
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
              {/* Today's Codes - Day/Night with Copy Buttons */}
              <div className="w-full p-3 rounded-xl" style={{ backgroundColor: 'var(--game-glass-light, rgba(255,255,255,0.04))', border: '1px solid var(--game-glass-border, rgba(255,255,255,0.08))' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">🎁</span>
                    <span className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>Today&apos;s Codes ({rotationDay})</span>
                  </div>
                  {/* Current shift indicator */}
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{ backgroundColor: isDayTime ? 'rgba(237,194,46,0.12)' : 'rgba(124,77,255,0.12)', border: `1px solid ${isDayTime ? 'rgba(237,194,46,0.3)' : 'rgba(124,77,255,0.3)'}` }}>
                    <span className="text-[10px]">{isDayTime ? '☀️' : '🌙'}</span>
                    <span className="text-[7px] font-bold" style={{ color: isDayTime ? '#EDC22E' : '#7C4DFF' }}>
                      {isDayTime ? 'DAY SHIFT' : 'NIGHT SHIFT'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {/* Day Code */}
                  <div className="p-2.5 rounded-lg"
                    style={{
                      backgroundColor: isDayTime ? 'rgba(237,194,46,0.1)' : 'rgba(255,255,255,0.03)',
                      border: isDayTime ? '1.5px solid rgba(237,194,46,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">☀️</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-bold" style={{ color: isDayTime ? '#EDC22E' : 'rgba(255,255,255,0.3)' }}>Day Code</p>
                            {isDayTime && (
                              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(237,194,46,0.2)', color: '#EDC22E' }}>ACTIVE</span>
                            )}
                          </div>
                          <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>6:00 AM – 6:00 PM</p>
                        </div>
                      </div>
                      <DayCodeCopyButton code={dayCode} active={isDayTime} />
                    </div>
                    <div className="px-3 py-1.5 rounded-lg font-mono text-center"
                      style={{ backgroundColor: isDayTime ? 'rgba(237,194,46,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isDayTime ? 'rgba(237,194,46,0.15)' : 'rgba(255,255,255,0.04)'}` }}>
                      <span className="text-[11px] font-bold tracking-wider" style={{ color: isDayTime ? '#EDC22E' : 'rgba(255,255,255,0.25)' }}>
                        {dayCode}
                      </span>
                    </div>
                  </div>
                  {/* Night Code */}
                  <div className="p-2.5 rounded-lg"
                    style={{
                      backgroundColor: isNightTime ? 'rgba(124,77,255,0.1)' : 'rgba(255,255,255,0.03)',
                      border: isNightTime ? '1.5px solid rgba(124,77,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🌙</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-bold" style={{ color: isNightTime ? '#7C4DFF' : 'rgba(255,255,255,0.3)' }}>Night Code</p>
                            {isNightTime && (
                              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(124,77,255,0.2)', color: '#7C4DFF' }}>ACTIVE</span>
                            )}
                          </div>
                          <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>6:00 PM – 6:00 AM</p>
                        </div>
                      </div>
                      <NightCodeCopyButton code={nightCode} active={isNightTime} />
                    </div>
                    <div className="px-3 py-1.5 rounded-lg font-mono text-center"
                      style={{ backgroundColor: isNightTime ? 'rgba(124,77,255,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isNightTime ? 'rgba(124,77,255,0.15)' : 'rgba(255,255,255,0.04)'}` }}>
                      <span className="text-[11px] font-bold tracking-wider" style={{ color: isNightTime ? '#7C4DFF' : 'rgba(255,255,255,0.25)' }}>
                        {nightCode}
                      </span>
                    </div>
                  </div>
                  {/* Timer to next shift */}
                  <div className="flex items-center justify-center gap-1.5 p-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Clock className="w-3 h-3" style={{ color: '#F65E3B' }} />
                    <span className="text-[8px] font-bold" style={{ color: '#F65E3B' }}>
                      {isDayTime ? '🌙 Night in' : '☀️ Day in'} {getTimeUntilSwitch()}
                    </span>
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
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                  }}
                />
                <button
                  onClick={handleClaim}
                  className="px-6 py-2.5 rounded-full text-xs font-bold transition-transform active:scale-95"
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
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Claim History</p>
                    <button
                      onClick={() => { setClaimHistory([]); saveClaimedCoupons([]) }}
                      className="text-[8px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-transform active:scale-95"
                      style={{ backgroundColor: 'rgba(246,94,59,0.1)', color: '#F65E3B' }}
                    >
                      🗑️ Delete All
                    </button>
                  </div>
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

      {/* ===== ADMIN PANEL - SEPARATE FULLSCREEN OVERLAY ===== */}
      <AnimatePresence>
        {isOpen && showAdminPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex flex-col"
            style={{ background: 'linear-gradient(135deg, var(--game-bg-1), var(--game-bg-2))' }}
          >
            {/* Admin Header */}
            <div className="flex items-center justify-between p-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: '#FF7A00' }} />
                <h3 className="text-sm font-bold" style={{ color: '#FF7A00' }}>Admin Panel</h3>
              </div>
              <button onClick={() => setShowAdminPanel(false)} className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Admin Tabs - Hidden on mobile, replaced by footer nav */}
            <div className="hidden sm:flex border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {[
                { key: 'dashboard' as AdminTab, label: 'Dashboard', icon: <TrendingUp className="w-3 h-3" /> },
                { key: 'payments' as AdminTab, label: 'Payments', icon: <Clock className="w-3 h-3" /> },
                { key: 'coupons' as AdminTab, label: 'Coupons', icon: <Ticket className="w-3 h-3" /> },
                { key: 'prices' as AdminTab, label: 'Prices', icon: <Coins className="w-3 h-3" /> },
                { key: 'history' as AdminTab, label: 'History', icon: <ChevronRight className="w-3 h-3" /> },
                { key: 'users' as AdminTab, label: 'Users', icon: <Ban className="w-3 h-3" /> },
                { key: 'partner' as AdminTab, label: 'Partner', icon: <UsersIcon className="w-3 h-3" /> },
              ].filter(t => {
                if (!partnerMode) return true
                if (partnerRole?.startsWith('PAY')) return t.key === 'payments' || t.key === 'dashboard'
                if (partnerRole?.startsWith('SKILL')) return t.key === 'prices' || t.key === 'dashboard'
                if (partnerRole?.startsWith('COUPON')) return t.key === 'coupons' || t.key === 'dashboard'
                return false
              }).map(tab => (
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

            {/* Scrollable Content Area - Full Screen */}
            <div className="flex-1 overflow-y-auto p-3">
                    {/* ====== DASHBOARD TAB ====== */}
                    {adminTab === 'dashboard' && (
                      <div className="space-y-3">
                        {/* Stats Summary Cards */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.2)' }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <UsersIcon className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                              <p className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Users</p>
                            </div>
                            <p className="text-xl font-bold" style={{ color: '#EDC22E' }}>
                              {userStatsLoading ? '...' : totalUsers}
                            </p>
                          </div>
                          <div className="p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)' }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Zap className="w-3.5 h-3.5" style={{ color: '#00E676' }} />
                              <p className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Online Now</p>
                            </div>
                            <p className="text-xl font-bold" style={{ color: '#00E676' }}>
                              {userStatsLoading ? '...' : onlineUsers}
                            </p>
                          </div>
                          <div className="p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(255,109,0,0.08)', border: '1px solid rgba(255,109,0,0.2)' }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <DollarSign className="w-3.5 h-3.5" style={{ color: '#FF6D00' }} />
                              <p className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Revenue</p>
                            </div>
                            <p className="text-xl font-bold" style={{ color: '#FF6D00' }}>
                              ₹{totalRevenue}
                            </p>
                          </div>
                          <div className="p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.2)' }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Package className="w-3.5 h-3.5" style={{ color: '#F65E3B' }} />
                              <p className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Pending Orders</p>
                            </div>
                            <p className="text-xl font-bold" style={{ color: '#F65E3B' }}>
                              {pendingOrderCount}
                            </p>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <p className="text-[9px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Quick Actions</p>
                          <div className="grid grid-cols-4 gap-2">
                            <button onClick={() => setAdminTab('payments')}
                              className="p-2 rounded-lg text-center transition-transform active:scale-95"
                              style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)' }}>
                              <span className="text-lg block">💳</span>
                              <p className="text-[7px] font-bold mt-1" style={{ color: '#F65E3B' }}>Payments</p>
                              {pendingOrderCount > 0 && (
                                <span className="text-[6px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block" style={{ backgroundColor: '#F65E3B', color: '#FFFFFF' }}>
                                  {pendingOrderCount}
                                </span>
                              )}
                            </button>
                            <button onClick={() => setAdminTab('coupons')}
                              className="p-2 rounded-lg text-center transition-transform active:scale-95"
                              style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)' }}>
                              <span className="text-lg block">🎟️</span>
                              <p className="text-[7px] font-bold mt-1" style={{ color: '#EDC22E' }}>Coupons</p>
                            </button>
                            <button onClick={() => setAdminTab('users')}
                              className="p-2 rounded-lg text-center transition-transform active:scale-95"
                              style={{ backgroundColor: 'rgba(124,77,255,0.08)', border: '1px solid rgba(124,77,255,0.15)' }}>
                              <span className="text-lg block">👥</span>
                              <p className="text-[7px] font-bold mt-1" style={{ color: '#7C4DFF' }}>Users</p>
                            </button>
                            <button onClick={() => setAdminTab('security')}
                              className="p-2 rounded-lg text-center transition-transform active:scale-95"
                              style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}>
                              <span className="text-lg block">🔐</span>
                              <p className="text-[7px] font-bold mt-1" style={{ color: '#00E676' }}>Security</p>
                            </button>
                          </div>
                        </div>

                        {/* Recent Pending Orders */}
                        {pendingOrderCount > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[9px] font-bold" style={{ color: '#F65E3B' }}>
                                🔔 Pending Orders ({pendingOrderCount})
                              </p>
                              <button onClick={() => setAdminTab('payments')}
                                className="text-[8px] font-bold px-2 py-0.5 rounded-lg"
                                style={{ backgroundColor: 'rgba(246,94,59,0.1)', color: '#F65E3B' }}>
                                View All →
                              </button>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                              {pendingPurchases.slice(0, 5).map(entry => (
                                <div key={entry.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                                  style={{ backgroundColor: 'rgba(246,94,59,0.04)', border: '1px solid rgba(246,94,59,0.12)' }}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold truncate" style={{ color: '#FFFFFF' }}>{entry.item}</p>
                                    <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                      {entry.amount} • {entry.buyerName || 'Unknown'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => handleApprovePurchase(entry)}
                                      className="px-2 py-1 rounded text-[7px] font-bold transition-transform active:scale-95"
                                      style={{ backgroundColor: 'rgba(0,230,118,0.15)', color: '#00E676' }}>
                                      ✓ Approve
                                    </button>
                                    <button
                                      onClick={() => handleDenyPurchase(entry)}
                                      className="px-2 py-1 rounded text-[7px] font-bold transition-transform active:scale-95"
                                      style={{ backgroundColor: 'rgba(246,94,59,0.15)', color: '#F65E3B' }}>
                                      ✗ Deny
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Active Discount Coupons Summary */}
                        {discountCoupons.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              💸 Active Discount Coupons ({discountCoupons.filter(c => !c.disabled).length})
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                              {discountCoupons.filter(c => !c.disabled).slice(0, 5).map(c => (
                                <div key={c.code} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <div>
                                    <p className="text-[9px] font-bold font-mono" style={{ color: '#EDC22E' }}>{c.code}</p>
                                    <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                      {c.discountPercent}% off • Uses: {c.currentUses}/{c.maxUses}
                                      {c.targetUserIds.length > 0 ? ` • ${c.targetUserIds.length} targeted` : ' • All users'}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-bold" style={{ color: '#FF6D00' }}>-{c.discountPercent}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Referral Stats */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(124,77,255,0.06)', border: '1px solid rgba(124,77,255,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <ThumbsUp className="w-3 h-3" style={{ color: '#7C4DFF' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#7C4DFF' }}>Referral Stats</p>
                          </div>
                          <p className="text-lg font-bold" style={{ color: '#7C4DFF' }}>{totalReferrals}</p>
                          <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Total referrals across all users</p>
                        </div>
                      </div>
                    )}

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
                          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                            {pendingPurchases.map(entry => {
                              const hoursSince = (Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60)
                              const isDelayed = hoursSince > 24
                              const coinAmount = entry.coinAmount || getCoinAmountFromItem(entry.item)
                              const bonusAmount = isDelayed ? coinAmount : 0

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
                                        24hr+ delay - give 2x bonus! (+{bonusAmount} coins)
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
                                    {(entry.buyerName) && (
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        👤 Name: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.buyerName}</span>
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
                                      <div className="mt-1.5">
                                        <p className="text-[7px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>📸 Payment Proof:</p>
                                        <div className="rounded-lg overflow-hidden mb-1.5 cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.1)', maxHeight: 150 }}
                                          onClick={() => setViewingScreenshot(entry.screenshotDataUrl!)}>
                                          <img src={entry.screenshotDataUrl} alt="Proof" className="w-full h-auto object-contain" style={{ backgroundColor: '#FFFFFF' }} />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <button onClick={() => setViewingScreenshot(entry.screenshotDataUrl!)}
                                            className="text-[7px] font-bold px-2 py-1 rounded"
                                            style={{ backgroundColor: 'rgba(0,230,118,0.1)', color: '#00E676' }}>
                                            <Eye className="w-3 h-3 inline" /> View Full Size
                                          </button>
                                          <button onClick={() => { const a = document.createElement('a'); a.href = entry.screenshotDataUrl!; a.download = `payment-${entry.id}.jpg`; a.click(); }}
                                            className="text-[7px] font-bold px-2 py-1 rounded"
                                            style={{ backgroundColor: 'rgba(237,194,46,0.1)', color: '#EDC22E' }}>
                                            ⬇️ Download
                                          </button>
                                        </div>
                                      </div>
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
                            <div className="max-h-[60vh] overflow-y-auto space-y-1" style={{ scrollbarWidth: 'thin' }}>
                              {allPurchases.filter(p => p.status !== 'Pending').slice(0, 15).map(entry => {
                                const hoursSinceDelivered = entry.status === 'Delivered'
                                  ? (Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60)
                                  : 999
                                const canUndoApproval = entry.status === 'Delivered' && hoursSinceDelivered <= 24
                                return (
                                <div key={entry.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.item}</p>
                                    <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                      {new Date(entry.date).toLocaleDateString()} • {entry.amount}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: entry.status === 'Delivered' ? 'rgba(0,230,118,0.1)' : 'rgba(246,94,59,0.1)',
                                        color: entry.status === 'Delivered' ? '#00E676' : '#F65E3B',
                                      }}>
                                      {entry.status}
                                    </span>
                                    {canUndoApproval && (
                                      <button
                                        onClick={() => handleDisapprovePurchase(entry)}
                                        className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-95"
                                        style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.2)' }}
                                        title="Undo approval (within 24h)"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" style={{ color: '#F65E3B' }} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ====== COUPONS TAB ====== */}
                    {adminTab === 'coupons' && (
                      <div className="space-y-3">
                        {/* Day/Night Code Management Section */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.15)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3" style={{ color: '#EDC22E' }} />
                              <p className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>Day/Night Codes</p>
                            </div>
                            <div className="flex rounded-full overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                              <button onClick={() => setDnToggle('day')}
                                className="px-2.5 py-1 text-[8px] font-bold transition-all"
                                style={{ backgroundColor: dnToggle === 'day' ? '#FFD700' : 'rgba(255,255,255,0.05)', color: dnToggle === 'day' ? '#000000' : 'rgba(255,255,255,0.4)' }}>
                                ☀️ Day
                              </button>
                              <button onClick={() => setDnToggle('night')}
                                className="px-2.5 py-1 text-[8px] font-bold transition-all"
                                style={{ backgroundColor: dnToggle === 'night' ? '#7C4DFF' : 'rgba(255,255,255,0.05)', color: dnToggle === 'night' ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}>
                                🌙 Night
                              </button>
                            </div>
                          </div>

                          {dnToggle === 'day' ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,215,0,0.2)' }}>
                                <div>
                                  <p className="text-[10px] font-bold font-mono" style={{ color: '#FFD700' }}>{dayCode}</p>
                                  <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Today&apos;s Day Code (auto-generated)</p>
                                </div>
                                <span className="text-lg">☀️</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Custom:</p>
                                <input
                                  type="text"
                                  value={dayCodeCustom}
                                  onChange={(e) => setDayCodeCustom(e.target.value.toUpperCase())}
                                  placeholder="Override code text..."
                                  className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Reward:</p>
                                <select
                                  value={dcRewardType}
                                  onChange={(e) => setDcRewardType(e.target.value as RewardType)}
                                  className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
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
                                  value={dcRewardAmount}
                                  onChange={(e) => setDcRewardAmount(parseInt(e.target.value) || 0)}
                                  min={1}
                                  className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                                />
                              </div>
                              <button
                                onClick={handleSaveDayCodeSettings}
                                className="w-full py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #FFD700, #FF7A00)', color: '#FFFFFF', boxShadow: '0 2px 10px rgba(255,165,0,0.3)' }}
                              >
                                ☀️ SAVE DAY CODE (Real-time)
                              </button>
                              <p className="text-[7px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                Changes take effect immediately in the game
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(124,77,255,0.2)' }}>
                                <div>
                                  <p className="text-[10px] font-bold font-mono" style={{ color: '#7C4DFF' }}>{nightCode}</p>
                                  <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Tonight&apos;s Night Code (auto-generated)</p>
                                </div>
                                <span className="text-lg">🌙</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Custom:</p>
                                <input
                                  type="text"
                                  value={nightCodeCustom}
                                  onChange={(e) => setNightCodeCustom(e.target.value.toUpperCase())}
                                  placeholder="Override code text..."
                                  className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Reward:</p>
                                <select
                                  value={ncRewardType}
                                  onChange={(e) => setNcRewardType(e.target.value as RewardType)}
                                  className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
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
                                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                                />
                              </div>
                              <button
                                onClick={handleSaveNightCodeSettings}
                                className="w-full py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #7C4DFF, #651FFF)', color: '#FFFFFF', boxShadow: '0 2px 10px rgba(124,77,255,0.3)' }}
                              >
                                🌙 SAVE NIGHT CODE (Real-time)
                              </button>
                              <p className="text-[7px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                Changes take effect immediately in the game
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-1.5 mt-2">
                            <div className="px-2 py-1.5 rounded-lg text-center"
                              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-lg">{nightCodeSettings.emoji}</p>
                              <p className="text-[8px] font-bold" style={{ color: '#FFFFFF' }}>{nightCodeSettings.label}</p>
                            </div>
                            <div className="px-2 py-1.5 rounded-lg text-center"
                              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-lg">{dnToggle === 'day' ? '☀️' : '🌙'}</p>
                              <p className="text-[8px] font-bold" style={{ color: dnToggle === 'day' ? '#FFD700' : '#7C4DFF' }}>{dnToggle === 'day' ? 'Day Code' : 'Night Code'}</p>
                              <p className="text-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Changes daily</p>
                            </div>
                          </div>
                        </div>

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

                    {/* ====== DISCOUNT COUPONS SECTION (in Coupons tab) ====== */}
                    {adminTab === 'coupons' && (
                      <div className="space-y-3 mt-3">
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,109,0,0.06)', border: '1px solid rgba(255,109,0,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Percent className="w-3 h-3" style={{ color: '#FF6D00' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#FF6D00' }}>Discount Coupons</p>
                            <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,109,0,0.12)', color: '#FF6D00' }}>
                              {discountCoupons.length} total
                            </span>
                          </div>

                          {/* Create new discount coupon */}
                          <div className="space-y-1.5 mb-3 p-2 rounded-lg"
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,109,0,0.2)' }}>
                            <p className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Create Discount Coupon</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-14" style={{ color: 'rgba(255,255,255,0.4)' }}>Code:</p>
                              <input
                                type="text"
                                value={newDiscountCode}
                                onChange={(e) => setNewDiscountCode(e.target.value.toUpperCase())}
                                placeholder="e.g. SAVE20"
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-14" style={{ color: 'rgba(255,255,255,0.4)' }}>Discount:</p>
                              <input
                                type="number"
                                value={newDiscountPercent}
                                onChange={(e) => setNewDiscountPercent(parseInt(e.target.value) || 0)}
                                min={1}
                                max={100}
                                className="w-16 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FF6D00' }}
                              />
                              <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>% off</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-14" style={{ color: 'rgba(255,255,255,0.4)' }}>Min ₹:</p>
                              <input
                                type="number"
                                value={newDiscountMinPurchase}
                                onChange={(e) => setNewDiscountMinPurchase(parseInt(e.target.value) || 0)}
                                min={0}
                                className="w-16 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                              />
                              <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>0 = no minimum</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-14" style={{ color: 'rgba(255,255,255,0.4)' }}>Max Uses:</p>
                              <input
                                type="number"
                                value={newDiscountMaxUses}
                                onChange={(e) => setNewDiscountMaxUses(parseInt(e.target.value) || 1)}
                                min={1}
                                className="w-16 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-14" style={{ color: 'rgba(255,255,255,0.4)' }}>Targets:</p>
                              <input
                                type="text"
                                value={newDiscountTargetUsers}
                                onChange={(e) => setNewDiscountTargetUsers(e.target.value)}
                                placeholder="User IDs (comma-separated) or empty for all"
                                className="flex-1 px-2 py-1 rounded-lg text-[7px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-14" style={{ color: 'rgba(255,255,255,0.4)' }}>Desc:</p>
                              <input
                                type="text"
                                value={newDiscountDescription}
                                onChange={(e) => setNewDiscountDescription(e.target.value)}
                                placeholder="Optional description"
                                className="flex-1 px-2 py-1 rounded-lg text-[7px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                              />
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newDiscountOneTime}
                                onChange={(e) => setNewDiscountOneTime(e.target.checked)}
                                className="w-3 h-3 accent-orange-500"
                              />
                              <span className="text-[7px] font-semibold" style={{ color: '#FF6D00' }}>One-time use per user</span>
                            </label>
                            <button
                              onClick={handleCreateDiscountCoupon}
                              disabled={!newDiscountCode.trim()}
                              className="w-full py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                              style={{
                                background: newDiscountCode.trim() ? 'linear-gradient(135deg, #FF6D00, #FF9100)' : 'rgba(255,255,255,0.06)',
                                color: newDiscountCode.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                                boxShadow: newDiscountCode.trim() ? '0 2px 10px rgba(255,109,0,0.3)' : 'none',
                              }}
                            >
                              💸 CREATE DISCOUNT COUPON
                            </button>
                          </div>

                          {/* Discount coupon list */}
                          {discountCoupons.length > 0 ? (
                            <div className="space-y-1 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                              {discountCoupons.map(c => (
                                <div key={c.code} className="p-2 rounded-lg"
                                  style={{
                                    backgroundColor: c.disabled ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${c.disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,109,0,0.15)'}`,
                                    opacity: c.disabled ? 0.5 : 1,
                                  }}>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-[9px] font-bold font-mono" style={{ color: c.disabled ? 'rgba(255,255,255,0.3)' : '#FF6D00' }}>{c.code}</p>
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                                          style={{ backgroundColor: 'rgba(255,109,0,0.12)', color: '#FF6D00' }}>
                                          -{c.discountPercent}%
                                        </span>
                                        {c.oneTime && (
                                          <span className="text-[6px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(237,194,46,0.1)', color: '#EDC22E' }}>1x ONLY</span>
                                        )}
                                        {c.disabled && (
                                          <span className="text-[6px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(246,94,59,0.1)', color: '#F65E3B' }}>DISABLED</span>
                                        )}
                                        {c.createdBy === 'system' && (
                                          <span className="text-[6px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,230,118,0.1)', color: '#00E676' }}>AUTO</span>
                                        )}
                                      </div>
                                      <p className="text-[7px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {c.description}
                                        {c.minPurchase > 0 && ` • Min: ₹${c.minPurchase}`}
                                        {' • Uses: '}{c.currentUses}/{c.maxUses}
                                      </p>
                                      {c.targetUserIds.length > 0 && (
                                        <p className="text-[7px]" style={{ color: 'rgba(124,77,255,0.8)' }}>
                                          🎯 Targeted: {c.targetUserIds.slice(0, 3).join(', ')}{c.targetUserIds.length > 3 ? ` +${c.targetUserIds.length - 3} more` : ''}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleToggleDiscountCoupon(c.code)}
                                        className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-95"
                                        style={{ backgroundColor: c.disabled ? 'rgba(0,230,118,0.1)' : 'rgba(237,194,46,0.1)', border: `1px solid ${c.disabled ? 'rgba(0,230,118,0.2)' : 'rgba(237,194,46,0.2)'}` }}
                                        title={c.disabled ? 'Enable' : 'Disable'}
                                      >
                                        <span className="text-[8px]">{c.disabled ? '▶️' : '⏸️'}</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          // Send notification to targeted users
                                          if (c.targetUserIds.length > 0) {
                                            onAddNotification('New Coupon Available! 🎟️', `You have a ${c.discountPercent}% off coupon: ${c.code}! ${c.description}`, 'reward', '💸')
                                          }
                                        }}
                                        className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-95"
                                        style={{ backgroundColor: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.2)' }}
                                        title="Notify targeted users"
                                      >
                                        <Send className="w-2.5 h-2.5" style={{ color: '#7C4DFF' }} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteDiscountCoupon(c.code)}
                                        className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-95"
                                        style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.2)' }}
                                        title="Delete coupon"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" style={{ color: '#F65E3B' }} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3">
                              <span className="text-xl block mb-1">💸</span>
                              <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No discount coupons yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ====== PRICES TAB ====== */}
                    {adminTab === 'prices' && (
                      <div className="space-y-3">
                        {/* Coin Package Prices */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(237,194,46,0.05)', border: '1px solid rgba(237,194,46,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Coins className="w-3 h-3" style={{ color: '#EDC22E' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>Coin Packages</p>
                          </div>
                          <div className="space-y-1.5">
                            {(customPrices?.coinPackages || DEFAULT_COIN_PACKAGES).map((pkg, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="text-[7px] font-semibold w-14 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                  {DEFAULT_COIN_PACKAGES[idx]?.coins?.toLocaleString() || pkg.coins?.toLocaleString()}
                                </span>
                                <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Coins:</span>
                                <input
                                  type="number"
                                  value={pkg.coins}
                                  onChange={(e) => {
                                    const newCoins = parseInt(e.target.value) || 0
                                    const currentPackages = customPrices?.coinPackages || DEFAULT_COIN_PACKAGES
                                    const updated = [...currentPackages]
                                    updated[idx] = { ...updated[idx], coins: newCoins }
                                    const newPrices: CustomPriceOverride = {
                                      coinPackages: updated,
                                      inrAbilityPackages: customPrices?.inrAbilityPackages || DEFAULT_INR_ABILITY_PACKAGES,
                                    }
                                    setCustomPrices(newPrices)
                                    saveCustomPrices(newPrices)
                                  }}
                                  min={1}
                                  className="w-14 px-1.5 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                  style={{
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#00E676',
                                  }}
                                />
                                <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>₹</span>
                                <input
                                  type="number"
                                  value={pkg.price}
                                  onChange={(e) => {
                                    const newPrice = parseInt(e.target.value) || 0
                                    const currentPackages = customPrices?.coinPackages || DEFAULT_COIN_PACKAGES
                                    const updated = [...currentPackages]
                                    updated[idx] = { ...updated[idx], price: newPrice }
                                    const newPrices: CustomPriceOverride = {
                                      coinPackages: updated,
                                      inrAbilityPackages: customPrices?.inrAbilityPackages || DEFAULT_INR_ABILITY_PACKAGES,
                                    }
                                    setCustomPrices(newPrices)
                                    saveCustomPrices(newPrices)
                                  }}
                                  min={1}
                                  className="w-14 px-1.5 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                  style={{
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#EDC22E',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* INR Ability Package Prices */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,109,0,0.05)', border: '1px solid rgba(255,109,0,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Zap className="w-3 h-3" style={{ color: '#FF6D00' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#FF6D00' }}>INR Ability Prices (₹)</p>
                          </div>
                          <div className="space-y-1.5">
                            {(customPrices?.inrAbilityPackages || DEFAULT_INR_ABILITY_PACKAGES).map((pkg, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-[8px] font-semibold w-20 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                  {pkg.type} ×{pkg.uses}
                                </span>
                                <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>₹</span>
                                <input
                                  type="number"
                                  value={pkg.price}
                                  onChange={(e) => {
                                    const newPrice = parseInt(e.target.value) || 0
                                    const currentPackages = customPrices?.inrAbilityPackages || DEFAULT_INR_ABILITY_PACKAGES
                                    const updated = [...currentPackages]
                                    updated[idx] = { ...updated[idx], price: newPrice }
                                    const newPrices: CustomPriceOverride = {
                                      coinPackages: customPrices?.coinPackages || DEFAULT_COIN_PACKAGES,
                                      inrAbilityPackages: updated,
                                    }
                                    setCustomPrices(newPrices)
                                    saveCustomPrices(newPrices)
                                  }}
                                  min={1}
                                  className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                  style={{
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#FF6D00',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Coin Ability Prices (coins per 5 uses) */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(237,194,46,0.05)', border: '1px solid rgba(237,194,46,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Coins className="w-3 h-3" style={{ color: '#EDC22E' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>Coin Ability Prices (coins/5)</p>
                          </div>
                          <div className="space-y-1.5">
                            {([
                              { key: 'hammer' as const, emoji: '🔨', label: 'Hammer' },
                              { key: 'magnet' as const, emoji: '🧲', label: 'Magnet' },
                              { key: 'bomb' as const, emoji: '💣', label: 'Bomb' },
                              { key: 'timer' as const, emoji: '⏱️', label: 'Timer' },
                              { key: 'undo' as const, emoji: '↩️', label: 'Undo' },
                            ]).map(ability => (
                              <div key={ability.key} className="flex items-center gap-1.5">
                                <span className="text-[9px]">{ability.emoji}</span>
                                <span className="text-[8px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.5)' }}>{ability.label}</span>
                                <button
                                  onClick={() => {
                                    const newPrice = Math.max(10, coinAbilityPrices[ability.key] - 10)
                                    const updated = { ...coinAbilityPrices, [ability.key]: newPrice }
                                    setCoinAbilityPrices(updated)
                                    saveCoinAbilityPrices(updated)
                                  }}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform active:scale-90"
                                  style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.2)' }}
                                >
                                  <Minus className="w-3 h-3" style={{ color: '#F65E3B' }} />
                                </button>
                                <span className="text-[10px] font-bold w-10 text-center" style={{ color: '#EDC22E' }}>
                                  {coinAbilityPrices[ability.key]}
                                </span>
                                <button
                                  onClick={() => {
                                    const newPrice = coinAbilityPrices[ability.key] + 10
                                    const updated = { ...coinAbilityPrices, [ability.key]: newPrice }
                                    setCoinAbilityPrices(updated)
                                    saveCoinAbilityPrices(updated)
                                  }}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform active:scale-90"
                                  style={{ backgroundColor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)' }}
                                >
                                  <Plus className="w-3 h-3" style={{ color: '#00E676' }} />
                                </button>
                                <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>coins/5</span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              setCoinAbilityPrices(DEFAULT_COIN_ABILITY_PRICES)
                              saveCoinAbilityPrices(DEFAULT_COIN_ABILITY_PRICES)
                            }}
                            className="w-full mt-2 py-1 rounded-lg text-[8px] font-bold flex items-center justify-center gap-1 transition-transform active:scale-95"
                            style={{ backgroundColor: 'rgba(246,94,59,0.06)', border: '1px solid rgba(246,94,59,0.1)', color: '#F65E3B' }}
                          >
                            <RotateCcw className="w-2.5 h-2.5" /> Reset Defaults
                          </button>
                        </div>

                        {/* Reset to defaults */}
                        <button
                          onClick={() => {
                            const defaults: CustomPriceOverride = {
                              coinPackages: DEFAULT_COIN_PACKAGES,
                              inrAbilityPackages: DEFAULT_INR_ABILITY_PACKAGES,
                            }
                            setCustomPrices(defaults)
                            saveCustomPrices(defaults)
                          }}
                          className="w-full py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                          style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)', color: '#F65E3B' }}
                        >
                          <RotateCcw className="w-3 h-3" /> Reset All Prices
                        </button>

                        <p className="text-[7px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          Price changes take effect on next store visit. User payment amount is locked to the displayed price.
                        </p>
                      </div>
                    )}

                    {/* ====== HISTORY TAB ====== */}
                    {adminTab === 'history' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            All Payment History ({allPurchases.length})
                          </p>
                          {allPurchases.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              {selectedHistoryIds.size > 0 && (
                                <button
                                  onClick={handleDeleteSelectedHistory}
                                  className="text-[7px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-transform active:scale-95"
                                  style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.2)', color: '#F65E3B' }}
                                >
                                  <Trash2 className="w-2.5 h-2.5" /> Delete Selected ({selectedHistoryIds.size})
                                </button>
                              )}
                              <button
                                onClick={handleDeleteAllHistory}
                                className="text-[7px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-transform active:scale-95"
                                style={{ backgroundColor: 'rgba(246,94,59,0.08)', border: '1px solid rgba(246,94,59,0.15)', color: '#F65E3B' }}
                              >
                                <Trash2 className="w-2.5 h-2.5" /> Delete All
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Lock Duration Setting */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,109,0,0.05)', border: '1px solid rgba(255,109,0,0.15)' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" style={{ color: '#FF6D00' }} />
                              <p className="text-[9px] font-bold" style={{ color: '#FF6D00' }}>Lock Duration</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  const newDuration = Math.max(1, lockDuration - 1)
                                  setLockDuration(newDuration)
                                  saveLockDuration(newDuration)
                                }}
                                className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-90"
                                style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.2)' }}
                              >
                                <Minus className="w-2.5 h-2.5" style={{ color: '#F65E3B' }} />
                              </button>
                              <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>{lockDuration} week{lockDuration !== 1 ? 's' : ''}</span>
                              <button
                                onClick={() => {
                                  const newDuration = lockDuration + 1
                                  setLockDuration(newDuration)
                                  saveLockDuration(newDuration)
                                }}
                                className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-90"
                                style={{ backgroundColor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)' }}
                              >
                                <Plus className="w-2.5 h-2.5" style={{ color: '#00E676' }} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[7px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            Coins/abilities from store purchases are locked for this duration after delivery
                          </p>
                        </div>

                        {allPurchases.length === 0 ? (
                          <div className="text-center py-4">
                            <span className="text-2xl block mb-1">📋</span>
                            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No payment history</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(() => {
                              const personMap = new Map<string, PurchaseHistoryEntry[]>()
                              allPurchases.forEach(entry => {
                                const key = entry.buyerName || entry.whatsappNumber || 'Unknown'
                                if (!personMap.has(key)) personMap.set(key, [])
                                personMap.get(key)!.push(entry)
                              })
                              return Array.from(personMap.entries()).map(([personName, entries]) => (
                                <div key={personName} className="rounded-lg overflow-hidden"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                  <button
                                    onClick={() => setExpandedHistoryId(expandedHistoryId === personName ? null : personName)}
                                    className="w-full flex items-center justify-between px-3 py-2.5"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1px solid rgba(237,194,46,0.2)' }}>
                                        <span className="text-[10px]">👤</span>
                                      </div>
                                      <div className="text-left">
                                        <p className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>{personName}</p>
                                        <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                          {entries.length} order{entries.length > 1 ? 's' : ''} • {entries.filter(e => e.status === 'Delivered').length} delivered • {entries.filter(e => e.status === 'Pending').length} pending
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>
                                        ₹{entries.reduce((sum, e) => {
                                          const amt = parseInt(e.amount.replace(/[^0-9]/g, '')) || 0
                                          return sum + amt
                                        }, 0)}
                                      </span>
                                      <ChevronRight className="w-3 h-3 transition-transform" style={{ color: 'rgba(255,255,255,0.3)', transform: expandedHistoryId === personName ? 'rotate(90deg)' : 'rotate(0)' }} />
                                    </div>
                                  </button>
                                  {expandedHistoryId === personName && (
                                    <div className="px-3 pb-2.5 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                      {entries.map(entry => {
                                        const coinAmount = entry.coinAmount || getCoinAmountFromItem(entry.item)
                                        const isSelected = selectedHistoryIds.has(entry.id)
                                        return (
                                          <div key={entry.id} className="flex items-start gap-2 p-2 rounded-lg"
                                            style={{ backgroundColor: isSelected ? 'rgba(237,194,46,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? 'rgba(237,194,46,0.2)' : 'rgba(255,255,255,0.04)'}` }}>
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleHistorySelection(entry.id)}
                                              className="mt-1 w-3 h-3 accent-amber-500 shrink-0 cursor-pointer"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between mb-1">
                                                <p className="text-[9px] font-bold" style={{ color: '#FFFFFF' }}>{entry.item}</p>
                                                <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                                                  style={{
                                                    backgroundColor: entry.status === 'Delivered' ? 'rgba(0,230,118,0.1)' : entry.status === 'Denied' ? 'rgba(246,94,59,0.1)' : 'rgba(237,194,46,0.1)',
                                                    color: entry.status === 'Delivered' ? '#00E676' : entry.status === 'Denied' ? '#F65E3B' : '#EDC22E',
                                                  }}>
                                                  {entry.status}
                                                </span>
                                              </div>
                                              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                📅 {new Date(entry.date).toLocaleString()} • {entry.amount}
                                              </p>
                                              {entry.whatsappNumber && (
                                                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                  📱 {entry.whatsappNumber}
                                                </p>
                                              )}
                                              {entry.type !== 'inr_ability' && (
                                                <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                  💰 {coinAmount} coins
                                                </p>
                                              )}
                                              {entry.screenshotDataUrl && (
                                                <div className="mt-1 rounded-lg overflow-hidden cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.1)', maxHeight: 100 }}
                                                  onClick={() => setViewingScreenshot(entry.screenshotDataUrl!)}>
                                                  <img src={entry.screenshotDataUrl} alt="Proof" className="w-full h-auto object-contain" style={{ backgroundColor: '#FFFFFF' }} />
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ====== USERS TAB ====== */}
                    {adminTab === 'users' && (
                      <div className="space-y-3">
                        {/* User Stats */}
                        <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          Real-time User Stats
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-lg text-center"
                            style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.12)' }}>
                            <UsersIcon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: '#EDC22E' }} />
                            <p className="text-sm font-bold" style={{ color: '#EDC22E' }}>
                              {userStatsLoading ? '...' : totalUsers}
                            </p>
                            <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Users</p>
                          </div>
                          <div className="p-2.5 rounded-lg text-center"
                            style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.12)' }}>
                            <Zap className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: '#00E676' }} />
                            <p className="text-sm font-bold" style={{ color: '#00E676' }}>
                              {userStatsLoading ? '...' : onlineUsers}
                            </p>
                            <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Online Now</p>
                          </div>
                          <div className="p-2.5 rounded-lg text-center"
                            style={{ backgroundColor: 'rgba(124,92,252,0.06)', border: '1px solid rgba(124,92,252,0.12)' }}>
                            <ThumbsUp className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: '#7C5CFC' }} />
                            <p className="text-sm font-bold" style={{ color: '#7C5CFC' }}>
                              {userStatsLoading ? '...' : totalReferrals}
                            </p>
                            <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Referrals</p>
                          </div>
                        </div>

                        {/* Refresh stats button */}
                        <button
                          onClick={() => {
                            setUserStatsLoading(true)
                            Promise.all([getTotalUserCount(), getOnlineUserCount(), getTotalReferralsCount()])
                              .then(([total, online, refs]) => {
                                setTotalUsers(total)
                                setOnlineUsers(online)
                                setTotalReferrals(refs)
                              })
                              .catch(() => { /* silent */ })
                              .finally(() => setUserStatsLoading(false))
                          }}
                          className="w-full py-1.5 rounded-lg text-[8px] font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${userStatsLoading ? 'animate-spin' : ''}`} />
                          Refresh Stats
                        </button>

                        {/* Ban User Section */}
                        <div className="p-3 rounded-lg"
                          style={{ backgroundColor: 'rgba(246,94,59,0.06)', border: '1px solid rgba(246,94,59,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <Ban className="w-3.5 h-3.5" style={{ color: '#F65E3B' }} />
                            <p className="text-[10px] font-bold" style={{ color: '#F65E3B' }}>Ban User</p>
                          </div>

                          {/* Player ID input */}
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={banPlayerId}
                              onChange={(e) => setBanPlayerId(e.target.value)}
                              placeholder="Enter Player ID (e.g. p_abc123...)"
                              className="w-full px-3 py-2 rounded-lg text-[10px] outline-none"
                              style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                            />

                            {/* Reason input */}
                            <input
                              type="text"
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              placeholder="Reason for ban"
                              className="w-full px-3 py-2 rounded-lg text-[10px] outline-none"
                              style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                            />

                            {/* Duration selector */}
                            <div className="flex gap-1.5">
                              {(['weekly', 'monthly', 'yearly', 'permanent'] as const).map(d => (
                                <button
                                  key={d}
                                  onClick={() => setBanDuration(d)}
                                  className="flex-1 py-1.5 rounded-lg text-[7px] font-bold transition-all"
                                  style={{
                                    backgroundColor: banDuration === d ? 'rgba(246,94,59,0.2)' : 'rgba(0,0,0,0.2)',
                                    border: `1px solid ${banDuration === d ? 'rgba(246,94,59,0.4)' : 'rgba(255,255,255,0.06)'}`,
                                    color: banDuration === d ? '#F65E3B' : 'rgba(255,255,255,0.4)',
                                  }}
                                >
                                  {d.charAt(0).toUpperCase() + d.slice(1)}
                                </button>
                              ))}
                            </div>

                            {/* Ban button */}
                            <button
                              onClick={() => {
                                const id = banPlayerId.trim()
                                if (!id) return
                                banUser(id, banReason || 'No reason specified', banDuration)
                                setBannedUsers(loadBannedUsers())
                                setBanPlayerId('')
                                setBanReason('')
                                setBanDuration('weekly')
                              }}
                              disabled={!banPlayerId.trim()}
                              className="w-full py-2 rounded-lg text-[10px] font-bold transition-transform active:scale-95 disabled:opacity-30"
                              style={{ background: 'linear-gradient(135deg, #F65E3B, #D32F2F)', color: '#FFFFFF' }}
                            >
                              🚫 BAN USER
                            </button>
                          </div>
                        </div>

                        {/* Banned Users List */}
                        <div>
                          <p className="text-[9px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Banned Users ({bannedUsers.length})
                          </p>
                          {bannedUsers.length === 0 ? (
                            <div className="text-center py-4">
                              <span className="text-2xl block mb-1">✅</span>
                              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No banned users</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                              {bannedUsers.map(user => {
                                const isExpired = user.expiresAt !== null && user.expiresAt < Date.now()
                                const isPermanent = user.expiresAt === null
                                const timeLeft = user.expiresAt ? user.expiresAt - Date.now() : 0
                                const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24))
                                return (
                                  <div key={user.playerId} className="p-2.5 rounded-lg"
                                    style={{
                                      backgroundColor: isExpired ? 'rgba(255,255,255,0.02)' : 'rgba(246,94,59,0.04)',
                                      border: `1px solid ${isExpired ? 'rgba(255,255,255,0.04)' : 'rgba(246,94,59,0.12)'}`,
                                      opacity: isExpired ? 0.5 : 1,
                                    }}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <Ban className="w-2.5 h-2.5 shrink-0" style={{ color: isExpired ? 'rgba(255,255,255,0.3)' : '#F65E3B' }} />
                                          <p className="text-[9px] font-bold truncate" style={{ color: '#FFFFFF' }}>
                                            {user.playerId}
                                          </p>
                                          {isExpired && (
                                            <span className="text-[6px] font-bold px-1 py-0.5 rounded-full"
                                              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                                              EXPIRED
                                            </span>
                                          )}
                                          {isPermanent && !isExpired && (
                                            <span className="text-[6px] font-bold px-1 py-0.5 rounded-full"
                                              style={{ backgroundColor: 'rgba(246,94,59,0.15)', color: '#F65E3B' }}>
                                              PERMANENT
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                          Reason: {user.reason}
                                        </p>
                                        <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                          Duration: {user.banDuration}
                                          {!isPermanent && !isExpired && ` • ${daysLeft > 0 ? `${daysLeft}d left` : 'Expires today'}`}
                                          {' • '}Banned: {new Date(user.bannedAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          unbanUser(user.playerId)
                                          setBannedUsers(loadBannedUsers())
                                        }}
                                        className="shrink-0 px-2 py-1 rounded-lg text-[7px] font-bold transition-transform active:scale-95"
                                        style={{ backgroundColor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)', color: '#00E676' }}
                                      >
                                        UNBAN
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Clean expired bans button */}
                        {bannedUsers.some(u => u.expiresAt !== null && u.expiresAt < Date.now()) && (
                          <button
                            onClick={() => {
                              const active = bannedUsers.filter(u => u.expiresAt === null || u.expiresAt > Date.now())
                              saveBannedUsers(active)
                              setBannedUsers(active)
                            }}
                            className="w-full py-1.5 rounded-lg text-[8px] font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Clean Expired Bans
                          </button>
                        )}
                      </div>
                    )}

                    {/* ====== PARTNER TAB ====== */}
                    {adminTab === 'partner' && !partnerMode && (
                      <div className="space-y-3">
                        {/* Generate Partner Link */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(124,77,255,0.06)', border: '1px solid rgba(124,77,255,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <UsersIcon className="w-3 h-3" style={{ color: '#7C4DFF' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#7C4DFF' }}>Generate Partner Link</p>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Name:</p>
                              <input
                                type="text"
                                value={partnerNewName}
                                onChange={(e) => setPartnerNewName(e.target.value)}
                                placeholder="Partner name..."
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Role:</p>
                              <select
                                value={partnerNewRole}
                                onChange={(e) => setPartnerNewRole(e.target.value as 'payment' | 'skill' | 'coupon')}
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                              >
                                <option value="payment">💳 Payment Approver</option>
                                <option value="skill">💰 Skill/Settlement Manager</option>
                                <option value="coupon">🎟️ Coupon Manager</option>
                              </select>
                            </div>
                            <button
                              onClick={() => {
                                const prefix = partnerNewRole === 'payment' ? 'PAY' : partnerNewRole === 'skill' ? 'SKILL' : 'COUPON'
                                const token = `${prefix}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
                                const name = partnerNewName.trim() || `${partnerNewRole} Partner`
                                const newLink: PartnerLink = {
                                  id: `pl_${Date.now()}`,
                                  role: partnerNewRole,
                                  token,
                                  name,
                                  createdAt: Date.now(),
                                  lastUsedAt: null,
                                  active: true,
                                }
                                const updated = [...partnerLinks, newLink]
                                setPartnerLinks(updated)
                                savePartnerLinks(updated)
                                const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
                                setGeneratedLink(`${baseUrl}?partner=${token}`)
                                setPartnerNewName('')
                              }}
                              className="w-full py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #7C4DFF, #536DFE)', color: '#FFFFFF', boxShadow: '0 2px 10px rgba(124,77,255,0.3)' }}
                            >
                              🤝 Generate Link
                            </button>
                            {generatedLink && (
                              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.15)' }}>
                                <p className="text-[7px] font-bold mb-1" style={{ color: '#00E676' }}>Generated Link:</p>
                                <div className="flex items-center gap-1">
                                  <p className="text-[7px] font-mono break-all flex-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    {generatedLink}
                                  </p>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(generatedLink)
                                    }}
                                    className="shrink-0 text-[7px] font-bold px-2 py-1 rounded transition-transform active:scale-95"
                                    style={{ backgroundColor: 'rgba(237,194,46,0.1)', color: '#EDC22E' }}
                                  >
                                    📋 Copy
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Active Partners List */}
                        <div>
                          <p className="text-[9px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Partner Links ({partnerLinks.length})
                          </p>
                          {partnerLinks.length === 0 ? (
                            <div className="text-center py-4">
                              <span className="text-2xl block mb-1">🤝</span>
                              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No partner links yet</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                              {partnerLinks.map(link => {
                                const roleEmoji = link.role === 'payment' ? '💳' : link.role === 'skill' ? '💰' : '🎟️'
                                const roleLabel = link.role === 'payment' ? 'Payment Approver' : link.role === 'skill' ? 'Skill/Settlement Mgr' : 'Coupon Manager'
                                return (
                                  <div key={link.id} className="p-2 rounded-lg flex items-center justify-between"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px]">{roleEmoji}</span>
                                        <p className="text-[9px] font-bold truncate" style={{ color: '#FFFFFF' }}>{link.name}</p>
                                      </div>
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {roleLabel} • Token: <span className="font-mono">{link.token}</span>
                                      </p>
                                      <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                        Created: {new Date(link.createdAt).toLocaleDateString()}
                                        {link.lastUsedAt && ` • Last used: ${new Date(link.lastUsedAt).toLocaleDateString()}`}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                                        style={{
                                          backgroundColor: link.active ? 'rgba(0,230,118,0.1)' : 'rgba(246,94,59,0.1)',
                                          color: link.active ? '#00E676' : '#F65E3B',
                                        }}>
                                        {link.active ? 'Active' : 'Inactive'}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
                                          const url = `${baseUrl}?partner=${link.token}`
                                          navigator.clipboard.writeText(url)
                                        }}
                                        className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-95"
                                        style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1px solid rgba(237,194,46,0.2)' }}
                                        title="Copy link"
                                      >
                                        <span className="text-[8px]">📋</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          const updated = partnerLinks.map(l =>
                                            l.id === link.id ? { ...l, active: !l.active } : l
                                          )
                                          setPartnerLinks(updated)
                                          savePartnerLinks(updated)
                                        }}
                                        className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-95"
                                        style={{ backgroundColor: link.active ? 'rgba(246,94,59,0.1)' : 'rgba(0,230,118,0.1)', border: `1px solid ${link.active ? 'rgba(246,94,59,0.2)' : 'rgba(0,230,118,0.2)'}` }}
                                        title={link.active ? 'Deactivate' : 'Activate'}
                                      >
                                        <span className="text-[8px]">{link.active ? '⏸️' : '▶️'}</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          const updated = partnerLinks.filter(l => l.id !== link.id)
                                          setPartnerLinks(updated)
                                          savePartnerLinks(updated)
                                        }}
                                        className="w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-95"
                                        style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.2)' }}
                                        title="Revoke link"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" style={{ color: '#F65E3B' }} />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Tournament Prize Editor */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(237,194,46,0.06)', border: '1px solid rgba(237,194,46,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px]">🏆</span>
                            <p className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>Tournament Prizes</p>
                          </div>
                          <div className="space-y-1.5">
                            {[
                              { key: 'rank1' as const, label: '1st Place' },
                              { key: 'rank2' as const, label: '2nd Place' },
                              { key: 'rank3' as const, label: '3rd Place' },
                              { key: 'rank4' as const, label: '4th Place' },
                              { key: 'rank5' as const, label: '5th Place' },
                            ].map(item => (
                              <div key={item.key} className="flex items-center gap-1.5">
                                <p className="text-[7px] font-semibold w-14" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}:</p>
                                <input
                                  type="number"
                                  value={tournamentPrizes[item.key]}
                                  onChange={(e) => setTournamentPrizes(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                                  min={0}
                                  className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                                />
                                <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>coins</span>
                              </div>
                            ))}
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-14" style={{ color: 'rgba(255,255,255,0.4)' }}>Entry Fee:</p>
                              <input
                                type="number"
                                value={tournamentPrizes.entryFee}
                                onChange={(e) => setTournamentPrizes(prev => ({ ...prev, entryFee: parseInt(e.target.value) || 0 }))}
                                min={0}
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                              />
                              <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>coins</span>
                            </div>
                            <button
                              onClick={() => {
                                saveTournamentPrizes(tournamentPrizes)
                              }}
                              className="w-full py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF', boxShadow: '0 2px 10px rgba(237,194,46,0.3)' }}
                            >
                              🏆 SAVE TOURNAMENT PRIZES
                            </button>
                          </div>
                        </div>

                        {/* Weekly Prize Editor */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px]">🎁</span>
                            <p className="text-[9px] font-bold" style={{ color: '#00E676' }}>Weekly Bonus</p>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[7px] font-semibold w-14" style={{ color: 'rgba(255,255,255,0.4)' }}>Amount:</p>
                              <input
                                type="number"
                                value={tournamentPrizes.weeklyBonus}
                                onChange={(e) => setTournamentPrizes(prev => ({ ...prev, weeklyBonus: parseInt(e.target.value) || 0 }))}
                                min={0}
                                className="flex-1 px-2 py-1 rounded-lg text-[8px] font-semibold outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                              />
                              <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>coins</span>
                            </div>
                            <button
                              onClick={() => {
                                saveTournamentPrizes(tournamentPrizes)
                              }}
                              className="w-full py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF', boxShadow: '0 2px 10px rgba(0,230,118,0.3)' }}
                            >
                              🎁 SAVE WEEKLY BONUS
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Partner mode restricted notice */}
                    {adminTab === 'partner' && partnerMode && (
                      <div className="text-center py-4">
                        <span className="text-2xl block mb-1">🔒</span>
                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Partner management is only available to the owner</p>
                      </div>
                    )}

                    {/* ====== SECURITY TAB (Admin only) ====== */}
                    {adminTab === 'security' && adminRole === 'admin' && (
                      <div className="space-y-3">
                        {/* Change Admin Password */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Lock className="w-3 h-3" style={{ color: '#00E676' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#00E676' }}>Change Admin Password</p>
                          </div>
                          <p className="text-[7px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Change the secret password used to access the admin panel. Current users will need the new password.
                          </p>
                          <div className="flex items-center gap-1.5 mb-2">
                            <input
                              type="text"
                              value={newAdminPassword}
                              onChange={(e) => setNewAdminPassword(e.target.value)}
                              placeholder="Enter new admin password..."
                              className="flex-1 px-2 py-1.5 rounded-lg text-[8px] font-semibold outline-none"
                              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                            />
                            <button
                              onClick={async () => {
                                if (!newAdminPassword.trim() || newAdminPassword.trim().length < 4) {
                                  setAdminPasswordMsg({ text: 'Password must be at least 4 characters', type: 'error' })
                                  return
                                }
                                await firebaseSetAdminPassword(newAdminPassword.trim())
                                setAdminPasswordMsg({ text: 'Password updated successfully!', type: 'success' })
                                setNewAdminPassword('')
                                setTimeout(() => setAdminPasswordMsg(null), 3000)
                              }}
                              className="px-3 py-1.5 rounded-lg text-[8px] font-bold transition-transform active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF' }}
                            >
                              SAVE
                            </button>
                          </div>
                          {adminPasswordMsg && (
                            <p className="text-[7px] font-bold" style={{ color: adminPasswordMsg.type === 'success' ? '#00E676' : '#F65E3B' }}>
                              {adminPasswordMsg.text}
                            </p>
                          )}
                        </div>

                        {/* Partner Passwords */}
                        <div className="p-2.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(124,77,255,0.06)', border: '1px solid rgba(124,77,255,0.15)' }}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <UserCheck className="w-3 h-3" style={{ color: '#7C4DFF' }} />
                            <p className="text-[9px] font-bold" style={{ color: '#7C4DFF' }}>Partner Passwords</p>
                          </div>
                          <p className="text-[7px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Partners can enter their password in the coupon code field to access specific admin features.
                          </p>
                          {/* Add new partner */}
                          <div className="space-y-1.5 mb-3 p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Add New Partner</p>
                            <input
                              type="text"
                              value={newPartnerName}
                              onChange={(e) => setNewPartnerName(e.target.value)}
                              placeholder="Partner name..."
                              className="w-full px-2 py-1 rounded-lg text-[8px] outline-none"
                              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                            />
                            <input
                              type="text"
                              value={newPartnerPassword}
                              onChange={(e) => setNewPartnerPassword(e.target.value)}
                              placeholder="Password (min 4 chars)..."
                              className="w-full px-2 py-1 rounded-lg text-[8px] outline-none"
                              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                            />
                            <div className="flex flex-wrap gap-1">
                              {['view_orders', 'approve_orders', 'manage_coupons', 'manage_prices', 'view_users', 'ban_users'].map(perm => (
                                <button key={perm}
                                  onClick={() => {
                                    setNewPartnerPermissions(prev =>
                                      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
                                    )
                                  }}
                                  className="text-[6px] font-bold px-1.5 py-0.5 rounded transition-transform active:scale-95"
                                  style={{
                                    backgroundColor: newPartnerPermissions.includes(perm) ? 'rgba(124,77,255,0.2)' : 'rgba(255,255,255,0.04)',
                                    border: newPartnerPermissions.includes(perm) ? '1px solid rgba(124,77,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                    color: newPartnerPermissions.includes(perm) ? '#7C4DFF' : 'rgba(255,255,255,0.4)',
                                  }}
                                >
                                  {perm.replace(/_/g, ' ')}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={async () => {
                                if (!newPartnerName.trim() || newPartnerPassword.trim().length < 4) return
                                const id = `partner_${Date.now()}`
                                await firebaseSavePartner(id, {
                                  name: newPartnerName.trim(),
                                  password: newPartnerPassword.trim(),
                                  permissions: newPartnerPermissions,
                                  createdAt: Date.now(),
                                  lastUsedAt: null,
                                  active: true,
                                })
                                setPartnerList(await firebaseGetPartners())
                                setNewPartnerName('')
                                setNewPartnerPassword('')
                                setNewPartnerPermissions(['view_orders'])
                              }}
                              className="w-full py-1.5 rounded-lg text-[8px] font-bold transition-transform active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #7C4DFF, #536DFE)', color: '#FFFFFF' }}
                            >
                              ADD PARTNER
                            </button>
                          </div>
                          {/* Existing partners */}
                          <div className="space-y-1">
                            {partnerList.map(partner => (
                              <div key={partner.id} className="flex items-center justify-between p-2 rounded-lg"
                                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] font-bold" style={{ color: '#FFFFFF' }}>{partner.name}</p>
                                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                                    {partner.permissions.map(p => (
                                      <span key={p} className="text-[5px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(124,77,255,0.1)', color: '#7C4DFF' }}>
                                        {p.replace(/_/g, ' ')}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-[6px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                    Password: {'•'.repeat(Math.min(partner.password.length, 8))} • {partner.active ? '✅ Active' : '❌ Inactive'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={async () => {
                                      await firebaseSavePartner(partner.id, { ...partner, active: !partner.active })
                                      setPartnerList(await firebaseGetPartners())
                                    }}
                                    className="text-[7px] font-bold px-2 py-1 rounded"
                                    style={{ backgroundColor: partner.active ? 'rgba(246,94,59,0.1)' : 'rgba(0,230,118,0.1)', color: partner.active ? '#F65E3B' : '#00E676' }}
                                  >
                                    {partner.active ? 'Disable' : 'Enable'}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await firebaseDeletePartner(partner.id)
                                      setPartnerList(await firebaseGetPartners())
                                    }}
                                    className="text-[7px] font-bold px-2 py-1 rounded"
                                    style={{ backgroundColor: 'rgba(246,94,59,0.1)', color: '#F65E3B' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                            {partnerList.length === 0 && (
                              <p className="text-[8px] text-center py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>No partners yet</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {adminTab === 'security' && adminRole === 'partner' && (
                      <div className="text-center py-4">
                        <span className="text-2xl block mb-1">🔒</span>
                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Security settings are only available to the main admin</p>
                      </div>
                    )}
            </div>

            {/* Admin Footer Navigation */}
            <div className="flex-shrink-0 sticky bottom-0 z-20 flex items-center justify-around py-2 px-1"
              style={{ 
                backgroundColor: 'rgba(0,0,0,0.4)', 
                borderTop: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)'
              }}>
              {[
                { key: 'dashboard' as AdminTab, icon: '📊', label: 'Home' },
                { key: 'payments' as AdminTab, icon: '💳', label: 'Pay' },
                { key: 'coupons' as AdminTab, icon: '🎟️', label: 'Coupon' },
                { key: 'prices' as AdminTab, icon: '💰', label: 'Price' },
                { key: 'history' as AdminTab, icon: '📜', label: 'History' },
                { key: 'users' as AdminTab, icon: '👥', label: 'Users' },
                { key: 'partner' as AdminTab, icon: '🤝', label: 'Partner' },
                { key: 'security' as AdminTab, icon: '🔐', label: 'Security' },
              ].filter(t => {
                if (adminRole === 'admin' && !partnerMode) return true
                if (adminRole === 'admin' && partnerMode) return true
                // Partner role - filter based on permissions
                if (adminRole === 'partner') {
                  if (t.key === 'dashboard') return true
                  if (t.key === 'payments' && partnerPermissions.includes('view_orders')) return true
                  if (t.key === 'payments' && partnerPermissions.includes('approve_orders')) return true
                  if (t.key === 'coupons' && partnerPermissions.includes('manage_coupons')) return true
                  if (t.key === 'prices' && partnerPermissions.includes('manage_prices')) return true
                  if (t.key === 'users' && (partnerPermissions.includes('view_users') || partnerPermissions.includes('ban_users'))) return true
                  if (t.key === 'security') return false // Partners never see security
                  return false
                }
                // Legacy partner mode (URL-based)
                if (partnerMode) {
                  if (partnerRole?.startsWith('PAY')) return t.key === 'payments' || t.key === 'dashboard'
                  if (partnerRole?.startsWith('SKILL')) return t.key === 'prices' || t.key === 'dashboard'
                  if (partnerRole?.startsWith('COUPON')) return t.key === 'coupons' || t.key === 'dashboard'
                }
                return false
              }).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setAdminTab(t.key)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-transform active:scale-95"
                  style={{
                    backgroundColor: adminTab === t.key ? 'rgba(237,194,46,0.15)' : 'transparent',
                    border: adminTab === t.key ? '1px solid rgba(237,194,46,0.3)' : '1px solid transparent',
                  }}
                >
                  <span className="text-sm">{t.icon}</span>
                  <span className="text-[7px] font-bold" style={{ color: adminTab === t.key ? '#EDC22E' : 'rgba(255,255,255,0.4)' }}>
                    {t.label}
                  </span>
                  {t.key === 'payments' && pendingPurchases.length > 0 && (
                    <span className="text-[6px] px-1 rounded-full" style={{ backgroundColor: '#F65E3B', color: '#FFFFFF', position: 'absolute', top: -2, right: -2 }}>
                      {pendingPurchases.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screenshot Viewer Modal */}
      <AnimatePresence>
        {viewingScreenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
            onClick={() => setViewingScreenshot(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-2xl w-[95vw] rounded-2xl p-4 text-center"
              style={{ background: 'linear-gradient(135deg, var(--game-bg-1), var(--game-bg-2))', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold" style={{ color: '#EDC22E' }}>📸 Payment Proof</p>
                <button onClick={() => setViewingScreenshot(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
              <div className="rounded-lg overflow-hidden mb-3" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={viewingScreenshot} alt="Payment proof" className="w-full h-auto max-h-[70vh] object-contain rounded-lg" style={{ backgroundColor: '#FFFFFF', imageRendering: 'auto' }} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  const a = document.createElement('a')
                  a.href = viewingScreenshot
                  a.download = `payment-proof-${Date.now()}.jpg`
                  a.click()
                }}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-transform active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                  ⬇️ Download
                </button>
                <button onClick={() => setViewingScreenshot(null)}
                  className="flex-1 py-2 rounded-lg text-[10px] font-semibold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
