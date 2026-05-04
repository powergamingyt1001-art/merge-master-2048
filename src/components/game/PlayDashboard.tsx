'use client'

import { motion } from 'framer-motion'
import { Wifi, WifiOff, Lock, Sparkles, Crown } from 'lucide-react'

interface PlayDashboardProps {
  onPlayOffline: () => void
}

export function PlayDashboard({ onPlayOffline }: PlayDashboardProps) {
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Neon glow background */}
      <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #EDC22E, transparent)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #FF7A00, transparent)', filter: 'blur(70px)' }} />

      {/* Floating tiles */}
      <FloatingTilesBG />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Crown */}
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="mb-3"
        >
          <Crown className="w-10 h-10" style={{ color: '#FFD700', filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.6))' }} />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-2"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5)' }}>MERGE</span>{' '}
            <span style={{ color: '#FFFFFF', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>MASTER</span>
          </h1>
          <div
            className="mt-1 px-4 py-1 rounded-full inline-block"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <span className="text-xs font-bold tracking-widest" style={{ color: '#EDC22E' }}>
              — 2048 CHALLENGE —
            </span>
          </div>
        </motion.div>

        {/* Logo Image */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
          className="my-6"
        >
          <img
            src="/loading.png"
            alt="Merge Master 2048"
            className="w-56 sm:w-64 rounded-2xl"
            style={{ filter: 'drop-shadow(0 0 25px rgba(237,194,46,0.4))' }}
          />
        </motion.div>

        {/* Mode Selection */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full space-y-3 mb-6"
        >
          {/* Offline Mode */}
          <button
            onClick={onPlayOffline}
            className="w-full py-4 px-6 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #EDC22E 0%, #FF7A00 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(237,194,46,0.4), 0 0 40px rgba(237,194,46,0.15)',
              textShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <WifiOff className="w-5 h-5" />
            PLAY OFFLINE
            <Sparkles className="w-4 h-4 ml-1" />
          </button>

          {/* Online Mode - Coming Soon */}
          <button
            className="w-full py-4 px-6 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 cursor-not-allowed relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.35)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            disabled
          >
            <Wifi className="w-5 h-5" />
            PLAY ONLINE
            <Lock className="w-4 h-4 ml-1" />
            <div
              className="absolute top-2 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
              style={{ backgroundColor: 'rgba(255,122,0,0.3)', color: '#FF7A00' }}
            >
              COMING SOON
            </div>
          </button>
        </motion.div>

        {/* Info text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-[10px] text-center leading-relaxed px-4"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Swipe tiles to merge same numbers. Reach 2048 to win!<br />
          Use power-ups wisely — Hammer, Magnet & Blast!
        </motion.p>
      </div>
    </motion.div>
  )
}

function FloatingTilesBG() {
  const tiles = [
    { v: 2, x: '8%', y: '12%' }, { v: 4, x: '85%', y: '18%' },
    { v: 8, x: '75%', y: '72%' }, { v: 16, x: '15%', y: '78%' },
    { v: 32, x: '45%', y: '8%' }, { v: 64, x: '88%', y: '55%' },
  ]
  const colors: Record<number, string> = {
    2: '#EEE4DA', 4: '#EDE0C8', 8: '#F2B179', 16: '#F59563',
    32: '#F67C5F', 64: '#F65E3B',
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {tiles.map((tile, i) => (
        <motion.div
          key={i}
          className="absolute rounded-lg flex items-center justify-center font-bold"
          style={{
            width: 32, height: 32,
            backgroundColor: colors[tile.v],
            color: tile.v <= 4 ? '#776E65' : '#FFF',
            fontSize: 12,
            left: tile.x, top: tile.y,
          }}
          animate={{ y: [0, -8, 0], opacity: [0.25, 0.35, 0.25] }}
          transition={{ delay: i * 0.4, duration: 3, repeat: Infinity }}
        >
          {tile.v}
        </motion.div>
      ))}
    </div>
  )
}
