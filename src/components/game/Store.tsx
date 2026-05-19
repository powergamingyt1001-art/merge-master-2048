'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, Zap, Clock, AlertCircle, Tv, Copy, Check, Upload, FileText, ImageIcon } from 'lucide-react'

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

type TabId = 'coins' | 'ability' | 'history'

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

const UPI_ID = '9897186065@fam'
const ORDERS_KEY = 'mergeMaster2048_orders'
const PURCHASE_LIMIT_KEY = 'mergeMaster2048_abilityPurchaseLimits'
const MAX_ABILITY_PER_2WEEKS = 15

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

// ─── General Helpers ─────────────────────────────────────────────────────────

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
}

function UPIPaymentModal({
  isOpen,
  onClose,
  itemName,
  itemPrice,
  itemQuantity,
  playerId,
  onOrderPlaced,
}: PaymentModalProps) {
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [name, setName] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [utrNumber, setUtrNumber] = useState('')
  const [proofBase64, setProofBase64] = useState<string | undefined>(undefined)
  const [proofFileName, setProofFileName] = useState<string | null>(null)
  const [qrLoaded, setQrLoaded] = useState(true)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const upiLink = generateUpiLink(itemPrice)
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

  const handleBookOrder = useCallback(() => {
    if (!whatsappNumber.trim() || !name.trim() || !transactionId.trim()) return

    setSubmitting(true)

    const order: StoreOrder = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      playerId,
      item: itemName,
      price: itemPrice,
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

    // Reset form
    setWhatsappNumber('')
    setName('')
    setTransactionId('')
    setUtrNumber('')
    setProofBase64(undefined)
    setProofFileName(null)
    setSubmitting(false)
  }, [whatsappNumber, name, transactionId, utrNumber, proofBase64, itemName, itemPrice, itemQuantity, playerId, onOrderPlaced])

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
}: {
  item: AbilityItem
  onBuy: (item: string, price: number, quantity: number) => void
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
          onClick={() => isCoinCurrency ? onCoinBuy(item) : onBuy(`${item.emoji} ${item.name} x${item.quantity}`, item.price, item.quantity)}
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

function AbilityTab({ onBuy, onCoinBuy, coins }: { onBuy: (item: string, price: number, quantity: number) => void; onCoinBuy: (item: AbilityItem) => void; coins: number }) {
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

function HistoryTab({ orders }: { orders: StoreOrder[] }) {
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
          <h4 className="text-xs font-extrabold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            ORDER HISTORY
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {orders.map((order) => {
              const sc = statusConfig[order.status] || statusConfig.pending
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <p className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
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
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Store Component ────────────────────────────────────────────────────

export function Store({ isOpen, onClose, playerId, coins, onAddNotification, onDeductCoins, onAddPowerUp, onAddUndos }: StoreProps) {
  const [activeTab, setActiveTab] = useState<TabId>('coins')
  const [orders, setOrders] = useState<StoreOrder[]>(() => loadOrders())
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; itemName: string; itemPrice: number; itemQuantity: number }>({
    open: false,
    itemName: '',
    itemPrice: 0,
    itemQuantity: 0,
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
      saveOrders(newOrders)
      setPaymentModal({ open: false, itemName: '', itemPrice: 0, itemQuantity: 0 })
      onAddNotification(
        'Order Booked! 🛒',
        `Your order for ${order.item} (₹${order.price}) has been submitted. We'll verify and deliver soon!`,
        'system',
        '📦'
      )
    },
    [orders, onAddNotification]
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
                    <AbilityTab onBuy={handleBuy} onCoinBuy={handleCoinBuy} coins={coins} />
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
                    <HistoryTab orders={orders} />
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
