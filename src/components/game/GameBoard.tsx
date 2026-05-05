'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, Direction, PowerUp } from '@/hooks/useGame'
import { TileComponent } from './Tile'
import { RewardedAd } from './RewardedAd'
import { BannerAd } from './BannerAd'
import {
  Trophy, RotateCcw, Undo2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Heart, Hammer, Magnet, Bomb, Crown, Zap, ArrowLeftCircle, Clock, Swords, Flame,
} from 'lucide-react'

function checkCanMove(tiles: { row: number; col: number; value: number }[]): boolean {
  if (tiles.length < 16) return true
  const grid: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0))
  for (const t of tiles) grid[t.row][t.col] = t.value
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (c + 1 < 4 && grid[r][c] === grid[r][c + 1]) return true
      if (r + 1 < 4 && grid[r][c] === grid[r + 1][c]) return true
    }
  }
  return false
}

function useResponsiveSize() {
  const [sizes, setSizes] = useState({ cellSize: 80, gap: 10 })
  useEffect(() => {
    function calc() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const maxBoard = Math.min(vw - 24, vh - 340, 420)
      const gap = maxBoard > 300 ? 10 : 8
      const cellSize = Math.floor((maxBoard - gap * 5) / 4)
      setSizes({ cellSize, gap })
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return sizes
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface GameBoardProps {
  onBackToDashboard: () => void
}

export function GameBoard({ onBackToDashboard }: GameBoardProps) {
  const game = useGame()
  const {
    tiles, score, bestScore, gameOver, won, keepPlaying,
    canUndo, undoCount, undoTotal,
    lives, maxLives, hammerCount, magnetCount, blastCount, activePowerUp,
    gameMode, botOpponent, botBattleResult,
    battleTimer, battleTimeLimit, consecutiveMerges, comboBonus,
    handleMove, newGame, continueGame, undo, activatePowerUp, handleTileClick,
    reviveWithAd, restartAfterStuck, tickBattleTimer,
  } = game

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const { cellSize, gap } = useResponsiveSize()
  const boardSize = 4 * (cellSize + gap) + gap
  const prevScore = useRef(score)
  const [scoreGain, setScoreGain] = useState(0)
  const [showRewardAd, setShowRewardAd] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : false)
  const [gameOverDismissed, setGameOverDismissed] = useState(false)

  const isStuck = !checkCanMove(tiles) && lives > 0 && !gameOver
  const showGameOverModal = gameOver && lives <= 0 && !gameOverDismissed

  // Internet detection
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Battle timer
  useEffect(() => {
    if (gameMode !== 'bot' || botBattleResult || battleTimer <= 0) return
    const interval = setInterval(() => { tickBattleTimer() }, 1000)
    return () => clearInterval(interval)
  }, [gameMode, botBattleResult, battleTimer, tickBattleTimer])

  // Combo flash - simply use comboBonus > 0 as indicator (no setState needed)
  // comboBonus increases each time a combo triggers, so we just check if it changed
  const comboFlashActive = comboBonus > 0 && consecutiveMerges === 0

  // Score gain animation
  useEffect(() => {
    if (score > prevScore.current) {
      setScoreGain(score - prevScore.current)
      const timer = setTimeout(() => setScoreGain(0), 600)
      prevScore.current = score
      return () => clearTimeout(timer)
    }
    prevScore.current = score
  }, [score])

  const onMove = useCallback((dir: Direction) => { handleMove(dir) }, [handleMove])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
    }
    const dir = keyMap[e.key]
    if (dir) { e.preventDefault(); onMove(dir) }
  }, [onMove])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return
    onMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
    touchStart.current = null
  }, [onMove])

  const handlePowerUp = useCallback((pu: PowerUp) => { activatePowerUp(pu) }, [activatePowerUp])
  const handleStuckContinue = useCallback(() => { restartAfterStuck() }, [restartAfterStuck])
  const handleBack = useCallback(() => { onBackToDashboard() }, [onBackToDashboard])

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 select-none outline-none min-h-screen"
      style={{ background: 'linear-gradient(180deg, #1a0533 0%, #0d1b3e 100%)' }}
      onKeyDown={handleKeyDown} tabIndex={0} role="application" aria-label="Merge Master 2048 Challenge">

      {/* Header */}
      <div className="flex items-center justify-between w-full px-3 pt-2" style={{ maxWidth: boardSize + 20 }}>
        <button onClick={handleBack} className="flex items-center gap-1 p-1.5 rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <ArrowLeftCircle className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
        </button>
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)' }}>
            <Crown className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold leading-tight">
              <span style={{ color: '#FFD700' }}>MERGE</span> <span style={{ color: '#FFFFFF' }}>MASTER</span>
            </h1>
            <p className="text-[7px] tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>2048 CHALLENGE</p>
          </div>
        </div>
        <div className="flex gap-1.5 relative">
          <ScoreCard label="SCORE" value={score} />
          <ScoreCard label="BEST" value={bestScore} />
          <AnimatePresence>
            {scoreGain > 0 && (
              <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -20 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }} className="absolute -top-1 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 50 }}>
                <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>+{scoreGain}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bot Battle Timer Bar - only show timer, no bot name/score */}
      {gameMode === 'bot' && !botBattleResult && (
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl"
          style={{ maxWidth: boardSize, backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.2)' }}>
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4" style={{ color: '#F65E3B' }} />
            <span className="text-[10px] font-bold" style={{ color: '#FFFFFF' }}>1v1 Battle</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" style={{ color: battleTimer <= 10 ? '#F65E3B' : '#EDC22E' }} />
            <span className="text-sm font-extrabold" style={{ color: battleTimer <= 10 ? '#F65E3B' : '#FFFFFF' }}>
              {formatTimer(battleTimer)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Score:</span>
            <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>{score}</span>
          </div>
        </motion.div>
      )}

      {/* Combo indicator */}
      <AnimatePresence>
        {(consecutiveMerges >= 2 || comboFlashActive) && gameMode !== 'bot' && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="px-3 py-1 rounded-full text-[9px] font-bold flex items-center gap-1"
            style={{
              backgroundColor: comboFlashActive ? 'rgba(237,194,46,0.25)' : 'rgba(255,122,0,0.15)',
              color: comboFlashActive ? '#EDC22E' : '#FF7A00',
              border: `1px solid ${comboFlashActive ? 'rgba(237,194,46,0.3)' : 'rgba(255,122,0,0.25)'}`,
            }}>
            <Flame className="w-2.5 h-2.5" />
            {comboFlashActive ? 'COMBO! Bonus earned!' : `${consecutiveMerges}/3 merges → combo!`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lives + Power-ups row */}
      <div className="flex items-center w-full px-3" style={{ maxWidth: boardSize }}>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: maxLives }).map((_, i) => (
            <Heart key={i} className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: i < lives ? '#F65E3B' : 'rgba(255,255,255,0.12)', fill: i < lives ? '#F65E3B' : 'none', filter: i < lives ? 'drop-shadow(0 0 3px rgba(246,94,59,0.5))' : 'none' }} />
          ))}
        </div>
        <div className="w-2" />
        <div className="flex items-center gap-1.5">
          <PowerUpBtn icon={<Hammer className="w-3.5 h-3.5" />} count={hammerCount} active={activePowerUp === 'hammer'} onClick={() => handlePowerUp('hammer')} color="#F59563" />
          <PowerUpBtn icon={<Magnet className="w-3.5 h-3.5" />} count={magnetCount} active={activePowerUp === 'magnet'} onClick={() => handlePowerUp('magnet')} color="#00E676" />
          <PowerUpBtn icon={<Bomb className="w-3.5 h-3.5" />} count={blastCount} active={false} onClick={() => handlePowerUp('blast')} color="#FF7A00" />
          <PowerUpBtn icon={<Undo2 className="w-3.5 h-3.5" />} count={undoTotal - undoCount} active={false} onClick={undo} color="#8f7a66" disabled={!canUndo || undoCount >= undoTotal} />
        </div>
      </div>

      {/* Active Power-up indicator */}
      <AnimatePresence>
        {activePowerUp && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="px-3 py-1 rounded-full text-[9px] font-bold flex items-center gap-1"
            style={{
              backgroundColor: activePowerUp === 'hammer' ? 'rgba(245,149,99,0.15)' : 'rgba(0,230,118,0.15)',
              color: activePowerUp === 'hammer' ? '#F59563' : '#00E676',
              border: `1px solid ${activePowerUp === 'hammer' ? 'rgba(245,149,99,0.25)' : 'rgba(0,230,118,0.25)'}`,
            }}>
            <Zap className="w-2.5 h-2.5" />
            {activePowerUp === 'hammer' ? 'Tap tile to destroy' : 'Tap tile to merge'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Board */}
      <div className="relative rounded-xl overflow-hidden" style={{
        width: boardSize, height: boardSize, backgroundColor: '#2d1b4e', touchAction: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(237,194,46,0.08)', border: '1px solid rgba(255,255,255,0.06)',
      }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {Array.from({ length: 16 }).map((_, i) => {
          const row = Math.floor(i / 4), col = i % 4
          return <div key={`bg-${i}`} className="absolute rounded-lg" style={{
            width: cellSize, height: cellSize, backgroundColor: 'rgba(255,255,255,0.05)',
            left: col * (cellSize + gap) + gap, top: row * (cellSize + gap) + gap,
          }} />
        })}
        <AnimatePresence>
          {tiles.map(tile => (
            <TileComponent key={tile.id} id={tile.id} value={tile.value} row={tile.row} col={tile.col}
              isNew={tile.isNew} isMerged={tile.isMerged} flash={tile.flash} cellSize={cellSize} gap={gap}
              onClick={() => handleTileClick(tile.row, tile.col)} />
          ))}
        </AnimatePresence>

        {/* Stuck overlay */}
        <AnimatePresence>
          {isStuck && lives > 0 && !gameOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100 }}>
              <Heart className="w-8 h-8 mb-2" style={{ color: '#F65E3B', fill: '#F65E3B' }} />
              <p className="text-lg font-bold mb-1" style={{ color: '#FFFFFF' }}>Stuck!</p>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>-1 ❤️ • {lives - 1} lives left</p>
              <button onClick={handleStuckContinue} className="px-5 py-2 rounded-lg font-bold text-xs transition-transform hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>Continue</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win overlay */}
        <AnimatePresence>
          {won && !keepPlaying && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(237,194,46,0.5)', zIndex: 100 }}>
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}>
                <Trophy className="w-12 h-12 sm:w-14 sm:h-14 mb-2" style={{ color: '#FFFFFF', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }} />
              </motion.div>
              <p className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: '#FFFFFF' }}>You Win! 🎉</p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>Score: {score}</p>
              <div className="flex gap-3">
                <button onClick={continueGame} className="px-4 py-2 rounded-lg font-bold text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}>Keep Going</button>
                <button onClick={() => { newGame(); onBackToDashboard(); }} className="px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                  <RotateCcw className="w-3 h-3" /> Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bot Battle Result overlay - show BOTH scores */}
        <AnimatePresence>
          {gameMode === 'bot' && botBattleResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl" style={{ backgroundColor: botBattleResult === 'win' ? 'rgba(0,200,83,0.6)' : 'rgba(246,94,59,0.6)', zIndex: 100 }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                <span className="text-5xl mb-2 block">{botBattleResult === 'win' ? '🏆' : '😔'}</span>
              </motion.div>
              <p className="text-2xl font-extrabold mb-2" style={{ color: '#FFFFFF' }}>
                {botBattleResult === 'win' ? 'You Won!' : 'You Lost!'}
              </p>
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Your Score</p>
                  <p className="text-xl font-extrabold" style={{ color: '#FFFFFF' }}>{score}</p>
                </div>
                <span className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>vs</span>
                <div className="text-center">
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{botOpponent?.avatar} {botOpponent?.name}</p>
                  <p className="text-xl font-extrabold" style={{ color: '#FFFFFF' }}>{botOpponent?.finalScore}</p>
                </div>
              </div>
              <p className="text-[9px] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {botBattleResult === 'win' ? `You scored ${score - (botOpponent?.finalScore ?? 0)} more!` : `Bot scored ${(botOpponent?.finalScore ?? 0) - score} more`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => { newGame(); onBackToDashboard(); }} className="px-4 py-2 rounded-lg font-bold text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}>Dashboard</button>
                <button onClick={() => { game.startBotBattle(battleTimeLimit); }} className="px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                  Play Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile direction buttons */}
      <div className="flex gap-1 sm:hidden">
        {(['up', 'down', 'left', 'right'] as Direction[]).map(dir => (
          <button key={dir} onClick={() => onMove(dir)} className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
            {dir === 'up' ? <ArrowUp className="w-5 h-5" /> : dir === 'down' ? <ArrowDown className="w-5 h-5" /> : dir === 'left' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        ))}
      </div>
      <p className="text-[8px] sm:text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Arrow keys / WASD / Swipe to play</p>

      {/* Banner Ad - bottom, non-clickable, only when online */}
      <BannerAd position="bottom" isOnline={isOnline} />

      {/* Game Over Modal */}
      <AnimatePresence>
        {showGameOverModal && gameOver && lives <= 0 && gameMode !== 'bot' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8 }}
              className="w-full max-w-xs rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Heart className="w-12 h-12 mx-auto mb-3" style={{ color: '#F65E3B' }} />
              </motion.div>
              <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#FFFFFF' }}>Game Over!</h2>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Score: {score} • Best: {bestScore}</p>
              <div className="space-y-2">
                <button onClick={() => { setGameOverDismissed(true); setShowRewardAd(true) }}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #F65E3B, #F67C5F)', color: '#FFFFFF' }}>
                  <Heart className="w-4 h-4" /> Watch Ad & Revive
                </button>
                <button onClick={() => { setGameOverDismissed(false); newGame(); onBackToDashboard(); }}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Back to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RewardedAd isOpen={showRewardAd} onClose={() => setShowRewardAd(false)} onReward={reviveWithAd} isOnline={isOnline} />
    </div>
  )
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg px-2 py-1 min-w-[48px]"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-[7px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span className="text-xs sm:text-sm font-extrabold" style={{ color: '#FFFFFF' }}>{value}</span>
    </div>
  )
}

function PowerUpBtn({ icon, count, active, onClick, color, disabled }: {
  icon: React.ReactNode; count: number; active: boolean; onClick: () => void; color: string; disabled?: boolean
}) {
  return (
    <motion.button onClick={onClick} disabled={disabled} className="relative flex items-center justify-center rounded-lg"
      style={{ width: 36, height: 36, backgroundColor: active ? `${color}20` : 'rgba(255,255,255,0.04)', border: active ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.06)', boxShadow: active ? `0 0 10px ${color}25` : 'none', opacity: disabled ? 0.35 : 1 }}
      whileTap={!disabled ? { scale: 0.9 } : {}} animate={active ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 0.8, repeat: active ? Infinity : 0 }}>
      <div style={{ color: count > 0 ? color : 'rgba(255,255,255,0.15)' }}>{icon}</div>
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
        style={{ backgroundColor: count > 0 ? color : 'rgba(255,255,255,0.08)', color: '#FFFFFF' }}>{count}</div>
    </motion.button>
  )
}
