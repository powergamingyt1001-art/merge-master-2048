'use client'

import { motion, AnimatePresence } from 'framer-motion'

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
        className="w-full flex items-center justify-center py-0.5 px-1"
        style={{
          background: 'linear-gradient(90deg, #1a0533, #0d1b3e, #1a0533)',
          borderTop: position === 'bottom' ? '1px solid rgba(255,255,255,0.06)' : 'none',
          borderBottom: position === 'top' ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        {/* Adsterra Banner Ad Container */}
        <div className="w-full max-w-md overflow-hidden" style={{ minHeight: 50 }}>
          <div id={`adsterra-banner-${position}`} className="w-full">
            {/* Adsterra will inject the ad here via script */}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
