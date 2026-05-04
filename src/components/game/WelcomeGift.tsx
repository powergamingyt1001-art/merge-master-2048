'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, Hammer, Magnet, Bomb, Undo2, Sparkles } from 'lucide-react'

interface WelcomeGiftProps {
  isOpen: boolean
  onClose: () => void
  onClaim: () => void
}

export function WelcomeGift({ isOpen, onClose, onClaim }: WelcomeGiftProps) {
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
            className="w-full max-w-xs rounded-2xl overflow-hidden text-center"
            style={{
              background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 100%)',
              border: '2px solid rgba(237,194,46,0.3)',
              boxShadow: '0 0 40px rgba(237,194,46,0.15)',
            }}
          >
            {/* Close */}
            <div className="flex justify-end p-3">
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Gift icon */}
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', boxShadow: '0 8px 30px rgba(237,194,46,0.4)' }}
            >
              <Gift className="w-10 h-10" style={{ color: '#FFFFFF' }} />
            </motion.div>

            <h2 className="text-xl font-extrabold mb-1" style={{ color: '#FFFFFF' }}>
              🎉 Welcome Gift!
            </h2>
            <p className="text-[10px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              New player? Here&apos;s something special for you!
            </p>

            {/* Rewards grid */}
            <div className="grid grid-cols-3 gap-2 px-5 mb-5">
              {[
                { icon: <Bomb className="w-5 h-5" />, label: '5 Blast', color: '#FF7A00' },
                { icon: <Magnet className="w-5 h-5" />, label: '5 Magnet', color: '#00E676' },
                { icon: <Hammer className="w-5 h-5" />, label: '5 Hammer', color: '#F59563' },
                { icon: <Undo2 className="w-5 h-5" />, label: '5 Undo', color: '#8f7a66' },
                { icon: <Sparkles className="w-5 h-5" />, label: '3 Spins', color: '#EDC22E' },
                { icon: <Gift className="w-5 h-5" />, label: '🥳 FREE!', color: '#FF00FF' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl"
                  style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}25` }}
                >
                  <div style={{ color: item.color }}>{item.icon}</div>
                  <span className="text-[9px] font-bold" style={{ color: item.color }}>{item.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Claim button */}
            <div className="px-5 pb-6">
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
