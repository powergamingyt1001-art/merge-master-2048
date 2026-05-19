'use client'

import { createContext, useContext, ReactNode } from 'react'

// This context shares the game state between page.tsx and GameBoard.tsx
// Without this, GameBoard creates its own useGame() instance with DEFAULT values
// (gameMode='classic', battleTimer=0) instead of the actual game state set by dashboard

// Use a loose type to avoid strict signature mismatches
const GameContext = createContext<unknown>(null)

export function GameProvider({ children, game }: { children: ReactNode; game: unknown }) {
  return (
    <GameContext.Provider value={game}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext() {
  const game = useContext(GameContext)
  if (!game) {
    throw new Error('useGameContext must be used within a GameProvider')
  }
  return game as ReturnType<typeof import('@/hooks/useGame').useGame>
}
