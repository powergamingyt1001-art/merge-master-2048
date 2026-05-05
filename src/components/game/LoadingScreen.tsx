'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown } from 'lucide-react'

interface LoadingScreenProps {
  onFinish: () => void
}

export function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const [count, setCount] = useState(5)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // 5 second countdown
    const totalDuration = 5000
    const interval = 50
    const steps = totalDuration / interval
    let current = 0

    const timer = setInterval(() => {
      current++
      const pct = Math.min(100, Math.round((current / steps) * 100))
      setProgress(pct)

      // Calculate remaining seconds
      const remainingSeconds = Math.ceil((steps - current) * interval / 1000)
      setCount(Math.max(0, remainingSeconds))

      if (current >= steps) {
        clearInterval(timer)
        setTimeout(onFinish, 300)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [onFinish])

  const isCritical = count <= 3 && count > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden"
      style={{ touchAction: 'none' }}>
      {/* Full screen background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)' }} />

      {/* Animated background circles */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(237,194,46,0.3), transparent)', filter: 'blur(60px)' }}
        />
      </div>
      <div className="absolute bottom-1/3 left-1/3">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ repeat: Infinity, duration: 4, delay: 1 }}
          className="w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,122,0,0.3), transparent)', filter: 'blur(50px)' }}
        />
      </div>

      {/* Main content centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex flex-col items-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
              boxShadow: '0 8px 40px rgba(237,194,46,0.4), 0 0 80px rgba(237,194,46,0.2)',
            }}>
            <Crown className="w-10 h-10" style={{ color: '#FFFFFF' }} />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span style={{ color: '#FFD700', textShadow: '0 0 30px rgba(255,215,0,0.5)' }}>MERGE</span>{' '}
            <span style={{ color: '#FFFFFF' }}>MASTER</span>
          </h1>
          <div className="mt-1 px-3 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#EDC22E' }}>2048 CHALLENGE</span>
          </div>
        </motion.div>

        {/* Countdown Number */}
        <motion.div
          key={count}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{
            scale: isCritical ? [1, 1.3, 1] : 1,
            opacity: 1,
          }}
          transition={isCritical ? {
            scale: { repeat: Infinity, duration: 0.5 },
            opacity: { duration: 0.2 },
          } : { duration: 0.3 }}
          className="mb-6"
        >
          <span
            className="text-7xl sm:text-8xl font-extrabold"
            style={{
              color: isCritical ? '#F65E3B' : '#EDC22E',
              textShadow: isCritical
                ? '0 0 40px rgba(246,94,59,0.6), 0 0 80px rgba(246,94,59,0.3)'
                : '0 0 30px rgba(237,194,46,0.4)',
            }}
          >
            {count}
          </span>
        </motion.div>

        {/* Heartbeat indicator for last 3 seconds */}
        <AnimatePresence>
          {isCritical && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="flex items-center gap-2 mb-4"
            >
              <span className="text-2xl">💓</span>
              <span className="text-xs font-bold" style={{ color: '#F65E3B' }}>GET READY!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className="w-56 sm:w-64">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: isCritical
                  ? 'linear-gradient(90deg, #F65E3B, #FF7A00)'
                  : 'linear-gradient(90deg, #EDC22E, #FF7A00)',
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
          <p className="text-center mt-2 text-[10px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {progress < 100 ? 'LOADING...' : 'READY!'}
          </p>
        </div>
      </div>
    </div>
  )
}
