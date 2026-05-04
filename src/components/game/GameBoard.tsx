'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, Direction, PowerUp, RewardType } from '@/hooks/useGame'
import { TileComponent } from './Tile'
import { RewardedAd } from './RewardedAd'
import { BannerAd } from './BannerAd'
import { Button } from '@/components/ui/button'
import {
  Trophy, RotateCcw, Undo2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Heart, Hammer, Magnet, Bomb, Sparkles, Crown, Zap, Star,
} from 'lucide-react'

function useResponsiveSize() {
  const [sizes, setSizes] = useState({ cellSize: 72, gap: 8 })

  useEffect(() => {
    function calc() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const maxBoard = Math.min(vw - 32, vh - 360, 400)
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
  const game = useGame()
  const {
    tiles, score, bestScore, gameOver, won, keepPlaying, canUndo,
    lives, maxLives, hammerCount, magnetCount, blastCount, activePowerUp,
    handleMove, newGame, continueGame, undo, useBlast, activatePowerUp,
    handleTileClick, reviveWithAd, earnPowerUp,
  } = game

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const { cellSize, gap } = useResponsiveSize()
  const boardSize = 4 * (cellSize + gap) + gap
  const prevScore = useRef(score)
  const [scoreGain, setScoreGain] = useState(0)
  const [showRewardAd, setShowRewardAd] = useState(false)
  const [rewardType, setRewardType] = useState<RewardType>('life')
  const [showGameOverModal, setShowGameOverModal] = useState(false)

  // Track score gain
  useEffect(() => {
    if (score > prevScore.current) {
      setScoreGain(score - prevScore.current)
      const timer = setTimeout(() => setScoreGain(0), 600)
      prevScore.current = score
      return () => clearTimeout(timer)
    }
    prevScore.current = score
  }, [score])

  // Show game over modal
  useEffect(() => {
    if (gameOver) {
      setShowGameOverModal(true)
    }
  }, [gameOver])

  const onMove = useCallback((dir: Direction) => {
    handleMove(dir)
  }, [handleMove])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
    }
    const dir = keyMap[e.key]
    if (dir) {
      e.preventDefault()
      onMove(dir)
    }
  }, [onMove])

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

  const handlePowerUp = useCallback((pu: PowerUp) => {
    if (pu === 'blast') {
      useBlast()
    } else {
      activatePowerUp(pu)
    }
  }, [useBlast, activatePowerUp])

  const handleTileClickFn = useCallback((row: number, col: number) => {
    handleTileClick(row, col)
  }, [handleTileClick])

  const openRewardAd = useCallback((type: RewardType) => {
    setRewardType(type)
    setShowRewardAd(true)
  }, [])

  const handleReward = useCallback((type: RewardType) => {
    if (type === 'life') {
      reviveWithAd()
    } else {
      earnPowerUp(type as PowerUp)
    }
  }, [reviveWithAd, earnPowerUp])

  // Highlight tiles for magnet (same value as selected)
  const magnetHighlightValue = activePowerUp === 'magnet' ? null : null // Would need selected tile

  return (
    <div
      className="flex flex-col items-center gap-2 sm:gap-3 select-none outline-none min-h-screen"
      style={{ background: 'linear-gradient(180deg, #1a0533 0%, #0d1b3e 100%)' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Merge Master 2048 Challenge"
    >
      {/* Top Banner Ad */}
      <BannerAd position="top" />

      {/* Header */}
      <div className="flex items-center justify-between w-full px-2 pt-2" style={{ maxWidth: boardSize }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)' }}>
            <Crown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#FFFFFF' }} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">
              <span style={{ color: '#FFD700' }}>MERGE</span>{' '}
              <span style={{ color: '#FFFFFF' }}>MASTER</span>
            </h1>
            <p className="text-[8px] sm:text-[9px] tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>2048 CHALLENGE</p>
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2 relative">
          <ScoreCard label="SCORE" value={score} />
          <ScoreCard label="BEST" value={bestScore} />
          {/* Score gain popup */}
          <AnimatePresence>
            {scoreGain > 0 && (
              <motion.div
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -25 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute -top-1 left-0 right-0 flex justify-center pointer-events-none"
                style={{ zIndex: 50 }}
              >
                <span className="text-xs font-bold" style={{ color: '#EDC22E' }}>+{scoreGain}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lives Row */}
      <div className="flex items-center gap-2 w-full px-2" style={{ maxWidth: boardSize }}>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxLives }).map((_, i) => (
            <motion.div
              key={i}
              animate={i < lives ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart
                className="w-4 h-4 sm:w-5 sm:h-5"
                style={{
                  color: i < lives ? '#F65E3B' : 'rgba(255,255,255,0.15)',
                  fill: i < lives ? '#F65E3B' : 'none',
                  filter: i < lives ? 'drop-shadow(0 0 4px rgba(246,94,59,0.5))' : 'none',
                }}
              />
            </motion.div>
          ))}
        </div>
        <div className="flex-1" />
        {/* Power-ups */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <PowerUpButton
            icon={<Hammer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            count={hammerCount}
            active={activePowerUp === 'hammer'}
            onClick={() => handlePowerUp('hammer')}
            color="#F59563"
            label="Hammer"
          />
          <PowerUpButton
            icon={<Magnet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            count={magnetCount}
            active={activePowerUp === 'magnet'}
            onClick={() => handlePowerUp('magnet')}
            color="#00E676"
            label="Magnet"
          />
          <PowerUpButton
            icon={<Bomb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            count={blastCount}
            active={false}
            onClick={() => handlePowerUp('blast')}
            color="#FF7A00"
            label="Blast"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1.5 sm:gap-2 w-full px-2" style={{ maxWidth: boardSize }}>
        <Button onClick={newGame} size="sm" className="gap-1 font-semibold text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.15)' }}>
          <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          New
        </Button>
        <Button
          onClick={undo}
          size="sm"
          className="gap-1 font-semibold text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8"
          style={{
            backgroundColor: canUndo ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            color: canUndo ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
          disabled={!canUndo}
        >
          <Undo2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          Undo
        </Button>
        <div className="flex-1" />
        <p className="text-[9px] hidden sm:block self-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Arrow keys / WASD
        </p>
        {/* Mobile direction buttons */}
        <div className="flex gap-1 sm:hidden">
          <DirectionButton dir="up" onMove={onMove} icon={<ArrowUp className="w-3 h-3" />} />
          <DirectionButton dir="down" onMove={onMove} icon={<ArrowDown className="w-3 h-3" />} />
          <DirectionButton dir="left" onMove={onMove} icon={<ArrowLeft className="w-3 h-3" />} />
          <DirectionButton dir="right" onMove={onMove} icon={<ArrowRight className="w-3 h-3" />} />
        </div>
      </div>

      {/* Active Power-up indicator */}
      <AnimatePresence>
        {activePowerUp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5"
            style={{
              backgroundColor: activePowerUp === 'hammer' ? 'rgba(245,149,99,0.2)' : 'rgba(0,230,118,0.2)',
              color: activePowerUp === 'hammer' ? '#F59563' : '#00E676',
              border: `1px solid ${activePowerUp === 'hammer' ? 'rgba(245,149,99,0.3)' : 'rgba(0,230,118,0.3)'}`,
            }}
          >
            <Zap className="w-3 h-3" />
            {activePowerUp === 'hammer' ? 'Tap a tile to destroy it' : 'Tap a tile to merge with same value'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Board */}
      <motion.div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: boardSize,
          height: boardSize,
          backgroundColor: '#2d1b4e',
          touchAction: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(237,194,46,0.1)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Grid */}
        {Array.from({ length: 16 }).map((_, i) => {
          const row = Math.floor(i / 4)
          const col = i % 4
          return (
            <div
              key={`bg-${i}`}
              className="absolute rounded-lg"
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: 'rgba(255,255,255,0.06)',
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
              flash={tile.flash}
              cellSize={cellSize}
              gap={gap}
              onClick={() => handleTileClickFn(tile.row, tile.col)}
            />
          ))}
        </AnimatePresence>

        {/* Win Overlay */}
        <AnimatePresence>
          {won && !keepPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(237,194,46,0.5)', zIndex: 100 }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              >
                <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mb-2" style={{ color: '#FFFFFF', filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.5))' }} />
              </motion.div>
              <motion.p
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="text-2xl sm:text-4xl font-extrabold mb-2"
                style={{ color: '#FFFFFF', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
              >
                You Win! 🎉
              </motion.p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>Score: {score}</p>
              <div className="flex gap-3">
                <button
                  onClick={continueGame}
                  className="px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                  Keep Going
                </button>
                <button
                  onClick={newGame}
                  className="px-4 py-2 rounded-lg font-bold text-xs sm:text-sm gap-1.5 flex items-center transition-transform hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  New Game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {showGameOverModal && gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8 }}
              className="w-full max-w-xs rounded-2xl p-6 text-center"
              style={{
                background: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Star className="w-12 h-12 mx-auto mb-3" style={{ color: '#FFD700', filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.5))' }} />
              </motion.div>
              <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#FFFFFF' }}>Game Over!</h2>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Final Score: {score}</p>

              {/* Lives remaining */}
              <div className="flex items-center justify-center gap-1 mb-4">
                {Array.from({ length: maxLives }).map((_, i) => (
                  <Heart
                    key={i}
                    className="w-5 h-5"
                    style={{
                      color: i < lives ? '#F65E3B' : 'rgba(255,255,255,0.15)',
                      fill: i < lives ? '#F65E3B' : 'none',
                    }}
                  />
                ))}
              </div>

              <div className="space-y-2">
                {lives > 0 ? (
                  <button
                    onClick={() => { setShowGameOverModal(false); newGame(); }}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-transform hover:scale-[1.02] active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}
                  >
                    <RotateCcw className="w-4 h-4 inline mr-2" />
                    Try Again
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { setShowGameOverModal(false); openRewardAd('life'); }}
                      className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #F65E3B, #F67C5F)', color: '#FFFFFF' }}
                    >
                      <Heart className="w-4 h-4" />
                      Watch Ad for Extra Life
                    </button>
                    <button
                      onClick={() => { setShowGameOverModal(false); newGame(); }}
                      className="w-full py-2.5 rounded-xl font-semibold text-xs transition-transform hover:scale-[1.02] active:scale-95"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Start New Game
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Earn Power-ups row */}
      <div className="flex items-center gap-2 w-full px-2 mt-1" style={{ maxWidth: boardSize }}>
        <p className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>EARN:</p>
        <EarnButton icon={<Heart className="w-3 h-3" />} label="Life" color="#F65E3B" onClick={() => openRewardAd('life')} />
        <EarnButton icon={<Hammer className="w-3 h-3" />} label="Hammer" color="#F59563" onClick={() => openRewardAd('hammer')} />
        <EarnButton icon={<Magnet className="w-3 h-3" />} label="Magnet" color="#00E676" onClick={() => openRewardAd('magnet')} />
        <EarnButton icon={<Bomb className="w-3 h-3" />} label="Blast" color="#FF7A00" onClick={() => openRewardAd('blast')} />
      </div>

      {/* How to play */}
      <div className="text-center mt-1 px-4" style={{ maxWidth: boardSize }}>
        <p className="text-[9px] sm:text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <strong style={{ color: 'rgba(255,255,255,0.5)' }}>How to play:</strong> Swipe or use arrow keys.
          Same numbers merge! Use power-ups when stuck.
        </p>
      </div>

      {/* Bottom Banner Ad */}
      <div className="mt-auto w-full">
        <BannerAd position="bottom" />
      </div>

      {/* Rewarded Ad Modal */}
      <RewardedAd
        isOpen={showRewardAd}
        onClose={() => setShowRewardAd(false)}
        onReward={handleReward}
        rewardType={rewardType}
      />
    </div>
  )
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 min-w-[52px] sm:min-w-[64px]"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <span className="text-[8px] sm:text-[9px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <motion.span
        key={value}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.15 }}
        className="text-sm sm:text-base font-extrabold"
        style={{ color: '#FFFFFF' }}
      >
        {value}
      </motion.span>
    </div>
  )
}

function PowerUpButton({
  icon, count, active, onClick, color, label,
}: {
  icon: React.ReactNode
  count: number
  active: boolean
  onClick: () => void
  color: string
  label: string
}) {
  return (
    <motion.button
      onClick={onClick}
      className="relative flex items-center justify-center rounded-lg transition-all"
      style={{
        width: 36, height: 36,
        backgroundColor: active ? `${color}25` : 'rgba(255,255,255,0.06)',
        border: active ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.08)',
        boxShadow: active ? `0 0 15px ${color}30` : 'none',
      }}
      whileTap={{ scale: 0.9 }}
      animate={active ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.8, repeat: active ? Infinity : 0 }}
    >
      <div style={{ color: count > 0 ? color : 'rgba(255,255,255,0.2)' }}>
        {icon}
      </div>
      {/* Count badge */}
      <div
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
        style={{
          backgroundColor: count > 0 ? color : 'rgba(255,255,255,0.1)',
          color: '#FFFFFF',
        }}
      >
        {count}
      </div>
    </motion.button>
  )
}

function DirectionButton({ dir, onMove, icon }: { dir: Direction; onMove: (d: Direction) => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={() => onMove(dir)}
      className="w-7 h-7 rounded flex items-center justify-center"
      style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
    >
      {icon}
    </button>
  )
}

function EarnButton({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-md transition-transform hover:scale-105 active:scale-95"
      style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
    >
      <div style={{ color }}>{icon}</div>
      <span className="text-[8px] font-semibold" style={{ color }}>{label}</span>
      <Sparkles className="w-2 h-2" style={{ color }} />
    </button>
  )
}
