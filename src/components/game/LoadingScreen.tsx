'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ touchAction: 'none' }}>
      {/* Background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)' }} />

      {/* Animated background circles */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(237,194,46,0.3), transparent)', filter: 'blur(60px)' }}
        />
      </div>
      <div className="absolute bottom-1/3 left-1/3">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ repeat: Infinity, duration: 4, delay: 1 }}
          className="w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,122,0,0.3), transparent)', filter: 'blur(50px)' }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with flash animation */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex flex-col items-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0], boxShadow: ['0 8px 40px rgba(237,194,46,0.4), 0 0 80px rgba(237,194,46,0.2)', '0 8px 60px rgba(237,194,46,0.6), 0 0 120px rgba(237,194,46,0.4)', '0 8px 40px rgba(237,194,46,0.4), 0 0 80px rgba(237,194,46,0.2)'] }}
            transition={{ rotate: { repeat: Infinity, duration: 4, ease: 'easeInOut' }, boxShadow: { repeat: Infinity, duration: 2 } }}
            className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
            }}>
            <Crown className="w-12 h-12" style={{ color: '#FFFFFF' }} />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span style={{ color: '#FFD700', textShadow: '0 0 30px rgba(255,215,0,0.5)' }}>MERGE</span>{' '}
            <span style={{ color: '#FFFFFF' }}>MASTER</span>
          </h1>
          <div className="mt-1 px-3 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#EDC22E' }}>2048 CHALLENGE</span>
          </div>
        </motion.div>

        {/* Flash pulse rings */}
        <div className="relative flex items-center justify-center mb-6">
          <motion.div
            animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute w-16 h-16 rounded-full"
            style={{ border: '2px solid rgba(237,194,46,0.3)' }}
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            className="absolute w-20 h-20 rounded-full"
            style={{ border: '2px solid rgba(255,122,0,0.2)' }}
          />
        </div>

        {/* Progress bar */}
        <div className="w-56 sm:w-64">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #EDC22E, #FF7A00)' }}
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
