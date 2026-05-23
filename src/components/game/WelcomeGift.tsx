'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift } from 'lucide-react'

interface WelcomeGiftProps {
  isOpen: boolean
  onClose: () => void
  onClaim: () => void
}

export function WelcomeGift({ isOpen, onClose, onClaim }: WelcomeGiftProps) {
  // Read admin welcome bonus config
  let bonus = { hammers: 5, spins: 5, roomCards: 2, bombs: 5, magnets: 5, timers: 5, multiplier5x: 5, multiplier2_5x: 5, undos: 5, discountPercent: 60 }
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminWelcomeBonus')
      if (saved) bonus = JSON.parse(saved)
    }
  } catch { /* use defaults */ }

  const items = [
    { emoji: '🔨', label: `${bonus.hammers} Hammer`, color: '#F59563' },
    { emoji: '🎫', label: `${bonus.spins} Spins`, color: '#EDC22E' },
    { emoji: '🃏', label: `${bonus.roomCards} Room Card`, color: '#E040FB' },
    { emoji: '💣', label: `${bonus.bombs} Bomb`, color: '#FF7A00' },
    { emoji: '🧲', label: `${bonus.magnets} Magnet`, color: '#00E676' },
    { emoji: '⏱️', label: `${bonus.timers} Timer`, color: '#00FFFF' },
    { emoji: '⚡', label: `${bonus.multiplier5x}x 5x`, color: '#F65E3B' },
    { emoji: '🔥', label: `${bonus.multiplier2_5x}x 2.5x`, color: '#FF7A00' },
    { emoji: '↩️', label: `${bonus.undos} Undo`, color: '#8f7a66' },
    { emoji: '🎟️', label: `${bonus.discountPercent}% OFF`, color: '#FF1744' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-full max-w-xs rounded-2xl overflow-hidden text-center max-h-[90vh] flex flex-col"
            style={{
              background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 100%)',
              border: '2px solid rgba(237,194,46,0.3)',
              boxShadow: '0 0 40px rgba(237,194,46,0.15)',
            }}
          >
            {/* Close */}
            <div className="flex justify-end p-3 shrink-0">
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Gift icon */}
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 shrink-0"
              style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', boxShadow: '0 8px 30px rgba(237,194,46,0.4)' }}
            >
              <Gift className="w-10 h-10" style={{ color: '#FFFFFF' }} />
            </motion.div>

            <h2 className="text-xl font-extrabold mb-1 shrink-0" style={{ color: '#FFFFFF' }}>
              🎉 Welcome Gift!
            </h2>
            <p className="text-[10px] mb-4 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
              New player? Here&apos;s something special for you!
            </p>

            {/* Rewards grid - scrollable */}
            <div className="overflow-y-auto px-4 mb-4 flex-1" style={{ scrollbarWidth: 'thin' }}>
              <div className="grid grid-cols-2 gap-2">
                {items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.08, type: 'spring' }}
                    className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ backgroundColor: `${item.color}12`, border: `1px solid ${item.color}25` }}
                  >
                    <span className="text-lg shrink-0">{item.emoji}</span>
                    <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Discount coupon highlight */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="mt-3 p-3 rounded-xl"
                style={{ background: 'linear-gradient(135deg, rgba(255,23,68,0.15), rgba(237,194,46,0.15))', border: '1px solid rgba(255,23,68,0.3)' }}
              >
                <p className="text-[11px] font-bold" style={{ color: '#FF1744' }}>
                  🎟️ WELCOME{bonus.discountPercent} Coupon Added!
                </p>
                <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {bonus.discountPercent}% off on ₹29+ purchases • Use in cart
                </p>
              </motion.div>
            </div>

            {/* Claim button */}
            <div className="px-5 pb-6 shrink-0">
              <button
                onClick={() => { onClaim(); onClose(); }}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-transform hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 20px rgba(237,194,46,0.4)',
                }}
              >
                🎁 CLAIM NOW!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
