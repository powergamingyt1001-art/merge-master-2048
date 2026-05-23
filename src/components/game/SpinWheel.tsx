'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Tv, ShoppingCart, Minus, Plus, Tag, Copy, Check, Upload, FileText } from 'lucide-react'
import { SpinWheelAd } from '@/components/ads/AdOverlay'
import { AdsterraBanner320x50 } from '@/components/ads/AdsterraAds'
import {
  loadSharedCart,
  saveSharedCart,
  clearSharedCart,
  type SharedCartItem,
} from '@/components/game/shared-cart'
import { placeOrder as firebasePlaceOrder, type FirebaseStoreOrder } from '@/lib/firebase-service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpinWheelProps {
  isOpen: boolean
  onClose: () => void
  spinTickets: number
  onUseTicket: () => void
  onWinPrize: (prize: SpinPrize) => void
  onWatchAdForSpin: () => void
  isOnline: boolean
  coins: number
  onDeductCoins: (amount: number) => void
  onAddSpinTickets: (count: number) => void
  playerId: string
  playerName: string
  userCode: string
  onAddNotification: (title: string, message: string, type: string, emoji: string) => void
}

export interface SpinPrize {
  type: 'blast' | 'magnet' | 'hammer' | 'undo' | 'spin' | 'coin' | 'respin' | 'multiply5' | 'multiply2_5' | 'timeExtend'
  count: number
  label: string
  emoji: string
  color: string
}

// ─── INR Spin Pack Data ──────────────────────────────────────────────────────

interface SpinPack {
  id: string
  spins: number
  price: number
  tag?: { label: string; color: string; fireStyling?: boolean }
  currency: 'inr' | 'coin'
  bonusSpins?: number
}

const SPIN_INR_PACKS: SpinPack[] = [
  { id: 'spin-9', spins: 9, price: 5, currency: 'inr' },
  { id: 'spin-20', spins: 20, price: 9, tag: { label: 'HOT', color: '#F65E3B' }, currency: 'inr' },
  { id: 'spin-33', spins: 33, price: 15, tag: { label: 'VERY HOT', color: '#FF1744', fireStyling: true }, currency: 'inr' },
  { id: 'spin-50', spins: 50, price: 25, currency: 'inr' },
]

// ─── UPI / Payment Constants ─────────────────────────────────────────────────

const UPI_ID = '9897186065@fam'
const ORDERS_KEY = 'mergeMaster2048_orders'
const PAYMENT_DETAILS_KEY = 'mergeMaster2048_paymentDetails'
const USED_COUPONS_KEY = 'mergeMaster2048_usedCoupons'
const ADMIN_COUPONS_KEY = 'adminCoupons'
const ADMIN_DISCOUNT_COUPONS_KEY = 'adminDiscountCoupons'

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

