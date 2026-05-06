'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play } from 'lucide-react'

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
  type: 'blast' | 'magnet' | 'hammer' | 'undo' | 'spin' | 'coin' | 'respin'
  count: number
  label: string
  emoji: string
  color: string
}

// 8 items with user-specified probabilities (normalized to 100%)
const PRIZE_POOL: { prize: SpinPrize; weight: number }[] = [
  { prize: { type: 'blast', count: 2, label: '2 Boom', emoji: '💣', color: '#FF7A00' }, weight: 6 },
  { prize: { type: 'magnet', count: 3, label: '3 Magnet', emoji: '🧲', color: '#00E676' }, weight: 5 },
  { prize: { type: 'blast', count: 1, label: '1 Boom', emoji: '💥', color: '#FF9F1C' }, weight: 8 },
  { prize: { type: 'hammer', count: 2, label: '2 Hammer', emoji: '🔨', color: '#F59563' }, weight: 5 },
  { prize: { type: 'respin', count: 1, label: 'Spin Again!', emoji: '🔄', color: '#EDC22E' }, weight: 3 },
  { prize: { type: 'undo', count: 3, label: '3 Undo', emoji: '↩️', color: '#8f7a66' }, weight: 5 },
  { prize: { type: 'spin', count: 1, label: '1 Spin Ticket', emoji: '🎫', color: '#00FFFF' }, weight: 7 },
  { prize: { type: 'coin', count: 100, label: '100 Coins', emoji: '💰', color: '#EDC22E' }, weight: 6 },
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

export function SpinWheel({ isOpen, onClose, spinTickets, onUseTicket, onWinPrize, onWatchAdForSpin: _onWatchAdForSpin, isOnline: _isOnline }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ index: number; prize: SpinPrize } | null>(null)
  const [rotation, setRotation] = useState(0)
  const spinCountRef = useRef(0)

  const handleSpin = useCallback(() => {
    if (spinTickets <= 0 || spinning) return
    setSpinning(true)
    setResult(null)
    onUseTicket()

    const win = pickPrize()
    spinCountRef.current += 1
    // Each slice = 45 degrees. Target the winning slice center.
    const sliceAngle = 360 / PRIZE_POOL.length
    const targetSliceCenter = win.index * sliceAngle + sliceAngle / 2
    // The pointer is at the top (0 degrees). We need to rotate so the target slice is at the top.
    const targetRotation = rotation + 360 * 5 + (360 - targetSliceCenter)

    setRotation(targetRotation)

    setTimeout(() => {
      setResult(win)
      setSpinning(false)
    }, 3500)
  }, [spinTickets, spinning, onUseTicket, rotation])

  const handleClaim = useCallback(() => {
    if (!result) return
    onWinPrize(result.prize)
    setResult(null)
  }, [result, onWinPrize])

  return (
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
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="px-4 pb-5">
              <p className="text-center text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Tickets: <span style={{ color: '#EDC22E', fontWeight: 'bold' }}>{spinTickets}</span>
              </p>

              {/* Wheel */}
              <div className="relative w-56 h-56 mx-auto mb-4">
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                  <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent" style={{ borderTopColor: '#FF7A00', filter: 'drop-shadow(0 2px 4px rgba(255,122,0,0.5))' }} />
                </div>

                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full z-20 flex items-center justify-center"
                  style={{ backgroundColor: '#2d1b4e', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  <span className="text-[8px]">🎯</span>
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
                          <text x={tx} y={ty - 4} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold">
                            {item.prize.emoji}
                          </text>
                          <text x={tx} y={ty + 10} textAnchor="middle" dominantBaseline="middle" fontSize="5" fontWeight="bold" fill="white">
                            {item.prize.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
              </div>

              {/* Result */}
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

              {/* Spin Button */}
              {!result && (
                <button
                  onClick={handleSpin}
                  disabled={spinTickets <= 0 || spinning}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}
                >
                  <Play className="w-4 h-4" />
                  {spinning ? 'Spinning...' : `SPIN (${spinTickets} tickets)`}
                </button>
              )}

              {/* No tickets info */}
              {spinTickets <= 0 && !result && (
                <p className="text-center text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  No spin tickets! Play games, claim daily rewards, or get them from the shop.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
