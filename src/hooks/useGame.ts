'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type PowerUp = 'hammer' | 'magnet' | 'blast'
export type GameMode = 'classic' | 'bot'

export interface Tile {
  id: number
  value: number
  row: number
  col: number
  isNew: boolean
  isMerged: boolean
  flash: boolean
}

export interface BotOpponent {
  name: string
  targetScore: number
  avatar: string
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
  undoTotal: number
  lives: number
  maxLives: number
  hammerCount: number
  magnetCount: number
  blastCount: number
  activePowerUp: PowerUp | null
  spinTickets: number
  streakDay: number
  lastLoginDate: string
  streakClaimed: boolean[]
  welcomeClaimed: boolean
  coins: number
  // Bot mode
  gameMode: GameMode
  botOpponent: BotOpponent | null
  botBattleResult: 'win' | 'lose' | null
  modBestScore: number
}

const BOT_NAMES = [
  { name: 'Rahul Pro', avatar: '🦁' },
  { name: 'Pooja Queen', avatar: '👸' },
  { name: 'Amit King', avatar: '👑' },
  { name: 'Sneha Star', avatar: '⭐' },
  { name: 'Vikram Boss', avatar: '🔥' },
  { name: 'Anjali Ace', avatar: '💎' },
  { name: 'Ravi Master', avatar: '🏆' },
  { name: 'Priya Legend', avatar: '🌟' },
  { name: 'Karan Beast', avatar: '💪' },
  { name: 'Neha Champ', avatar: '🎯' },
]

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
      result.push({ id: getNextId(), value: newValue, row: 0, col: 0, isNew: false, isMerged: true, flash: true })
      i += 2
    } else {
      result.push({ ...filtered[i], id: getNextId(), isNew: false, isMerged: false, flash: false })
      i++
    }
  }

  while (result.length < 4) result.push(null)
  return { newLine: result, scoreGain }
}

function moveTiles(tiles: Tile[], direction: Direction): { newTiles: Tile[], scoreGain: number, moved: boolean } {
  const grid: (Tile | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null))
  for (const tile of tiles) grid[tile.row][tile.col] = { ...tile, isNew: false, isMerged: false, flash: false }

  let totalScore = 0
  const newTiles: Tile[] = []

  for (let i = 0; i < 4; i++) {
    let line: (Tile | null)[] = []
    if (direction === 'left') line = [grid[i][0], grid[i][1], grid[i][2], grid[i][3]]
    else if (direction === 'right') line = [grid[i][3], grid[i][2], grid[i][1], grid[i][0]]
    else if (direction === 'up') line = [grid[0][i], grid[1][i], grid[2][i], grid[3][i]]
    else line = [grid[3][i], grid[2][i], grid[1][i], grid[0][i]]

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
  return { newTiles, scoreGain: totalScore, moved: beforeKey !== afterKey }
}

function canMove(tiles: Tile[]): boolean {
  if (tiles.length < 16) return true
  const grid: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0))
  for (const tile of tiles) grid[tile.row][tile.col] = tile.value
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
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem('mergeMaster2048')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return null
}

function generateBotOpponent(modBestScore: number): BotOpponent {
  const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
  // Generate target score based on player's mod best - 50-50 chance
  const baseScore = Math.max(modBestScore, 200)
  const variance = baseScore * 0.4
  const targetScore = Math.round(baseScore + (Math.random() * variance * 2 - variance))
  return { ...bot, targetScore: Math.max(100, targetScore) }
}

