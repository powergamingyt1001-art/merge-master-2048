'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play } from 'lucide-react'

interface SpinWheelProps {
  isOpen: boolean
  onClose: () => void
  spinTickets: number
  isOnline: boolean
  onSpin: () => void
  onEarnTicket: () => void
}

const PRIZES = [
  { label: '❤️ Life', color: '#F65E3B' },
  { label: '🔨 Hammer', color: '#F59563' },
  { label: '💰 100 Pts', color: '#EDC22E' },
  { label: '🧲 Magnet', color: '#00E676' },
  { label: '💣 Blast', color: '#FF7A00' },
  { label: '2X Score', color: '#FF9F1C' },
  { label: '🎰 3 Spins', color: '#EDC22E' },
  { label: '🎁 Mystery', color: '#FF00FF' },
]

export function SpinWheel({ isOpen, onClose, spinTickets, isOnline, onSpin, onEarnTicket }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)

  const handleSpin = useCallback(() => {
    if (spinTickets <= 0 || spinning) return
    setSpinning(true)
    setResult(null)
    onSpin()

    const winIndex = Math.floor(Math.random() * PRIZES.length)
    setTimeout(() => {
      setResult(winIndex)
      setSpinning(false)
    }, 3000)
  }, [spinTickets, spinning, onSpin])

  const handleWatchAd = useCallback(() => {
    if (!isOnline) return
    onEarnTicket()
  }, [isOnline, onEarnTicket])

  const wheelRotation = spinning ? 1800 + Math.floor(Math.random() * 360) : result !== null ? result * 45 : 0

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
            style={{
              background: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>🎰 Spin & Win</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="px-4 pb-5">
              {/* Spin tickets */}
              <p className="text-center text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Tickets: <span style={{ color: '#EDC22E' }}>{spinTickets}</span>
              </p>

              {/* Wheel */}
              <div className="relative w-48 h-48 mx-auto mb-4">
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                  <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent" style={{ borderTopColor: '#FF7A00' }} />
                </div>

                {/* Wheel body */}
                <motion.div
                  className="w-full h-full rounded-full border-4 overflow-hidden"
                  style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                  animate={{ rotate: wheelRotation }}
                  transition={{ duration: spinning ? 3 : 0.5, ease: spinning ? [0.2, 0.8, 0.3, 1] : 'easeOut' }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {PRIZES.map((prize, i) => {
                      const startAngle = i * 45
                      const endAngle = startAngle + 45
                      const startRad = (startAngle - 90) * Math.PI / 180
                      const endRad = (endAngle - 90) * Math.PI / 180
                      const x1 = 100 + 90 * Math.cos(startRad)
                      const y1 = 100 + 90 * Math.sin(startRad)
                      const x2 = 100 + 90 * Math.cos(endRad)
                      const y2 = 100 + 90 * Math.sin(endRad)
                      const midRad = (startAngle + 22.5 - 90) * Math.PI / 180
                      const tx = 100 + 55 * Math.cos(midRad)
                      const ty = 100 + 55 * Math.sin(midRad)

                      return (
                        <g key={i}>
                          <path
                            d={`M100,100 L${x1},${y1} A90,90 0 0,1 ${x2},${y2} Z`}
                            fill={i % 2 === 0 ? prize.color + '30' : prize.color + '15'}
                            stroke={prize.color + '40'}
                            strokeWidth="1"
                          />
                          <text
                            x={tx}
                            y={ty}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="7"
                            fontWeight="bold"
                          >
                            {prize.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </motion.div>
              </div>

              {/* Result */}
              {result !== null && !spinning && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center mb-4"
                >
                  <p className="text-sm font-bold" style={{ color: PRIZES[result].color }}>
                    🎉 You won: {PRIZES[result].label}
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleSpin}
                  disabled={spinTickets <= 0 || spinning}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}
                >
                  <Play className="w-4 h-4" />
                  {spinning ? 'Spinning...' : `SPIN (${spinTickets} tickets)`}
                </button>

                {isOnline && (
                  <button
                    onClick={handleWatchAd}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-95"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    📺 Watch Ad → +3 Spin Tickets
                  </button>
                )}

                {!isOnline && (
                  <p className="text-center text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Go online to earn more tickets
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
