'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type PowerUp = 'hammer' | 'magnet' | 'blast'
export type GameMode = 'classic' | 'bot' | 'coins'

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
  avatar: string
  finalScore: number
}

export interface InvitedUser {
  id: string
  name: string
  joinedAt: string
  commissionEarned: number
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'reward' | 'rank' | 'invite' | 'commission' | 'system' | 'battle'
  emoji: string
  timestamp: string
  read: boolean
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
  // Game points - only from actual gameplay (for ranking)
  gamePoints: number
  // Bot mode
  gameMode: GameMode
  botOpponent: BotOpponent | null
  botBattleResult: 'win' | 'lose' | null
  modBestScore: number
  // Battle timer
  battleTimer: number
  battleTimeLimit: number
  // Combo system
  consecutiveMerges: number
  comboBonus: number
  // Invite system
  inviteCode: string
  invitedBy: string | null
  invitedUsers: InvitedUser[]
  commissionBalance: number
  commissionClaimed: number
  autoClaimCommission: boolean
  // Daily game limit
  gamesPlayedToday: number
  lastPlayDate: string
  maxGamesPerDay: number
  // Notifications
  notifications: Notification[]
  // Coin game mode
  coinEntryFee: number
  coinGameWon: boolean | null
  // Player profile
  playerName: string
  playerAvatar: string
  playerLevel: number
  // Win/loss tracking for percentage
  totalBattlesPlayed: number
  totalBattlesWon: number
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

export const PLAYER_AVATARS = ['😎', '🦊', '🐺', '🦅', '🐉', '🦁', '👑', '🔥', '💎', '⚡']

let tileId = 0

function getNextId(): number {
  return ++tileId
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
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

function slideLine(line: (Tile | null)[]): { newLine: (Tile | null)[], scoreGain: number, mergeCount: number } {
  const filtered = line.filter(t => t !== null) as Tile[]
  const result: (Tile | null)[] = []
  let scoreGain = 0
  let mergeCount = 0

  let i = 0
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value) {
      const newValue = filtered[i].value * 2
      scoreGain += newValue
      mergeCount++
      result.push({ id: getNextId(), value: newValue, row: 0, col: 0, isNew: false, isMerged: true, flash: true })
      i += 2
    } else {
      result.push({ ...filtered[i], id: getNextId(), isNew: false, isMerged: false, flash: false })
      i++
    }
  }

  while (result.length < 4) result.push(null)
  return { newLine: result, scoreGain, mergeCount }
}

