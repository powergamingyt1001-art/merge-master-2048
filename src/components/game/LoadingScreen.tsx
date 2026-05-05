'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface LoadingScreenProps {
  onFinish: () => void
}

export function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const [count, setCount] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const duration = 3000 // 3 seconds total
    const interval = 30 // Update every 30ms
    const steps = duration / interval
    let current = 0

    const timer = setInterval(() => {
      current++
      const pct = Math.min(100, Math.round((current / steps) * 100))
      setProgress(pct)
      setCount(pct)

      if (current >= steps) {
        clearInterval(timer)
        setTimeout(onFinish, 300)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [onFinish])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden">
      {/* Full screen background image */}
      <img
        src="/loading.png"
        alt="Merge Master 2048 Challenge"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay at bottom for loading bar visibility */}
      <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }} />

      {/* Loading content at the bottom */}
      <div className="relative z-10 w-4/5 max-w-xs mb-14">
        {/* Count number */}
        <div className="text-center mb-2">
          <motion.span
            className="text-4xl font-extrabold"
            style={{ color: '#EDC22E', textShadow: '0 0 20px rgba(237,194,46,0.5)' }}
            key={Math.floor(count / 10)}
            initial={{ scale: 1.2, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.1 }}
          >
            {count}%
          </motion.span>
        </div>

        {/* Loading bar */}
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #EDC22E, #FF7A00)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
        <p className="text-center mt-2 text-[10px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>
          LOADING...
        </p>
      </div>
    </div>
  )
}
