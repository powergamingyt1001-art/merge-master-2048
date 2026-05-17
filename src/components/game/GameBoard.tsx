'use client'

// ============================================================
// FILE: src/components/game/GameBoard.tsx
// PURPOSE: Main game board with TIMER + LOADING BAR
// The timer uses SHARED game state from GameContext
// (NOT its own useGame() which was the root cause of the bug)
// ============================================================

import { useCallback, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Direction, PowerUp } from '@/hooks/useGame'
import { useGameContext } from '@/context/GameContext'
import { TileComponent } from './Tile'
import {
  Trophy, RotateCcw, Undo2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Heart, Hammer, Magnet, Bomb, Crown, Zap, ArrowLeftCircle, Swords, Coins,
} from 'lucide-react'
import { AdsterraBanner300x250, AdsterraBanner468x60 } from '@/components/ads/AdsterraAds'
import { getRandomLink } from '@/components/ads/AdOverlay'

// ============================================================
// HELPER: Check if tiles can still move
// ============================================================
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

// ============================================================
// HELPER: Responsive board size calculation
// ============================================================
function useResponsiveSize() {
  const [sizes, setSizes] = useState({ cellSize: 80, gap: 10 })
  useEffect(() => {
    function calc() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const maxBoard = Math.min(vw - 24, vh - 320, 420)
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

// ============================================================
// MAIN COMPONENT: GameBoard
// Uses SHARED game state from GameContext
// ============================================================
interface GameBoardProps {
  onBackToDashboard: () => void
  onPlayAgain: (mode: 'bot' | 'coins' | 'tournament', timeLimit: number, entryFee: number) => void
}

export function GameBoard({ onBackToDashboard, onPlayAgain }: GameBoardProps) {
  // ============================================================
  // 🔴 CRITICAL FIX: Use GameContext instead of useGame()
  // Previously GameBoard called useGame() which created a NEW
  // state with default values (gameMode='classic', battleTimer=0)
  // Now it uses the SHARED state from page.tsx via GameContext
  // ============================================================
  const game = useGameContext()
  const {
    tiles, score, bestScore, gameOver, won, keepPlaying,
    canUndo, undoCount, undoTotal,
    lives, maxLives, hammerCount, magnetCount, blastCount, activePowerUp,
    gameMode, botOpponent, botBattleResult,
    battleTimer, battleTimeLimit, consecutiveMerges, comboBonus, comboMultiplier,
    coinEntryFee, coinGameWon,
    tournamentPoints, tournamentCarryOver,
    countdownActive, countdownSecondsLeft, timerPaused,
    handleMove, newGame, continueGame, undo, activatePowerUp, handleTileClick,
    reviveWithAd, restartAfterStuck, tickBattleTimer, tickCountdown, addCoins, addNotification,
    goBackToDashboard, calculateTournamentPoints, addGameToHistory,
  } = game

  // ============================================================
  // INJECT BLINK CSS ANIMATION GLOBALLY (once)
  // EXACTLY like user's HTML reference:
  // @keyframes blink {
  //   0% {opacity: 1;}
  //   50% {opacity: 0.4;}
  //   100% {opacity: 1;}
  // }
  // ============================================================
  useEffect(() => {
    const id = 'timer-blink-style'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = `
        @keyframes timerBlink {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const { cellSize, gap } = useResponsiveSize()
  const boardSize = 4 * (cellSize + gap) + gap
  const prevScore = useRef(score)
  const [scoreGain, setScoreGain] = useState(0)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : false)
  const [gameOverDismissed, setGameOverDismissed] = useState(false)
  const [waitingForReturn, setWaitingForReturn] = useState(false) // User visiting ad site
  const [showWelcomeBack, setShowWelcomeBack] = useState(false) // Show welcome back overlay

  // Determine game type
  const isBattleMode = gameMode === 'bot' || gameMode === 'coins' || gameMode === 'tournament'
  const isCoinGame = gameMode === 'coins'
  const isTournament = gameMode === 'tournament'
  const isClassic = gameMode === 'classic'

  const isStuck = !checkCanMove(tiles) && lives > 0 && !gameOver
  const showGameOverModal = gameOver && lives <= 0 && !gameOverDismissed && !isBattleMode

  // Countdown overlay - derived from game state
  const countdownOverlay = countdownActive ? { seconds: countdownSecondsLeft, total: 3 } : null

  // Countdown tick effect
  useEffect(() => {
    if (!countdownActive) return
    const timer = setTimeout(() => { tickCountdown() }, 1000)
    return () => clearTimeout(timer)
  }, [countdownActive, countdownSecondsLeft, tickCountdown])

  // Internet detection
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Detect when user returns from ad website
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && waitingForReturn) {
        setWaitingForReturn(false)
        setShowWelcomeBack(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [waitingForReturn])

  // Battle timer tick - don't tick during countdown or when paused
  useEffect(() => {
    if (!isBattleMode || botBattleResult || battleTimer <= 0 || countdownOverlay || timerPaused) return
    const interval = setInterval(() => { tickBattleTimer() }, 1000)
    return () => clearInterval(interval)
  }, [isBattleMode, botBattleResult, battleTimer, tickBattleTimer, countdownOverlay, timerPaused])

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

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't capture touch on buttons/interactive elements inside overlays
    if ((e.target as HTMLElement).closest('button, [role="button"], .overlay-content')) return
    e.preventDefault()
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    e.preventDefault()
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    e.preventDefault()
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return
    onMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
    touchStart.current = null
  }, [onMove])

  const handlePowerUp = useCallback((pu: PowerUp) => { activatePowerUp(pu) }, [activatePowerUp])
  const handleStuckContinue = useCallback(() => { restartAfterStuck() }, [restartAfterStuck])
  const handleBack = useCallback(() => { onBackToDashboard() }, [onBackToDashboard])

  // Open direct link for ad revenue - wait for user to return before reviving
  const openAdAndRevive = useCallback(() => {
    if (isOnline) {
      try { window.open(getRandomLink(), '_blank') } catch { /* popup blocked */ }
      setWaitingForReturn(true)
    } else {
      // Offline - just revive immediately
      setGameOverDismissed(false)
      reviveWithAd()
    }
  }, [isOnline, reviveWithAd])

  // Handle user returning from ad - revive the game
  const handleWelcomeBackContinue = useCallback(() => {
    setShowWelcomeBack(false)
    setGameOverDismissed(false)
    reviveWithAd()
  }, [reviveWithAd])

  // Finalize current game (save history, coins, tournament points)
  const finalizeGame = useCallback(() => {
    const result = botBattleResult || 'classic'
    addGameToHistory(gameMode, score, result as 'win' | 'lose' | 'classic', coinEntryFee, battleTimeLimit)
    if (isCoinGame && botBattleResult === 'win' && coinEntryFee > 0) {
      const winAmount = coinEntryFee * 2
      addCoins(winAmount)
      addNotification('Coin Game Won!', `You won ${winAmount} coins! 🎉`, 'reward', '💰')
    } else if (isCoinGame && botBattleResult === 'lose') {
      addNotification('Coin Game Lost', `You lost ${coinEntryFee} coins`, 'battle', '😔')
    }
    if (isTournament) {
      calculateTournamentPoints(score)
      if (botBattleResult === 'win') {
        addNotification('Tournament Win!', `+${Math.floor(score / 20)} points! Score: ${score}`, 'reward', '🏆')
      } else {
        addNotification('Tournament Game Over', `Score: ${score} - Keep playing!`, 'battle', '⚔️')
      }
    }
  }, [isCoinGame, isTournament, botBattleResult, coinEntryFee, score, addCoins, addNotification, addGameToHistory, gameMode, battleTimeLimit, calculateTournamentPoints])

  const handleBattleEnd = useCallback(() => {
    finalizeGame()
    onBackToDashboard()
  }, [finalizeGame, onBackToDashboard])

  const handlePlayAgain = useCallback(() => {
    finalizeGame()
    // Go through ad system when playing again
    onPlayAgain(gameMode as 'bot' | 'coins' | 'tournament', battleTimeLimit, coinEntryFee)
  }, [finalizeGame, onPlayAgain, gameMode, battleTimeLimit, coinEntryFee])

  // ============================================================
  // TIMER SYSTEM - EXACTLY like user's HTML reference
  // progress = timeLeft / totalTime
  // >60% → GREEN (#00e676)
  // 30-60% → YELLOW (#ffeb3b)
  // 15-30% → ORANGE (#ff9800)
  // <15% → RED (#ff3d00) + BLINK animation
  // ============================================================
  const progress = battleTimeLimit > 0 ? battleTimer / battleTimeLimit : 0

  let timerColor = '#00e676' // GREEN default
  if (progress <= 0.15) {
    timerColor = '#ff3d00' // RED
  } else if (progress <= 0.30) {
    timerColor = '#ff9800' // ORANGE
  } else if (progress <= 0.60) {
    timerColor = '#ffeb3b' // YELLOW
  }

  const shouldBlink = progress <= 0.15 && isBattleMode && battleTimer > 0 && !botBattleResult



  // ============================================================
  // RENDER - Main game screen layout
  // EXACT LAYOUT (top to bottom):
  // 1. [ BACK + SCORE ]   [ TIMER TEXT ]
  // 2. [ LOADING BAR ]
  // 3. [ HEARTS ]
  // 4. [ GAME BOARD 4x4 ]
  // 5. [ POWER-UPS ]
  // 6. [ BANNER AD ]
  // ============================================================
  return (
    <div
      className="fixed inset-0 flex flex-col items-center select-none outline-none game-touch-area"
      style={{ background: '#1e1b3a', overflow: 'hidden', touchAction: 'none' }}
      onKeyDown={handleKeyDown} tabIndex={0} role="application" aria-label="Merge Master 2048 Challenge"
    >

      {/* ====== TOP HEADER AD - thin banner ====== */}
      <div className="flex-shrink-0 w-full flex justify-center" style={{ maxHeight: 60, overflow: 'hidden' }}>
        <AdsterraBanner468x60 />
      </div>

      {/* ============================================================ */}
      {/* ROW 1: [ BACK + SCORE ]   [ TIMER TEXT ]                     */}
      {/* Timer number is BIG BOLD like "60" "59" "58"                 */}
      {/* Exactly like user's HTML: #timer { font-size:28px; bold }    */}
      {/* ============================================================ */}
      <div style={{
        width: '100%',
        padding: '12px 16px 0 16px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Left: Back + Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleBack}
              style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
              }}>
              <ArrowLeftCircle style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.7)' }} />
            </button>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1.5 }}>SCORE</div>
              <div style={{ fontSize: 24, color: '#FFFFFF', fontWeight: 900, lineHeight: 1, fontFamily: 'monospace' }}>
                {score}
                <AnimatePresence>
                  {scoreGain > 0 && (
                    <motion.span
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: -15 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      style={{ fontSize: 12, color: comboMultiplier >= 2 ? '#FF7A00' : '#EDC22E', marginLeft: 4, fontWeight: 700 }}
                    >
                      +{scoreGain}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isBattleMode && comboMultiplier >= 2 && (
                  <span style={{ fontSize: 10, color: '#00E676', marginLeft: 4, fontWeight: 800 }}>
                    {comboMultiplier}x
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Timer Number (only in battle modes) */}
          {isBattleMode && !botBattleResult ? (
            <div style={{ textAlign: 'right' }}>
              {/* Mode label */}
              <div style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 600,
                marginBottom: 2,
              }}>
                {isCoinGame ? `💰 ₹${coinEntryFee} Game` : isTournament ? '🏆 Tournament' : '⚔️ 1v1 Battle'}
              </div>
              {/* 🔥 TIMER NUMBER - EXACTLY like user's HTML reference */}
              {/* #timer { font-size: 28px; font-weight: bold; } */}
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 'bold',
                  color: shouldBlink ? timerColor : '#FFFFFF',
                  lineHeight: 1,
                  fontFamily: 'monospace',
                  animation: shouldBlink ? 'timerBlink 0.5s infinite' : 'none',
                }}
              >
                {battleTimer}
              </div>
              {timerPaused && (
                <span style={{ fontSize: 9, color: '#FFB300', fontWeight: 700 }}>⏸ PAUSED</span>
              )}
            </div>
          ) : (
            /* Classic mode: Show best score */
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1.5 }}>BEST</div>
              <div style={{ fontSize: 20, color: '#EDC22E', fontWeight: 900, lineHeight: 1, fontFamily: 'monospace' }}>{bestScore}</div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 2: LOADING BAR - EXACTLY like user's HTML reference      */}
      {/* .bar-container { width:90%; height:10px; background:#333;     */}
      {/*   border-radius:10px; overflow:hidden; margin:auto; }        */}
      {/* #bar { height:100%; width:100%; background:#00e676;           */}
      {/*   transition: width 1s linear, background 0.5s;              */}
      {/*   border-radius:10px; }                                       */}
      {/* When <15%: .blink { animation: blink 0.5s infinite; }        */}
      {/* ============================================================ */}
      {isBattleMode && !botBattleResult && (
        <div style={{
          width: '100%',
          padding: '10px 16px 0 16px',
          flexShrink: 0,
        }}>
          {/* Bar container - EXACTLY like .bar-container */}
          <div style={{
            width: '90%',
            height: 10,
            background: '#333',
            margin: '0 auto',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Bar fill - EXACTLY like #bar */}
            <div style={{
              height: '100%',
              width: `${Math.max(progress * 100, 0)}%`,
              background: timerColor,
              borderRadius: 10,
              transition: 'width 1s linear, background 0.5s',
              animation: shouldBlink ? 'timerBlink 0.5s infinite' : 'none',
            }} />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ROW 3: HEARTS / LIVES                                        */}
      {/* Below the loading bar, above the game board                  */}
      {/* ============================================================ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '8px 0 4px 0',
        flexShrink: 0,
      }}>
        {Array.from({ length: maxLives }).map((_, i) => (
          <Heart
            key={i}
            style={{
              width: i < lives ? 18 : 14,
              height: i < lives ? 18 : 14,
              color: i < lives ? '#F65E3B' : 'rgba(255,255,255,0.12)',
              fill: i < lives ? '#F65E3B' : 'none',
              filter: i < lives ? 'drop-shadow(0 0 4px rgba(246,94,59,0.6))' : 'none',
            }}
          />
        ))}
      </div>

      {/* ============================================================ */}
      {/* COMBO INDICATOR - ALWAYS RESERVES FIXED SPACE (32px)         */}
      {/* The combo badge stays in ONE place. When combo is active,    */}
      {/* the badge shows. When no combo, empty space is reserved.     */}
      {/* This prevents tiles from shaking/moving when combo appears.  */}
      {/* ============================================================ */}
      {isBattleMode && !botBattleResult && (
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{ height: 32 }}
        >
          {comboMultiplier >= 2 ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: comboMultiplier >= 5
                  ? 'linear-gradient(135deg, #FF3D00, #FF6D00, #FFD600)'
                  : comboMultiplier >= 4
                    ? 'linear-gradient(135deg, #FF6D00, #FF9100)'
                    : comboMultiplier >= 3
                      ? 'linear-gradient(135deg, #EDC22E, #FF7A00)'
                      : 'linear-gradient(135deg, #00E676, #00C853)',
                boxShadow: comboMultiplier >= 4
                  ? `0 0 20px rgba(255,109,0,0.5), 0 0 40px rgba(255,109,0,0.2)`
                  : comboMultiplier >= 3
                    ? `0 0 15px rgba(237,194,46,0.4), 0 0 30px rgba(237,194,46,0.15)`
                    : `0 0 10px rgba(0,230,118,0.3)`,
                border: `1.5px solid ${comboMultiplier >= 4 ? 'rgba(255,255,255,0.4)' : comboMultiplier >= 3 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'}`,
                transition: 'background 0.3s, box-shadow 0.3s, border-color 0.3s',
              }}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} fill="white" />
              <span style={{
                fontSize: 14,
                fontWeight: 900,
                color: '#FFFFFF',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                fontFamily: 'monospace',
              }}>
                {comboMultiplier}x COMBO
              </span>
              {comboMultiplier >= 3 && (
                <span style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.8)',
                }}>
                  🔥
                </span>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Timer Paused Overlay - Watch ad to revive */}
      <AnimatePresence>
        {timerPaused && isBattleMode && !isTournament && lives <= 0 && !botBattleResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              width: '90%',
              maxWidth: boardSize,
              flexShrink: 0,
              padding: '12px 16px',
              borderRadius: 12,
              textAlign: 'center',
              backgroundColor: 'rgba(246,94,59,0.15)',
              border: '1.5px solid rgba(246,94,59,0.4)',
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <Heart style={{ width: 20, height: 20, color: '#F65E3B' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>Lives Finished!</span>
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              Timer paused at {battleTimer}s • Score: {score}
            </p>
            <button
              onClick={openAdAndRevive}
              style={{
                padding: '8px 24px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                background: 'linear-gradient(135deg, #F65E3B, #F67C5F)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(246,94,59,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '0 auto',
              }}>
              ❤️ Get Free Life
              <span style={{ fontSize: 8, fontWeight: 400, opacity: 0.7 }}> (opens ad)</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* GAME BOARD - 4x4 Grid with tiles                             */}
      {/* ============================================================ */}
      <div
        className="relative rounded-xl overflow-hidden game-touch-area"
        style={{
          width: boardSize,
          height: boardSize,
          backgroundColor: '#2d1b4e',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(237,194,46,0.08)',
          border: '1px solid rgba(255,255,255,0.06)',
          touchAction: 'none',
          flexShrink: 0,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background cells */}
        {Array.from({ length: 16 }).map((_, i) => {
          const row = Math.floor(i / 4), col = i % 4
          return <div key={`bg-${i}`} className="absolute rounded-lg" style={{
            width: cellSize, height: cellSize, backgroundColor: 'rgba(255,255,255,0.05)',
            left: col * (cellSize + gap) + gap, top: row * (cellSize + gap) + gap,
          }} />
        })}

        {/* Tiles */}
        <AnimatePresence>
          {tiles.map((tile: { id: number; value: number; row: number; col: number; isNew: boolean; isMerged: boolean; flash: boolean }) => (
            <TileComponent key={tile.id} id={tile.id} value={tile.value} row={tile.row} col={tile.col}
              isNew={tile.isNew} isMerged={tile.isMerged} flash={tile.flash} cellSize={cellSize} gap={gap}
              onClick={() => handleTileClick(tile.row, tile.col)} />
          ))}
        </AnimatePresence>

        {/* Countdown overlay - 3-2-1 when entering battle mode */}
        <AnimatePresence>
          {countdownOverlay && countdownOverlay.seconds > 0 && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 150 }}
            >
              <motion.div
                key={countdownOverlay.seconds}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <span
                  className="text-7xl sm:text-8xl font-extrabold"
                  style={{
                    color: countdownOverlay.seconds === 1 ? '#F65E3B' : '#EDC22E',
                    textShadow: countdownOverlay.seconds === 1
                      ? '0 0 40px rgba(246,94,59,0.6), 0 0 80px rgba(246,94,59,0.3)'
                      : '0 0 30px rgba(237,194,46,0.4)',
                  }}
                >
                  {countdownOverlay.seconds}
                </span>
              </motion.div>
              <p className="text-xs font-bold mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {isTournament ? '🏆 Tournament Starting!' : isCoinGame ? '🪙 Coin Game Starting!' : '⚔️ Battle Starting!'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final countdown removed - no 5-4-3-2-1 overlay to waste user's time */}

        {/* Stuck overlay */}
        <AnimatePresence>
          {isStuck && lives > 0 && !gameOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl overlay-content" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100 }}>
              <Heart className="w-8 h-8 mb-2" style={{ color: '#F65E3B' }} />
              <p className="text-lg font-bold mb-1" style={{ color: '#FFFFFF' }}>Stuck!</p>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>-1 ❤️ • {lives} lives left</p>
              <button onClick={handleStuckContinue} onTouchStart={(e) => e.stopPropagation()} className="px-5 py-2 rounded-lg font-bold text-xs"
                style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>Continue</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win overlay */}
        <AnimatePresence>
          {won && !keepPlaying && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl overlay-content" style={{ backgroundColor: 'rgba(237,194,46,0.5)', zIndex: 100 }}>
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}>
                <Trophy className="w-12 h-12 sm:w-14 sm:h-14 mb-2" style={{ color: '#FFFFFF' }} />
              </motion.div>
              <p className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: '#FFFFFF' }}>You Win! 🎉</p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>Score: {score}</p>
              <div className="flex gap-3">
                <button onClick={continueGame} onTouchStart={(e) => e.stopPropagation()} className="px-4 py-2 rounded-lg font-bold text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}>Keep Going</button>
                <button onClick={() => { onBackToDashboard(); }} onTouchStart={(e) => e.stopPropagation()} className="px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                  <RotateCcw className="w-3 h-3" /> Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battle Result overlay */}
        <AnimatePresence>
          {isBattleMode && botBattleResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl overlay-content" style={{ backgroundColor: botBattleResult === 'win' ? 'rgba(0,200,83,0.6)' : 'rgba(246,94,59,0.6)', zIndex: 100 }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                <span className="text-5xl mb-2 block">{botBattleResult === 'win' ? '🏆' : '😔'}</span>
              </motion.div>
              <p className="text-2xl font-extrabold mb-2" style={{ color: '#FFFFFF' }}>
                {botBattleResult === 'win' ? 'You Won!' : 'You Lost!'}
              </p>
              <div className="flex items-center gap-6 mb-3">
                <div className="text-center">
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Your Score</p>
                  <p className="text-xl font-extrabold" style={{ color: '#FFFFFF' }}>{score}</p>
                </div>
                <span className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>vs</span>
                <div className="text-center">
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Opponent</p>
                  <p className="text-xl font-extrabold" style={{ color: '#FFFFFF' }}>{botOpponent?.finalScore}</p>
                </div>
              </div>
              {isCoinGame && (
                <p className="text-[10px] font-bold mb-3" style={{ color: botBattleResult === 'win' ? '#FFD700' : 'rgba(255,255,255,0.6)' }}>
                  {botBattleResult === 'win' ? `+${coinEntryFee * 2} coins! 🎉` : `-${coinEntryFee} coins`}
                </p>
              )}
              {comboBonus > 0 && (
                <div className="mb-3 px-3 py-1.5 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,122,0,0.15)', border: '1px solid rgba(255,122,0,0.3)' }}>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>🔥 Combo Bonus</p>
                  <p className="text-sm font-extrabold" style={{ color: '#FF7A00' }}>+{comboBonus} pts</p>
                </div>
              )}
              {isTournament && (
                <div className="mb-3 p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Tournament Points</p>
                  <p className="text-lg font-extrabold" style={{ color: '#00E676' }}>+{Math.floor((score + tournamentCarryOver) / 20)} pts</p>
                  <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Total: {tournamentPoints + Math.floor((score + tournamentCarryOver) / 20)} pts</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleBattleEnd}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="px-4 py-2 rounded-lg font-bold text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}>Dashboard</button>
                <button
                  onClick={handlePlayAgain}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                  Play Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Power-ups row - BELOW the board */}
      <div className="flex items-center gap-2 py-1.5 flex-shrink-0">
        <PowerUpBtn icon={<Hammer className="w-3.5 h-3.5" />} count={hammerCount} active={activePowerUp === 'hammer'} onClick={() => handlePowerUp('hammer')} color="#F59563" />
        <PowerUpBtn icon={<Magnet className="w-3.5 h-3.5" />} count={magnetCount} active={activePowerUp === 'magnet'} onClick={() => handlePowerUp('magnet')} color="#00E676" />
        <PowerUpBtn icon={<Bomb className="w-3.5 h-3.5" />} count={blastCount} active={false} onClick={() => handlePowerUp('blast')} color="#FF7A00" />
        <PowerUpBtn icon={<Undo2 className="w-3.5 h-3.5" />} count={undoTotal - undoCount} active={false} onClick={undo} color="#8f7a66" disabled={!canUndo || undoCount >= undoTotal} />
        <PowerUpBtn icon={<span className="text-[10px]">5x</span>} count={game.multiplier5xCount} active={false} onClick={() => handlePowerUp('multiplier5x')} color="#F65E3B" />
        <PowerUpBtn icon={<span className="text-[10px]">2.5x</span>} count={game.multiplier2_5xCount} active={false} onClick={() => handlePowerUp('multiplier2_5x')} color="#FF7A00" />
        <PowerUpBtn icon={<span className="text-[10px]">+10s</span>} count={game.extraTimeCount} active={false} onClick={() => handlePowerUp('extraTime')} color="#00FFFF" />
      </div>

      {/* Active Power-up indicator */}
      <AnimatePresence>
        {activePowerUp && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="px-3 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 flex-shrink-0"
            style={{
              backgroundColor: activePowerUp === 'hammer' ? 'rgba(245,149,99,0.15)' : activePowerUp === 'magnet' ? 'rgba(0,230,118,0.15)' : 'rgba(255,122,0,0.15)',
              color: activePowerUp === 'hammer' ? '#F59563' : activePowerUp === 'magnet' ? '#00E676' : '#FF7A00',
              border: `1px solid ${activePowerUp === 'hammer' ? 'rgba(245,149,99,0.25)' : activePowerUp === 'magnet' ? 'rgba(0,230,118,0.25)' : 'rgba(255,122,0,0.25)'}`,
            }}>
            <Zap className="w-2.5 h-2.5" />
            {activePowerUp === 'hammer' ? 'Tap tile to destroy + 2 nearby' : activePowerUp === 'magnet' ? 'Tap to destroy all same tiles' : 'Power-up active'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile direction buttons */}
      <div className="flex gap-1 sm:hidden flex-shrink-0">
        {(['up', 'down', 'left', 'right'] as Direction[]).map(dir => (
          <button key={dir} onClick={() => onMove(dir)} className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
            {dir === 'up' ? <ArrowUp className="w-5 h-5" /> : dir === 'down' ? <ArrowDown className="w-5 h-5" /> : dir === 'left' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        ))}
      </div>

      {/* ====== BOTTOM AD DURING GAMEPLAY - always visible ====== */}
      <div className="flex-shrink-0 w-full" style={{ marginTop: 4 }}>
        <AdsterraBanner300x250 />
      </div>



      {/* Game Over Modal - for classic mode */}
      <AnimatePresence>
        {showGameOverModal && gameOver && lives <= 0 && !isBattleMode && (
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
                <button onClick={openAdAndRevive}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #F65E3B, #F67C5F)', color: '#FFFFFF' }}>
                  <Heart className="w-4 h-4" /> Get Free Life
                  <span style={{ fontSize: 8, fontWeight: 400, opacity: 0.7 }}> (opens ad)</span>
                </button>
                <button onClick={() => {
                  addGameToHistory('classic', score, 'classic', 0, 0)
                  setGameOverDismissed(false)
                  onBackToDashboard()
                }}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Back to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Back overlay - shown when user returns from ad website */}
      <AnimatePresence>
        {showWelcomeBack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-xs rounded-2xl p-6 text-center"
              style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <span className="text-4xl block mb-3">👋</span>
              <h2 className="text-xl font-extrabold mb-1" style={{ color: '#FFFFFF' }}>Welcome Back!</h2>
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Your game is ready to continue. Tap below to resume!
              </p>
              {isBattleMode && (
                <p className="text-[10px] mb-3" style={{ color: '#EDC22E' }}>
                  ⏱ Timer: {battleTimer}s remaining • Score: {score}
                </p>
              )}
              <button
                onClick={handleWelcomeBackContinue}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #00E676, #00C853)',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 15px rgba(0,230,118,0.3)',
                }}
              >
                ❤️ Continue Game
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* BLINK CSS ANIMATION - Injected via useEffect                 */}
      {/* @keyframes timerBlink {                                      */}
      {/*   0% { opacity: 1; }                                        */}
      {/*   50% { opacity: 0.4; }                                     */}
      {/*   100% { opacity: 1; }                                      */}
      {/* }                                                            */}
      {/* EXACTLY like user's HTML reference                           */}
      {/* ============================================================ */}
    </div>
  )
}

// ============================================================
// SUB-COMPONENT: PowerUpBtn
// ============================================================
function PowerUpBtn({ icon, count, active, onClick, color, disabled }: {
  icon: React.ReactNode; count: number; active: boolean; onClick: () => void; color: string; disabled?: boolean
}) {
  return (
    <motion.button onClick={onClick} disabled={disabled} className="relative flex items-center justify-center rounded-lg"
      style={{ width: 36, height: 36, backgroundColor: active ? `${color}20` : 'rgba(255,255,255,0.04)', border: active ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.06)', opacity: disabled ? 0.35 : 1 }}
      whileTap={!disabled ? { scale: 0.9 } : {}} animate={active ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 0.8, repeat: active ? Infinity : 0 }}>
      <div style={{ color: count > 0 ? color : 'rgba(255,255,255,0.15)' }}>{icon}</div>
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
        style={{ backgroundColor: count > 0 ? color : 'rgba(255,255,255,0.08)', color: '#FFFFFF' }}>{count}</div>
    </motion.button>
  )
}
