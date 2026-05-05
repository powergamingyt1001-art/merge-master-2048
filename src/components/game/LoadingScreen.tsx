'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface LoadingScreenProps {
  onFinish: () => void
}

export function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const totalDuration = 3000
    const interval = 50
    const steps = totalDuration / interval
    let current = 0

    const timer = setInterval(() => {
      current++
      const pct = Math.min(100, Math.round((current / steps) * 100))
      setProgress(pct)

      if (current >= steps) {
        clearInterval(timer)
        setTimeout(onFinish, 200)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [onFinish])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden"
      style={{ touchAction: 'none' }}>

      {/* Full-screen intro image */}
      <div className="absolute inset-0">
        <img
          src="/intro-bg.png"
          alt="Merge Master 2048 Challenge"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center' }}
        />
        {/* Slight dark overlay at bottom for loading bar visibility */}
        <div className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }} />
      </div>

      {/* Loading bar - at the bottom */}
      <div className="relative z-10 w-full px-8 pb-8">
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #EDC22E, #FF7A00)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
        <p className="text-center mt-2 text-[10px] font-bold tracking-wider"
          style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          {progress < 100 ? 'LOADING...' : 'READY!'}
        </p>
      </div>
    </div>
  )
}