function moveTiles(tiles: Tile[], direction: Direction): { newTiles: Tile[], scoreGain: number, moved: boolean, mergeCount: number } {
  const grid: (Tile | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null))
  for (const tile of tiles) grid[tile.row][tile.col] = { ...tile, isNew: false, isMerged: false, flash: false }

  let totalScore = 0
  let totalMergeCount = 0
  const newTiles: Tile[] = []

  for (let i = 0; i < 4; i++) {
    let line: (Tile | null)[] = []
    if (direction === 'left') line = [grid[i][0], grid[i][1], grid[i][2], grid[i][3]]
    else if (direction === 'right') line = [grid[i][3], grid[i][2], grid[i][1], grid[i][0]]
    else if (direction === 'up') line = [grid[0][i], grid[1][i], grid[2][i], grid[3][i]]
    else line = [grid[3][i], grid[2][i], grid[1][i], grid[0][i]]

    const { newLine, scoreGain, mergeCount } = slideLine(line)
    totalScore += scoreGain
    totalMergeCount += mergeCount

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
  return { newTiles, scoreGain: totalScore, moved: beforeKey !== afterKey, mergeCount: totalMergeCount }
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

// Generate realistic bot score for 1-minute gameplay - 50/50 win chance
function generateBotScore(playerBestScore: number): BotOpponent {
  const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
  // Base score around player's ability for 50-50 chance
  const base = Math.max(playerBestScore, 200)
  // Add randomness: 50% chance bot scores higher, 50% lower
  const variance = base * 0.5
  const finalScore = Math.round(Math.max(50, base + (Math.random() * variance * 2 - variance)))
  return { ...bot, finalScore }
}

// Calculate player level from game points
function calculateLevel(gamePoints: number): number {
  if (gamePoints >= 10000) return 5
  if (gamePoints >= 5000) return 4
  if (gamePoints >= 2000) return 3
  if (gamePoints >= 500) return 2
  return 1
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
      gamePoints: 0,
      gameMode: 'classic',
      botOpponent: null,
      botBattleResult: null,
      modBestScore: 0,
      battleTimer: 0,
      battleTimeLimit: 60,
      consecutiveMerges: 0,
      comboBonus: 0,
      inviteCode: '',
      invitedBy: null,
      invitedUsers: [],
      commissionBalance: 0,
      commissionClaimed: 0,
      autoClaimCommission: false,
      gamesPlayedToday: 0,
      lastPlayDate: today,
      maxGamesPerDay: 20,
      notifications: [],
      coinEntryFee: 0,
      coinGameWon: null,
      playerName: 'Player',
      playerAvatar: '😎',
      playerLevel: 1,
      totalBattlesPlayed: 0,
      totalBattlesWon: 0,
    }

    if (!saved) {
      return { ...defaults, inviteCode: generateInviteCode() }
    }

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
        streakDay = 0
        const newClaimed = [...streakClaimed]
        for (let i = 0; i < 7; i++) {
          if (!newClaimed[i]) newClaimed[i] = false
        }
      }
    }

    // Check URL for invite code (auto-detect)
    let invitedBy = saved.invitedBy || null
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref')
      if (ref && !invitedBy) {
        invitedBy = ref
      }
    }

    // Reset daily game count if new day
    let gamesPlayedToday = saved.gamesPlayedToday || 0
    const savedLastPlayDate = saved.lastPlayDate || today
    if (savedLastPlayDate !== today) {
      gamesPlayedToday = 0
    }

    const gamePoints = saved.gamePoints || 0

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
      gamePoints,
      modBestScore: saved.modBestScore || 0,
      inviteCode: saved.inviteCode || generateInviteCode(),
      invitedBy,
      invitedUsers: saved.invitedUsers || [],
      commissionBalance: saved.commissionBalance || 0,
      commissionClaimed: saved.commissionClaimed || 0,
      autoClaimCommission: saved.autoClaimCommission || false,
      gamesPlayedToday,
      lastPlayDate: today,
      notifications: saved.notifications || [],
      playerName: saved.playerName || 'Player',
      playerAvatar: saved.playerAvatar || '😎',
      playerLevel: calculateLevel(gamePoints),
      totalBattlesPlayed: saved.totalBattlesPlayed || 0,
      totalBattlesWon: saved.totalBattlesWon || 0,
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
      gamePoints: state.gamePoints,
      modBestScore: state.modBestScore,
      inviteCode: state.inviteCode,
      invitedBy: state.invitedBy,
      invitedUsers: state.invitedUsers,
      commissionBalance: state.commissionBalance,
      commissionClaimed: state.commissionClaimed,
      autoClaimCommission: state.autoClaimCommission,
      gamesPlayedToday: state.gamesPlayedToday,
      lastPlayDate: state.lastPlayDate,
      notifications: state.notifications.slice(0, 50), // Keep last 50
      playerName: state.playerName,
      playerAvatar: state.playerAvatar,
      playerLevel: state.playerLevel,
      totalBattlesPlayed: state.totalBattlesPlayed,
      totalBattlesWon: state.totalBattlesWon,
    }
    localStorage.setItem('mergeMaster2048', JSON.stringify(data))
  }, [state.bestScore, state.spinTickets, state.streakDay, state.lastLoginDate, state.streakClaimed, state.welcomeClaimed, state.hammerCount, state.magnetCount, state.blastCount, state.undoTotal, state.coins, state.gamePoints, state.modBestScore, state.inviteCode, state.invitedBy, state.invitedUsers, state.commissionBalance, state.commissionClaimed, state.autoClaimCommission, state.gamesPlayedToday, state.lastPlayDate, state.notifications, state.playerName, state.playerAvatar, state.playerLevel, state.totalBattlesPlayed, state.totalBattlesWon])

  // Clear flash
  useEffect(() => {
    if (state.tiles.some(t => t.flash)) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, tiles: prev.tiles.map(t => ({ ...t, flash: false })) }))
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [state.tiles])

  const addNotification = useCallback((title: string, message: string, type: Notification['type'], emoji: string) => {
    const notif: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      emoji,
      timestamp: new Date().toISOString(),
      read: false,
    }
    setState(prev => ({
      ...prev,
      notifications: [notif, ...prev.notifications].slice(0, 50),
    }))
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }))
  }, [])

  const handleMove = useCallback((direction: Direction) => {
    setState(prev => {
      if (prev.gameOver || (prev.won && !prev.keepPlaying) || prev.activePowerUp) return prev

      const { newTiles, scoreGain, moved, mergeCount } = moveTiles(prev.tiles, direction)
      if (!moved) return prev

      prevState.current = prev
      const tilesWithNew = addRandomTile(newTiles)

      // Combo system: 3 consecutive merges = 1/5 extra point bonus
      let newConsecutiveMerges = prev.consecutiveMerges
      let newComboBonus = prev.comboBonus
      let comboExtra = 0
      if (mergeCount > 0) {
        newConsecutiveMerges += mergeCount
        if (newConsecutiveMerges >= 3) {
          comboExtra = Math.round(scoreGain / 5)
          newComboBonus += comboExtra
          newConsecutiveMerges = 0 // Reset after combo
        }
      } else {
        newConsecutiveMerges = 0 // Reset if no merge
      }

      const newScore = prev.score + scoreGain + comboExtra
      const newBestScore = Math.max(newScore, prev.bestScore)
      const isStuck = !canMove(tilesWithNew)
      const won = !prev.won && hasWon(tilesWithNew)

      let newLives = prev.lives
      let isGameOver = false
      if (isStuck) {
        newLives = prev.lives - 1
        if (newLives <= 0) { isGameOver = true; newLives = 0 }
      }

      // Bot battle check - timer based
      let botBattleResult = prev.botBattleResult
      let modBestScore = prev.modBestScore
      let coinGameWon = prev.coinGameWon
      let totalBattlesPlayed = prev.totalBattlesPlayed
      let totalBattlesWon = prev.totalBattlesWon
      if (prev.gameMode === 'bot' && prev.botOpponent && !botBattleResult) {
        if (isGameOver) {
          botBattleResult = newScore > prev.botOpponent.finalScore ? 'win' : 'lose'
          totalBattlesPlayed++
          if (botBattleResult === 'win') {
            modBestScore = Math.max(modBestScore, newScore)
            totalBattlesWon++
          }
        }
      }

      // Coin game mode check
      if (prev.gameMode === 'coins' && isGameOver) {
        const opponent = generateBotScore(prev.modBestScore)
        coinGameWon = newScore > opponent.finalScore ? true : false
        botBattleResult = coinGameWon ? 'win' : 'lose'
        totalBattlesPlayed++
        if (coinGameWon) {
          modBestScore = Math.max(modBestScore, newScore)
          totalBattlesWon++
        }
      }

      // Game points only from actual gameplay
      const newGamePoints = prev.gamePoints + scoreGain + comboExtra

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
        consecutiveMerges: newConsecutiveMerges,
        comboBonus: newComboBonus,
        gamePoints: newGamePoints,
        coinGameWon,
        playerLevel: calculateLevel(newGamePoints),
        totalBattlesPlayed,
        totalBattlesWon,
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
      return { ...prev, tiles, score: 0, gameOver: false, won: false, keepPlaying: false, canUndo: false, undoCount: 0, activePowerUp: null, consecutiveMerges: 0, comboBonus: 0 }
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
        return { ...prev, tiles: newTiles, score: prev.score + newValue, magnetCount: prev.magnetCount - 1, activePowerUp: null, canUndo: true, gamePoints: prev.gamePoints + newValue }
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
      battleTimer: 0,
      consecutiveMerges: 0,
      comboBonus: 0,
      coinEntryFee: 0,
      coinGameWon: null,
    }))
  }, [])

  const startBotBattle = useCallback((timeLimit: number = 60) => {
    const tiles = initTiles()
    prevState.current = null
    setState(prev => {
      // Check daily limit
      const today = getTodayStr()
      const gamesToday = prev.lastPlayDate === today ? prev.gamesPlayedToday : 0
      if (gamesToday >= prev.maxGamesPerDay) return prev

      const opponent = generateBotScore(prev.modBestScore)
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
        battleTimer: timeLimit,
        battleTimeLimit: timeLimit,
        consecutiveMerges: 0,
        comboBonus: 0,
        gamesPlayedToday: gamesToday + 1,
        lastPlayDate: today,
        coinEntryFee: 0,
        coinGameWon: null,
      }
    })
  }, [])

  const startCoinGame = useCallback((entryFee: number) => {
    const tiles = initTiles()
    prevState.current = null
    setState(prev => {
      // Check daily limit
      const today = getTodayStr()
      const gamesToday = prev.lastPlayDate === today ? prev.gamesPlayedToday : 0
      if (gamesToday >= prev.maxGamesPerDay) return prev
      if (prev.coins < entryFee) return prev

      const opponent = generateBotScore(prev.modBestScore)
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
        gameMode: 'coins',
        botOpponent: opponent,
        botBattleResult: null,
        battleTimer: 90,
        battleTimeLimit: 90, // Coin games: 1:30 min = 90 seconds
        consecutiveMerges: 0,
        comboBonus: 0,
        coins: prev.coins - entryFee,
        coinEntryFee: entryFee,
        coinGameWon: null,
        gamesPlayedToday: gamesToday + 1,
        lastPlayDate: today,
      }
    })
  }, [])

  const tickBattleTimer = useCallback(() => {
    setState(prev => {
      if (prev.gameMode !== 'bot' && prev.gameMode !== 'coins') return prev
      if (prev.botBattleResult || prev.battleTimer <= 0) return prev
      const newTimer = prev.battleTimer - 1
      if (newTimer <= 0) {
        // Time's up - compare scores
        const result = prev.score > (prev.botOpponent?.finalScore ?? 0) ? 'win' : 'lose'
        const newModBest = result === 'win' ? Math.max(prev.modBestScore, prev.score) : prev.modBestScore
        const coinGameWon = result === 'win' ? true : false
        return { ...prev, battleTimer: 0, botBattleResult: result, gameOver: true, modBestScore: newModBest, coinGameWon, totalBattlesPlayed: prev.totalBattlesPlayed + 1, totalBattlesWon: result === 'win' ? prev.totalBattlesWon + 1 : prev.totalBattlesWon }
      }
      return { ...prev, battleTimer: newTimer }
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
    setState(prev => {
      const newCoins = prev.coins + amount
      // If auto-claim is on and there's commission, auto-claim it
      let newCommissionBalance = prev.commissionBalance
      let newCommissionClaimed = prev.commissionClaimed
      if (prev.autoClaimCommission && prev.commissionBalance > 0) {
        newCommissionClaimed += prev.commissionBalance
        newCommissionBalance = 0
      }
      return { ...prev, coins: newCoins, commissionBalance: newCommissionBalance, commissionClaimed: newCommissionClaimed }
    })
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
      battleTimer: 0,
      consecutiveMerges: 0,
      comboBonus: 0,
      coinEntryFee: 0,
      coinGameWon: null,
    }))
  }, [])

  // Invite system
  const claimInviteReward = useCallback(() => {
    setState(prev => {
      if (prev.invitedBy) {
        return {
          ...prev,
          coins: prev.coins + 500,
          spinTickets: prev.spinTickets + 2,
          magnetCount: prev.magnetCount + 2,
          invitedBy: null, // Clear after claiming
        }
      }
      return prev
    })
  }, [])

  const addInvitedUser = useCallback((name: string) => {
    setState(prev => {
      const newUser: InvitedUser = {
        id: Date.now().toString(),
        name,
        joinedAt: new Date().toISOString(),
        commissionEarned: 0,
      }
      return {
        ...prev,
        invitedUsers: [...prev.invitedUsers, newUser],
      }
    })
  }, [])

  const addCommission = useCallback((amount: number) => {
    setState(prev => {
      const newBalance = prev.commissionBalance + amount
      if (prev.autoClaimCommission) {
        return {
          ...prev,
          coins: prev.coins + amount,
          commissionClaimed: prev.commissionClaimed + amount,
        }
      }
      return { ...prev, commissionBalance: newBalance }
    })
  }, [])

  const claimCommission = useCallback(() => {
    setState(prev => {
      if (prev.commissionBalance <= 0) return prev
      return {
        ...prev,
        coins: prev.coins + prev.commissionBalance,
        commissionClaimed: prev.commissionClaimed + prev.commissionBalance,
        commissionBalance: 0,
      }
    })
  }, [])

  const toggleAutoClaim = useCallback(() => {
    setState(prev => ({ ...prev, autoClaimCommission: !prev.autoClaimCommission }))
  }, [])

  const updatePlayerName = useCallback((name: string) => {
    setState(prev => ({ ...prev, playerName: name }))
  }, [])

  const updatePlayerAvatar = useCallback((avatar: string) => {
    setState(prev => ({ ...prev, playerAvatar: avatar }))
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
    startCoinGame,
    tickBattleTimer,
    goBackToDashboard,
    claimInviteReward,
    addInvitedUser,
    addCommission,
    claimCommission,
    toggleAutoClaim,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    updatePlayerName,
    updatePlayerAvatar,
  }
}
