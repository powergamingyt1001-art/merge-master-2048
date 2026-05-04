'use client'

import { motion } from 'framer-motion'

const TILE_COLORS: Record<number, { bg: string; text: string; glow?: string }> = {
  2: { bg: '#EEE4DA', text: '#776E65' },
  4: { bg: '#EDE0C8', text: '#776E65' },
  8: { bg: '#F2B179', text: '#FFFFFF' },
  16: { bg: '#F59563', text: '#FFFFFF' },
  32: { bg: '#F67C5F', text: '#FFFFFF' },
  64: { bg: '#F65E3B', text: '#FFFFFF' },
  128: { bg: '#EDCF72', text: '#FFFFFF', glow: '#EDCF72' },
  256: { bg: '#EDCC61', text: '#FFFFFF', glow: '#EDCC61' },
  512: { bg: '#EDC850', text: '#FFFFFF', glow: '#EDC850' },
  1024: { bg: '#EDC53F', text: '#FFFFFF', glow: '#EDC53F' },
  2048: { bg: '#EDC22E', text: '#FFFFFF', glow: '#FF7A00' },
  // Advanced
  4096: { bg: '#FF9F1C', text: '#FFFFFF', glow: '#FF9F1C' },
  8192: { bg: '#FF7A00', text: '#FFFFFF', glow: '#FF7A00' },
  16384: { bg: '#00E676', text: '#FFFFFF', glow: '#00E676' },
  32768: { bg: '#00C853', text: '#FFFFFF', glow: '#00C853' },
  // Ultra
  65536: { bg: '#00FFFF', text: '#FFFFFF', glow: '#00FFFF' },
  131072: { bg: '#FF00FF', text: '#FFFFFF', glow: '#FF00FF' },
}

function getTileStyle(value: number) {
  if (TILE_COLORS[value]) return TILE_COLORS[value]
  return { bg: '#3c3a32', text: '#f9f6f2', glow: '#3c3a32' }
}

function getFontSize(value: number, cellSize: number): string {
  if (value >= 100000) return `${cellSize * 0.18}px`
  if (value >= 10000) return `${cellSize * 0.22}px`
  if (value >= 1000) return `${cellSize * 0.26}px`
  if (value >= 100) return `${cellSize * 0.32}px`
  return `${cellSize * 0.4}px`
}

interface TileProps {
  id: number
  value: number
  row: number
  col: number
  isNew: boolean
  isMerged: boolean
  flash: boolean
  cellSize: number
  gap: number
  onClick?: () => void
  isHighlighted?: boolean
}

export function TileComponent({ value, row, col, isNew, isMerged, flash, cellSize, gap, onClick, isHighlighted }: TileProps) {
  const style = getTileStyle(value)
  const offset = (r: number) => r * (cellSize + gap) + gap

  const glowIntensity = value >= 2048 ? 0.6 : value >= 128 ? 0.3 : 0
  const glowColor = style.glow || style.bg

  return (
    <motion.div
      layout
      initial={isNew ? { scale: 0, opacity: 0 } : false}
      animate={{
        x: offset(col),
        y: offset(row),
        scale: isMerged ? [1, 1.18, 1] : isNew ? 1 : 1,
        opacity: 1,
      }}
      transition={{
        layout: { type: 'spring', stiffness: 400, damping: 35, mass: 0.8 },
        scale: { duration: 0.18, ease: 'easeOut' },
        opacity: { duration: 0.08 },
      }}
      className="absolute rounded-lg flex items-center justify-center font-extrabold select-none cursor-pointer"
      style={{
        width: cellSize,
        height: cellSize,
        backgroundColor: style.bg,
        color: style.text,
        fontSize: getFontSize(value, cellSize),
        zIndex: isMerged ? 10 : 1,
        boxShadow: glowIntensity > 0
          ? `0 0 ${cellSize * 0.5}px ${cellSize * 0.15}px ${glowColor}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}, 0 2px 8px rgba(0,0,0,0.15)`
          : '0 2px 8px rgba(0,0,0,0.1)',
        border: isHighlighted ? '3px solid #00FFFF' : value >= 128 ? '2px solid rgba(255,255,255,0.3)' : 'none',
        textShadow: value >= 128 ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
      }}
      onClick={onClick}
    >
      {/* Flash overlay on merge */}
      {flash && (
        <motion.div
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 rounded-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        />
      )}
      {/* Merge glow ring */}
      {isMerged && (
        <motion.div
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="absolute inset-0 rounded-lg"
          style={{ border: `3px solid ${style.glow || '#FF7A00'}` }}
        />
      )}
      {value}
    </motion.div>
  )
}
