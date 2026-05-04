'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface LoadingScreenProps {
  onFinish: () => void
}

export function LoadingScreen({ onFinish }: LoadingScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background floating tiles */}
      <FloatingTiles />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Crown */}
        <motion.div
          initial={{ y: -50, opacity: 0, scale: 0 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="mb-2"
        >
          <div className="text-5xl sm:text-6xl">👑</div>
        </motion.div>

        {/* Logo Image */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 150 }}
          className="mb-4 relative"
        >
          <img
            src="/loading.png"
            alt="Merge Master 2048 Challenge"
            className="w-64 sm:w-80 rounded-2xl"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(237, 194, 46, 0.5))',
            }}
          />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5)' }}>MERGE</span>{' '}
            <span style={{ color: '#FFFFFF', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>MASTER</span>
          </h1>
          <div
            className="mt-1 px-4 py-1 rounded-full inline-block"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <span className="text-xs sm:text-sm font-bold tracking-widest" style={{ color: '#EDC22E' }}>
              — 2048 CHALLENGE —
            </span>
          </div>
        </motion.div>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-48 sm:w-64 mb-6"
        >
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #EDC22E, #FF7A00)' }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ delay: 1, duration: 2, ease: 'easeInOut' }}
              onAnimationComplete={() => {
                setTimeout(onFinish, 300)
              }}
            />
          </div>
          <p className="text-center mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading...</p>
        </motion.div>

        {/* Sparkle decorations */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" style={{ color: '#EDC22E' }} />
          <p className="text-[10px] tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
            TAP TO CONTINUE
          </p>
          <Sparkles className="w-4 h-4" style={{ color: '#EDC22E' }} />
        </motion.div>
      </div>

      {/* Neon glow circles background */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #EDC22E, transparent)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #FF7A00, transparent)', filter: 'blur(50px)' }} />
    </motion.div>
  )
}

function FloatingTiles() {
  const tileData = [
    { value: 2, x: '10%', y: '15%', delay: 0, size: 40 },
    { value: 4, x: '80%', y: '20%', delay: 0.5, size: 36 },
    { value: 8, x: '70%', y: '70%', delay: 1, size: 38 },
    { value: 16, x: '20%', y: '75%', delay: 1.5, size: 34 },
    { value: 32, x: '50%', y: '10%', delay: 0.8, size: 32 },
    { value: 64, x: '85%', y: '50%', delay: 1.2, size: 30 },
    { value: 2048, x: '5%', y: '45%', delay: 0.3, size: 35 },
  ]

  const colors: Record<number, string> = {
    2: '#EEE4DA', 4: '#EDE0C8', 8: '#F2B179', 16: '#F59563',
    32: '#F67C5F', 64: '#F65E3B', 2048: '#EDC22E',
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {tileData.map((tile, i) => (
        <motion.div
          key={i}
          className="absolute rounded-lg flex items-center justify-center font-bold"
          style={{
            width: tile.size,
            height: tile.size,
            backgroundColor: colors[tile.value],
            color: tile.value <= 4 ? '#776E65' : '#FFFFFF',
            fontSize: tile.size * 0.35,
            left: tile.x,
            top: tile.y,
            boxShadow: tile.value >= 128 ? `0 0 20px ${colors[tile.value]}40` : '0 4px 12px rgba(0,0,0,0.3)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.1, 1],
            opacity: [0, 0.6, 0.4],
            y: [0, -10, 0],
          }}
          transition={{
            delay: tile.delay,
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        >
          {tile.value}
        </motion.div>
      ))}
    </div>
  )
}
