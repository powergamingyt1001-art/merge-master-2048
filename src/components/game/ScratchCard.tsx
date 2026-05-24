'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift } from 'lucide-react'

interface ScratchCardProps {
  isOpen: boolean
  onClose: (claimed: boolean) => void
  couponCode: string
  discountPercent: number
}

export function ScratchCard({ isOpen, onClose, couponCode, discountPercent }: ScratchCardProps) {
  const [revealed, setRevealed] = useState(false)
  const [scratchProgress, setScratchProgress] = useState(0)

  const handleScratch = useCallback(() => {
    const newProgress = Math.min(100, scratchProgress + 15 + Math.random() * 20)
    setScratchProgress(newProgress)
    if (newProgress >= 80 && !revealed) {
      setRevealed(true)
    }
  }, [scratchProgress, revealed])

  const handleClaim = useCallback(() => {
    // Save the scratch coupon as a discount coupon for next purchase
    try {
      const existingCoupons = JSON.parse(localStorage.getItem('adminDiscountCoupons') || '[]')
      const hasCoupon = existingCoupons.some((c: any) => c.code.toUpperCase() === couponCode.toUpperCase())
      if (!hasCoupon) {
        existingCoupons.push({
          code: couponCode,
          discountPercent,
          minPurchase: 0,
          maxUses: 1,
          currentUses: 0,
          disabled: false,
          source: 'scratch',
          createdAt: Date.now()
        })
        localStorage.setItem('adminDiscountCoupons', JSON.stringify(existingCoupons))
      }
      // Mark as used in scratch history
      const scratchHistory = JSON.parse(localStorage.getItem('mergeMaster2048_scratchClaimed') || '[]')
      scratchHistory.push({ code: couponCode, claimedAt: Date.now() })
      localStorage.setItem('mergeMaster2048_scratchClaimed', JSON.stringify(scratchHistory))
    } catch { /* ignore */ }
    onClose(true)
  }, [couponCode, discountPercent, onClose])

  const handleSkip = useCallback(() => {
    onClose(false)
  }, [onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      >
        <motion.div
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.5 }}
          className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
            border: '2px solid rgba(237,194,46,0.3)',
            boxShadow: '0 0 40px rgba(237,194,46,0.2)',
          }}
        >
          {/* Header */}
          <div className="p-4 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-lg font-bold" style={{ color: '#FFD700' }}>🎉 Scratch & Win!</h3>
            <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>You earned a reward for your ₹160+ purchase!</p>
          </div>

          {/* Scratch Area */}
          <div className="p-6 flex flex-col items-center">
            {!revealed ? (
              <div
                className="w-56 h-36 rounded-xl cursor-pointer relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, #C0C0C0, #A0A0A0)`,
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
                onClick={handleScratch}
              >
                {/* Scratch overlay */}
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{
                    opacity: Math.max(0, 1 - scratchProgress / 100),
                    background: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)',
                  }}>
                  <div className="text-center">
                    <Gift className="w-8 h-8 mx-auto mb-2" style={{ color: '#666' }} />
                    <p className="text-sm font-bold" style={{ color: '#666' }}>SCRATCH HERE</p>
                    <p className="text-[8px]" style={{ color: '#888' }}>Tap to reveal your prize!</p>
                  </div>
                </div>
                {/* Hidden prize underneath */}
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ opacity: scratchProgress > 20 ? Math.min(1, scratchProgress / 60) : 0 }}>
                  <div className="text-center">
                    <p className="text-3xl mb-1">🤑</p>
                    <p className="text-xl font-extrabold" style={{ color: '#FFD700' }}>{discountPercent}% OFF</p>
                    <p className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>{couponCode}</p>
                  </div>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="text-center"
              >
                {/* Emoji rain */}
                <div className="relative h-20 mb-4">
                  {Array.from({ length: 12 }, (_, i) => (
                    <motion.span
                      key={i}
                      initial={{ y: -50, opacity: 0, x: (Math.random() - 0.5) * 200 }}
                      animate={{ y: 80, opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 2, delay: i * 0.15, repeat: 1 }}
                      className="absolute text-2xl"
                      style={{ left: `${10 + (i * 8) % 80}%` }}
                    >
                      🤑
                    </motion.span>
                  ))}
                </div>

                {/* Glitter/confetti effect */}
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 20 }, (_, i) => (
                    <motion.div
                      key={`glitter-${i}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                        x: (Math.random() - 0.5) * 300,
                        y: (Math.random() - 0.5) * 300,
                      }}
                      transition={{ duration: 1.5, delay: i * 0.1, repeat: 2 }}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        backgroundColor: ['#FFD700', '#FF7A00', '#00E676', '#FF69B4', '#00FFFF'][i % 5],
                      }}
                    />
                  ))}
                </div>

                <div className="p-4 rounded-xl mb-4"
                  style={{
                    backgroundColor: 'rgba(237,194,46,0.1)',
                    border: '2px solid rgba(237,194,46,0.4)',
                    boxShadow: '0 0 30px rgba(237,194,46,0.2)',
                  }}>
                  <p className="text-3xl mb-2">🎊</p>
                  <p className="text-sm font-bold" style={{ color: '#FFD700' }}>You won {discountPercent}% OFF!</p>
                  <p className="text-lg font-extrabold mt-1" style={{ color: '#EDC22E' }}>{couponCode}</p>
                  <p className="text-[8px] mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Use on your next purchase!</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Actions */}
          {revealed && (
            <div className="p-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={handleSkip}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                LATER
              </button>
              <button
                onClick={handleClaim}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs"
                style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}
              >
                CLAIM! 🎉
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
