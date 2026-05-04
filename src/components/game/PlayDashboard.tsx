'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wifi, WifiOff, Lock, Play, Swords, Clock, Trophy } from 'lucide-react'

interface PlayDashboardProps {
  onPlayOffline: () => void
  onOpenStreak: () => void
  onOpenSpin: () => void
  spinTickets: number
  streakDay: number
}

export function PlayDashboard({ onPlayOffline, onOpenStreak, onOpenSpin, spinTickets, streakDay }: PlayDashboardProps) {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)' }}
    >
      {/* Neon glow */}
      <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #EDC22E, transparent)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #FF7A00, transparent)', filter: 'blur(70px)' }} />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Title */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-4"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            <span style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5)' }}>MERGE</span>{' '}
            <span style={{ color: '#FFFFFF' }}>MASTER</span>
          </h1>
          <div className="mt-1 px-3 py-0.5 rounded-full inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#EDC22E' }}>
              — 2048 CHALLENGE —
            </span>
          </div>
        </motion.div>

        {/* Central PLAY Button */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="my-6"
        >
          <button
            onClick={onPlayOffline}
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #EDC22E 0%, #FF7A00 100%)',
              boxShadow: '0 6px 30px rgba(237,194,46,0.5), 0 0 60px rgba(237,194,46,0.2), inset 0 -4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <Play className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: '#FFFFFF', marginLeft: 4 }} fill="white" />
            <span className="text-base sm:text-lg font-extrabold" style={{ color: '#FFFFFF', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              PLAY
            </span>
            <span className="text-[8px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.8)' }}>
              OFFLINE
            </span>
          </button>
        </motion.div>

        {/* Online Play - Coming Soon */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full mb-4"
        >
          <button
            className="w-full py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed relative"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            disabled
          >
            <Wifi className="w-4 h-4" />
            PLAY ONLINE
            <Lock className="w-3.5 h-3.5" />
            <div className="absolute top-1.5 right-3 px-2 py-0.5 rounded-full text-[8px] font-bold" style={{ backgroundColor: 'rgba(255,122,0,0.2)', color: '#FF7A00' }}>
              COMING SOON
            </div>
          </button>
        </motion.div>

        {/* Battle Mods - Coming Soon */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full mb-4"
        >
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4" style={{ color: '#F65E3B' }} />
                <span className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Battle Mode</span>
              </div>
              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,122,0,0.2)', color: '#FF7A00' }}>
                COMING SOON
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { time: '2 min', icon: <Clock className="w-3 h-3" /> },
                { time: '5 min', icon: <Clock className="w-3 h-3" /> },
                { time: '10 min', icon: <Clock className="w-3 h-3" /> },
                { time: '6 hrs', icon: <Trophy className="w-3 h-3" /> },
              ].map((mode, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1 py-2 rounded-lg opacity-40"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div style={{ color: 'rgba(255,255,255,0.5)' }}>{mode.icon}</div>
                  <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{mode.time}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] mt-2 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
              1v1 Battle — Highest score wins! Earn hearts & rewards.
            </p>
          </div>
        </motion.div>

        {/* Quick Actions: Streak & Spin */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full grid grid-cols-2 gap-2"
        >
          <button
            onClick={onOpenStreak}
            className="flex items-center gap-2 p-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1px solid rgba(237,194,46,0.2)' }}
          >
            <span className="text-lg">📅</span>
            <div className="text-left">
              <p className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Login Streak</p>
              <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Day {streakDay + 1} of 7</p>
            </div>
          </button>

          <button
            onClick={onOpenSpin}
            className="flex items-center gap-2 p-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}
          >
            <span className="text-lg">🎰</span>
            <div className="text-left">
              <p className="text-[10px] font-bold" style={{ color: '#00E676' }}>Spin & Win</p>
              <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{spinTickets} tickets</p>
            </div>
          </button>
        </motion.div>

        {/* Internet status */}
        <div className="mt-3 flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="w-3 h-3" style={{ color: '#00E676' }} />
          ) : (
            <WifiOff className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
          )}
          <span className="text-[9px]" style={{ color: isOnline ? 'rgba(0,230,118,0.6)' : 'rgba(255,255,255,0.25)' }}>
            {isOnline ? 'Online — Ads available' : 'Offline — No ads'}
          </span>
        </div>
      </div>
    </div>
  )
}
