'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type PowerUp = 'hammer' | 'magnet' | 'blast'

export interface Tile {
  id: number
  value: number
  row: number
  col: number
  isNew: boolean
  isMerged: boolean
  flash: boolean
}

export interface GameState {
  tiles: Tile[]
  score: number
  bestScore: number
  gameOver: boolean
  won: boolean
  keepPlaying: boolean
  canUndo: boolean
  lives: number
  maxLives: number
  hammerCount: number
  magnetCount: number
  blastCount: number
  activePowerUp: PowerUp | null
  moveCount: number
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
  return [...tiles, { id: getNextId(), value, row, col, isNew: true, isMerged: false, flash: false }]
}

function initGame(): Tile[] {
  tileId = 0
  let tiles: Tile[] = []
  tiles = addRandomTile(tiles)
  tiles = addRandomTile(tiles)
  return tiles
}

function slideLine(line: (Tile | null)[]): { newLine: (Tile | null)[], scoreGain: number, mergedIndices: number[] } {
  const filtered = line.filter(t => t !== null) as Tile[]
  const result: (Tile | null)[] = []
  let scoreGain = 0
  const mergedIndices: number[] = []

  let i = 0
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value) {
      const newValue = filtered[i].value * 2
      scoreGain += newValue
      mergedIndices.push(result.length)
      result.push({
        id: getNextId(),
        value: newValue,
        row: 0,
        col: 0,
        isNew: false,
        isMerged: true,
        flash: true,
      })
      i += 2
    } else {
      result.push({ ...filtered[i], id: getNextId(), isNew: false, isMerged: false, flash: false })
      i++
    }
  }

  while (result.length < 4) {
    result.push(null)
  }

  return { newLine: result, scoreGain, mergedIndices }
}