function loadOrders(): StoreOrder[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveOrders(orders: StoreOrder[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

function toFirebaseOrder(order: StoreOrder, playerName: string, userCode: string): Omit<FirebaseStoreOrder, 'createdAt' | 'approvedAt'> {
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

function formatNumber(n: number): string {
  return n.toLocaleString('en-IN')
}

function generateUpiLink(price: number): string {
  return `upi://pay?pa=${UPI_ID}&pn=MergeMaster2048&am=${price}&cu=INR`
}

function generateQrUrl(upiLink: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`
}

// ─── Coupon Types ─────────────────────────────────────────────────────────────

interface Coupon {
  code: string
  discountPercent: number
  minPurchase: number
  used: boolean
}

// ─── Prize Pool & Spin Logic ──────────────────────────────────────────────────

// 11 items with user-specified probabilities (normalized to 100%)
const PRIZE_POOL: { prize: SpinPrize; weight: number }[] = [
  { prize: { type: 'blast', count: 2, label: '2 Boom', emoji: '💣', color: '#FF7A00' }, weight: 6 },
  { prize: { type: 'magnet', count: 3, label: '3 Magnet', emoji: '🧲', color: '#00E676' }, weight: 5 },
  { prize: { type: 'blast', count: 1, label: '1 Boom', emoji: '💥', color: '#FF9F1C' }, weight: 8 },
  { prize: { type: 'hammer', count: 2, label: '2 Hammer', emoji: '🔨', color: '#F59563' }, weight: 5 },
  { prize: { type: 'respin', count: 1, label: 'Spin Again!', emoji: '🔄', color: '#EDC22E' }, weight: 3 },
  { prize: { type: 'undo', count: 3, label: '3 Undo', emoji: '↩️', color: '#8f7a66' }, weight: 5 },
  { prize: { type: 'spin', count: 1, label: '1 Spin Ticket', emoji: '🎫', color: '#00FFFF' }, weight: 7 },
  { prize: { type: 'coin', count: 100, label: '100 Coins', emoji: '💰', color: '#EDC22E' }, weight: 6 },
  { prize: { type: 'multiply5', count: 1, label: '5x Ability', emoji: '⚡', color: '#FF00FF' }, weight: 0.5 },
  { prize: { type: 'multiply2_5', count: 1, label: '2.5x Ability', emoji: '💫', color: '#00FFFF' }, weight: 1 },
  { prize: { type: 'timeExtend', count: 1, label: '+10s Timer', emoji: '⏱️', color: '#00E676' }, weight: 1.5 },
]

function pickPrize(): { index: number; prize: SpinPrize } {
  const totalWeight = PRIZE_POOL.reduce((sum, p) => sum + p.weight, 0)
  let random = Math.random() * totalWeight
  for (let i = 0; i < PRIZE_POOL.length; i++) {
    random -= PRIZE_POOL[i].weight
    if (random <= 0) {
      return { index: i, prize: { ...PRIZE_POOL[i].prize } }
    }
  }
  return { index: 0, prize: { ...PRIZE_POOL[0].prize } }
}

const SPIN_COUNTS = [1, 3, 5, 10]

// ─── UPI Payment Modal ────────────────────────────────────────────────────────

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

    // Consume discount coupon if used
    if (discountCouponCode && discountAmount && discountAmount > 0) {
      try {
        const { consumeDiscountCoupon } = await import('@/components/game/CouponCode')
        consumeDiscountCoupon(discountCouponCode)
      } catch { /* ignore */ }
    }

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
      className="fixed inset-0 z-[300] flex items-center justify-center p-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
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
          {/* QR Code Section */}
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

          {/* Package Details */}
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

          {/* Payment Form */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              📝 PAYMENT DETAILS
            </h4>
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
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
              />
            </div>
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
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
              />
            </div>
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
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
              />
            </div>
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
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
              />
            </div>
            <div>
              <label className="text-[9px] font-bold mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Upload Proof (Screenshot)
              </label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
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
                  <><FileText className="w-3.5 h-3.5" />{proofFileName.length > 25 ? proofFileName.substring(0, 22) + '...' : proofFileName}</>
                ) : (
                  <><Upload className="w-3.5 h-3.5" />Upload Screenshot</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 p-4 pt-3 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-transform active:scale-95"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            CANCEL
          </button>
          <button
            onClick={handleBookOrder}
            disabled={!isFormValid || submitting}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}
          >
            {submitting ? 'BOOKING...' : 'BOOK ORDER'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main SpinWheel Component ────────────────────────────────────────────────

export function SpinWheel({
  isOpen, onClose, spinTickets, onUseTicket, onWinPrize, onWatchAdForSpin, isOnline, coins, onDeductCoins, onAddSpinTickets,
  playerId, playerName, userCode, onAddNotification,
}: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ index: number; prize: SpinPrize } | null>(null)
  const [rotation, setRotation] = useState(0)
  const [showAdOverlay, setShowAdOverlay] = useState(false)
  const [spinMultiplier, setSpinMultiplier] = useState(1)
  const [multiResults, setMultiResults] = useState<{ prize: SpinPrize; revealed: boolean }[]>([])
  const [allRevealed, setAllRevealed] = useState(false)
  const [spinMode, setSpinMode] = useState<'ticket' | 'coin'>('ticket')
  const spinCountRef = useRef(0)
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  // ─── Shared Cart State ────────────────────────────────────────────────────
  const [cart, setCart] = useState<SharedCartItem[]>(() => {
    if (typeof window === 'undefined') return []
    return loadSharedCart()
  })
  const [showCart, setShowCart] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState('')
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; itemName: string; itemPrice: number; itemQuantity: number }>({
    open: false, itemName: '', itemPrice: 0, itemQuantity: 0,
  })

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotalINR = cart.filter(i => i.currency === 'inr').reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartTotalCoins = cart.filter(i => i.currency === 'coin').reduce((sum, item) => sum + item.price * item.quantity, 0)

  const addToCart = useCallback((pack: SpinPack) => {
    const newItem: Omit<SharedCartItem, 'quantity'> = {
      id: pack.id,
      emoji: '🎫',
      name: `${pack.spins} Spin Tickets`,
      price: pack.price,
      currency: pack.currency,
      section: 'spin',
    }
    const existing = cart.find(c => c.id === pack.id)
    let updated: SharedCartItem[]
    if (existing) {
      updated = cart.map(c => c.id === pack.id ? { ...c, quantity: c.quantity + 1 } : c)
    } else {
      updated = [...cart, { ...newItem, quantity: 1 }]
    }
    setCart(updated)
    saveSharedCart(updated)
  }, [cart])

  const updateCartQuantity = useCallback((id: string, delta: number) => {
    const updated = cart
      .map(c => {
        if (c.id === id) {
          const newQty = Math.max(0, c.quantity + delta)
          return newQty === 0 ? null : { ...c, quantity: newQty }
        }
        return c
      })
      .filter(Boolean) as SharedCartItem[]
    setCart(updated)
    saveSharedCart(updated)
  }, [cart])

  const removeFromCart = useCallback((id: string) => {
    const updated = cart.filter(c => c.id !== id)
    setCart(updated)
    saveSharedCart(updated)
  }, [cart])

  const applyCoupon = useCallback(() => {
    if (!couponCode.trim()) return
    setCouponError('')
    try {
      const usedCoupons: string[] = JSON.parse(localStorage.getItem(USED_COUPONS_KEY) || '[]')
      if (usedCoupons.includes(couponCode.trim().toUpperCase())) {
        setCouponError('Coupon already used')
        return
      }
    } catch { /* ignore */ }
    try {
      const discountCoupons: Array<{ code: string; discountPercent: number; minPurchase?: number; maxUses?: number; currentUses?: number; disabled?: boolean }> = JSON.parse(localStorage.getItem(ADMIN_DISCOUNT_COUPONS_KEY) || '[]')
      const found = discountCoupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase())
      if (found) {
        if (found.disabled) { setCouponError('This coupon has been disabled'); return }
        if (found.maxUses && found.currentUses !== undefined && found.currentUses >= found.maxUses) { setCouponError('This coupon has reached its max uses'); return }
        const minPurchase = found.minPurchase || 0
        if (minPurchase > 0 && cartTotalINR < minPurchase) { setCouponError(`Minimum ₹${minPurchase} purchase required`); return }
        setAppliedCoupon({ code: found.code, discountPercent: found.discountPercent || 10, minPurchase, used: false })
        return
      }
    } catch { /* ignore */ }
    try {
      const adminCoupons: Array<{ code: string; discount: number; minPurchase?: number }> = JSON.parse(localStorage.getItem(ADMIN_COUPONS_KEY) || '[]')
      const found = adminCoupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase())
      if (found) {
        const minPurchase = found.minPurchase || 0
        if (minPurchase > 0 && cartTotalINR < minPurchase) { setCouponError(`Minimum ₹${minPurchase} purchase required`); return }
        setAppliedCoupon({ code: found.code, discountPercent: found.discount || 10, minPurchase, used: false })
        return
      }
    } catch { /* ignore */ }
    setCouponError('Invalid coupon code')
  }, [couponCode, cartTotalINR])

  const discountAmount = appliedCoupon ? Math.round(cartTotalINR * appliedCoupon.discountPercent / 100) : 0
  const finalTotal = cartTotalINR - discountAmount

  const handleOrderPlaced = useCallback((order: StoreOrder) => {
    const orders = loadOrders()
    orders.push(order)
    saveOrders(orders)
    try {
      firebasePlaceOrder(toFirebaseOrder(order, playerName, userCode))
    } catch { /* ignore */ }
    onAddNotification('Order Placed! 🎉', `Your order for ${order.item} has been placed. Status: Pending`, 'system', '📦')
  }, [playerName, userCode, onAddNotification])

  const handlePlaceOrder = useCallback(() => {
    if (cart.length === 0) return
    if (appliedCoupon) {
      try {
        const usedCoupons: string[] = JSON.parse(localStorage.getItem(USED_COUPONS_KEY) || '[]')
        usedCoupons.push(appliedCoupon.code)
        localStorage.setItem(USED_COUPONS_KEY, JSON.stringify(usedCoupons))
      } catch { /* ignore */ }
      setAppliedCoupon(null)
    }

    // Process INR items - open payment modal with combined total
    const inrItems = cart.filter(i => i.currency === 'inr')
    if (inrItems.length > 0) {
      const total = finalTotal
      const itemNames = inrItems.map(i => `${i.emoji} ${i.name} x${i.quantity}`).join(', ')
      setPaymentModal({ open: true, itemName: itemNames, itemPrice: total, itemQuantity: 1 })
    }

    setCart([])
    clearSharedCart()
    setCouponCode('')
    setShowCart(false)
  }, [cart, appliedCoupon, finalTotal])

  // ─── Existing Spin Functionality ──────────────────────────────────────────

  // 2 free daily spins - track in localStorage
  const FREE_DAILY_SPINS = 2
  const FREE_SPINS_KEY = 'mergeMaster2048_freeSpinsClaimed'
  const [freeSpinsClaimed, setFreeSpinsClaimed] = useState<{ date: string; count: number }>(() => {
    try {
      const data = localStorage.getItem(FREE_SPINS_KEY)
      if (data) {
        const parsed = JSON.parse(data)
        const today = new Date().toISOString().split('T')[0]
        if (parsed.date === today) return parsed
      }
    } catch { /* ignore */ }
    return { date: new Date().toISOString().split('T')[0], count: 0 }
  })

  // Persist free spins state
  useEffect(() => {
    localStorage.setItem(FREE_SPINS_KEY, JSON.stringify(freeSpinsClaimed))
  }, [freeSpinsClaimed])

  const remainingFreeSpins = Math.max(0, FREE_DAILY_SPINS - freeSpinsClaimed.count)

  const COIN_COST_PER_SPIN = 300
  const affordableSpins = Math.floor(coins / COIN_COST_PER_SPIN)
  const affordableTicketSpins = spinTickets

  const effectiveMultiplier = useMemo(() => {
    const canAfford = spinMode === 'ticket' ? spinTickets >= spinMultiplier : coins >= spinMultiplier * COIN_COST_PER_SPIN
    if (canAfford) return spinMultiplier
    for (let i = SPIN_COUNTS.length - 1; i >= 0; i--) {
      const count = SPIN_COUNTS[i]
      const affordable = spinMode === 'ticket' ? spinTickets >= count : coins >= count * COIN_COST_PER_SPIN
      if (affordable) return count
    }
    return 1
  }, [spinMode, spinMultiplier, spinTickets, coins])

  const totalSpins = effectiveMultiplier === 10 ? 12 : effectiveMultiplier
  const ticketCost = effectiveMultiplier
  const coinCost = effectiveMultiplier * COIN_COST_PER_SPIN
  const canAffordSpin = spinMode === 'ticket' ? spinTickets >= ticketCost : coins >= coinCost

  const clearPendingTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(t => clearTimeout(t))
    timeoutRefs.current = []
  }, [])

  const handleClaimFreeSpins = useCallback(() => {
    if (remainingFreeSpins <= 0) return
    const claimCount = remainingFreeSpins
    onAddSpinTickets(claimCount)
    setFreeSpinsClaimed(prev => ({
      date: new Date().toISOString().split('T')[0],
      count: FREE_DAILY_SPINS
    }))
  }, [remainingFreeSpins, onAddSpinTickets])

  const handleSpin = useCallback(() => {
    if (!canAffordSpin || spinning) return
    clearPendingTimeouts()
    setSpinning(true)
    setResult(null)
    setMultiResults([])
    setAllRevealed(false)

    if (spinMode === 'ticket') {
      for (let i = 0; i < ticketCost; i++) {
        onUseTicket()
      }
    } else {
      onDeductCoins(coinCost)
    }

    const visualWin = pickPrize()
    spinCountRef.current += 1

    const sliceAngle = 360 / PRIZE_POOL.length
    const offset = (Math.random() - 0.5) * sliceAngle * 0.5
    const targetAngle = visualWin.index * sliceAngle + sliceAngle / 2 + offset
    const fullRotations = 360 * (5 + Math.floor(Math.random() * 3))
    const baseRotation = Math.ceil(rotation / 360) * 360
    const targetRotation = baseRotation + fullRotations + (360 - targetAngle)

    setRotation(targetRotation)

    if (effectiveMultiplier === 1) {
      const t1 = setTimeout(() => {
        setResult(visualWin)
        setSpinning(false)
      }, 3500)
      timeoutRefs.current.push(t1)
    } else {
      const prizes: SpinPrize[] = []
      for (let i = 0; i < totalSpins; i++) {
        prizes.push(pickPrize().prize)
      }
      const t2 = setTimeout(() => {
        setMultiResults(prizes.map(p => ({ prize: p, revealed: false })))
        setSpinning(false)
        prizes.forEach((_, i) => {
          const t3 = setTimeout(() => {
            setMultiResults(prev => prev.map((r, idx) => idx === i ? { ...r, revealed: true } : r))
            if (i === prizes.length - 1) {
              const t4 = setTimeout(() => setAllRevealed(true), 350)
              timeoutRefs.current.push(t4)
            }
          }, i * 250)
          timeoutRefs.current.push(t3)
        })
      }, 2500)
      timeoutRefs.current.push(t2)
    }
  }, [canAffordSpin, spinning, spinMode, onUseTicket, onDeductCoins, rotation, effectiveMultiplier, ticketCost, coinCost, totalSpins, clearPendingTimeouts])

  const handleClaim = useCallback(() => {
    if (!result) return
    onWinPrize(result.prize)
    setResult(null)
  }, [result, onWinPrize])

  const handleClaimAll = useCallback(() => {
    if (multiResults.length === 0) return
    multiResults.forEach(r => onWinPrize(r.prize))
    setMultiResults([])
    setAllRevealed(false)
  }, [multiResults, onWinPrize])

  const handleWatchAd = useCallback(() => {
    if (!isOnline) return
    setShowAdOverlay(true)
  }, [isOnline])

  const handleAdComplete = useCallback(() => {
    onWatchAdForSpin()
    setShowAdOverlay(false)
  }, [onWatchAdForSpin])

  const hasResult = result !== null || multiResults.length > 0

  const handleClose = useCallback(() => {
    clearPendingTimeouts()
    if (result) {
      onWinPrize(result.prize)
      setResult(null)
    }
    if (multiResults.length > 0) {
      multiResults.forEach(r => onWinPrize(r.prize))
      setMultiResults([])
      setAllRevealed(false)
    }
    setSpinning(false)
    onClose()
  }, [result, multiResults, onWinPrize, onClose, clearPendingTimeouts])

  return (
    <>
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
              className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
              style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 shrink-0">
                <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>🎰 Spin & Win</h3>
                <div className="flex items-center gap-2">
                  {/* Cart Icon with Badge */}
                  <button
                    onClick={() => setShowCart(!showCart)}
                    className="relative w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
                    style={{ backgroundColor: showCart ? 'rgba(237,194,46,0.2)' : 'rgba(255,255,255,0.1)' }}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" style={{ color: showCart ? '#EDC22E' : 'rgba(255,255,255,0.5)' }} />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ backgroundColor: '#F65E3B', color: '#FFFFFF' }}>
                        {cartItemCount > 9 ? '9+' : cartItemCount}
                      </span>
                    )}
                  </button>
                  <button onClick={handleClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                </div>
              </div>

              {/* Cart Drawer */}
              <AnimatePresence>
                {showCart && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                          <span className="text-xs font-bold" style={{ color: '#FFFFFF' }}>Cart ({cartItemCount})</span>
                        </div>
                        <button onClick={() => setShowCart(false)} className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Close
                        </button>
                      </div>

                      {cart.length === 0 ? (
                        <div className="text-center py-4">
                          <ShoppingCart className="w-8 h-8 mx-auto mb-1" style={{ color: 'rgba(255,255,255,0.15)' }} />
                          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cart is empty. Add spin packs below!</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto mb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                            {cart.map(item => (
                              <div key={item.id} className="flex items-center gap-2 p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <span className="text-xs">{item.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] font-bold truncate" style={{ color: '#FFFFFF' }}>{item.name}</p>
                                  <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    {item.currency === 'inr' ? `₹${item.price}` : `💰 ${formatNumber(item.price)}`} each
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => updateCartQuantity(item.id, -1)} className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                    <Minus className="w-2 h-2" style={{ color: 'rgba(255,255,255,0.5)' }} />
                                  </button>
                                  <span className="text-[9px] font-bold w-4 text-center" style={{ color: '#FFFFFF' }}>{item.quantity}</span>
                                  <button onClick={() => updateCartQuantity(item.id, 1)} className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                    <Plus className="w-2 h-2" style={{ color: 'rgba(255,255,255,0.5)' }} />
                                  </button>
                                </div>
                                <p className="text-[9px] font-bold ml-1" style={{ color: '#EDC22E' }}>
                                  {item.currency === 'inr' ? `₹${item.price * item.quantity}` : `💰${formatNumber(item.price * item.quantity)}`}
                                </p>
                                <button onClick={() => removeFromCart(item.id)} className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(246,94,59,0.1)' }}>
                                  <X className="w-2 h-2" style={{ color: '#F65E3B' }} />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Coupon & Checkout */}
                          <div className="space-y-1.5">
                            {/* Coupon */}
                            <div className="flex gap-1">
                              <div className="flex-1 flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Tag className="w-2.5 h-2.5" style={{ color: '#EDC22E' }} />
                                <input type="text" value={couponCode} onChange={e => { setCouponCode(e.target.value); setCouponError('') }} placeholder="Coupon code" className="flex-1 bg-transparent text-[8px] outline-none" style={{ color: '#FFFFFF' }} />
                              </div>
                              <button onClick={applyCoupon} disabled={!couponCode.trim()} className="px-2 py-1 rounded-lg text-[8px] font-bold disabled:opacity-40" style={{ backgroundColor: 'rgba(237,194,46,0.15)', border: '1px solid rgba(237,194,46,0.3)', color: '#EDC22E' }}>
                                Apply
                              </button>
                            </div>
                            {couponError && <p className="text-[7px]" style={{ color: '#F65E3B' }}>{couponError}</p>}
                            {appliedCoupon && <p className="text-[7px]" style={{ color: '#00E676' }}>✅ {appliedCoupon.discountPercent}% off applied!</p>}

                            {/* Totals */}
                            <div className="space-y-0.5">
                              {cartTotalINR > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>₹ Total:</span>
                                  <span className="text-[8px] font-bold" style={{ color: '#EDC22E' }}>₹{cartTotalINR}</span>
                                </div>
                              )}
                              {discountAmount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-[8px]" style={{ color: '#00E676' }}>Discount:</span>
                                  <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>-₹{discountAmount}</span>
                                </div>
                              )}
                              {finalTotal > 0 && discountAmount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-[8px] font-bold" style={{ color: '#FFFFFF' }}>Final:</span>
                                  <span className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>₹{finalTotal}</span>
                                </div>
                              )}
                            </div>

                            <button onClick={handlePlaceOrder} className="w-full py-2 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-95" style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF', boxShadow: '0 2px 12px rgba(237,194,46,0.3)' }}>
                              <ShoppingCart className="w-3 h-3" />
                              Buy Now{cartTotalINR > 0 ? ` • ₹${finalTotal || cartTotalINR}` : ''}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {/* Free Daily Spins Claim */}
                {remainingFreeSpins > 0 && !hasResult && !spinning && (
                  <div className="mb-3">
                    <button
                      onClick={handleClaimFreeSpins}
                      className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                      style={{
                        background: 'linear-gradient(135deg, #00E676, #00C853)',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(0,230,118,0.3)',
                      }}
                    >
                      🎁 Claim {remainingFreeSpins} Free Spin{remainingFreeSpins > 1 ? 's' : ''}!
                    </button>
                    <p className="text-center text-[8px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      2 free spins daily • Resets at midnight
                    </p>
                  </div>
                )}

                {/* Spin Mode Toggle */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setSpinMode('ticket')}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center"
                    style={{
                      backgroundColor: spinMode === 'ticket' ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.06)',
                      border: spinMode === 'ticket' ? '1px solid rgba(0,230,118,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: spinMode === 'ticket' ? '#00E676' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    🎫 Ticket Spin
                  </button>
                  <button
                    onClick={() => setSpinMode('coin')}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center"
                    style={{
                      backgroundColor: spinMode === 'coin' ? 'rgba(237,194,46,0.2)' : 'rgba(255,255,255,0.06)',
                      border: spinMode === 'coin' ? '1px solid rgba(237,194,46,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: spinMode === 'coin' ? '#EDC22E' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    🪙 Coin Spin (300🪙)
                  </button>
                </div>

                <p className="text-center text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {spinMode === 'ticket' ? (
                    <>Tickets: <span style={{ color: '#EDC22E', fontWeight: 'bold' }}>{spinTickets}</span> • Available spins: <span style={{ color: '#00E676', fontWeight: 'bold' }}>{affordableTicketSpins}</span></>
                  ) : (
                    <>Coins: <span style={{ color: '#EDC22E', fontWeight: 'bold' }}>{coins}</span> • Available spins: <span style={{ color: '#00E676', fontWeight: 'bold' }}>{affordableSpins}</span></>
                  )}
                </p>

                {/* Spin Multiplier Selector */}
                {!hasResult && !spinning && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {SPIN_COUNTS.map(count => {
                      const isActive = effectiveMultiplier === count
                      const isBonus = count === 10
                      const canAfford = spinMode === 'ticket' ? spinTickets >= count : coins >= count * COIN_COST_PER_SPIN
                      const costLabel = spinMode === 'ticket'
                        ? `${count}🎫`
                        : `${count * COIN_COST_PER_SPIN}🪙`
                      return (
                        <button
                          key={count}
                          onClick={() => canAfford && setSpinMultiplier(count)}
                          className="relative flex flex-col items-center px-3 py-1.5 rounded-lg transition-all"
                          style={{
                            backgroundColor: isActive ? 'rgba(237,194,46,0.2)' : canAfford ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                            border: isActive ? '1px solid rgba(237,194,46,0.5)' : canAfford ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.04)',
                            opacity: canAfford ? 1 : 0.35,
                            transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          }}
                        >
                          <span className="text-[10px] font-extrabold" style={{ color: isActive ? '#EDC22E' : 'rgba(255,255,255,0.6)' }}>
                            {isBonus ? '10+2' : `${count}`}x
                          </span>
                          <span className="text-[7px]" style={{ color: isActive ? 'rgba(237,194,46,0.7)' : 'rgba(255,255,255,0.3)' }}>{costLabel}</span>
                          {isBonus && (
                            <span className="absolute -top-1.5 -right-1 text-[6px] font-bold px-1 rounded-full" style={{ backgroundColor: '#00E676', color: '#FFFFFF' }}>
                              +2 FREE
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Multi-spin info */}
                {!hasResult && !spinning && effectiveMultiplier > 1 && (
                  <p className="text-center text-[10px] mb-2" style={{ color: '#00E676' }}>
                    {spinMode === 'ticket'
                      ? (effectiveMultiplier === 10 ? '10 tickets = 12 spins! (+2 FREE 🎉)' : `${effectiveMultiplier} spins for ${effectiveMultiplier} tickets`)
                      : (effectiveMultiplier === 10 ? '3,000 coins = 12 spins! (+2 FREE 🎉)' : `${effectiveMultiplier} spins for ${coinCost} coins`)
                    }
                  </p>
                )}

                {/* Available spins info */}
                {!hasResult && !spinning && spinMode === 'coin' && (
                  <p className="text-center text-[9px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Your coins can buy up to <span style={{ color: '#EDC22E', fontWeight: 'bold' }}>{affordableSpins}</span> spin{affordableSpins !== 1 ? 's' : ''}
                    {affordableSpins >= 10 && <span style={{ color: '#00E676' }}> (10+2 FREE deal available!)</span>}
                  </p>
                )}

                {/* Wheel */}
                <div className="relative w-48 h-48 mx-auto mb-3">
                  {/* Pointer */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                    <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[15px] border-l-transparent border-r-transparent" style={{ borderTopColor: '#FF7A00', filter: 'drop-shadow(0 2px 4px rgba(255,122,0,0.5))' }} />
                  </div>

                  {/* Center dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full z-20 flex items-center justify-center"
                    style={{ backgroundColor: '#2d1b4e', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    <span className="text-[7px]">🎯</span>
                  </div>

                  {/* Rotating wheel */}
                  <div
                    className="w-full h-full rounded-full overflow-hidden border-4"
                    style={{
                      borderColor: 'rgba(255,255,255,0.15)',
                      transform: `rotate(${rotation}deg)`,
                      transition: spinning ? 'transform 3.5s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none',
                    }}
                  >
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {PRIZE_POOL.map((item, i) => {
                        const sliceAngle = 360 / PRIZE_POOL.length
                        const startAngle = i * sliceAngle
                        const endAngle = startAngle + sliceAngle
                        const startRad = (startAngle - 90) * Math.PI / 180
                        const endRad = (endAngle - 90) * Math.PI / 180
                        const x1 = 100 + 92 * Math.cos(startRad)
                        const y1 = 100 + 92 * Math.sin(startRad)
                        const x2 = 100 + 92 * Math.cos(endRad)
                        const y2 = 100 + 92 * Math.sin(endRad)
                        const midRad = (startAngle + sliceAngle / 2 - 90) * Math.PI / 180
                        const tx = 100 + 55 * Math.cos(midRad)
                        const ty = 100 + 55 * Math.sin(midRad)

                        const isEven = i % 2 === 0

                        return (
                          <g key={i}>
                            <path
                              d={`M100,100 L${x1},${y1} A92,92 0 0,1 ${x2},${y2} Z`}
                              fill={isEven ? item.prize.color + '30' : item.prize.color + '18'}
                              stroke={item.prize.color + '40'}
                              strokeWidth="0.5"
                            />
                            <text x={tx} y={ty - 3} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold">
                              {item.prize.emoji}
                            </text>
                            <text x={tx} y={ty + 8} textAnchor="middle" dominantBaseline="middle" fontSize="4" fontWeight="bold" fill="white">
                              {item.prize.label}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                </div>

                {/* Single spin result */}
                <AnimatePresence>
                  {result && !spinning && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="text-center mb-3">
                      <p className="text-sm font-bold mb-2" style={{ color: result.prize.color }}>
                        🎉 You won: {result.prize.emoji} {result.prize.label}
                      </p>
                      <button
                        onClick={handleClaim}
                        className="px-6 py-2 rounded-xl font-bold text-xs transition-transform hover:scale-105 active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${result.prize.color}, ${result.prize.color}CC)`, color: '#FFFFFF' }}
                      >
                        CLAIM
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Multi-spin results grid */}
                <AnimatePresence>
                  {multiResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-3">
                      <p className="text-center text-xs font-bold mb-2" style={{ color: '#EDC22E' }}>
                        🎉 {totalSpins} Spins Results!
                      </p>
                      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
                        {multiResults.map((r, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotateY: 180 }}
                            animate={r.revealed ? { scale: 1, rotateY: 0 } : { scale: 0.8, rotateY: 180 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg"
                            style={{
                              backgroundColor: r.revealed ? `${r.prize.color}15` : 'rgba(255,255,255,0.06)',
                              border: r.revealed ? `1px solid ${r.prize.color}40` : '1px solid rgba(255,255,255,0.1)',
                              minHeight: '52px',
                            }}
                          >
                            {r.revealed ? (
                              <>
                                <span className="text-base leading-none">{r.prize.emoji}</span>
                                <span className="text-[7px] font-bold mt-0.5 leading-tight text-center" style={{ color: r.prize.color }}>{r.prize.label}</span>
                              </>
                            ) : (
                              <span className="text-lg leading-none">❓</span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                      {/* Claim All button */}
                      {allRevealed && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                          <button
                            onClick={handleClaimAll}
                            className="w-full py-2.5 rounded-xl font-bold text-xs transition-transform hover:scale-[1.02] active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF', boxShadow: '0 2px 12px rgba(237,194,46,0.4)' }}
                          >
                            CLAIM ALL ({totalSpins} prizes)
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Spin Button */}
                {!hasResult && (
                  <button
                    onClick={handleSpin}
                    disabled={!canAffordSpin || spinning}
                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}
                  >
                    <Play className="w-4 h-4" />
                    {spinning ? 'Spinning...' : `SPIN ${effectiveMultiplier > 1 ? `${totalSpins}x ` : ''}(${spinMode === 'ticket' ? `${ticketCost} 🎫` : `${coinCost} 🪙`})`}
                  </button>
                )}

                {/* Watch Ad for Free Spin */}
                {isOnline && !hasResult && !spinning && (
                  <button
                    onClick={handleWatchAd}
                    className="w-full py-2.5 mt-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #F65E3B, #FF7A00)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <Tv className="w-4 h-4" />
                    📺 Watch Ad for Free Spin
                  </button>
                )}

                {/* No tickets and offline message */}
                {!isOnline && spinTickets <= 0 && !hasResult && (
                  <p className="text-center text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    🔴 You&apos;re offline. Connect to internet to watch ads for free spins!
                  </p>
                )}

                {/* ─── INR Spin Packs Section ──────────────────────────────────── */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🎫</span>
                    <h4 className="text-xs font-extrabold tracking-wide" style={{ color: '#F65E3B' }}>
                      BUY SPIN PACKS (₹)
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SPIN_INR_PACKS.map((pack, i) => (
                      <motion.div
                        key={pack.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.2 }}
                        className="relative flex flex-col items-center justify-between p-3 pt-4 rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: pack.tag ? `0 0 16px ${pack.tag.color}15` : 'none',
                        }}
                      >
                        {pack.tag && (
                          <div
                            className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-extrabold tracking-wide whitespace-nowrap z-10"
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
                        <div className="text-center mb-2">
                          <div className="text-xl mb-0.5">🎫</div>
                          <p className="text-sm font-extrabold" style={{ color: '#F65E3B' }}>
                            {pack.spins}
                          </p>
                          <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Spins</p>
                        </div>
                        <div className="w-full">
                          <p className="text-center text-[10px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            {pack.spins} Spins = ₹{pack.price}
                          </p>
                          <button
                            onClick={() => addToCart(pack)}
                            className="w-full py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-transform hover:scale-[1.02] active:scale-95"
                            style={{
                              background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
                              color: '#FFFFFF',
                              boxShadow: '0 2px 8px rgba(237,194,46,0.3)',
                            }}
                          >
                            <ShoppingCart className="w-3 h-3" />
                            Add 🛒
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Small ad at bottom of spin wheel */}
                {isOnline && (
                  <div className="mt-3 rounded-lg overflow-hidden flex justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <AdsterraBanner320x50 />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin Wheel Ad Overlay */}
      <SpinWheelAd
        isOpen={showAdOverlay}
        onClose={() => setShowAdOverlay(false)}
        onAdComplete={handleAdComplete}
      />

      {/* UPI Payment Modal */}
      {paymentModal.open && (
        <UPIPaymentModal
          isOpen={paymentModal.open}
          onClose={() => setPaymentModal({ open: false, itemName: '', itemPrice: 0, itemQuantity: 0 })}
          itemName={paymentModal.itemName}
          itemPrice={paymentModal.itemPrice}
          itemQuantity={paymentModal.itemQuantity}
          playerId={playerId}
          onOrderPlaced={handleOrderPlaced}
          discountCouponCode={appliedCoupon?.code}
          discountAmount={discountAmount > 0 ? discountAmount : undefined}
        />
      )}
    </>
  )
}
