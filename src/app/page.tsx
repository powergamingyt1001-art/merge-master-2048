'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/game/LoadingScreen'
import { PlayDashboard } from '@/components/game/PlayDashboard'
import { GameBoard } from '@/components/game/GameBoard'

type GamePhase = 'loading' | 'dashboard' | 'game'

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>('loading')

  const handleLoadingComplete = useCallback(() => {
    setPhase('dashboard')
  }, [])

  const handlePlayOffline = useCallback(() => {
    setPhase('game')
  }, [])

  return (
    <main className="min-h-screen">
      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <LoadingScreen key="loading" onFinish={handleLoadingComplete} />
        )}
        {phase === 'dashboard' && (
          <PlayDashboard key="dashboard" onPlayOffline={handlePlayOffline} />
        )}
        {phase === 'game' && (
          <GameBoard key="game" />
        )}
      </AnimatePresence>
    </main>
  )
}