function move(tiles: Tile[], direction: Direction): { newTiles: Tile[], scoreGain: number, moved: boolean } {
  const grid: (Tile | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null))

  for (const tile of tiles) {
    grid[tile.row][tile.col] = { ...tile, isNew: false, isMerged: false, flash: false }
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
    const saved = typeof window !== 'undefined' ? localStorage.getItem('mergeMaster2048') : null
    const data = saved ? JSON.parse(saved) : {}
    return {
      tiles,
      score: 0,
      bestScore: data.bestScore || 0,
      gameOver: false,
      won: false,
      keepPlaying: false,
      canUndo: false,
      lives: 3,
      maxLives: 3,
      hammerCount: 1,
      magnetCount: 1,
      blastCount: 1,
      activePowerUp: null,
      moveCount: 0,
    }
  })

  const prevState = useRef<GameState | null>(null)

  // Save progress
  useEffect(() => {
    const data = {
      bestScore: state.bestScore,
    }
    localStorage.setItem('mergeMaster2048', JSON.stringify(data))
  }, [state.bestScore])

  // Clear flash after a short time
  useEffect(() => {
    const hasFlash = state.tiles.some(t => t.flash)
    if (hasFlash) {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          tiles: prev.tiles.map(t => ({ ...t, flash: false })),
        }))
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [state.tiles])

  const handleMove = useCallback((direction: Direction) => {
    setState(prev => {
      if (prev.gameOver) return prev
      if (prev.won && !prev.keepPlaying) return prev
      if (prev.activePowerUp) return prev

      const { newTiles, scoreGain, moved } = move(prev.tiles, direction)

      if (!moved) return prev

      prevState.current = prev

      const tilesWithNew = addRandomTile(newTiles)
      const newScore = prev.score + scoreGain
      const newBestScore = Math.max(newScore, prev.bestScore)
      const isGameOver = !canMove(tilesWithNew)
      const won = !prev.won && hasWon(tilesWithNew)

      // Lose a life on game over
      let newLives = prev.lives
      if (isGameOver) {
        newLives = Math.max(0, prev.lives - 1)
      }

      return {
        ...prev,
        tiles: tilesWithNew,
        score: newScore,
        bestScore: newBestScore,
        gameOver: isGameOver,
        won: won || (prev.won && prev.keepPlaying),
        canUndo: true,
        lives: newLives,
        moveCount: prev.moveCount + 1,
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

  const useHammer = useCallback((row: number, col: number) => {
    setState(prev => {
      if (prev.hammerCount <= 0 || prev.activePowerUp !== 'hammer') return prev
      const newTiles = prev.tiles.filter(t => !(t.row === row && t.col === col))
      if (newTiles.length === prev.tiles.length) return prev // tile not found
      prevState.current = prev
      return {
        ...prev,
        tiles: newTiles,
        hammerCount: prev.hammerCount - 1,
        activePowerUp: null,
        canUndo: true,
      }
    })
  }, [])

  const useMagnet = useCallback((row: number, col: number) => {
    setState(prev => {
      if (prev.magnetCount <= 0 || prev.activePowerUp !== 'magnet') return prev
      const targetTile = prev.tiles.find(t => t.row === row && t.col === col)
      if (!targetTile) return prev

      // Find another tile with the same value
      const sameValueTiles = prev.tiles.filter(t => t.value === targetTile.value && !(t.row === row && t.col === col))
      if (sameValueTiles.length === 0) return prev

      // Merge with the first matching tile
      const mergeTarget = sameValueTiles[0]
      const newValue = targetTile.value * 2
      prevState.current = prev

      const newTiles = prev.tiles
        .filter(t => !(t.row === row && t.col === col) && !(t.row === mergeTarget.row && t.col === mergeTarget.col))
        .concat([{
          id: getNextId(),
          value: newValue,
          row: mergeTarget.row,
          col: mergeTarget.col,
          isNew: false,
          isMerged: true,
          flash: true,
        }])

      return {
        ...prev,
        tiles: newTiles,
        score: prev.score + newValue,
        magnetCount: prev.magnetCount - 1,
        activePowerUp: null,
        canUndo: true,
      }
    })
  }, [])

  const useBlast = useCallback(() => {
    setState(prev => {
      if (prev.blastCount <= 0) return prev

      // Remove ~half the tiles randomly
      const tilesToRemove = Math.ceil(prev.tiles.length / 2)
      const shuffled = [...prev.tiles].sort(() => Math.random() - 0.5)
      const remaining = shuffled.slice(tilesToRemove)

      prevState.current = prev

      return {
        ...prev,
        tiles: remaining.map(t => ({ ...t, id: getNextId(), isNew: false, isMerged: false, flash: false })),
        blastCount: prev.blastCount - 1,
        activePowerUp: null,
        canUndo: true,
      }
    })
  }, [])

  const activatePowerUp = useCallback((powerUp: PowerUp) => {
    setState(prev => {
      if (prev.activePowerUp === powerUp) {
        return { ...prev, activePowerUp: null }
      }
      // Check if available
      if (powerUp === 'hammer' && prev.hammerCount <= 0) return prev
      if (powerUp === 'magnet' && prev.magnetCount <= 0) return prev
      if (powerUp === 'blast' && prev.blastCount <= 0) return prev

      if (powerUp === 'blast') {
        // Blast activates immediately
        return prev // Will be handled by useBlast
      }

      return { ...prev, activePowerUp: powerUp }
    })
  }, [])

  const handleTileClick = useCallback((row: number, col: number) => {
    setState(prev => {
      if (prev.activePowerUp === 'hammer') {
        // Will be handled by useHammer
        return prev
      }
      if (prev.activePowerUp === 'magnet') {
        // Will be handled by useMagnet
        return prev
      }
      return prev
    })

    // Use the actual power-up functions
    const currentState = state
    if (currentState.activePowerUp === 'hammer') {
      useHammer(row, col)
    } else if (currentState.activePowerUp === 'magnet') {
      useMagnet(row, col)
    }
  }, [state.activePowerUp, useHammer, useMagnet])

  const reviveWithAd = useCallback(() => {
    setState(prev => ({
      ...prev,
      lives: Math.min(prev.lives + 1, prev.maxLives),
      gameOver: false,
    }))
  }, [])

  const earnPowerUp = useCallback((powerUp: PowerUp) => {
    setState(prev => {
      switch (powerUp) {
        case 'hammer':
          return { ...prev, hammerCount: prev.hammerCount + 1 }
        case 'magnet':
          return { ...prev, magnetCount: prev.magnetCount + 1 }
        case 'blast':
          return { ...prev, blastCount: prev.blastCount + 1 }
      }
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
      lives: prev.lives > 0 ? prev.lives : 3,
      maxLives: 3,
      hammerCount: prev.hammerCount,
      magnetCount: prev.magnetCount,
      blastCount: prev.blastCount,
      activePowerUp: null,
      moveCount: 0,
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
    useHammer,
    useMagnet,
    useBlast,
    activatePowerUp,
    handleTileClick,
    reviveWithAd,
    earnPowerUp,
  }
}
