'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { CouponCode } from '@/hooks/useGame'

interface CouponPanelProps {
  isOpen: boolean
  onClose: () => void
  couponCodes: CouponCode[]
  onValidateCoupon: (code: string) => { valid: boolean; reward?: string; alreadyClaimed?: boolean }
  onClaimCoupon: (code: string) => void
  onAddNotification: (title: string, message: string, type: 'reward' | 'rank' | 'invite' | 'commission' | 'system' | 'battle', emoji: string) => void
}

function getISTHour(): number {
  const now = new Date()
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  return istTime.getUTCHours()
}

export function CouponPanel({ isOpen, onClose, couponCodes, onValidateCoupon, onClaimCoupon, onAddNotification }: CouponPanelProps) {
  const [inputCode, setInputCode] = useState('')
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)

  const istHour = getISTHour()
  const isDayPeriod = istHour >= 12

  // Separate active (unclaimed, not expired) and claimed coupons
  const now = Date.now()
  const activeCoupons = couponCodes.filter(c => !c.claimed && c.expiresAt > now)
  const claimedCoupons = couponCodes.filter(c => c.claimed)

  // Day and Night coupons
  const dayCoupon = activeCoupons.find(c => c.code === '100Boom' || (isDayPeriod && !c.code.startsWith('10k')))
  const nightCoupon = activeCoupons.find(c => c.code === '10kCoin' || (!isDayPeriod && c.code !== '100Boom'))

  const handleSubmitCode = useCallback(() => {
    if (!inputCode.trim()) return

    const result = onValidateCoupon(inputCode.trim())
    if (result.valid && result.reward) {
      onClaimCoupon(inputCode.trim())
      onAddNotification('Coupon Claimed! 🎫', `You received: ${result.reward}`, 'reward', '🎫')
      setSubmitResult({ success: true, message: `Claimed: ${result.reward}` })
      setInputCode('')
    } else if (result.alreadyClaimed) {
      setSubmitResult({ success: false, message: 'This code has already been claimed!' })
    } else {
      // Check special codes that might not be in the daily pool
      const specialCodes: Record<string, string> = {
        '100Boom': '100 blast',
        '10kCoin': '10000 coins',
      }
      const code = inputCode.trim()
      if (specialCodes[code]) {
        // Try claiming it anyway
        onClaimCoupon(code)
        onAddNotification('Coupon Claimed! 🎫', `You received: ${specialCodes[code]}`, 'reward', '🎫')
        setSubmitResult({ success: true, message: `Claimed: ${specialCodes[code]}` })
        setInputCode('')
      } else {
        setSubmitResult({ success: false, message: 'Invalid code. Try again!' })
      }
    }

    setTimeout(() => setSubmitResult(null), 3000)
  }, [inputCode, onValidateCoupon, onClaimCoupon, onAddNotification])

  const handleClaimDailyCoupon = useCallback((code: string) => {
    const result = onValidateCoupon(code)
    if (result.valid && result.reward) {
      onClaimCoupon(code)
      onAddNotification('Coupon Claimed! 🎫', `You received: ${result.reward}`, 'reward', '🎫')
    }
  }, [onValidateCoupon, onClaimCoupon, onAddNotification])

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
            className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>🎫 Coupon Code</h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Claim daily codes & enter special codes
                </p>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="px-4 pb-5 overflow-y-auto flex-1">
              {/* Daily Coupon Cards */}
              <div className="mb-4">
                <p className="text-[9px] font-bold mb-2 uppercase tracking-wider" style={{ color: '#EDC22E' }}>
                  📅 Today&apos;s Daily Codes
                </p>
                <div className="flex flex-col gap-2">
                  {/* Day Coupon */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,122,0,0.08)', border: '1px solid rgba(255,122,0,0.2)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">☀️</span>
                        <div>
                          <p className="text-[10px] font-bold" style={{ color: '#FF7A00' }}>Day Coupon</p>
                          <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>12:00 PM – 11:59 PM IST</p>
                        </div>
                      </div>
                      {dayCoupon && !dayCoupon.claimed ? (
                        <button
                          onClick={() => handleClaimDailyCoupon(dayCoupon.code)}
                          className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #FF7A00, #F65E3B)', color: '#FFFFFF' }}
                        >
                          CLAIM
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {dayCoupon ? '✓ Claimed' : 'Unavailable'}
                        </span>
                      )}
                    </div>
                    {dayCoupon && !dayCoupon.claimed && (
                      <div className="mt-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-[9px] font-mono font-bold text-center" style={{ color: '#FF7A00', letterSpacing: '2px' }}>
                          {dayCoupon.code}
                        </p>
                        <p className="text-[7px] text-center mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Reward: {dayCoupon.reward}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Night Coupon */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,255,255,0.06)', border: '1px solid rgba(0,255,255,0.15)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🌙</span>
                        <div>
                          <p className="text-[10px] font-bold" style={{ color: '#00FFFF' }}>Night Coupon</p>
                          <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>12:00 AM – 11:59 AM IST</p>
                        </div>
                      </div>
                      {nightCoupon && !nightCoupon.claimed ? (
                        <button
                          onClick={() => handleClaimDailyCoupon(nightCoupon.code)}
                          className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-transform active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #00FFFF, #00E676)', color: '#1a0533' }}
                        >
                          CLAIM
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {nightCoupon ? '✓ Claimed' : 'Unavailable'}
                        </span>
                      )}
                    </div>
                    {nightCoupon && !nightCoupon.claimed && (
                      <div className="mt-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-[9px] font-mono font-bold text-center" style={{ color: '#00FFFF', letterSpacing: '2px' }}>
                          {nightCoupon.code}
                        </p>
                        <p className="text-[7px] text-center mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Reward: {nightCoupon.reward}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enter Code Section */}
              <div className="mb-4">
                <p className="text-[9px] font-bold mb-2 uppercase tracking-wider" style={{ color: '#00E676' }}>
                  🔑 Enter Special Code
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitCode()}
                    placeholder="Enter Code"
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#FFFFFF',
                    }}
                  />
                  <button
                    onClick={handleSubmitCode}
                    disabled={!inputCode.trim()}
                    className="px-4 py-2 rounded-lg text-[10px] font-bold transition-transform active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF' }}
                  >
                    SUBMIT
                  </button>
                </div>

                {/* Submit result feedback */}
                <AnimatePresence>
                  {submitResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-2 px-3 py-1.5 rounded-lg text-center"
                      style={{
                        backgroundColor: submitResult.success ? 'rgba(0,230,118,0.1)' : 'rgba(246,94,59,0.1)',
                        border: `1px solid ${submitResult.success ? 'rgba(0,230,118,0.2)' : 'rgba(246,94,59,0.2)'}`,
                      }}
                    >
                      <p className="text-[9px] font-bold" style={{ color: submitResult.success ? '#00E676' : '#F65E3B' }}>
                        {submitResult.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hint codes */}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setInputCode('100Boom')}
                    className="px-2 py-1 rounded text-[7px] font-bold transition-transform active:scale-95"
                    style={{ backgroundColor: 'rgba(255,122,0,0.08)', border: '1px solid rgba(255,122,0,0.15)', color: '#FF7A00' }}
                  >
                    💣 100Boom
                  </button>
                  <button
                    onClick={() => setInputCode('10kCoin')}
                    className="px-2 py-1 rounded text-[7px] font-bold transition-transform active:scale-95"
                    style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)', color: '#EDC22E' }}
                  >
                    💰 10kCoin
                  </button>
                </div>
              </div>

              {/* Claimed Coupons List */}
              {claimedCoupons.length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    ✅ Recently Claimed
                  </p>
                  <div className="flex flex-col gap-1">
                    {claimedCoupons.slice(0, 5).map((coupon, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{coupon.code}</span>
                        <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{coupon.reward}</span>
                        <span className="text-[7px]" style={{ color: '#00E676' }}>✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Section */}
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[8px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  ⏰ Daily codes refresh at <span style={{ color: '#FF7A00' }}>12:00 PM</span> and <span style={{ color: '#00FFFF' }}>12:00 AM</span> IST.
                  Special codes like &quot;100Boom&quot; and &quot;10kCoin&quot; can be entered anytime!
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
