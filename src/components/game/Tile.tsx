'use client'

import { motion } from 'framer-motion'

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2: { bg: '#eee4da', text: '#776e65' },
  4: { bg: '#ede0c8', text: '#776e65' },
  8: { bg: '#f2b179', text: '#f9f6f2' },
  16: { bg: '#f59563', text: '#f9f6f2' },
  32: { bg: '#f67c5f', text: '#f9f6f2' },
  64: { bg: '#f65e3b', text: '#f9f6f2' },
  128: { bg: '#edcf72', text: '#f9f6f2' },
  256: { bg: '#edcc61', text: '#f9f6f2' },
  512: { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
}

function getTileStyle(value: number) {
  if (TILE_COLORS[value]) return TILE_COLORS[value]
  return { bg: '#3c3a32', text: '#f9f6f2' }
}

function getFontSize(value: number, cellSize: number): string {
  if (value >= 1024) return `${cellSize * 0.28}px`
  if (value >= 128) return `${cellSize * 0.33}px`
  return `${cellSize * 0.4}px`
}

interface TileProps {
  id: number
  value: number
  row: number
  col: number
  isNew: boolean
  isMerged: boolean
  cellSize: number
  gap: number
}

export function TileComponent({ value, row, col, isNew, isMerged, cellSize, gap }: TileProps) {
  const style = getTileStyle(value)
  const offset = (r: number) => r * (cellSize + gap) + gap

  return (
    <motion.div
      layout
      initial={isNew ? { scale: 0, opacity: 0 } : false}
      animate={{
        x: offset(col),
        y: offset(row),
        scale: isMerged ? [1, 1.15, 1] : isNew ? 1 : 1,
        opacity: 1,
      }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        scale: { duration: 0.15 },
        opacity: { duration: 0.1 },
      }}
      className="absolute rounded-md flex items-center justify-center font-bold select-none"
      style={{
        width: cellSize,
        height: cellSize,
        backgroundColor: style.bg,
        color: style.text,
        fontSize: getFontSize(value, cellSize),
        zIndex: isMerged ? 10 : 1,
        boxShadow: value >= 128
          ? `0 0 ${cellSize * 0.4}px ${cellSize * 0.12}px rgba(243, 215, 116, ${Math.min((value / 2048) * 0.4, 0.4)})`
          : 'none',
      }}
    >
      {value}
    </motion.div>
  )
}
