'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Tv } from 'lucide-react'
import { SpinWheelAd } from '@/components/ads/AdOverlay'
import { AdsterraBanner320x50 } from '@/components/ads/AdsterraAds'

interface SpinWheelProps {
  isOpen: boolean
  onClose: () => void
  spinTickets: number
  onUseTicket: () => void
  onWinPrize: (prize: SpinPrize) => void
  onWatchAdForSpin: () => void
  isOnline: boolean
}

export interface SpinPrize {
  type: 'blast' | 'magnet' | 'hammer' | 'undo' | 'spin' | 'coin' | 'respin' | 'multiply5' | 'multiply2_5' | 'timeExtend'
  count: number
  label: string
  emoji: string
  color: string
}

// 11 items with user-specified probabilities (normalized to 100%)
const PRIZE_POOL: { prize: SpinPrize; weight: number }[] = [
  { prize: { type: 'blast', count: 2, label: '2 Boom', emoji: '💣', color: '#FF7A00' }, weight: 6 },
  { prize: { type: 'magnet', count: 3, label: '3 Magnet', emoji: '🧲', color: '#00E676' }, weight: 5 },
  { prize: { type: 'blast', count: 1, label: '1 Boom', emoji: '💥', color: '#FF9F1C' }, weight: 8 },
  { prize: { type: 'hammer', count: 2, label: '2 Hammer', emoji: '🔨', color: '#F59563' }, weight: 5 },
  { prize: { type: 'respin', count: 1, label: 'Spin Again!', emoji: '🔄', color: '#EDC22E' }, weight: 3 },
  { prize: { type: 'undo', count: 3, label: '3 Undo', emoji: '↩️', color: '#8f7a66' }, weight: 5 },
  { prize: { type: 'spin', count: 1, label: '1 Spin Ticket', emoji: '🎫', color: '#00FFFF' }, weight: 7 },
  { prize: { type: 'coin', count: 100, label: '100 Coins', emoji: '💰', color: '#EDC22E' }, weight: 6 },
  { prize: { type: 'multiply5', count: 1, label: '5x Ability', emoji: '⚡', color: '#FF00FF' }, weight: 0.5 },
  { prize: { type: 'multiply2_5', count: 1, label: '2.5x Ability', emoji: '💫', color: '#00FFFF' }, weight: 1 },
  { prize: { type: 'timeExtend', count: 1, label: '+10s Timer', emoji: '⏱️', color: '#00E676' }, weight: 1.5 },
]

function pickPrize(): { index: number; prize: SpinPrize } {
  const totalWeight = PRIZE_POOL.reduce((sum, p) => sum + p.weight, 0)
  let random = Math.random() * totalWeight
  for (let i = 0; i < PRIZE_POOL.length; i++) {
    random -= PRIZE_POOL[i].weight
    if (random <= 0) {
      return { index: i, prize: { ...PRIZE_POOL[i].prize } }
    }
  }
  return { index: 0, prize: { ...PRIZE_POOL[0].prize } }
}

const SPIN_COUNTS = [1, 2, 3, 5, 10]

