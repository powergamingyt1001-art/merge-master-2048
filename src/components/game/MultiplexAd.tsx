'use client'

import { motion } from 'framer-motion'

interface MultiplexAdProps {
  isOnline: boolean
}

export function MultiplexAd({ isOnline }: MultiplexAdProps) {
  // Don't show ad when offline
  if (!isOnline) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="w-full rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="w-full px-1 py-1" style={{ minHeight: 100 }}>
        <div id="adsterra-multiplex" className="w-full">
          {/* Adsterra will inject the ad here via script */}
        </div>
      </div>
    </motion.div>
  )
}
