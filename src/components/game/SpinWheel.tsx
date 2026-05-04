'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play } from 'lucide-react'
import { PowerUp } from '@/hooks/useGame'

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

// 8 items with weighted probabilities (normalized to 100%)
const PRIZE_POOL: { prize: SpinPrize; weight: number }[] = [
  { prize: { type: 'blast', count: 2, label: '2 Blast', emoji: '💣', color: '#FF7A00' }, weight: 13 },
  { prize: { type: 'magnet', count: 3, label: '3 Magnet', emoji: '🧲', color: '#00E676' }, weight: 11 },
  { prize: { type: 'blast', count: 1, label: '1 Blast', emoji: '💣', color: '#FF9F1C' }, weight: 18 },
  { prize: { type: 'hammer', count: 2, label: '2 Hammer', emoji: '🔨', color: '#F59563' }, weight: 11 },
  { prize: { type: 'respin', count: 1, label: 'Re-Spin!', emoji: '🔄', color: '#EDC22E' }, weight: 7 },
  { prize: { type: 'undo', count: 3, label: '3 Undo', emoji: '↩️', color: '#8f7a66' }, weight: 11 },
  { prize: { type: 'spin', count: 1, label: '1 Spin Ticket', emoji: '🎫', color: '#00FFFF' }, weight: 16 },
  { prize: { type: 'coin', count: 100, label: '100 Coins', emoji: '💰', color: '#EDC22E' }, weight: 13 },
]

function pickPrize(): { index: number; prize: SpinPrize } {
  const totalWeight = PRIZE_POOL.reduce((sum, p) => sum + p.weight, 0)
  let random = Math.random() * totalWeight
  for (let i = 0; i < PRIZE_POOL.length; i++) {
    random -= PRIZE_POOL[i].weight
    if (random <= 0) {
      return { index: i, prize: PRIZE_POOL[i].prize }
    }
  }
  return { index: 0, prize: PRIZE_POOL[0].prize }
}

export function SpinWheel({ isOpen, onClose, spinTickets, onUseTicket, onWinPrize, onWatchAdForSpin, isOnline }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ index: number; prize: SpinPrize } | null>(null)

  const handleSpin = useCallback(() => {
    if (spinTickets <= 0 || spinning) return
    setSpinning(true)
    setResult(null)
    onUseTicket()

    const win = pickPrize()
    setTimeout(() => {
      setResult(win)
      setSpinning(false)
    }, 3000)
  }, [spinTickets, spinning, onUseTicket])

  const handleClaim = useCallback(() => {
    if (!result) return
    onWinPrize(result.prize)
    setResult(null)
  }, [result, onWinPrize])

  // Wheel rotation: each slice = 45deg. Prize at index i is centered at i*45 + 22.5
  const targetRotation = result ? 360 * 5 + (360 - (result.index * 45 + 22.5)) : 0

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
                Tickets: <span style={{ color: '#EDC22E' }}>{spinTickets}</span>
              </p>

              {/* Wheel */}
              <div className="relative w-52 h-52 mx-auto mb-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                  <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent" style={{ borderTopColor: '#FF7A00', filter: 'drop-shadow(0 2px 4px rgba(255,122,0,0.5))' }} />
                </div>

                <motion.div
                  className="w-full h-full rounded-full border-4 overflow-hidden"
                  style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                  animate={{ rotate: spinning ? targetRotation : result ? targetRotation : 0 }}
                  transition={{ duration: spinning ? 3 : 0.5, ease: spinning ? [0.15, 0.85, 0.25, 1] : 'easeOut' }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {PRIZE_POOL.map((item, i) => {
                      const startAngle = i * 45
                      const endAngle = startAngle + 45
                      const startRad = (startAngle - 90) * Math.PI / 180
                      const endRad = (endAngle - 90) * Math.PI / 180
                      const x1 = 100 + 90 * Math.cos(startRad)
                      const y1 = 100 + 90 * Math.sin(startRad)
                      const x2 = 100 + 90 * Math.cos(endRad)
                      const y2 = 100 + 90 * Math.sin(endRad)
                      const midRad = (startAngle + 22.5 - 90) * Math.PI / 180
                      const tx = 100 + 52 * Math.cos(midRad)
                      const ty = 100 + 52 * Math.sin(midRad)

                      return (
                        <g key={i}>
                          <path
                            d={`M100,100 L${x1},${y1} A90,90 0 0,1 ${x2},${y2} Z`}
                            fill={i % 2 === 0 ? item.prize.color + '35' : item.prize.color + '18'}
                            stroke={item.prize.color + '50'}
                            strokeWidth="1"
                          />
                          <text x={tx} y={ty - 5} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="white">
                            {item.prize.emoji}
                          </text>
                          <text x={tx} y={ty + 10} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fontWeight="bold" fill="white">
                            {item.prize.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </motion.div>
              </div>

              {/* Result */}
              {result && !spinning && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center mb-3">
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

              {/* Spin Button */}
              <button
                onClick={handleSpin}
                disabled={spinTickets <= 0 || spinning}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}
              >
                <Play className="w-4 h-4" />
                {spinning ? 'Spinning...' : `SPIN (${spinTickets} tickets)`}
              </button>

              {/* Watch ad for spin */}
              {isOnline && (
                <button
                  onClick={onWatchAdForSpin}
                  className="w-full mt-2 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  📺 Watch Ad → +1 Spin Ticket
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
