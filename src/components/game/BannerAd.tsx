'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone } from 'lucide-react'

interface BannerAdProps {
  position: 'top' | 'bottom'
  isOnline: boolean
}

export function BannerAd({ position, isOnline }: BannerAdProps) {
  // Don't show ad when offline
  if (!isOnline) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="w-full flex items-center justify-center py-1.5 px-4"
        style={{
          background: 'linear-gradient(90deg, #1a0533, #0d1b3e, #1a0533)',
          borderTop: position === 'bottom' ? '1px solid rgba(255,255,255,0.06)' : 'none',
          borderBottom: position === 'top' ? '1px solid rgba(255,255,255,0.06)' : 'none',
          // Non-clickable: pointer-events-none prevents any interaction
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-1 rounded-lg max-w-md w-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Megaphone className="w-3 h-3 flex-shrink-0" style={{ color: '#EDC22E' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[8px] sm:text-[9px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Merge Master 2048 — Download the App!
            </p>
            <p className="text-[7px] truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Play anytime, anywhere. Free on iOS &amp; Android
            </p>
          </div>
          <div
            className="px-1.5 py-0.5 rounded text-[7px] font-bold flex-shrink-0"
            style={{ backgroundColor: 'rgba(237,194,46,0.15)', color: '#EDC22E' }}
          >
            AD
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
