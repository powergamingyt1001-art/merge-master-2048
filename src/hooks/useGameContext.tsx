'use client'

import { createContext, useContext } from 'react'
import { useGame } from '@/hooks/useGame'

const GameContext = createContext<ReturnType<typeof useGame> | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const game = useGame()
  return (
    <GameContext.Provider value={game}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider')
  }
  return context
}