export function SpinWheel({ isOpen, onClose, spinTickets, onUseTicket, onWinPrize, onWatchAdForSpin, isOnline }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ index: number; prize: SpinPrize } | null>(null)
  const [rotation, setRotation] = useState(0)
  const [showAdOverlay, setShowAdOverlay] = useState(false)
  const [spinMultiplier, setSpinMultiplier] = useState(1)
  const [multiResults, setMultiResults] = useState<{ prize: SpinPrize; revealed: boolean }[]>([])
  const [allRevealed, setAllRevealed] = useState(false)
  const spinCountRef = useRef(0)
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  const totalSpins = spinMultiplier === 10 ? 11 : spinMultiplier
  const ticketCost = spinMultiplier

  // Clear pending timeouts to prevent stale state after close
  const clearPendingTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(t => clearTimeout(t))
    timeoutRefs.current = []
  }, [])

  const handleSpin = useCallback(() => {
    if (spinTickets < ticketCost || spinning) return
    clearPendingTimeouts()
    setSpinning(true)
    setResult(null)
    setMultiResults([])
    setAllRevealed(false)

    // Use tickets
    for (let i = 0; i < ticketCost; i++) {
      onUseTicket()
    }

    // For the visual wheel animation, pick a target slice to land on
    const visualWin = pickPrize()
    spinCountRef.current += 1

    // === FIXED ROTATION CALCULATION ===
    // SVG draws slices with startAngle - 90, so slice 0 starts at top (12 o'clock).
    // The pointer is at the TOP of the wheel.
    // When rotation = 0, pointer points at the top → start of slice 0.
    // Slice i center in SVG coordinates = i * sliceAngle + sliceAngle/2 (clockwise from top).
    // To bring slice i's center to the top, rotate clockwise by (360 - center_angle).
    const sliceAngle = 360 / PRIZE_POOL.length
    // Add a small random offset within ±25% of slice half-width to avoid edge hits
    const offset = (Math.random() - 0.5) * sliceAngle * 0.5
    const targetAngle = visualWin.index * sliceAngle + sliceAngle / 2 + offset
    // Multiple full rotations for dramatic effect (5-7 full spins)
    const fullRotations = 360 * (5 + Math.floor(Math.random() * 3))
    // Snap base to next full rotation boundary to prevent accumulation drift
    const baseRotation = Math.ceil(rotation / 360) * 360
    const targetRotation = baseRotation + fullRotations + (360 - targetAngle)

    setRotation(targetRotation)

    if (spinMultiplier === 1) {
      // Single spin: the visual result IS the prize
      const t1 = setTimeout(() => {
        setResult(visualWin)
        setSpinning(false)
      }, 3500)
      timeoutRefs.current.push(t1)
    } else {
      // Multi-spin: pick all prizes, show them in a reveal grid
      const prizes: SpinPrize[] = []
      for (let i = 0; i < totalSpins; i++) {
        prizes.push(pickPrize().prize)
      }
      const t2 = setTimeout(() => {
        setMultiResults(prizes.map(p => ({ prize: p, revealed: false })))
        setSpinning(false)
        // Reveal one by one with staggered delay
        prizes.forEach((_, i) => {
          const t3 = setTimeout(() => {
            setMultiResults(prev => prev.map((r, idx) => idx === i ? { ...r, revealed: true } : r))
            if (i === prizes.length - 1) {
              const t4 = setTimeout(() => setAllRevealed(true), 350)
              timeoutRefs.current.push(t4)
            }
          }, i * 250)
          timeoutRefs.current.push(t3)
        })
      }, 2500)
      timeoutRefs.current.push(t2)
    }
  }, [spinTickets, spinning, onUseTicket, rotation, spinMultiplier, ticketCost, totalSpins, clearPendingTimeouts])

  const handleClaim = useCallback(() => {
    if (!result) return
    onWinPrize(result.prize)
    setResult(null)
  }, [result, onWinPrize])

  const handleClaimAll = useCallback(() => {
    if (multiResults.length === 0) return
    multiResults.forEach(r => onWinPrize(r.prize))
    setMultiResults([])
    setAllRevealed(false)
  }, [multiResults, onWinPrize])

  // Watch ad for free spin - opens the ad overlay
  const handleWatchAd = useCallback(() => {
    if (!isOnline) return
    setShowAdOverlay(true)
  }, [isOnline])

  // Called when ad is "watched" (countdown completed)
  const handleAdComplete = useCallback(() => {
    onWatchAdForSpin()
    setShowAdOverlay(false)
  }, [onWatchAdForSpin])

  const hasResult = result !== null || multiResults.length > 0

  // Auto-claim prizes when closing modal to prevent prize loss
  const handleClose = useCallback(() => {
    clearPendingTimeouts()
    if (result) {
      onWinPrize(result.prize)
      setResult(null)
    }
    if (multiResults.length > 0) {
      multiResults.forEach(r => onWinPrize(r.prize))
      setMultiResults([])
      setAllRevealed(false)
    }
    setSpinning(false)
    onClose()
  }, [result, multiResults, onWinPrize, onClose, clearPendingTimeouts])

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>🎰 Spin & Win</h3>
                <button onClick={handleClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              <div className="px-4 pb-5">
                <p className="text-center text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Tickets: <span style={{ color: '#EDC22E', fontWeight: 'bold' }}>{spinTickets}</span>
                </p>

                {/* Spin Multiplier Selector */}
                {!hasResult && !spinning && (
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    {SPIN_COUNTS.map(count => {
                      const isActive = spinMultiplier === count
                      const isBonus = count === 10
                      const canAfford = spinTickets >= count
                      return (
                        <button
                          key={count}
                          onClick={() => canAfford && setSpinMultiplier(count)}
                          className="relative flex flex-col items-center px-2 py-1 rounded-lg transition-all"
                          style={{
                            backgroundColor: isActive ? 'rgba(237,194,46,0.2)' : canAfford ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                            border: isActive ? '1px solid rgba(237,194,46,0.5)' : canAfford ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.04)',
                            opacity: canAfford ? 1 : 0.35,
                            transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          }}
                        >
                          <span className="text-[10px] font-extrabold" style={{ color: isActive ? '#EDC22E' : 'rgba(255,255,255,0.6)' }}>{count}x</span>
                          <span className="text-[7px]" style={{ color: isActive ? 'rgba(237,194,46,0.7)' : 'rgba(255,255,255,0.3)' }}>{count}🎫</span>
                          {isBonus && (
                            <span className="absolute -top-1.5 -right-1 text-[6px] font-bold px-1 rounded-full" style={{ backgroundColor: '#F65E3B', color: '#FFFFFF' }}>
                              +1
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Multi-spin info */}
                {!hasResult && !spinning && spinMultiplier > 1 && (
                  <p className="text-center text-[10px] mb-2" style={{ color: '#00E676' }}>
                    {spinMultiplier === 10 ? '10 tickets = 11 spins! (+1 FREE)' : `${spinMultiplier} spins for ${spinMultiplier} tickets`}
                  </p>
                )}

                {/* Wheel */}
                <div className="relative w-48 h-48 mx-auto mb-3">
                  {/* Pointer */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                    <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[15px] border-l-transparent border-r-transparent" style={{ borderTopColor: '#FF7A00', filter: 'drop-shadow(0 2px 4px rgba(255,122,0,0.5))' }} />
                  </div>

                  {/* Center dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full z-20 flex items-center justify-center"
                    style={{ backgroundColor: '#2d1b4e', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    <span className="text-[7px]">🎯</span>
                  </div>

                  {/* Rotating wheel */}
                  <div
                    className="w-full h-full rounded-full overflow-hidden border-4"
                    style={{
                      borderColor: 'rgba(255,255,255,0.15)',
                      transform: `rotate(${rotation}deg)`,
                      transition: spinning ? 'transform 3.5s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none',
                    }}
                  >
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {PRIZE_POOL.map((item, i) => {
                        const sliceAngle = 360 / PRIZE_POOL.length
                        const startAngle = i * sliceAngle
                        const endAngle = startAngle + sliceAngle
                        const startRad = (startAngle - 90) * Math.PI / 180
                        const endRad = (endAngle - 90) * Math.PI / 180
                        const x1 = 100 + 92 * Math.cos(startRad)
                        const y1 = 100 + 92 * Math.sin(startRad)
                        const x2 = 100 + 92 * Math.cos(endRad)
                        const y2 = 100 + 92 * Math.sin(endRad)
                        const midRad = (startAngle + sliceAngle / 2 - 90) * Math.PI / 180
                        const tx = 100 + 55 * Math.cos(midRad)
                        const ty = 100 + 55 * Math.sin(midRad)

                        const isEven = i % 2 === 0

                        return (
                          <g key={i}>
                            <path
                              d={`M100,100 L${x1},${y1} A92,92 0 0,1 ${x2},${y2} Z`}
                              fill={isEven ? item.prize.color + '30' : item.prize.color + '18'}
                              stroke={item.prize.color + '40'}
                              strokeWidth="0.5"
                            />
                            <text x={tx} y={ty - 3} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold">
                              {item.prize.emoji}
                            </text>
                            <text x={tx} y={ty + 8} textAnchor="middle" dominantBaseline="middle" fontSize="4" fontWeight="bold" fill="white">
                              {item.prize.label}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                </div>

                {/* Single spin result */}
                <AnimatePresence>
                  {result && !spinning && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="text-center mb-3">
                      <p className="text-sm font-bold mb-2" style={{ color: result.prize.color }}>
                        🎉 You won: {result.prize.emoji} {result.prize.label}
                      </p>
                      <button
                        onClick={handleClaim}
                        className="px-6 py-2 rounded-xl font-bold text-xs transition-transform hover:scale-105 active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${result.prize.color}, ${result.prize.color}CC)`, color: '#FFFFFF' }}
                      >
                        CLAIM
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Multi-spin results grid */}
                <AnimatePresence>
                  {multiResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-3">
                      <p className="text-center text-xs font-bold mb-2" style={{ color: '#EDC22E' }}>
                        🎉 {totalSpins} Spins Results!
                      </p>
                      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
                        {multiResults.map((r, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotateY: 180 }}
                            animate={r.revealed ? { scale: 1, rotateY: 0 } : { scale: 0.8, rotateY: 180 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg"
                            style={{
                              backgroundColor: r.revealed ? `${r.prize.color}15` : 'rgba(255,255,255,0.06)',
                              border: r.revealed ? `1px solid ${r.prize.color}40` : '1px solid rgba(255,255,255,0.1)',
                              minHeight: '52px',
                            }}
                          >
                            {r.revealed ? (
                              <>
                                <span className="text-base leading-none">{r.prize.emoji}</span>
                                <span className="text-[7px] font-bold mt-0.5 leading-tight text-center" style={{ color: r.prize.color }}>{r.prize.label}</span>
                              </>
                            ) : (
                              <span className="text-lg leading-none">❓</span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                      {/* Claim All button */}
                      {allRevealed && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                          <button
                            onClick={handleClaimAll}
                            className="w-full py-2.5 rounded-xl font-bold text-xs transition-transform hover:scale-[1.02] active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF', boxShadow: '0 2px 12px rgba(237,194,46,0.4)' }}
                          >
                            CLAIM ALL ({totalSpins} prizes)
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Spin Button */}
                {!hasResult && (
                  <button
                    onClick={handleSpin}
                    disabled={spinTickets < ticketCost || spinning}
                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}
                  >
                    <Play className="w-4 h-4" />
                    {spinning ? 'Spinning...' : `SPIN ${spinMultiplier > 1 ? `${totalSpins}x ` : ''}(${ticketCost} 🎫)`}
                  </button>
                )}

                {/* Watch Ad for Free Spin - ALWAYS visible when online and no result */}
                {isOnline && !hasResult && !spinning && (
                  <button
                    onClick={handleWatchAd}
                    className="w-full py-2.5 mt-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #F65E3B, #FF7A00)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <Tv className="w-4 h-4" />
                    📺 Watch Ad for Free Spin
                  </button>
                )}

                {/* No tickets and offline message */}
                {!isOnline && spinTickets <= 0 && !hasResult && (
                  <p className="text-center text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    🔴 You&apos;re offline. Connect to internet to watch ads for free spins!
                  </p>
                )}

                {/* Small ad at bottom of spin wheel */}
                {isOnline && (
                  <div className="mt-3 rounded-lg overflow-hidden flex justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <AdsterraBanner320x50 />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin Wheel Ad Overlay */}
      <SpinWheelAd
        isOpen={showAdOverlay}
        onClose={() => setShowAdOverlay(false)}
        onAdComplete={handleAdComplete}
      />
    </>
  )
}
