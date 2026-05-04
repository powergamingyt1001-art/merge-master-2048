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
  undoCount: number
  maxUndos: number
  lives: number
  maxLives: number
  hammerCount: number
  magnetCount: number
  blastCount: number
  activePowerUp: PowerUp | null
  spinTickets: number
  streakDay: number
  lastLoginDate: string
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

function initTiles(): Tile[] {
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

  return { newLine: result, scoreGain }
}

function moveTiles(tiles: Tile[], direction: Direction): { newTiles: Tile[], scoreGain: number, moved: boolean } {
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
    } else {
      line = [grid[3][i], grid[2][i], grid[1][i], grid[0][i]]
    }

    const { newLine, scoreGain } = slideLine(line)
    totalScore += scoreGain

    for (let j = 0; j < 4; j++) {
      const tile = newLine[j]
      if (tile) {
        let row: number, col: number
        if (direction === 'left') { row = i; col = j }
        else if (direction === 'right') { row = i; col = 3 - j }
        else if (direction === 'up') { row = j; col = i }
        else { row = 3 - j; col = i }
        newTiles.push({ ...tile, row, col })
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

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function loadSavedData() {
  if (typeof window === 'undefined') return { bestScore: 0, spinTickets: 5, streakDay: 0, lastLoginDate: '' }
  try {
    const saved = localStorage.getItem('mergeMaster2048')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return { bestScore: 0, spinTickets: 5, streakDay: 0, lastLoginDate: '' }
}

export function useGame() {
  const [state, setState] = useState<GameState>(() => {
    const saved = loadSavedData()
    const tiles = initTiles()
    const today = getTodayStr()
    let streakDay = saved.streakDay || 0
    let lastLoginDate = saved.lastLoginDate || ''

    // Check streak
    if (lastLoginDate && lastLoginDate !== today) {
      const lastDate = new Date(lastLoginDate)
      const todayDate = new Date(today)
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        streakDay = Math.min(streakDay + 1, 6) // 0-6 for 7 days
      } else if (diffDays > 1) {
        streakDay = 0 // Reset streak
      }
    }

    return {
      tiles,
      score: 0,
      bestScore: saved.bestScore || 0,
      gameOver: false,
      won: false,
      keepPlaying: false,
      canUndo: false,
      undoCount: 0,
      maxUndos: 5,
      lives: 3,
      maxLives: 3,
      hammerCount: 1,
      magnetCount: 1,
      blastCount: 1,
      activePowerUp: null,
      spinTickets: saved.spinTickets ?? 5,
      streakDay,
      lastLoginDate: today,
    }
  })

  const prevState = useRef<GameState | null>(null)

  // Save data
  useEffect(() => {
    const data = {
      bestScore: state.bestScore,
      spinTickets: state.spinTickets,
      streakDay: state.streakDay,
      lastLoginDate: state.lastLoginDate,
    }
    localStorage.setItem('mergeMaster2048', JSON.stringify(data))
  }, [state.bestScore, state.spinTickets, state.streakDay, state.lastLoginDate])

  // Clear flash after short time
  useEffect(() => {
    const hasFlash = state.tiles.some(t => t.flash)
    if (hasFlash) {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          tiles: prev.tiles.map(t => ({ ...t, flash: false })),
        }))
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [state.tiles])

  const handleMove = useCallback((direction: Direction) => {
    setState(prev => {
      if (prev.gameOver) return prev
      if (prev.won && !prev.keepPlaying) return prev
      if (prev.activePowerUp) return prev

      const { newTiles, scoreGain, moved } = moveTiles(prev.tiles, direction)
      if (!moved) return prev

      prevState.current = prev

      const tilesWithNew = addRandomTile(newTiles)
      const newScore = prev.score + scoreGain
      const newBestScore = Math.max(newScore, prev.bestScore)
      const isStuck = !canMove(tilesWithNew)
      const won = !prev.won && hasWon(tilesWithNew)

      // If stuck, lose a life
      let newLives = prev.lives
      let isGameOver = false
      if (isStuck) {
        newLives = prev.lives - 1
        if (newLives <= 0) {
          isGameOver = true
          newLives = 0
        }
      }

      return {
        ...prev,
        tiles: tilesWithNew,
        score: newScore,
        bestScore: newBestScore,
        gameOver: isGameOver,
        won: won || (prev.won && prev.keepPlaying),
        canUndo: true,
        undoCount: 0,
        lives: newLives,
      }
    })
  }, [])

  const undo = useCallback(() => {
    setState(prev => {
      if (!prev.canUndo || !prevState.current) return prev
      if (prev.undoCount >= prev.maxUndos) return prev
      const restored = prevState.current
      prevState.current = null
      return { ...restored, canUndo: false, undoCount: prev.undoCount + 1 }
    })
  }, [])

  // When stuck but has lives left, restart board
  const restartAfterStuck = useCallback(() => {
    setState(prev => {
      if (prev.lives <= 0) return prev
      const tiles = initTiles()
      return {
        ...prev,
        tiles,
        score: 0,
        gameOver: false,
        won: false,
        keepPlaying: false,
        canUndo: false,
        undoCount: 0,
        activePowerUp: null,
      }
    })
  }, [])

  const activatePowerUp = useCallback((pu: PowerUp) => {
    setState(prev => {
      if (prev.activePowerUp === pu) return { ...prev, activePowerUp: null }
      if (pu === 'hammer' && prev.hammerCount <= 0) return prev
      if (pu === 'magnet' && prev.magnetCount <= 0) return prev
      if (pu === 'blast' && prev.blastCount <= 0) return prev
      if (pu === 'blast') {
        // Blast activates immediately
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
      }
      return { ...prev, activePowerUp: pu }
    })
  }, [])

  const handleTileClick = useCallback((row: number, col: number) => {
    setState(prev => {
      if (prev.activePowerUp === 'hammer') {
        const tileExists = prev.tiles.some(t => t.row === row && t.col === col)
        if (!tileExists || prev.hammerCount <= 0) return { ...prev, activePowerUp: null }
        prevState.current = prev
        return {
          ...prev,
          tiles: prev.tiles.filter(t => !(t.row === row && t.col === col)),
          hammerCount: prev.hammerCount - 1,
          activePowerUp: null,
          canUndo: true,
        }
      }

      if (prev.activePowerUp === 'magnet') {
        const targetTile = prev.tiles.find(t => t.row === row && t.col === col)
        if (!targetTile || prev.magnetCount <= 0) return { ...prev, activePowerUp: null }
        const sameValueTiles = prev.tiles.filter(t => t.value === targetTile.value && !(t.row === row && t.col === col))
        if (sameValueTiles.length === 0) return { ...prev, activePowerUp: null }

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
      }

      return prev
    })
  }, [])

  const reviveWithAd = useCallback(() => {
    setState(prev => ({
      ...prev,
      lives: Math.min(prev.lives + 1, prev.maxLives),
      gameOver: false,
    }))
  }, [])

  const newGame = useCallback(() => {
    const tiles = initTiles()
    prevState.current = null
    setState(prev => ({
      ...prev,
      tiles,
      score: 0,
      gameOver: false,
      won: false,
      keepPlaying: false,
      canUndo: false,
      undoCount: 0,
      lives: prev.maxLives,
      activePowerUp: null,
    }))
  }, [])

  const continueGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      won: false,
      keepPlaying: true,
    }))
  }, [])

  const useSpinTicket = useCallback(() => {
    setState(prev => {
      if (prev.spinTickets <= 0) return prev
      return { ...prev, spinTickets: prev.spinTickets - 1 }
    })
  }, [])

  const addSpinTickets = useCallback((count: number) => {
    setState(prev => ({ ...prev, spinTickets: prev.spinTickets + count }))
  }, [])

  const earnPowerUp = useCallback((pu: PowerUp) => {
    setState(prev => {
      switch (pu) {
        case 'hammer': return { ...prev, hammerCount: prev.hammerCount + 1 }
        case 'magnet': return { ...prev, magnetCount: prev.magnetCount + 1 }
        case 'blast': return { ...prev, blastCount: prev.blastCount + 1 }
        default: return prev
      }
    })
  }, [])

  return {
    ...state,
    handleMove,
    newGame,
    continueGame,
    undo,
    activatePowerUp,
    handleTileClick,
    reviveWithAd,
    restartAfterStuck,
    useSpinTicket,
    addSpinTickets,
    earnPowerUp,
  }
}
