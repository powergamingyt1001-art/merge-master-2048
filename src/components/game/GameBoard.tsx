'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, Direction } from '@/hooks/useGame'
import { TileComponent } from './Tile'
import { Button } from '@/components/ui/button'
import { Trophy, RotateCcw, Undo2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'

function useResponsiveSize() {
  const [sizes, setSizes] = useState({ cellSize: 72, gap: 8 })

  useEffect(() => {
    function calc() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const maxBoard = Math.min(vw - 32, vh - 280, 420)
      const gap = maxBoard > 300 ? 8 : 6
      const cellSize = Math.floor((maxBoard - gap * 5) / 4)
      setSizes({ cellSize, gap })
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  return sizes
}

export function GameBoard() {
  const { tiles, score, bestScore, gameOver, won, keepPlaying, canUndo, handleMove, newGame, continueGame, undo } = useGame()
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const { cellSize, gap } = useResponsiveSize()
  const boardSize = 4 * (cellSize + gap) + gap
  const prevScore = useRef(score)
  const [scoreGain, setScoreGain] = useState(0)

  useEffect(() => {
    if (score > prevScore.current) {
      setScoreGain(score - prevScore.current)
      const timer = setTimeout(() => setScoreGain(0), 600)
      prevScore.current = score
      return () => clearTimeout(timer)
    }
    prevScore.current = score
  }, [score])

  const onMove = useCallback((dir: Direction) => {
    handleMove(dir)
  }, [handleMove])

  // Keyboard controls
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right',
    }
    const dir = keyMap[e.key]
    if (dir) {
      e.preventDefault()
      onMove(dir)
    }
  }, [onMove])

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (Math.max(absDx, absDy) < 30) return

    if (absDx > absDy) {
      onMove(dx > 0 ? 'right' : 'left')
    } else {
      onMove(dy > 0 ? 'down' : 'up')
    }
    touchStart.current = null
  }, [onMove])

  return (
    <div
      className="flex flex-col items-center gap-3 sm:gap-4 select-none outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="2048 Game"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: boardSize }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#edc22e' }}>
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#f9f6f2' }} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: '#776e65' }}>2048</h1>
          </div>
        </div>
        <div className="flex gap-2 relative">
          <ScoreCard label="SCORE" value={score} />
          <ScoreCard label="BEST" value={bestScore} />
          {/* Score gain popup */}
          <AnimatePresence>
            {scoreGain > 0 && (
              <motion.div
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -30 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute -top-2 left-0 right-0 flex justify-center pointer-events-none"
                style={{ zIndex: 50 }}
              >
                <span className="text-sm font-bold" style={{ color: '#776e65' }}>+{scoreGain}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 w-full items-center" style={{ maxWidth: boardSize }}>
        <Button onClick={newGame} variant="secondary" size="sm" className="gap-1.5 font-semibold text-xs sm:text-sm" style={{ backgroundColor: '#8f7a66', color: '#f9f6f2' }}>
          <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          New Game
        </Button>
        <Button
          onClick={undo}
          variant="secondary"
          size="sm"
          className="gap-1.5 font-semibold text-xs sm:text-sm"
          style={{
            backgroundColor: canUndo ? '#8f7a66' : '#cdc1b4',
            color: '#f9f6f2',
            opacity: canUndo ? 1 : 0.5,
          }}
          disabled={!canUndo}
        >
          <Undo2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Undo
        </Button>
        <div className="flex-1" />
        <p className="text-[10px] text-muted-foreground hidden sm:block">
          Arrow keys / WASD to play
        </p>
        {/* Mobile direction buttons */}
        <div className="flex gap-1 sm:hidden">
          <DirectionButton dir="up" onMove={onMove} icon={<ArrowUp className="w-3.5 h-3.5" />} />
          <DirectionButton dir="down" onMove={onMove} icon={<ArrowDown className="w-3.5 h-3.5" />} />
          <DirectionButton dir="left" onMove={onMove} icon={<ArrowLeft className="w-3.5 h-3.5" />} />
          <DirectionButton dir="right" onMove={onMove} icon={<ArrowRight className="w-3.5 h-3.5" />} />
        </div>
      </div>

      {/* Game Board */}
      <motion.div
        className="relative rounded-xl overflow-hidden shadow-lg"
        style={{
          width: boardSize,
          height: boardSize,
          backgroundColor: '#bbada0',
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Background Grid */}
        {Array.from({ length: 16 }).map((_, i) => {
          const row = Math.floor(i / 4)
          const col = i % 4
          return (
            <div
              key={`bg-${i}`}
              className="absolute rounded-md"
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: 'rgba(238, 228, 218, 0.35)',
                left: col * (cellSize + gap) + gap,
                top: row * (cellSize + gap) + gap,
              }}
            />
          )
        })}

        {/* Tiles */}
        <AnimatePresence>
          {tiles.map((tile) => (
            <TileComponent
              key={tile.id}
              id={tile.id}
              value={tile.value}
              row={tile.row}
              col={tile.col}
              isNew={tile.isNew}
              isMerged={tile.isMerged}
              cellSize={cellSize}
              gap={gap}
            />
          ))}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(238, 228, 218, 0.73)', zIndex: 100 }}
            >
              <motion.p
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="text-2xl sm:text-4xl font-extrabold mb-4"
                style={{ color: '#776e65' }}
              >
                Game Over!
              </motion.p>
              <p className="text-sm mb-4" style={{ color: '#776e65' }}>Final Score: {score}</p>
              <Button onClick={newGame} className="gap-2 font-bold text-sm sm:text-base" style={{ backgroundColor: '#8f7a66', color: '#f9f6f2' }}>
                <RotateCcw className="w-4 h-4" />
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win Overlay */}
        <AnimatePresence>
          {won && !keepPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(237, 194, 46, 0.5)', zIndex: 100 }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              >
                <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mb-3" style={{ color: '#f9f6f2' }} />
              </motion.div>
              <motion.p
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="text-3xl sm:text-4xl font-extrabold mb-4"
                style={{ color: '#f9f6f2' }}
              >
                You Win!
              </motion.p>
              <div className="flex gap-3">
                <Button onClick={continueGame} variant="secondary" className="font-bold text-xs sm:text-sm" style={{ backgroundColor: '#8f7a66', color: '#f9f6f2' }}>
                  Keep Going
                </Button>
                <Button onClick={newGame} className="gap-2 font-bold text-xs sm:text-sm" style={{ backgroundColor: '#8f7a66', color: '#f9f6f2' }}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  New Game
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* How to play */}
      <div className="text-center mt-1 px-4" style={{ maxWidth: boardSize }}>
        <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">How to play:</strong> Use arrow keys, WASD, or swipe to move tiles.
          When two tiles with the same number touch, they merge into one!
        </p>
      </div>
    </div>
  )
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 min-w-[60px] sm:min-w-[72px]"
      style={{ backgroundColor: '#bbada0' }}
    >
      <span className="text-[9px] sm:text-[10px] font-bold tracking-widest" style={{ color: '#eee4da' }}>{label}</span>
      <motion.span
        key={value}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.15 }}
        className="text-base sm:text-lg font-extrabold"
        style={{ color: '#f9f6f2' }}
      >
        {value}
      </motion.span>
    </div>
  )
}

function DirectionButton({ dir, onMove, icon }: { dir: Direction; onMove: (d: Direction) => void; icon: React.ReactNode }) {
  return (
    <Button
      onClick={() => onMove(dir)}
      variant="secondary"
      size="icon"
      className="w-8 h-8"
      style={{ backgroundColor: '#bbada0', color: '#f9f6f2' }}
    >
      {icon}
    </Button>
  )
}
