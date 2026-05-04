'use client'

import { GameBoard } from '@/components/game/GameBoard'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#faf8ef' }}>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8">
        <GameBoard />
      </main>
      <footer className="py-3 text-center border-t" style={{ borderColor: '#e8e0d4' }}>
        <p className="text-[10px] sm:text-xs" style={{ color: '#776e65' }}>
          Made with ❤️ — 2048 Game
        </p>
      </footer>
    </div>
  )
}
