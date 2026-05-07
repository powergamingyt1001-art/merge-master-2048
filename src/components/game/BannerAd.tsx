'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AD_CONFIG, pushAd } from '@/lib/admob'

interface BannerAdProps {
  position: 'top' | 'bottom'
  isOnline: boolean
}

export function BannerAd({ position, isOnline }: BannerAdProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const adPushed = useRef(false)

  useEffect(() => {
    if (!isOnline) return
    // Push ad once after mount
    if (!adPushed.current) {
      adPushed.current = true
      // Small delay to ensure the ins element is in DOM
      const timer = setTimeout(() => pushAd(), 300)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  // Don't show ad when offline
  if (!isOnline) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="w-full flex items-center justify-center py-1 px-2"
        style={{
          background: 'linear-gradient(90deg, #1a0533, #0d1b3e, #1a0533)',
          borderTop: position === 'bottom' ? '1px solid rgba(255,255,255,0.06)' : 'none',
          borderBottom: position === 'top' ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        {/* Google AdSense Banner Ad */}
        <div ref={adRef} className="w-full max-w-md overflow-hidden">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', minHeight: 50 }}
            data-ad-client={AD_CONFIG.publisherId}
            data-ad-slot={AD_CONFIG.banner.id}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
