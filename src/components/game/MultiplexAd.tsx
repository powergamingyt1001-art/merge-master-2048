'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { AD_CONFIG, pushAd } from '@/lib/admob'

interface MultiplexAdProps {
  isOnline: boolean
}

export function MultiplexAd({ isOnline }: MultiplexAdProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const adPushed = useRef(false)

  useEffect(() => {
    if (!isOnline) return
    // Push ad once after mount
    if (!adPushed.current) {
      adPushed.current = true
      const timer = setTimeout(() => pushAd(), 500)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  // Don't show ad when offline
  if (!isOnline) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="w-full rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div ref={adRef} className="w-full px-1 py-1">
        {/* Google AdSense Multiplex/Autorelaxed Ad */}
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-format="autorelaxed"
          data-ad-client={AD_CONFIG.publisherId}
          data-ad-slot={AD_CONFIG.multiplex.id}
        />
      </div>
    </motion.div>
  )
}
