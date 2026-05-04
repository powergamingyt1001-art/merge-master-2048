'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Tile {
  id: number
  value: number
  row: number
  col: number
  isNew: boolean
  isMerged: boolean
}

export interface GameState {
  tiles: Tile[]
  score: number
  bestScore: number
  gameOver: boolean
  won: boolean
  keepPlaying: boolean
  canUndo: boolean
}

let tileId = 0

function getNextId(): number {
  return ++tileId
}

function getEmptyCells(tiles: Tile[]): [number, number][] {
  const occupied = new Set(tiles.map(t => `${t.row}-${t.col}`))
  const empty: [number, number][] = []
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!occupied.has(`${r}-${c}`)) {
        empty.push([r, c])
      }
    }
  }
  return empty
}

function addRandomTile(tiles: Tile[]): Tile[] {
  const empty = getEmptyCells(tiles)
  if (empty.length === 0) return tiles
  const [row, col] = empty[Math.floor(Math.random() * empty.length)]
  const value = Math.random() < 0.9 ? 2 : 4
  return [...tiles, { id: getNextId(), value, row, col, isNew: true, isMerged: false }]
}

function initGame(): Tile[] {
  tileId = 0
  let tiles: Tile[] = []
  tiles = addRandomTile(tiles)
  tiles = addRandomTile(tiles)
  return tiles
}

function slideLine(line: (Tile | null)[]): { newLine: (Tile | null)[], scoreGain: number } {
  const filtered = line.filter(t => t !== null) as Tile[]
  const result: (Tile | null)[] = []
  let scoreGain = 0

  let i = 0
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value) {
      const newValue = filtered[i].value * 2
      scoreGain += newValue
      result.push({
        id: getNextId(),
        value: newValue,
        row: 0,
        col: 0,
        isNew: false,
        isMerged: true,
      })
      i += 2
    } else {
      result.push({ ...filtered[i], id: getNextId(), isNew: false, isMerged: false })
      i++
    }
  }

  while (result.length < 4) {
    result.push(null)
  }

  return { newLine: result, scoreGain }
}

function move(tiles: Tile[], direction: Direction): { newTiles: Tile[], scoreGain: number, moved: boolean } {
  const grid: (Tile | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null))

  for (const tile of tiles) {
    grid[tile.row][tile.col] = { ...tile, isNew: false, isMerged: false }
  }

  let totalScore = 0
  const newTiles: Tile[] = []

  for (let i = 0; i < 4; i++) {
    let line: (Tile | null)[] = []

    if (direction === 'left') {
      line = [grid[i][0], grid[i][1], grid[i][2], grid[i][3]]
    } else if (direction === 'right') {
      line = [grid[i][3], grid[i][2], grid[i][1], grid[i][0]]
    } else if (direction === 'up') {
      line = [grid[0][i], grid[1][i], grid[2][i], grid[3][i]]
    } else if (direction === 'down') {
      line = [grid[3][i], grid[2][i], grid[1][i], grid[0][i]]
    }

    const { newLine, scoreGain } = slideLine(line)
    totalScore += scoreGain

    for (let j = 0; j < 4; j++) {
      const tile = newLine[j]
      if (tile) {
        let row: number, col: number
        if (direction === 'left') {
          row = i; col = j
        } else if (direction === 'right') {
          row = i; col = 3 - j
        } else if (direction === 'up') {
          row = j; col = i
        } else {
          row = 3 - j; col = i
        }

        newTiles.push({
          ...tile,
          row,
          col,
        })
      }
    }
  }

  // Check if actually moved
  const beforeKey = tiles.map(t => `${t.row}-${t.col}-${t.value}`).sort().join(',')
  const afterKey = newTiles.map(t => `${t.row}-${t.col}-${t.value}`).sort().join(',')
  const moved = beforeKey !== afterKey

  return { newTiles, scoreGain: totalScore, moved }
}

function canMove(tiles: Tile[]): boolean {
  if (tiles.length < 16) return true

  const grid: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0))
  for (const tile of tiles) {
    grid[tile.row][tile.col] = tile.value
  }

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (c + 1 < 4 && grid[r][c] === grid[r][c + 1]) return true
      if (r + 1 < 4 && grid[r][c] === grid[r + 1][c]) return true
    }
  }

  return false
}

function hasWon(tiles: Tile[]): boolean {
  return tiles.some(t => t.value >= 2048)
}

export function useGame() {
  const [state, setState] = useState<GameState>(() => {
    const tiles = initGame()
    const bestScore = typeof window !== 'undefined' ? parseInt(localStorage.getItem('best2048') || '0') : 0
    return {
      tiles,
      score: 0,
      bestScore,
      gameOver: false,
      won: false,
      keepPlaying: false,
      canUndo: false,
    }
  })

  const prevState = useRef<GameState | null>(null)

  // Save best score
  useEffect(() => {
    if (state.score > state.bestScore) {
      localStorage.setItem('best2048', state.score.toString())
    }
  }, [state.score, state.bestScore])

  const handleMove = useCallback((direction: Direction) => {
    setState(prev => {
      if (prev.gameOver) return prev
      if (prev.won && !prev.keepPlaying) return prev

      const { newTiles, scoreGain, moved } = move(prev.tiles, direction)

      if (!moved) return prev

      // Save previous state for undo
      prevState.current = prev

      const tilesWithNew = addRandomTile(newTiles)
      const newScore = prev.score + scoreGain
      const newBestScore = Math.max(newScore, prev.bestScore)
      const gameOver = !canMove(tilesWithNew)
      const won = !prev.won && hasWon(tilesWithNew)

      return {
        tiles: tilesWithNew,
        score: newScore,
        bestScore: newBestScore,
        gameOver,
        won: won || (prev.won && prev.keepPlaying),
        keepPlaying: prev.keepPlaying,
        canUndo: true,
      }
    })
  }, [])

  const undo = useCallback(() => {
    setState(prev => {
      if (!prev.canUndo || !prevState.current) return prev
      const restored = prevState.current
      prevState.current = null
      return { ...restored, canUndo: false }
    })
  }, [])

  const newGame = useCallback(() => {
    const tiles = initGame()
    prevState.current = null
    setState(prev => ({
      tiles,
      score: 0,
      bestScore: Math.max(prev.bestScore, prev.score),
      gameOver: false,
      won: false,
      keepPlaying: false,
      canUndo: false,
    }))
  }, [])

  const continueGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      won: false,
      keepPlaying: true,
    }))
  }, [])

  return {
    ...state,
    handleMove,
    newGame,
    continueGame,
    undo,
  }
}