export function useGame() {
  const [state, setState] = useState<GameState>(() => {
    const saved = loadSavedData()
    const tiles = initTiles()
    const today = getTodayStr()

    const defaults: GameState = {
      tiles,
      score: 0,
      bestScore: 0,
      gameOver: false,
      won: false,
      keepPlaying: false,
      canUndo: false,
      undoCount: 0,
      maxUndos: 5,
      undoTotal: 5,
      lives: 3,
      maxLives: 3,
      hammerCount: 0,
      magnetCount: 0,
      blastCount: 0,
      activePowerUp: null,
      spinTickets: 0,
      streakDay: 0,
      lastLoginDate: today,
      streakClaimed: [false, false, false, false, false, false, false],
      welcomeClaimed: false,
      coins: 0,
      gameMode: 'classic',
      botOpponent: null,
      botBattleResult: null,
      modBestScore: 0,
    }

    if (!saved) return defaults

    let streakDay = saved.streakDay || 0
    const lastLoginDate = saved.lastLoginDate || today
    const streakClaimed = saved.streakClaimed || [false, false, false, false, false, false, false]

    if (lastLoginDate !== today) {
      const lastDate = new Date(lastLoginDate)
      const todayDate = new Date(today)
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        streakDay = Math.min(streakDay + 1, 6)
      } else if (diffDays > 1) {
        // Streak broken - reset but keep already claimed items at 30%
        streakDay = 0
        const newClaimed = [...streakClaimed]
        for (let i = 0; i < 7; i++) {
          if (newClaimed[i]) {
            // Already claimed rewards stay claimed, but user only got 30%
          }
        }
        // Reset unclaimed
        for (let i = 0; i < 7; i++) {
          if (!newClaimed[i]) newClaimed[i] = false
        }
      }
    }

    return {
      ...defaults,
      bestScore: saved.bestScore || 0,
      spinTickets: saved.spinTickets ?? 0,
      streakDay,
      lastLoginDate: today,
      streakClaimed: saved.streakClaimed || streakClaimed,
      welcomeClaimed: saved.welcomeClaimed || false,
      hammerCount: saved.hammerCount ?? 0,
      magnetCount: saved.magnetCount ?? 0,
      blastCount: saved.blastCount ?? 0,
      undoTotal: saved.undoTotal ?? 5,
      coins: saved.coins || 0,
      modBestScore: saved.modBestScore || 0,
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
      streakClaimed: state.streakClaimed,
      welcomeClaimed: state.welcomeClaimed,
      hammerCount: state.hammerCount,
      magnetCount: state.magnetCount,
      blastCount: state.blastCount,
      undoTotal: state.undoTotal,
      coins: state.coins,
      modBestScore: state.modBestScore,
    }
    localStorage.setItem('mergeMaster2048', JSON.stringify(data))
  }, [state.bestScore, state.spinTickets, state.streakDay, state.lastLoginDate, state.streakClaimed, state.welcomeClaimed, state.hammerCount, state.magnetCount, state.blastCount, state.undoTotal, state.coins, state.modBestScore])

  // Clear flash
  useEffect(() => {
    if (state.tiles.some(t => t.flash)) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, tiles: prev.tiles.map(t => ({ ...t, flash: false })) }))
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [state.tiles])

  const handleMove = useCallback((direction: Direction) => {
    setState(prev => {
      if (prev.gameOver || (prev.won && !prev.keepPlaying) || prev.activePowerUp) return prev

      const { newTiles, scoreGain, moved } = moveTiles(prev.tiles, direction)
      if (!moved) return prev

      prevState.current = prev
      const tilesWithNew = addRandomTile(newTiles)
      const newScore = prev.score + scoreGain
      const newBestScore = Math.max(newScore, prev.bestScore)
      const isStuck = !canMove(tilesWithNew)
      const won = !prev.won && hasWon(tilesWithNew)

      let newLives = prev.lives
      let isGameOver = false
      if (isStuck) {
        newLives = prev.lives - 1
        if (newLives <= 0) { isGameOver = true; newLives = 0 }
      }

      // Bot battle check
      let botBattleResult = prev.botBattleResult
      let modBestScore = prev.modBestScore
      if (prev.gameMode === 'bot' && prev.botOpponent && !botBattleResult) {
        if (newScore >= prev.botOpponent.targetScore) {
          botBattleResult = 'win'
          modBestScore = Math.max(modBestScore, newScore)
        } else if (isGameOver) {
          botBattleResult = 'lose'
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
        botBattleResult,
        modBestScore,
      }
    })
  }, [])

  const undo = useCallback(() => {
    setState(prev => {
      if (!prev.canUndo || !prevState.current || prev.undoCount >= prev.undoTotal) return prev
      const restored = prevState.current
      prevState.current = null
      return { ...restored, canUndo: false, undoCount: prev.undoCount + 1 }
    })
  }, [])

  const restartAfterStuck = useCallback(() => {
    setState(prev => {
      if (prev.lives <= 0) return prev
      const tiles = initTiles()
      return { ...prev, tiles, score: 0, gameOver: false, won: false, keepPlaying: false, canUndo: false, undoCount: 0, activePowerUp: null }
    })
  }, [])

  const activatePowerUp = useCallback((pu: PowerUp) => {
    setState(prev => {
      if (prev.activePowerUp === pu) return { ...prev, activePowerUp: null }
      if (pu === 'hammer' && prev.hammerCount <= 0) return prev
      if (pu === 'magnet' && prev.magnetCount <= 0) return prev
      if (pu === 'blast' && prev.blastCount <= 0) return prev

      if (pu === 'blast') {
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
        if (!prev.tiles.some(t => t.row === row && t.col === col) || prev.hammerCount <= 0) return { ...prev, activePowerUp: null }
        prevState.current = prev
        return { ...prev, tiles: prev.tiles.filter(t => !(t.row === row && t.col === col)), hammerCount: prev.hammerCount - 1, activePowerUp: null, canUndo: true }
      }
      if (prev.activePowerUp === 'magnet') {
        const targetTile = prev.tiles.find(t => t.row === row && t.col === col)
        if (!targetTile || prev.magnetCount <= 0) return { ...prev, activePowerUp: null }
        const same = prev.tiles.filter(t => t.value === targetTile.value && !(t.row === row && t.col === col))
        if (same.length === 0) return { ...prev, activePowerUp: null }
        const mergeTarget = same[0]
        const newValue = targetTile.value * 2
        prevState.current = prev
        const newTiles = prev.tiles
          .filter(t => !(t.row === row && t.col === col) && !(t.row === mergeTarget.row && t.col === mergeTarget.col))
          .concat([{ id: getNextId(), value: newValue, row: mergeTarget.row, col: mergeTarget.col, isNew: false, isMerged: true, flash: true }])
        return { ...prev, tiles: newTiles, score: prev.score + newValue, magnetCount: prev.magnetCount - 1, activePowerUp: null, canUndo: true }
      }
      return prev
    })
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
      botOpponent: null,
      botBattleResult: null,
      gameMode: 'classic',
    }))
  }, [])

  const startBotBattle = useCallback(() => {
    const tiles = initTiles()
    prevState.current = null
    setState(prev => {
      const opponent = generateBotOpponent(prev.modBestScore)
      return {
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
        gameMode: 'bot',
        botOpponent: opponent,
        botBattleResult: null,
      }
    })
  }, [])

  const continueGame = useCallback(() => {
    setState(prev => ({ ...prev, won: false, keepPlaying: true }))
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

  const claimWelcome = useCallback(() => {
    setState(prev => {
      if (prev.welcomeClaimed) return prev
      return {
        ...prev,
        welcomeClaimed: true,
        hammerCount: prev.hammerCount + 5,
        magnetCount: prev.magnetCount + 5,
        blastCount: prev.blastCount + 5,
        undoTotal: prev.undoTotal + 5,
        spinTickets: prev.spinTickets + 3,
      }
    })
  }, [])

  const claimStreakDay = useCallback((day: number) => {
    setState(prev => {
      if (prev.streakClaimed[day]) return prev
      const newClaimed = [...prev.streakClaimed]
      newClaimed[day] = true

      let h = 0, m = 0, b = 0, s = 0
      switch (day) {
        case 0: m = 2; break
        case 1: s = 2; break
        case 2: m = 1; b = 1; break
        case 3: b = 2; break
        case 4: h = 1; m = 2; break
        case 5: m = 3; h = 2; break
        case 6: s = 5; break
      }

      return {
        ...prev,
        streakClaimed: newClaimed,
        hammerCount: prev.hammerCount + h,
        magnetCount: prev.magnetCount + m,
        blastCount: prev.blastCount + b,
        spinTickets: prev.spinTickets + s,
      }
    })
  }, [])

  const addCoins = useCallback((amount: number) => {
    setState(prev => ({ ...prev, coins: prev.coins + amount }))
  }, [])

  const addPowerUp = useCallback((pu: PowerUp, count: number) => {
    setState(prev => {
      switch (pu) {
        case 'hammer': return { ...prev, hammerCount: prev.hammerCount + count }
        case 'magnet': return { ...prev, magnetCount: prev.magnetCount + count }
        case 'blast': return { ...prev, blastCount: prev.blastCount + count }
        default: return prev
      }
    })
  }, [])

  const addUndos = useCallback((count: number) => {
    setState(prev => ({ ...prev, undoTotal: prev.undoTotal + count }))
  }, [])

  const reviveWithAd = useCallback(() => {
    setState(prev => ({ ...prev, lives: Math.min(prev.lives + 1, prev.maxLives), gameOver: false }))
  }, [])

  const goBackToDashboard = useCallback(() => {
    setState(prev => ({
      ...prev,
      tiles: initTiles(),
      score: 0,
      gameOver: false,
      won: false,
      keepPlaying: false,
      canUndo: false,
      undoCount: 0,
      lives: prev.maxLives,
      activePowerUp: null,
      gameMode: 'classic',
      botOpponent: null,
      botBattleResult: null,
    }))
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
    claimWelcome,
    claimStreakDay,
    addCoins,
    addPowerUp,
    addUndos,
    startBotBattle,
    goBackToDashboard,
  }
}
