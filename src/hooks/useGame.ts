'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { syncPlayerToFirebase, processReferral, processCommissionForReferrer, getReferrals, onReferralsUpdate, getCommissionNotifications, claimCommissionNotification, type FirebaseReferral, joinMatchmaking, leaveMatchmaking, findMatch, onMatchmakingUpdate, cleanupStaleMatchmaking, createBattle, joinBattle, onBattleUpdate, updateBattleScore, finishBattle, leaveBattle as firebaseLeaveBattle, markMatched, type MatchmakingEntry, type FirebaseBattle, onUserNotificationsUpdate, markNotificationDelivered } from '@/lib/firebase-service'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type PowerUp = 'hammer' | 'magnet' | 'blast' | 'multiplier5x' | 'multiplier2_5x' | 'extraTime'
export type GameMode = 'classic' | 'bot' | 'coins' | 'tournament'

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
  type: 'reward' | 'rank' | 'invite' | 'commission' | 'system' | 'battle' | 'friend_request'
  emoji: string
  timestamp: string
  read: boolean
}

export interface GameHistoryEntry {
  id: string
  date: string
  mode: GameMode
  score: number
  result: 'win' | 'lose' | 'classic'
  entryFee: number
  timeLimit: number
}

export interface DailyTaskReward {
  type: 'coins' | 'spin' | 'hammer' | 'magnet' | 'blast' | 'multiplier5x' | 'multiplier2_5x' | 'extraTime' | 'undo'
  count: number
  label: string
  emoji: string
}

export interface DailyTask {
  id: string
  description: string
  emoji: string
  target: number
  progress: number
  reward: DailyTaskReward
  claimed: boolean
  // Task action type - determines UI button and behavior
  actionType?: 'visit' | 'play' | 'spin' | 'claim' | 'auto' // auto = tracks automatically
  // For visit tasks: how many visits required
  visitCount?: number
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
  // Timer paused (when lives=0 in battle mode, waiting for ad)
  timerPaused: boolean
  // Countdown before game starts (3-2-1)
  countdownActive: boolean
  countdownSecondsLeft: number
  // Combo system
  consecutiveMerges: number
  comboBonus: number
  comboMultiplier: number // Current combo multiplier (1=none, 2=2x, 3=3x, etc.)
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
  playerId: string // Unique ID for Firebase
  playerName: string
  playerAvatar: string
  playerLevel: number
  // Referral tracking from Firebase
  firebaseReferrals: FirebaseReferral[]
  firebaseCommissionPending: number
  // Win/loss tracking for percentage
  totalBattlesPlayed: number
  totalBattlesWon: number
  // Tournament system
  tournamentJoined: boolean
  tournamentPoints: number
  tournamentCarryOver: number
  tournamentGamesPlayed: number
  levelXP: number // XP from SP conversion (3 SP = 1 XP), determines player level via calculateLevel
  // Game history
  gameHistory: GameHistoryEntry[]
  // Weekly bonus
  weeklyBonusClaimed: boolean
  // Streak week tracker (for daily rewards cycling)
  streakWeek: number
  // Leaderboard reset tracking
  leaderboardMonth: number // Year*12+Month for monthly reset
  leaderboardYear: number // Year for yearly reset
  // Daily tasks
  dailyTasks: DailyTask[]
  // New ability types
  multiplier5xCount: number
  multiplier2_5xCount: number
  extraTimeCount: number
  activeMultiplier: number // 1 = none, 5 = 5x active, 2.5 = 2.5x active
  multiplierTimeLeft: number // seconds remaining for multiplier
  // User ID (6-8 digit numeric code, unique per user)
  userCode: string
  // Total coins ever earned (never decreases)
  totalCoinsEarned: number
  // Coins earned from WINNING battles only (for leaderboard - purchased coins don't count)
  winningCoins: number
  // Room Card resource for Room Fight feature
  roomCardCount: number
  // SP/XP Leveling System
  skillPoints: number // Accumulated SP with decimal precision (e.g., 1.5, 3.0)
  spRemainder: number // Fractional SP remainder after 3 SP → 1 XP conversion
  // Timer ability tracking
  timerAbilitiesUsed: number // Count of timer abilities used in current game
  gameTimeElapsed: number // Seconds elapsed in current game (for timer ability cooldown)
  // Real-time battle (Firebase matchmaking)
  realTimeBattleId: string | null // Firebase battle ID when matched with real player
  realTimePlayerField: 'player1' | 'player2' | null // Which player slot we are
  realTimeOpponentScore: number // Opponent's live score from Firebase
  realTimeOpponentFinished: boolean // Opponent finished the game
  isRealTimeBattle: boolean // Whether this is a real-time battle vs real player
}

const BOT_NAMES = [
  { name: 'Aero 4', avatar: '🦅' },
  { name: 'Blaze 7', avatar: '🔥' },
  { name: 'Viper 9', avatar: '🐍' },
  { name: 'Nova 3', avatar: '💫' },
  { name: 'Storm 6', avatar: '⚡' },
  { name: 'Raze 2', avatar: '💥' },
  { name: 'Fang 8', avatar: '🐺' },
  { name: 'Drift 5', avatar: '🌪️' },
  { name: 'Apex 1', avatar: '🏆' },
  { name: 'Volt 11', avatar: '⚡' },
  { name: 'Shadow 3', avatar: '🌑' },
  { name: 'Phantom 7', avatar: '👻' },
  { name: 'Titan 5', avatar: '🗿' },
  { name: 'Echo 9', avatar: '🔊' },
  { name: 'Fury 4', avatar: '😡' },
  { name: 'Onyx 2', avatar: '🖤' },
  { name: 'Nexus 6', avatar: '🔮' },
  { name: 'Zenith 8', avatar: '🏔️' },
  { name: 'Cipher 3', avatar: '🔐' },
  { name: 'Rogue 7', avatar: '🗡️' },
  { name: 'Flux 10', avatar: '🌊' },
  { name: 'Saber 4', avatar: '⚔️' },
  { name: 'Blitz 6', avatar: '💥' },
  { name: 'Omega 1', avatar: '🅾️' },
  { name: 'Spark 5', avatar: '✨' },
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

function generatePlayerId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'p_'
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

function generateUserCode(): string {
  // Generate a random 6-8 digit numeric code
  const length = 6 + Math.floor(Math.random() * 3) // 6, 7, or 8 digits
  let code = ''
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString()
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

// ============================================================
// LEADERBOARD RESET LOGIC
// Tracks last reset timestamps in localStorage
// Weekly reset: every Monday at midnight → resets bestScore, modBestScore, battleBestScore
// Monthly reset: 1st of every month → resets coin leaderboard related fields
// Yearly reset: January 1st → resets classicBestScore related fields
// ============================================================

const LEADERBOARD_RESET_KEY = 'mergeMaster2048_leaderboardResets'

interface LeaderboardResets {
  weeklyLastReset: string   // ISO date of last weekly reset (every Monday)
  monthlyLastReset: string  // ISO date of last monthly reset (1st of month)
  yearlyLastReset: string   // ISO date of last yearly reset (Jan 1st)
}

function loadLeaderboardResets(): LeaderboardResets {
  try {
    const data = localStorage.getItem(LEADERBOARD_RESET_KEY)
    if (data) return JSON.parse(data)
  } catch { /* ignore */ }
  // Default: set to current time so no immediate reset
  const now = new Date().toISOString()
  return { weeklyLastReset: now, monthlyLastReset: now, yearlyLastReset: now }
}

function saveLeaderboardResets(resets: LeaderboardResets) {
  localStorage.setItem(LEADERBOARD_RESET_KEY, JSON.stringify(resets))
}

// Check if weekly reset needed (every Monday at midnight)
function needsWeeklyReset(lastReset: string): boolean {
  const last = new Date(lastReset)
  const now = new Date()
  // Find the most recent Monday at midnight
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() + mondayOffset)
  lastMonday.setHours(0, 0, 0, 0)
  return last < lastMonday
}

// Check if monthly reset needed (1st of every month)
function needsMonthlyReset(lastReset: string): boolean {
  const last = new Date(lastReset)
  const now = new Date()
  const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return last < firstOfCurrentMonth
}

// Check if yearly reset needed (January 1st)
function needsYearlyReset(lastReset: string): boolean {
  const last = new Date(lastReset)
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  return last < jan1
}

// Generate bot name/avatar for display (score generated at game end for fairness)
function generateBotOpponent(): BotOpponent {
  const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
  return { ...bot, finalScore: 0 } // Score set to 0; will be generated at game end
}

// Generate fair bot score at game end - 50/50 win chance
// Score is based on player's ACTUAL score, not best score
// This ensures truly fair gameplay where both have equal chances
function generateFairBotScore(playerScore: number): number {
  const base = Math.max(playerScore, 100)
  // ±30% variance around player's score for close, exciting games
  const variance = base * 0.3
  return Math.round(Math.max(50, base + (Math.random() * variance * 2 - variance)))
}

// ============================================================
// LEVEL SYSTEM - 1000 Levels, based on LEVEL XP (SP)
// SP earning rate based on level:
//   Lv 1-20:   Every 100 tournament score = 1 SP
//   Lv 21-50:  Every 100 tournament score = 1.5 SP
//   Lv 51-150: Every 100 tournament score = 2 SP
//   Lv 150+:   Every 100 tournament score = 3 SP
// Every 3 SP = 1 XP (levelXP), remainder carries over
// levelXP never resets on weekly tournament reset
// Every 5 levels: guaranteed coins + 2 random items from:
//   boom, 100 coin, magnet, timer, hammer, undo, 500 coin, 250 coin
// Bonus coins at every 5 levels = (level/5) * 100 coins
// ============================================================

export const MAX_LEVEL = 1000

// SP earning rate per 100 tournament score based on player level
export function getSPPerHundredScore(level: number): number {
  if (level <= 20) return 1
  if (level <= 50) return 1.5
  if (level <= 150) return 2
  return 3
}

// Original titles/icons/colors for levels 1-50 (backward compatible)
const ORIGINAL_TITLES = [
  'Beginner', 'Newbie', 'Starter', 'Learner', 'Rookie',
  'Novice', 'Apprentice', 'Trainee', 'Player', 'Skilled',
  'Adept', 'Competent', 'Proficient', 'Experienced', 'Advanced',
  'Expert', 'Veteran', 'Elite', 'Champion', 'Master',
  'Grand Master', 'Supreme', 'Heroic', 'Mythic', 'Immortal',
  'Divine', 'Celestial', 'Transcendent', 'Ascendant', 'Omnipotent',
  'Cosmic', 'Galactic', 'Universal', 'Dimensional', 'Infinite',
  'Eternal', 'Timeless', 'Boundless', 'Limitless', 'Absolute',
  'Paramount', 'Sovereign', 'Emperor', 'Overlord', 'Apex',
  'Zenith', 'Pinnacle', 'Apex Lord', 'Ultimate', 'Merge God',
]

const ORIGINAL_ICONS = [
  '🌱', '🌿', '🍀', '⭐', '🌟',
  '⚡', '🔥', '💫', '🎯', '🛡️',
  '💎', '🏆', '👑', '⚜️', '🗡️',
  '🦅', '🐉', '🔱', '⚔️', '🦁',
  '👑', '🌟', '💫', '🔮', '🌈',
  '⚡', '🔥', '🌟', '💫', '🔮',
  '🪐', '🌍', '🌌', '✨', '🌈',
  '⏳', '🔮', '🌀', '💫', '🌟',
  '🔱', '👑', '🏰', '⚡', '🏔️',
  '🌟', '💫', '🔮', '👑', '🎮',
]

const ORIGINAL_COLORS = [
  '#8f7a66', '#7cb342', '#66bb6a', '#26a69a', '#00bcd4',
  '#42a5f5', '#5c6bc0', '#7e57c2', '#ab47bc', '#ec407a',
  '#ef5350', '#ff7043', '#ffa726', '#ffca28', '#d4e157',
  '#00E676', '#26c6da', '#42a5f5', '#7c4dff', '#e040fb',
  '#EDC22E', '#FF7A00', '#F65E3B', '#00E676', '#FF00FF',
  '#00FFFF', '#FFD700', '#FF69B4', '#7B68EE', '#00FA9A',
  '#9370DB', '#FF6347', '#4169E1', '#32CD32', '#FF1493',
  '#00CED1', '#FFD700', '#8A2BE2', '#00FF7F', '#DC143C',
  '#FF8C00', '#7FFF00', '#4B0082', '#FF4500', '#1E90FF',
  '#FF00FF', '#FFD700', '#00FF00', '#FF69B4', '#F65E3B',
]

// Convert number to Roman numeral (for tier suffixes in high-level titles)
function toRoman(num: number): string {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let result = ''
  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += numerals[i]
      num -= values[i]
    }
  }
  return result
}

// Convert HSL to hex color string
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Compute the point threshold for a given level (1-1000)
// Uses piecewise power-law interpolation between checkpoints:
// L1=0, L2=10, L3=25, L5=80, L10=200, L20=600,
// L50=5000, L100=25000, L200=150000, L500=2000000, L1000=50000000
export function getLevelThreshold(level: number): number {
  if (level <= 1) return 0
  const l = level - 1 // l goes from 1 to 999

  // Piecewise segments with continuous boundaries (slow tournament-point progression)
  if (l <= 1) return 10                                                               // L1→L2: 10 pts
  if (l <= 2) return Math.floor(10 + 15 * ((l - 1) / 1))                             // L2→L3: 10→25
  if (l <= 4) return Math.floor(25 + 55 * Math.pow((l - 2) / 2, 1.5))                // L3→L5: 25→80
  if (l <= 9) return Math.floor(80 + 120 * Math.pow((l - 4) / 5, 1.8))               // L5→L10: 80→200
  if (l <= 19) return Math.floor(200 + 400 * Math.pow((l - 9) / 10, 1.9))            // L10→L20: 200→600
  if (l <= 49) return Math.floor(600 + 4400 * Math.pow((l - 19) / 30, 2.0))          // L20→L50: 600→5000
  if (l <= 99) return Math.floor(5000 + 20000 * Math.pow((l - 49) / 50, 2.2))        // L50→L100: 5000→25000
  if (l <= 199) return Math.floor(25000 + 125000 * Math.pow((l - 99) / 100, 2.5))    // L100→L200: 25000→150000
  if (l <= 499) return Math.floor(150000 + 1850000 * Math.pow((l - 199) / 300, 2.8)) // L200→L500: 150000→2000000
  return Math.floor(2000000 + 48000000 * Math.pow((l - 499) / 500, 3.0))             // L500→L1000: 2000000→50000000
}

// Generate title for a given level (1-1000)
export function getLevelTitle(level: number): string {
  const clampedLevel = Math.min(Math.max(level, 1), MAX_LEVEL)
  if (clampedLevel <= 50) return ORIGINAL_TITLES[clampedLevel - 1]

  // Levels 51-100: Metal/Gem rank + Class (5×10=50 combos)
  if (clampedLevel <= 100) {
    const prefixes = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
    const suffixes = ['Warrior', 'Knight', 'Sage', 'Guardian', 'Paladin', 'Commander', 'Sentinel', 'Warden', 'Champion', 'Hero']
    const idx = clampedLevel - 51
    return `${prefixes[Math.floor(idx / 10) % prefixes.length]} ${suffixes[idx % suffixes.length]}`
  }

  // Levels 101-200: Elemental + Title (10×10=100 combos)
  if (clampedLevel <= 200) {
    const prefixes = ['Fire', 'Ice', 'Storm', 'Shadow', 'Light', 'Thunder', 'Frost', 'Void', 'Arcane', 'Sacred']
    const suffixes = ['Lord', 'Sage', 'Master', 'King', 'Oracle', 'Archon', 'Titan', 'Deity', 'Phoenix', 'Dragon']
    const idx = clampedLevel - 101
    return `${prefixes[Math.floor(idx / 10) % prefixes.length]} ${suffixes[idx % suffixes.length]}`
  }

  // Levels 201-500: Cosmic prefix + Roman numeral tier (15×20=300 combos)
  if (clampedLevel <= 500) {
    const prefixes = ['Nebula', 'Stellar', 'Astral', 'Solar', 'Lunar', 'Comet', 'Nova', 'Quasar', 'Pulsar', 'Cosmos', 'Galactic', 'Orbital', 'Zenith', 'Eclipse', 'Aurora']
    const idx = clampedLevel - 201
    const prefixIdx = Math.floor(idx / 20) % prefixes.length
    const tierNum = (idx % 20) + 1
    return `${prefixes[prefixIdx]} ${toRoman(tierNum)}`
  }

  // Levels 501-1000: Mythic prefix + Roman numeral tier (20×25=500 combos)
  const prefixes = ['Omega', 'Alpha', 'Ultra', 'Mega', 'Prime', 'Exalted', 'Sovereign', 'Transcendent', 'Eternal', 'Primordial', 'Celestial', 'Immortal', 'Divine', 'Infinite', 'Absolute', 'Cosmic', 'Apotheosis', 'Paradigm', 'Apex', 'Supreme']
  const idx = clampedLevel - 501
  const prefixIdx = Math.floor(idx / 25) % prefixes.length
  const tierNum = (idx % 25) + 1
  return `${prefixes[prefixIdx]} ${toRoman(tierNum)}`
}

// Generate icon for a given level (1-1000)
export function getLevelIcon(level: number): string {
  const clampedLevel = Math.min(Math.max(level, 1), MAX_LEVEL)
  if (clampedLevel <= 50) return ORIGINAL_ICONS[clampedLevel - 1]

  // Icon pools by level range
  if (clampedLevel <= 100) {
    const pool = ['⚔️', '🛡️', '🏹', '🗡️', '🏇', '🏰', '💎', '🎺', '📯', '⚔️']
    return pool[(clampedLevel - 51) % pool.length]
  }
  if (clampedLevel <= 200) {
    const pool = ['🔥', '❄️', '⚡', '🌑', '✨', '🌩️', '🏔️', '🌀', '🔮', '☀️']
    return pool[(clampedLevel - 101) % pool.length]
  }
  if (clampedLevel <= 500) {
    const pool = ['🌟', '💫', '⭐', '🌠', '🌙', '☄️', '💥', '🌌', '🪐', '🌍', '🔮', '✨', '🌈', '🌑', '🌅']
    return pool[(clampedLevel - 201) % pool.length]
  }
  // 501-1000
  const pool = ['👑', '🔱', '⚜️', '🐉', '🦅', '💎', '🏆', '🎯', '🌟', '💫', '⭐', '🌠', '🌙', '☄️', '💥', '🌌', '🪐', '🌍', '🔮', '✨']
  return pool[(clampedLevel - 501) % pool.length]
}

// Generate color for a given level (1-1000)
export function getLevelColor(level: number): string {
  const clampedLevel = Math.min(Math.max(level, 1), MAX_LEVEL)
  if (clampedLevel <= 50) return ORIGINAL_COLORS[clampedLevel - 1]

  // HSL rotation for levels 51+ using golden angle for even distribution
  const hue = ((clampedLevel - 51) * 137.508) % 360
  const saturation = 70 + ((clampedLevel - 51) % 5) * 5 // 70-90%
  const lightness = 50 + ((clampedLevel - 51) % 3) * 5  // 50-60%
  return hslToHex(hue, saturation, lightness)
}

// Calculate player level from level XP (50% of tournament points) using binary search
function calculateLevel(levelXP: number): number {
  if (levelXP <= 0) return 1
  let lo = 1, hi = MAX_LEVEL
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (getLevelThreshold(mid) <= levelXP) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return lo
}

// Get level info helper (same return shape as before)
export function getLevelInfo(level: number) {
  const clampedLevel = Math.min(Math.max(level, 1), MAX_LEVEL)
  return {
    level: clampedLevel,
    title: getLevelTitle(clampedLevel),
    icon: getLevelIcon(clampedLevel),
    color: getLevelColor(clampedLevel),
    threshold: getLevelThreshold(clampedLevel),
  }
}

// Get next level's required points
export function getNextLevelPoints(level: number): number {
  if (level >= MAX_LEVEL) return getLevelThreshold(MAX_LEVEL)
  return getLevelThreshold(level + 1)
}

// Get current level's starting points
export function getCurrentLevelPoints(level: number): number {
  return getLevelThreshold(Math.min(Math.max(level, 1), MAX_LEVEL))
}

// Generate daily tasks for today - varied tasks with coins + ability rewards
// If admin has created custom tasks, use those; otherwise use default random tasks
function generateDailyTasks(): DailyTask[] {
  const today = getTodayStr()

  // Check for admin custom tasks first
  try {
    const adminTasksData = typeof window !== 'undefined' ? localStorage.getItem('adminDailyTasks') : null
    if (adminTasksData) {
      const adminTasks = JSON.parse(adminTasksData)
      const activeTasks = adminTasks.filter((t: any) => t.active === true)
      if (activeTasks.length > 0) {
        // Map admin tasks to DailyTask format
        return activeTasks.map((adminTask: any) => {
          // Map action to actionType
          let actionType: DailyTask['actionType'] = 'auto'
          let emoji = '📋'
          let visitCount: number | undefined = undefined

          switch (adminTask.action) {
            case 'play_battle':
              actionType = 'play'
              emoji = '⚔️'
              break
            case 'play_classic':
              actionType = 'play'
              emoji = '🎮'
              break
            case 'watch_ad':
              actionType = 'visit'
              emoji = '📺'
              visitCount = adminTask.requiredCount
              break
            case 'visit_store':
              actionType = 'visit'
              emoji = '🏪'
              visitCount = adminTask.requiredCount
              break
            case 'spin_wheel':
              actionType = 'spin'
              emoji = '🎰'
              break
            case 'win_battle':
              actionType = 'play'
              emoji = '🏆'
              break
            default:
              actionType = 'auto'
              emoji = '📋'
          }

          // Map reward type
          let rewardType: DailyTaskReward['type'] = 'coins'
          let rewardEmoji = '💰'
          switch (adminTask.rewardType) {
            case 'coins':
              rewardType = 'coins'
              rewardEmoji = '💰'
              break
            case 'spins':
              rewardType = 'spin'
              rewardEmoji = '🎫'
              break
            case 'hammer':
              rewardType = 'hammer'
              rewardEmoji = '🔨'
              break
            case 'magnet':
              rewardType = 'magnet'
              rewardEmoji = '🧲'
              break
            case 'blast':
              rewardType = 'blast'
              rewardEmoji = '💣'
              break
            case 'timer':
              rewardType = 'extraTime'
              rewardEmoji = '⏱️'
              break
          }

          return {
            id: `admin-${adminTask.id}-${today}`,
            description: adminTask.description || adminTask.name,
            emoji,
            target: adminTask.requiredCount || 1,
            progress: 0,
            reward: {
              type: rewardType,
              count: adminTask.rewardAmount || 1,
              label: `${adminTask.rewardAmount} ${adminTask.rewardType}`,
              emoji: rewardEmoji,
            },
            claimed: false,
            actionType,
            visitCount,
          }
        })
      }
    }
  } catch {
    // Fall through to default tasks
  }

  // Default: Use day of year to vary tasks slightly each day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
  const taskVariant = dayOfYear % 7 // Rotate ability rewards weekly

  // Ability reward varies by day of week
  const abilityRewards: DailyTaskReward[] = [
    { type: 'blast', count: 3, label: '3 Bombs', emoji: '💣' },
    { type: 'hammer', count: 3, label: '3 Hammers', emoji: '🔨' },
    { type: 'magnet', count: 3, label: '3 Magnets', emoji: '🧲' },
    { type: 'extraTime', count: 3, label: '3 Timers', emoji: '⏱️' },
    { type: 'undo', count: 3, label: '3 Undos', emoji: '↩️' },
    { type: 'blast', count: 5, label: '5 Bombs', emoji: '💣' },
    { type: 'hammer', count: 5, label: '5 Hammers', emoji: '🔨' },
  ]

  return [
    // Visit tasks - some require 2 visits
    { id: `visit1-${today}`, description: 'Visit Sponsor Website', emoji: '🌐', target: 1, progress: 0, reward: { type: 'coins', count: 50, label: '50 Coins', emoji: '💰' }, claimed: false, actionType: 'visit', visitCount: 1 },
    { id: `visit2-${today}`, description: 'Visit 2 Sponsor Pages', emoji: '🌐', target: 2, progress: 0, reward: { type: 'coins', count: 100, label: '100 Coins', emoji: '💰' }, claimed: false, actionType: 'visit', visitCount: 2 },
    // Play games task
    { id: `play3-${today}`, description: 'Play 3 Games', emoji: '🎮', target: 3, progress: 0, reward: { type: 'coins', count: 30, label: '30 Coins', emoji: '💰' }, claimed: false, actionType: 'play' },
    // Score task
    { id: `score500-${today}`, description: 'Score 500+ in a game', emoji: '🏆', target: 1, progress: 0, reward: { type: 'coins', count: 40, label: '40 Coins', emoji: '💰' }, claimed: false, actionType: 'auto' },
    // Spin task
    { id: `spin-${today}`, description: 'Spin the Wheel', emoji: '🎰', target: 1, progress: 0, reward: { type: 'coins', count: 20, label: '20 Coins', emoji: '💰' }, claimed: false, actionType: 'spin' },
    // Ability reward task - varies daily
    { id: `ability-${today}`, description: 'Play 5 Games', emoji: '🎯', target: 5, progress: 0, reward: abilityRewards[taskVariant], claimed: false, actionType: 'play' },
    // Claim free coins task (just press claim)
    { id: `claim-coins-${today}`, description: 'Claim Free Coins', emoji: '💰', target: 1, progress: 0, reward: { type: 'coins', count: 100, label: '100 Coins', emoji: '💰' }, claimed: false, actionType: 'claim' },
  ]
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
      timerPaused: false,
      countdownActive: false,
      countdownSecondsLeft: 0,
      consecutiveMerges: 0,
      comboBonus: 0,
      comboMultiplier: 1,
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
      playerId: '',
      firebaseReferrals: [],
      firebaseCommissionPending: 0,
      totalBattlesPlayed: 0,
      totalBattlesWon: 0,
      tournamentJoined: false,
      tournamentPoints: 0,
      tournamentCarryOver: 0,
      tournamentGamesPlayed: 0,
      levelXP: 0,
      gameHistory: [],
      weeklyBonusClaimed: false,
      leaderboardMonth: new Date().getFullYear() * 12 + new Date().getMonth(),
      leaderboardYear: new Date().getFullYear(),
      dailyTasks: generateDailyTasks(),
      multiplier5xCount: 0,
      multiplier2_5xCount: 0,
      extraTimeCount: 0,
      activeMultiplier: 1,
      multiplierTimeLeft: 0,
      userCode: '',
      totalCoinsEarned: 0,
      winningCoins: 0,
      roomCardCount: 0,
      streakWeek: 1,
      skillPoints: 0,
      spRemainder: 0,
      timerAbilitiesUsed: 0,
      gameTimeElapsed: 0,
      realTimeBattleId: null,
      realTimePlayerField: null,
      realTimeOpponentScore: 0,
      realTimeOpponentFinished: false,
      isRealTimeBattle: false,
    }

    if (!saved) {
      return { ...defaults, inviteCode: generateInviteCode(), userCode: generateUserCode() }
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

    // Reset tournament weekly if new week
    let tournamentJoined = saved.tournamentJoined || false
    let tournamentPoints = saved.tournamentPoints || 0
    let tournamentCarryOver = saved.tournamentCarryOver || 0
    let tournamentGamesPlayed = saved.tournamentGamesPlayed || 0
    let levelXP = saved.levelXP || 0
    let weeklyBonusClaimed = saved.weeklyBonusClaimed || false
    // Simple weekly reset: check if last tournament week is different from current week
    if (saved.tournamentWeek) {
      const start = new Date(2025, 0, 6)
      const now = new Date()
      const currentWeek = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
      if (currentWeek > saved.tournamentWeek) {
        tournamentJoined = false
        tournamentPoints = 0
        tournamentCarryOver = 0
        tournamentGamesPlayed = 0
        // levelXP is NOT reset on weekly reset - it carries over permanently
        weeklyBonusClaimed = false // Reset weekly bonus each week
      }
    }

    // Monthly reset for coins and battle scores
    let coins = saved.coins || 0
    let modBestScore = saved.modBestScore || 0
    if (saved.leaderboardMonth) {
      const now = new Date()
      const currentMonth = now.getFullYear() * 12 + now.getMonth()
      if (currentMonth > saved.leaderboardMonth) {
        // Reset coins leaderboard and battle (mod) best score monthly
        // Note: coins balance is NOT reset, only the leaderboard tracking
        modBestScore = 0
      }
    }

    // Yearly reset for classic best score and offline rank
    let bestScore = saved.bestScore || 0
    if (saved.leaderboardYear) {
      const now = new Date()
      const currentYear = now.getFullYear()
      if (currentYear > saved.leaderboardYear) {
        // Reset classic best score and offline rank yearly
        bestScore = 0
      }
    }

    const gamePoints = saved.gamePoints || 0

    // ============================================================
    // LEADERBOARD RESET CHECK using dedicated timestamps
    // Checks weekly/monthly/yearly reset timestamps stored in
    // a separate localStorage key and resets appropriate scores
    // ============================================================
    const leaderboardResets = loadLeaderboardResets()
    const nowISO = new Date().toISOString()
    let lbResetWeekly = false
    let lbResetMonthly = false
    let lbResetYearly = false

    if (needsWeeklyReset(leaderboardResets.weeklyLastReset)) {
      lbResetWeekly = true
      bestScore = 0
      modBestScore = 0
    }
    if (needsMonthlyReset(leaderboardResets.monthlyLastReset)) {
      lbResetMonthly = true
      modBestScore = 0
    }
    if (needsYearlyReset(leaderboardResets.yearlyLastReset)) {
      lbResetYearly = true
      bestScore = 0
      modBestScore = 0
    }

    // Save updated reset timestamps if any reset occurred
    if (lbResetWeekly || lbResetMonthly || lbResetYearly) {
      saveLeaderboardResets({
        weeklyLastReset: lbResetWeekly ? nowISO : leaderboardResets.weeklyLastReset,
        monthlyLastReset: lbResetMonthly ? nowISO : leaderboardResets.monthlyLastReset,
        yearlyLastReset: lbResetYearly ? nowISO : leaderboardResets.yearlyLastReset,
      })
    }

    return {
      ...defaults,
      bestScore,
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
      playerLevel: calculateLevel(levelXP),
      playerId: saved.playerId || generatePlayerId(),
      firebaseReferrals: [],
      firebaseCommissionPending: 0,
      totalBattlesPlayed: saved.totalBattlesPlayed || 0,
      totalBattlesWon: saved.totalBattlesWon || 0,
      tournamentJoined,
      tournamentPoints,
      tournamentCarryOver,
      tournamentGamesPlayed,
      levelXP,
      gameHistory: saved.gameHistory || [],
      weeklyBonusClaimed,
      leaderboardMonth: (() => {
        const now = new Date()
        return now.getFullYear() * 12 + now.getMonth()
      })(),
      leaderboardYear: new Date().getFullYear(),
      // Regenerate daily tasks if it's a new day or tasks are empty/stale
      dailyTasks: (() => {
        const savedTasks = saved.dailyTasks || []
        if (savedTasks.length === 0) return generateDailyTasks()
        // Check if tasks are from today
        const hasTodayTasks = savedTasks.some(t => t.id.includes(today))
        if (!hasTodayTasks) return generateDailyTasks()
        return savedTasks
      })(),
      multiplier5xCount: saved.multiplier5xCount ?? 0,
      multiplier2_5xCount: saved.multiplier2_5xCount ?? 0,
      extraTimeCount: saved.extraTimeCount ?? 0,
      activeMultiplier: 1,
      multiplierTimeLeft: 0,
      userCode: saved.userCode || generateUserCode(),
      totalCoinsEarned: saved.totalCoinsEarned ?? 0,
      winningCoins: saved.winningCoins ?? 0,
      roomCardCount: saved.roomCardCount ?? 0,
      streakWeek: saved.streakWeek ?? 1,
      skillPoints: saved.skillPoints ?? 0,
      spRemainder: saved.spRemainder ?? 0,
      timerAbilitiesUsed: 0,
      gameTimeElapsed: 0,
      realTimeBattleId: null,
      realTimePlayerField: null,
      realTimeOpponentScore: 0,
      realTimeOpponentFinished: false,
      isRealTimeBattle: false,
    }
  })

  const prevState = useRef<GameState | null>(null)

  // Save data
  useEffect(() => {
    const now = new Date()
    const start = new Date(2025, 0, 6)
    const currentWeek = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1

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
      notifications: state.notifications.slice(0, 50),
      playerName: state.playerName,
      playerAvatar: state.playerAvatar,
      playerLevel: state.playerLevel,
      playerId: state.playerId,
      totalBattlesPlayed: state.totalBattlesPlayed,
      totalBattlesWon: state.totalBattlesWon,
      tournamentJoined: state.tournamentJoined,
      tournamentPoints: state.tournamentPoints,
      tournamentCarryOver: state.tournamentCarryOver,
      tournamentGamesPlayed: state.tournamentGamesPlayed,
      levelXP: state.levelXP,
      tournamentWeek: currentWeek,
      gameHistory: state.gameHistory.slice(0, 30),
      weeklyBonusClaimed: state.weeklyBonusClaimed,
      leaderboardMonth: state.leaderboardMonth,
      leaderboardYear: state.leaderboardYear,
      dailyTasks: state.dailyTasks,
      multiplier5xCount: state.multiplier5xCount,
      multiplier2_5xCount: state.multiplier2_5xCount,
      extraTimeCount: state.extraTimeCount,
      userCode: state.userCode,
      totalCoinsEarned: state.totalCoinsEarned,
      winningCoins: state.winningCoins,
      roomCardCount: state.roomCardCount,
      streakWeek: state.streakWeek,
      skillPoints: state.skillPoints,
      spRemainder: state.spRemainder,
    }
    localStorage.setItem('mergeMaster2048', JSON.stringify(data))
  }, [state.bestScore, state.spinTickets, state.streakDay, state.lastLoginDate, state.streakClaimed, state.welcomeClaimed, state.hammerCount, state.magnetCount, state.blastCount, state.undoTotal, state.coins, state.gamePoints, state.modBestScore, state.inviteCode, state.invitedBy, state.invitedUsers, state.commissionBalance, state.commissionClaimed, state.autoClaimCommission, state.gamesPlayedToday, state.lastPlayDate, state.notifications, state.playerName, state.playerAvatar, state.playerLevel, state.playerId, state.totalBattlesPlayed, state.totalBattlesWon, state.tournamentJoined, state.tournamentPoints, state.tournamentCarryOver, state.tournamentGamesPlayed, state.levelXP, state.gameHistory, state.weeklyBonusClaimed, state.dailyTasks, state.multiplier5xCount, state.multiplier2_5xCount, state.extraTimeCount, state.userCode, state.totalCoinsEarned, state.winningCoins, state.roomCardCount, state.streakWeek, state.skillPoints, state.spRemainder])

  // ============================================================
  // FIREBASE SYNC - Sync player data to Firebase RTDB
  // ============================================================
  const firebaseSyncedRef = useRef(false)

  // Sync player data to Firebase whenever key stats change
  useEffect(() => {
    if (!state.playerId || state.playerId === '') return
    // Debounce - don't sync too frequently
    const timer = setTimeout(() => {
      syncPlayerToFirebase({
        id: state.playerId,
        name: state.playerName,
        avatar: state.playerAvatar,
        inviteCode: state.inviteCode,
        userCode: state.userCode,
        tournamentPoints: state.tournamentPoints,
        levelXP: state.levelXP,
        bestScore: state.bestScore,
        modBestScore: state.modBestScore,
        coins: state.coins,
        totalCoinsEarned: state.totalCoinsEarned,
        winningCoins: state.winningCoins,
        level: state.playerLevel,
        totalBattlesPlayed: state.totalBattlesPlayed,
        totalBattlesWon: state.totalBattlesWon,
      }).catch(() => {/* silent fail */})
    }, 2000) // 2 second debounce
    return () => clearTimeout(timer)
  }, [state.playerId, state.playerName, state.playerAvatar, state.inviteCode, state.userCode, state.tournamentPoints, state.levelXP, state.bestScore, state.modBestScore, state.coins, state.totalCoinsEarned, state.playerLevel, state.totalBattlesPlayed, state.totalBattlesWon])

  // Listen to referrals in real-time (people who used MY invite code)
  useEffect(() => {
    if (!state.playerId) return
    const unsubscribe = onReferralsUpdate(state.playerId, (referrals) => {
      setState(prev => {
        const newReferrals = referrals
        // Calculate total pending commission
        const totalCommission = referrals.reduce((sum, r) => sum + (r.commissionEarned || 0), 0)
        return {
          ...prev,
          firebaseReferrals: newReferrals,
          firebaseCommissionPending: totalCommission - prev.commissionClaimed,
        }
      })
    })
    return unsubscribe
  }, [state.playerId])

  // Process commission for referrer when player earns in tournament
  // Commission: 30% on WIN, 2% on LOSS
  useEffect(() => {
    if (!state.playerId || state.tournamentPoints <= 0 || !state.botBattleResult) return
    // Only process after a game ends (botBattleResult is set)
    const isWin = state.botBattleResult === 'win'
    processCommissionForReferrer(state.playerId, state.tournamentPoints, isWin).catch(() => {/* silent */})
  }, [state.botBattleResult, state.playerId])

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

  // Process referral on first load when invitedBy is set (after addNotification is declared)
  useEffect(() => {
    if (!state.invitedBy || !state.playerId || firebaseSyncedRef.current) return
    firebaseSyncedRef.current = true
    processReferral(state.playerId, state.playerName, state.playerAvatar, state.invitedBy)
      .then((result) => {
        if (result.success) {
          // Auto-claim invite reward
          setState(prev => ({
            ...prev,
            coins: prev.coins + 500,
            spinTickets: prev.spinTickets + 2,
            magnetCount: prev.magnetCount + 2,
            invitedBy: null, // Clear so it doesn't reprocess
          }))
          addNotification('Invite Reward! 🎉', `You got 500 coins + 2 spins for joining! Invited by ${result.referrerName || 'a friend'}`, 'reward', '🎁')
        }
      })
      .catch(() => {/* silent fail */})
  }, [state.invitedBy, state.playerId, state.playerName, state.playerAvatar, addNotification])

  // ============================================================
  // REAL-TIME ITEM DELIVERY - Listen for order approval notifications
  // When admin approves an order, items are delivered via Firebase
  // ============================================================
  const deliveryProcessedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!state.playerId) return
    const unsubscribe = onUserNotificationsUpdate(state.playerId, (notifications) => {
      for (const notif of notifications) {
        // Skip already delivered or already processed
        if (notif.delivered || deliveryProcessedRef.current.has(notif.id)) continue
        if (notif.type !== 'order_delivery' || !notif.items) continue

        // Mark as processed to avoid double delivery
        deliveryProcessedRef.current.add(notif.id)

        // Deliver items to user
        const items = notif.items as { coins?: number; abilities?: Array<{ type: string; count: number }>; roomCards?: number; spinTickets?: number }

        setState(prev => {
          let newState = { ...prev }
          let deliveryMsg: string[] = []

          // Add coins
          if (items.coins && items.coins > 0) {
            newState.coins = prev.coins + items.coins
            newState.totalCoinsEarned = prev.totalCoinsEarned + items.coins
            deliveryMsg.push(`💰 ${items.coins} coins`)
          }

          // Add abilities
          if (items.abilities) {
            for (const ability of items.abilities) {
              switch (ability.type) {
                case 'multiplier5x':
                  newState.multiplier5xCount = prev.multiplier5xCount + ability.count
                  deliveryMsg.push(`⚡ ${ability.count}x 5x Multiplier`)
                  break
                case 'multiplier2_5x':
                  newState.multiplier2_5xCount = prev.multiplier2_5xCount + ability.count
                  deliveryMsg.push(`🔥 ${ability.count}x 2.5x Multiplier`)
                  break
                case 'hammer':
                  newState.hammerCount = prev.hammerCount + ability.count
                  deliveryMsg.push(`🔨 ${ability.count}x Hammer`)
                  break
                case 'magnet':
                  newState.magnetCount = prev.magnetCount + ability.count
                  deliveryMsg.push(`🧲 ${ability.count}x Magnet`)
                  break
                case 'blast':
                  newState.blastCount = prev.blastCount + ability.count
                  deliveryMsg.push(`💣 ${ability.count}x Bomb`)
                  break
                case 'extraTime':
                  newState.extraTimeCount = prev.extraTimeCount + ability.count
                  deliveryMsg.push(`⏱️ ${ability.count}x Timer`)
                  break
              }
            }
          }

          // Add room cards
          if (items.roomCards && items.roomCards > 0) {
            newState.roomCardCount = prev.roomCardCount + items.roomCards
            deliveryMsg.push(`🃏 ${items.roomCards} Room Card${items.roomCards > 1 ? 's' : ''}`)
          }

          // Add spin tickets
          if (items.spinTickets && items.spinTickets > 0) {
            newState.spinTickets = prev.spinTickets + items.spinTickets
            deliveryMsg.push(`🎫 ${items.spinTickets} Spin Ticket${items.spinTickets > 1 ? 's' : ''}`)
          }

          // Show notification
          if (deliveryMsg.length > 0) {
            const msg = deliveryMsg.join(', ')
            addNotification('📦 Items Delivered!', `Your order has been approved! Received: ${msg}`, 'reward', '🎁')
          }

          return newState
        })

        // Mark as delivered in Firebase
        markNotificationDelivered(state.playerId, notif.id).catch(() => {})
      }
    })
    return unsubscribe
  }, [state.playerId, addNotification])

  // Check ban status on game load
  const banCheckRef = useRef(false)
  useEffect(() => {
    if (!state.playerId || banCheckRef.current) return
    banCheckRef.current = true
    // Use setTimeout to avoid calling setState synchronously within an effect
    const timer = setTimeout(() => {
      try {
        const data = localStorage.getItem('adminBannedUsers')
        if (data) {
          const bannedUsers: Array<{
            playerId: string
            expiresAt: number | null
          }> = JSON.parse(data)
          const now = Date.now()
          const isBanned = bannedUsers.some(u => {
            if (u.playerId !== state.playerId) return false
            if (u.expiresAt === null) return true // permanent ban
            return u.expiresAt > now // not yet expired
          })
          if (isBanned) {
            addNotification('🚫 Account Suspended', 'Your account has been suspended. Contact support for more information.', 'system', '⚠️')
          }
        }
      } catch { /* ignore */ }
    }, 100)
    return () => clearTimeout(timer)
  }, [state.playerId, addNotification])

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

  const deleteNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id),
    }))
  }, [])

  const deleteReadNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => !n.read),
    }))
  }, [])

  // Add game to history
  const addGameToHistory = useCallback((mode: GameMode, score: number, result: 'win' | 'lose' | 'classic', entryFee: number, timeLimit: number) => {
    const entry: GameHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mode,
      score,
      result,
      entryFee,
      timeLimit,
    }
    setState(prev => {
      // Update daily task progress for games played, score, and ability tasks
      const today = getTodayStr()
      const tasks = prev.dailyTasks.map(t => {
        // Play 3 games task
        if (t.id === `play3-${today}` && !t.claimed) {
          return { ...t, progress: Math.min(t.progress + 1, t.target) }
        }
        // Play 5 games (ability) task
        if (t.id === `ability-${today}` && !t.claimed) {
          return { ...t, progress: Math.min(t.progress + 1, t.target) }
        }
        // Score 500+ task
        if (t.id === `score500-${today}` && !t.claimed && score >= 500) {
          return { ...t, progress: Math.min(t.progress + 1, t.target) }
        }
        return t
      })
      return {
        ...prev,
        gameHistory: [entry, ...prev.gameHistory].slice(0, 30),
        dailyTasks: tasks,
      }
    })
  }, [])

  const handleMove = useCallback((direction: Direction) => {
    setState(prev => {
      if (prev.gameOver || (prev.won && !prev.keepPlaying) || prev.activePowerUp || prev.timerPaused) return prev

      const { newTiles, scoreGain, moved, mergeCount } = moveTiles(prev.tiles, direction)
      if (!moved) return prev

      // Check if this is a battle mode (for timer pause on lives=0)
      const isBattleMode = prev.gameMode === 'bot' || prev.gameMode === 'coins' || prev.gameMode === 'tournament'

      prevState.current = prev
      const tilesWithNew = addRandomTile(newTiles)

      // Combo system: Works in Battle, Coins, AND Tournament modes (NOT classic)
      // Progressive combo: consecutive moves with merges build multiplier
      // 1st merge move = 1x (base), 2nd consecutive = 2x, 3rd = 3x, 4th = 4x, 5+ = 5x
      // Combo resets when a move produces NO merge
      let newConsecutiveMerges = prev.consecutiveMerges
      let newComboBonus = prev.comboBonus
      let comboExtra = 0
      let comboMultiplier = 1 // 1 = no combo, 2 = 2x, 3 = 3x, etc.
      const isComboMode = prev.gameMode === 'bot' || prev.gameMode === 'coins' || prev.gameMode === 'tournament'
      if (isComboMode) {
        if (mergeCount > 0) {
          // This move produced a merge → increment consecutive counter
          newConsecutiveMerges += 1
          // Calculate multiplier based on consecutive merges
          comboMultiplier = Math.min(newConsecutiveMerges, 5) // Cap at 5x
          if (comboMultiplier >= 2) {
            // Extra score = scoreGain * (multiplier - 1) because base scoreGain already counts as 1x
            comboExtra = scoreGain * (comboMultiplier - 1)
            newComboBonus += comboExtra
          }
        } else {
          // This move produced NO merge → combo breaks, reset
          newConsecutiveMerges = 0
          comboMultiplier = 1
        }
      } else {
        // Classic mode: no combo
        newConsecutiveMerges = 0
        newComboBonus = 0
        comboMultiplier = 1
      }

      // Apply active multiplier to score gain (time-based, not move-based)
      let multiplierExtra = 0
      if (prev.activeMultiplier > 1 && prev.multiplierTimeLeft > 0) {
        multiplierExtra = Math.round((scoreGain + comboExtra) * (prev.activeMultiplier - 1))
        // Countdown is handled by multiplierTick (1 second intervals), NOT per move
      }

      const newScore = prev.score + scoreGain + comboExtra + multiplierExtra
      const newBestScore = Math.max(newScore, prev.bestScore)
      const isStuck = !canMove(tilesWithNew)
      const won = !prev.won && hasWon(tilesWithNew)

      let newLives = prev.lives
      let isGameOver = false
      let newTimerPaused: boolean = prev.timerPaused
      if (isStuck) {
        newLives = prev.lives - 1
        if (newLives <= 0) {
          newLives = 0
          // Tournament: NO ad lifeline - game over immediately when lives run out
          // Bot/Coins battle modes: pause timer so user can watch ad to revive
          // Classic mode: game over (can revive with ad from Game Over modal)
          if (prev.gameMode === 'tournament') {
            isGameOver = true
          } else if (isBattleMode) {
            newTimerPaused = true
          } else {
            isGameOver = true
          }
        }
      }

      // Bot battle result variables
      let botBattleResult = prev.botBattleResult
      let modBestScore = prev.modBestScore
      let coinGameWon = prev.coinGameWon
      let totalBattlesPlayed = prev.totalBattlesPlayed
      let totalBattlesWon = prev.totalBattlesWon
      let botOpponent = prev.botOpponent // Will be updated with final score at game end

      // Bot battle check - generate fair bot score at game end
      // For real-time battles, score comparison is handled by Firebase listener
      if (!prev.isRealTimeBattle) {
        if (prev.gameMode === 'bot' && prev.botOpponent && !botBattleResult) {
          if (isGameOver) {
            const botFinalScore = generateFairBotScore(newScore)
            botBattleResult = newScore > botFinalScore ? 'win' : 'lose'
            botOpponent = { ...prev.botOpponent, finalScore: botFinalScore }
            totalBattlesPlayed++
            if (botBattleResult === 'win') {
              modBestScore = Math.max(modBestScore, newScore)
              totalBattlesWon++
            }
          }
        }

        // Coin game mode check - generate fair bot score at game end
        if (prev.gameMode === 'coins' && isGameOver) {
          const botFinalScore = generateFairBotScore(newScore)
          coinGameWon = newScore > botFinalScore ? true : false
          botBattleResult = coinGameWon ? 'win' : 'lose'
          botOpponent = prev.botOpponent ? { ...prev.botOpponent, finalScore: botFinalScore } : null
          totalBattlesPlayed++
          if (coinGameWon) {
            modBestScore = Math.max(modBestScore, newScore)
            totalBattlesWon++
          }
        }

        // Tournament mode check - generate fair bot score at game end
        if (prev.gameMode === 'tournament' && isGameOver) {
          const botFinalScore = generateFairBotScore(newScore)
          botBattleResult = newScore > botFinalScore ? 'win' : 'lose'
          botOpponent = prev.botOpponent ? { ...prev.botOpponent, finalScore: botFinalScore } : null
          totalBattlesPlayed++
          if (botBattleResult === 'win') {
            modBestScore = Math.max(modBestScore, newScore)
            totalBattlesWon++
          }
        }
      } else {
        // Real-time battle: when game is over, finish the battle in Firebase
        // The actual result will come from the Firebase listener
        if (isGameOver && prev.realTimeBattleId) {
          const opponentField = prev.realTimePlayerField === 'player1' ? 'player2' : 'player1'
          const winnerId = newScore > prev.realTimeOpponentScore ? prev.playerId : 'opponent'
          finishBattle(prev.realTimeBattleId, winnerId).catch(() => {/* silent */})
          botOpponent = prev.botOpponent ? { ...prev.botOpponent, finalScore: prev.realTimeOpponentScore } : null
        }
      }

      // Game points only from actual gameplay (combo only counts in mods mode)
      const newGamePoints = prev.gamePoints + scoreGain + comboExtra

      // comboMultiplier is used for display (2x/3x combo label)
      // It's derived from consecutiveMerges in the UI

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
        timerPaused: newTimerPaused,
        botOpponent,
        botBattleResult,
        modBestScore,
        consecutiveMerges: newConsecutiveMerges,
        comboBonus: newComboBonus,
        comboMultiplier: comboMultiplier,
        gamePoints: newGamePoints + multiplierExtra,
        activeMultiplier: prev.activeMultiplier,
        multiplierTimeLeft: prev.multiplierTimeLeft,
        coinGameWon,
        playerLevel: calculateLevel(prev.levelXP),
        totalBattlesPlayed,
        totalBattlesWon,
      }
    })

    // Sync score to Firebase in real-time battle (fire-and-forget, outside setState)
    // We read the new score from the state update and push it asynchronously
    // This is done via a separate effect that watches state.score when in real-time battle

    return undefined as unknown as void
  }, [])

  // Update opponent's score from Firebase in real-time (must be declared before useEffect that uses it)
  const updateRealTimeOpponentScore = useCallback((score: number, finished: boolean) => {
    setState(prev => {
      if (!prev.isRealTimeBattle) return prev
      return {
        ...prev,
        realTimeOpponentScore: score,
        realTimeOpponentFinished: finished,
      }
    })
  }, [])

  // Sync score to Firebase during real-time battle
  useEffect(() => {
    if (!state.isRealTimeBattle || !state.realTimeBattleId || !state.realTimePlayerField) return
    if (state.score > 0 || state.gameOver) {
      updateBattleScore(state.realTimeBattleId, state.realTimePlayerField, state.score, state.gameOver).catch(() => {/* silent */})
    }
  }, [state.score, state.gameOver, state.isRealTimeBattle, state.realTimeBattleId, state.realTimePlayerField])

  // Listen for opponent's score in real-time battle
  useEffect(() => {
    if (!state.isRealTimeBattle || !state.realTimeBattleId || !state.realTimePlayerField) return
    const opponentField = state.realTimePlayerField === 'player1' ? 'player2' : 'player1'
    const unsubscribe = onBattleUpdate(state.realTimeBattleId, (battle) => {
      if (!battle) return
      const opponent = battle[opponentField]
      if (opponent) {
        updateRealTimeOpponentScore(opponent.score, opponent.finished)
      }
      // If battle is finished and we haven't set our result yet
      if (battle.status === 'finished' && !state.botBattleResult) {
        const winnerId = battle.winnerId
        const isWin = winnerId === state.playerId
        setState(prev => {
          if (prev.botBattleResult) return prev // Already resolved
          return {
            ...prev,
            botBattleResult: isWin ? 'win' : 'lose',
            botOpponent: prev.botOpponent ? { ...prev.botOpponent, finalScore: prev.realTimeOpponentScore } : null,
            coinGameWon: prev.gameMode === 'coins' ? isWin : null,
            gameOver: true,
            totalBattlesPlayed: prev.totalBattlesPlayed + 1,
            totalBattlesWon: isWin ? prev.totalBattlesWon + 1 : prev.totalBattlesWon,
            modBestScore: isWin ? Math.max(prev.modBestScore, prev.score) : prev.modBestScore,
          }
        })
      }
    })
    return unsubscribe
  }, [state.isRealTimeBattle, state.realTimeBattleId, state.realTimePlayerField, state.playerId, state.botBattleResult, updateRealTimeOpponentScore])

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
      // IMPORTANT: Keep score & gamePoints intact! Only reset tiles.
      // The user loses a life for getting stuck, but their earned points are preserved.
      return { ...prev, tiles, gameOver: false, won: false, keepPlaying: false, canUndo: false, undoCount: 0, activePowerUp: null, consecutiveMerges: 0, comboBonus: 0, comboMultiplier: 1 }
    })
  }, [])

  const activatePowerUp = useCallback((pu: PowerUp) => {
    setState(prev => {
      if (prev.activePowerUp === pu) return { ...prev, activePowerUp: null }
      if (pu === 'hammer' && prev.hammerCount <= 0) return prev
      if (pu === 'magnet' && prev.magnetCount <= 0) return prev
      if (pu === 'blast' && prev.blastCount <= 0) return prev
      if (pu === 'multiplier5x' && prev.multiplier5xCount <= 0) return prev
      if (pu === 'multiplier2_5x' && prev.multiplier2_5xCount <= 0) return prev
      if (pu === 'extraTime' && prev.extraTimeCount <= 0) return prev

      if (pu === 'multiplier5x') {
        return { ...prev, activeMultiplier: 5, multiplierTimeLeft: 10, multiplier5xCount: prev.multiplier5xCount - 1, activePowerUp: null }
      }
      if (pu === 'multiplier2_5x') {
        return { ...prev, activeMultiplier: 2.5, multiplierTimeLeft: 10, multiplier2_5xCount: prev.multiplier2_5xCount - 1, activePowerUp: null }
      }
      if (pu === 'extraTime') {
        // Timer ability: only usable after 20 seconds of game time have elapsed
        if (prev.gameTimeElapsed < 20) return prev
        const isBattleMode = prev.gameMode === 'bot' || prev.gameMode === 'coins' || prev.gameMode === 'tournament'
        // In battle/tournament mode: max 2 timer abilities per game
        if (isBattleMode && prev.timerAbilitiesUsed >= 2) return prev
        // Classic mode: UNLIMITED timer abilities - gives +50 score bonus (no timer to extend)
        if (!isBattleMode) {
          return {
            ...prev,
            score: prev.score + 50,
            extraTimeCount: prev.extraTimeCount - 1,
            activePowerUp: null,
            timerAbilitiesUsed: prev.timerAbilitiesUsed + 1,
          }
        }
        // Battle mode: adds +10 seconds to timer
        return { ...prev, battleTimer: prev.battleTimer + 10, battleTimeLimit: prev.battleTimeLimit + 10, extraTimeCount: prev.extraTimeCount - 1, activePowerUp: null, timerAbilitiesUsed: prev.timerAbilitiesUsed + 1 }
      }

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
        // Find adjacent tiles (up/down/left/right)
        const adjacentOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]]
        const adjacentTiles: Tile[] = []
        for (const [dr, dc] of adjacentOffsets) {
          const adj = prev.tiles.find(t => t.row === row + dr && t.col === col + dc)
          if (adj) adjacentTiles.push(adj)
        }
        // Remove clicked tile + up to 2 adjacent tiles
        const tilesToRemove = adjacentTiles.slice(0, 2)
        const removeSet = new Set<string>()
        removeSet.add(`${row}-${col}`)
        for (const t of tilesToRemove) {
          removeSet.add(`${t.row}-${t.col}`)
        }
        return { ...prev, tiles: prev.tiles.filter(t => !removeSet.has(`${t.row}-${t.col}`)), hammerCount: prev.hammerCount - 1, activePowerUp: null, canUndo: true }
      }
      if (prev.activePowerUp === 'magnet') {
        const targetTile = prev.tiles.find(t => t.row === row && t.col === col)
        if (!targetTile || prev.magnetCount <= 0) return { ...prev, activePowerUp: null }
        // Find ALL tiles with the same value
        const sameValueTiles = prev.tiles.filter(t => t.value === targetTile.value)
        // Remove ALL of them (including the clicked one)
        const removedValuesSum = sameValueTiles.reduce((sum, t) => sum + t.value, 0)
        prevState.current = prev
        const newTiles = prev.tiles.filter(t => t.value !== targetTile.value)
        return { ...prev, tiles: newTiles, score: prev.score + removedValuesSum, magnetCount: prev.magnetCount - 1, activePowerUp: null, canUndo: true, gamePoints: prev.gamePoints + removedValuesSum }
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
      timerPaused: false,
      countdownActive: false,
      countdownSecondsLeft: 0,
      consecutiveMerges: 0,
      comboBonus: 0,
      comboMultiplier: 1,
      coinEntryFee: 0,
      coinGameWon: null,
      activeMultiplier: 1,
      multiplierTimeLeft: 0,
      timerAbilitiesUsed: 0,
      gameTimeElapsed: 0,
      realTimeBattleId: null,
      realTimePlayerField: null,
      realTimeOpponentScore: 0,
      realTimeOpponentFinished: false,
      isRealTimeBattle: false,
    }))
  }, [])

  // Start a real-time battle with a matched player (from Firebase matchmaking)
  // board is the shared 4x4 grid from Firebase, battleId is the Firebase battle ID
  // MUST be defined before startBotBattle and startCoinGame which reference it
  const startRealTimeBattle = useCallback((
    opponent: { id: string; name: string; avatar: string; level: number },
    battleId: string,
    playerField: 'player1' | 'player2',
    board: number[][] | null,
    gameMode: 'bot' | 'coins',
    coinEntryFee: number = 0,
    timeLimit: number = 120,
  ) => {
    prevState.current = null
    setState(prev => {
      const today = getTodayStr()
      const gamesToday = prev.lastPlayDate === today ? prev.gamesPlayedToday : 0
      if (gamesToday >= prev.maxGamesPerDay) return prev
      if (gameMode === 'coins' && prev.coins < coinEntryFee) return prev

      // Reconstruct tiles from shared board, or generate new ones if no board
      let tiles: Tile[]
      if (board) {
        tileId = 0
        tiles = []
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            const val = board[r]?.[c]
            if (val && val > 0) {
              tiles.push({ id: getNextId(), value: val, row: r, col: c, isNew: false, isMerged: false, flash: false })
            }
          }
        }
        // If board is empty or invalid, fall back to fresh tiles
        if (tiles.length === 0) {
          tiles = initTiles()
        }
      } else {
        tiles = initTiles()
      }

      const opponentForState: BotOpponent = {
        name: opponent.name,
        avatar: opponent.avatar,
        finalScore: 0,
      }

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
        gameMode: gameMode,
        botOpponent: opponentForState,
        botBattleResult: null,
        battleTimer: timeLimit,
        battleTimeLimit: timeLimit,
        timerPaused: false,
        countdownActive: true,
        countdownSecondsLeft: 3,
        consecutiveMerges: 0,
        comboBonus: 0,
        gamesPlayedToday: gamesToday + 1,
        lastPlayDate: today,
        coinEntryFee: coinEntryFee,
        coinGameWon: null,
        activeMultiplier: 1,
        multiplierTimeLeft: 0,
        timerAbilitiesUsed: 0,
        gameTimeElapsed: 0,
        coins: gameMode === 'coins' ? prev.coins - coinEntryFee : prev.coins,
        // Real-time battle specific fields
        realTimeBattleId: battleId,
        realTimePlayerField: playerField,
        realTimeOpponentScore: 0,
        realTimeOpponentFinished: false,
        isRealTimeBattle: true,
      }
    })
  }, [])

  // Start a bot battle with Firebase matchmaking for real players
  // Uses coinAmount=0 for free battle mode matchmaking
  const startBotBattle = useCallback(async (timeLimit: number = 60) => {
    const today = getTodayStr()
    // Validate locally first
    const currentGamesToday = new Promise<number>(resolve => {
      setState(prev => {
        resolve(prev.lastPlayDate === today ? prev.gamesPlayedToday : 0)
        return prev
      })
    })
    const gamesToday = await currentGamesToday
    if (gamesToday >= 20) return

    // Try Firebase matchmaking with coinAmount=0 for free battle mode
    let matched = false
    const matchmakingKey = `battle_${timeLimit}` // Key by time limit
    try {
      // Clean up stale entries
      await cleanupStaleMatchmaking(0)

      const match = await findMatch(0, state.playerId)
      if (match) {
        const tiles = initTiles()
        const board: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0))
        for (const tile of tiles) {
          board[tile.row][tile.col] = tile.value
        }

        const battleId = await createBattle(
          { id: match.playerId, name: match.data.name, avatar: match.data.avatar, level: match.data.level },
          0,
          timeLimit,
          board
        )

        if (battleId) {
          const battle = await joinBattle(battleId, {
            id: state.playerId,
            name: state.playerName,
            avatar: state.playerAvatar,
            level: state.playerLevel,
          })

          if (battle) {
            await markMatched(match.playerId, 0, battleId)
            await markMatched(state.playerId, 0, battleId)

            startRealTimeBattle(
              { id: match.playerId, name: match.data.name, avatar: match.data.avatar, level: match.data.level },
              battleId,
              'player2',
              board,
              'bot',
              0,
              timeLimit
            )
            matched = true
          }
        }
      } else {
        // No match found → join the matchmaking queue and wait briefly
        await joinMatchmaking(state.playerId, state.playerName, state.playerAvatar, 0, state.playerLevel)

        const waitResult = await new Promise<{ playerId: string; data: MatchmakingEntry } | null>((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000)
          const unsubscribe = onMatchmakingUpdate(state.playerId, 0, (entry) => {
            if (entry && entry.status === 'matched' && entry.battleId) {
              clearTimeout(timeout)
              unsubscribe()
              joinBattle(entry.battleId, {
                id: state.playerId,
                name: state.playerName,
                avatar: state.playerAvatar,
                level: state.playerLevel,
              }).then((battle) => {
                if (battle && battle.player1 && battle.board) {
                  resolve({ playerId: battle.player1.id, data: { name: battle.player1.name, avatar: battle.player1.avatar, level: battle.player1.level, joinedAt: 0, status: 'matched', battleId: entry.battleId } })
                } else {
                  resolve(null)
                }
              }).catch(() => resolve(null))
            }
          })
        })

        await leaveMatchmaking(state.playerId, 0)

        if (waitResult) {
          const { getBattle: getBattleFB } = await import('@/lib/firebase-service')
          const battle = await getBattleFB(waitResult.data.battleId || '')
          if (battle && battle.player1) {
            startRealTimeBattle(
              { id: battle.player1.id, name: battle.player1.name, avatar: battle.player1.avatar, level: battle.player1.level },
              waitResult.data.battleId || '',
              'player2',
              battle.board,
              'bot',
              0,
              timeLimit
            )
            matched = true
          }
        }
      }
    } catch (err) {
      console.warn('Firebase matchmaking failed, falling back to bot:', err)
      await leaveMatchmaking(state.playerId, 0).catch(() => {})
    }

    // Fall back to bot if no real player matched
    if (!matched) {
      const tiles = initTiles()
      prevState.current = null
      setState(prev => {
        const t = getTodayStr()
        const gt = prev.lastPlayDate === t ? prev.gamesPlayedToday : 0
        if (gt >= prev.maxGamesPerDay) return prev

        const opponent = generateBotOpponent()
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
          gameMode: 'bot' as GameMode,
          botOpponent: opponent,
          botBattleResult: null,
          battleTimer: timeLimit,
          battleTimeLimit: timeLimit,
          timerPaused: false,
          countdownActive: true,
          countdownSecondsLeft: 3,
          consecutiveMerges: 0,
          comboBonus: 0,
          gamesPlayedToday: gt + 1,
          lastPlayDate: t,
          coinEntryFee: 0,
          coinGameWon: null,
          activeMultiplier: 1,
          multiplierTimeLeft: 0,
          timerAbilitiesUsed: 0,
          gameTimeElapsed: 0,
          realTimeBattleId: null,
          realTimePlayerField: null,
          realTimeOpponentScore: 0,
          realTimeOpponentFinished: false,
          isRealTimeBattle: false,
        }
      })
    }
  }, [state.playerId, state.playerName, state.playerAvatar, state.playerLevel, startRealTimeBattle])

  // Start a coin game with Firebase matchmaking
  // 1. Join matchmaking queue
  // 2. Try to find a waiting opponent
  // 3a. If match found → createBattle with shared board → startRealTimeBattle
  // 3b. If no match → fall back to bot opponent (local game)
  const startCoinGame = useCallback(async (entryFee: number) => {
    const today = getTodayStr()
    // Validate locally first
    const currentGamesToday = new Promise<number>(resolve => {
      setState(prev => {
        resolve(prev.lastPlayDate === today ? prev.gamesPlayedToday : 0)
        return prev
      })
    })
    const currentCoins = new Promise<number>(resolve => {
      setState(prev => {
        resolve(prev.coins)
        return prev
      })
    })
    const gamesToday = await currentGamesToday
    const coins = await currentCoins
    if (gamesToday >= 20 || coins < entryFee) return

    // Try Firebase matchmaking
    let matched = false
    try {
      // Clean up stale entries first
      await cleanupStaleMatchmaking(entryFee)

      // Try to find a waiting opponent
      const match = await findMatch(entryFee, state.playerId)
      if (match) {
        // Found a waiting player → create battle with shared board and join as player2
        const tiles = initTiles()
        const board: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0))
        for (const tile of tiles) {
          board[tile.row][tile.col] = tile.value
        }

        // Create battle with player1 being the matched player
        const battleId = await createBattle(
          { id: match.playerId, name: match.data.name, avatar: match.data.avatar, level: match.data.level },
          entryFee,
          120,
          board
        )

        if (battleId) {
          // Join as player2
          const battle = await joinBattle(battleId, {
            id: state.playerId,
            name: state.playerName,
            avatar: state.playerAvatar,
            level: state.playerLevel,
          })

          if (battle) {
            // Mark the other player as matched so they get notified
            await markMatched(match.playerId, entryFee, battleId)
            // Mark ourselves as matched too
            await markMatched(state.playerId, entryFee, battleId)

            // Start the real-time battle with shared board
            startRealTimeBattle(
              { id: match.playerId, name: match.data.name, avatar: match.data.avatar, level: match.data.level },
              battleId,
              'player2',
              board,
              'coins',
              entryFee,
              120
            )
            matched = true
          }
        }
      } else {
        // No match found → join the matchmaking queue and wait briefly
        await joinMatchmaking(state.playerId, state.playerName, state.playerAvatar, entryFee, state.playerLevel)

        // Wait up to 5 seconds for someone to match with us
        const waitResult = await new Promise<{ playerId: string; data: MatchmakingEntry } | null>((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000)
          const unsubscribe = onMatchmakingUpdate(state.playerId, entryFee, (entry) => {
            if (entry && entry.status === 'matched' && entry.battleId) {
              clearTimeout(timeout)
              unsubscribe()
              // We got matched! The battle already exists (created by the other player)
              // Join the battle
              joinBattle(entry.battleId, {
                id: state.playerId,
                name: state.playerName,
                avatar: state.playerAvatar,
                level: state.playerLevel,
              }).then((battle) => {
                if (battle && battle.player1 && battle.board) {
                  resolve({ playerId: battle.player1.id, data: { name: battle.player1.name, avatar: battle.player1.avatar, level: battle.player1.level, joinedAt: 0, status: 'matched', battleId: entry.battleId } })
                } else {
                  resolve(null)
                }
              }).catch(() => resolve(null))
            }
          })
        })

        // Leave matchmaking queue regardless of result
        await leaveMatchmaking(state.playerId, entryFee)

        if (waitResult) {
          // Get the battle from Firebase to read the board
          const { getBattle: getBattleFB } = await import('@/lib/firebase-service')
          const battle = await getBattleFB(waitResult.data.battleId || '')
          if (battle && battle.player1) {
            startRealTimeBattle(
              { id: battle.player1.id, name: battle.player1.name, avatar: battle.player1.avatar, level: battle.player1.level },
              waitResult.data.battleId || '',
              'player2',
              battle.board,
              'coins',
              entryFee,
              120
            )
            matched = true
          }
        }
      }
    } catch (err) {
      console.warn('Firebase matchmaking failed, falling back to bot:', err)
      await leaveMatchmaking(state.playerId, entryFee).catch(() => {})
    }

    // Fall back to bot if no real player matched
    if (!matched) {
      const tiles = initTiles()
      prevState.current = null
      setState(prev => {
        const t = getTodayStr()
        const gt = prev.lastPlayDate === t ? prev.gamesPlayedToday : 0
        if (gt >= prev.maxGamesPerDay) return prev
        if (prev.coins < entryFee) return prev

        const opponent = generateBotOpponent()
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
          gameMode: 'coins' as GameMode,
          botOpponent: opponent,
          botBattleResult: null,
          battleTimer: 120,
          battleTimeLimit: 120,
          timerPaused: false,
          countdownActive: true,
          countdownSecondsLeft: 3,
          consecutiveMerges: 0,
          comboBonus: 0,
          coins: prev.coins - entryFee,
          coinEntryFee: entryFee,
          coinGameWon: null,
          activeMultiplier: 1,
          multiplierTimeLeft: 0,
          timerAbilitiesUsed: 0,
          gameTimeElapsed: 0,
          gamesPlayedToday: gt + 1,
          lastPlayDate: t,
          realTimeBattleId: null,
          realTimePlayerField: null,
          realTimeOpponentScore: 0,
          realTimeOpponentFinished: false,
          isRealTimeBattle: false,
        }
      })
    }
  }, [state.playerId, state.playerName, state.playerAvatar, state.playerLevel, startRealTimeBattle])

  // Sync current player's score to Firebase
  const syncBattleScoreToFirebase = useCallback((score: number, finished: boolean) => {
    if (!state.realTimeBattleId || !state.realTimePlayerField) return
    updateBattleScore(state.realTimeBattleId, state.realTimePlayerField, score, finished).catch(() => {/* silent */})
  }, [state.realTimeBattleId, state.realTimePlayerField])

  // Leave real-time battle (disconnect / forfeit)
  const leaveRealTimeBattle = useCallback(() => {
    if (!state.realTimeBattleId || !state.realTimePlayerField) return
    const opponentField = state.realTimePlayerField === 'player1' ? 'player2' : 'player1'
    firebaseLeaveBattle(state.realTimeBattleId, state.realTimePlayerField, opponentField).catch(() => {/* silent */})
  }, [state.realTimeBattleId, state.realTimePlayerField])

  // Tournament game: 90 seconds, point system
  const startTournamentGame = useCallback(() => {
    const tiles = initTiles()
    prevState.current = null
    setState(prev => {
      if (!prev.tournamentJoined) return prev

      const today = getTodayStr()
      const gamesToday = prev.lastPlayDate === today ? prev.gamesPlayedToday : 0
      if (gamesToday >= prev.maxGamesPerDay) return prev

      const opponent = generateBotOpponent()
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
        gameMode: 'tournament' as GameMode,
        botOpponent: opponent,
        botBattleResult: null,
        battleTimer: 90,
        battleTimeLimit: 90,
        timerPaused: false,
        countdownActive: true,
        countdownSecondsLeft: 3,
        consecutiveMerges: 0,
        comboBonus: 0,
        coinEntryFee: 0,
        coinGameWon: null,
        activeMultiplier: 1,
        multiplierTimeLeft: 0,
        timerAbilitiesUsed: 0,
        gameTimeElapsed: 0,
        gamesPlayedToday: gamesToday + 1,
        lastPlayDate: today,
      }
    })
  }, [])

  // Calculate and add tournament points after a game
  // NEW SP/XP system: SP earned based on score and level, 3 SP = 1 XP (levelXP)
  const calculateTournamentPoints = useCallback((finalScore: number) => {
    setState(prev => {
      if (prev.gameMode !== 'tournament') return prev

      // Calculate SP earned based on score and current level
      const spRate = getSPPerHundredScore(prev.playerLevel)
      const spEarned = (finalScore / 100) * spRate

      // Add earned SP to accumulated skillPoints
      let newSkillPoints = prev.skillPoints + spEarned

      // Convert SP to XP: every 3 SP = 1 XP (levelXP)
      let xpGained = 0
      while (newSkillPoints >= 3) {
        newSkillPoints -= 3
        xpGained++
      }

      // Update levelXP and calculate new level
      const newLevelXP = prev.levelXP + xpGained
      const newSpRemainder = newSkillPoints // remainder after conversion (< 3)

      // Tournament points for leaderboard = score-based (1 point per game for leaderboard tracking)
      const newTournamentPoints = prev.tournamentPoints + 1

      return {
        ...prev,
        tournamentPoints: newTournamentPoints,
        tournamentCarryOver: 0,
        tournamentGamesPlayed: prev.tournamentGamesPlayed + 1,
        levelXP: newLevelXP,
        playerLevel: calculateLevel(newLevelXP),
        skillPoints: newSkillPoints,
        spRemainder: newSpRemainder,
      }
    })
  }, [])

  // Join tournament (50 coins entry fee)
  const joinTournament = useCallback(() => {
    setState(prev => {
      if (prev.tournamentJoined) return prev
      if (prev.coins < 50) return prev
      return {
        ...prev,
        tournamentJoined: true,
        coins: prev.coins - 50,
      }
    })
  }, [])

  const tickBattleTimer = useCallback(() => {
    setState(prev => {
      if (prev.gameMode !== 'bot' && prev.gameMode !== 'coins' && prev.gameMode !== 'tournament') return prev
      if (prev.botBattleResult || prev.battleTimer <= 0 || prev.timerPaused) return prev

      // Track game time elapsed
      const newGameTimeElapsed = prev.gameTimeElapsed + 1
      const newTimer = prev.battleTimer - 1

      if (newTimer <= 0) {
        // Time's up - generate FAIR bot score based on player's actual score
        // This ensures 50/50 win chance - both have equal opportunity
        const botFinalScore = generateFairBotScore(prev.score)
        const result = prev.score > botFinalScore ? 'win' : 'lose'
        const newModBest = result === 'win' ? Math.max(prev.modBestScore, prev.score) : prev.modBestScore
        const coinGameWon = result === 'win' ? true : false

        // Calculate tournament points if tournament mode (using new SP/XP system)
        let tournamentPoints = prev.tournamentPoints
        let tournamentCarryOver = prev.tournamentCarryOver
        let tournamentGamesPlayed = prev.tournamentGamesPlayed
        let levelXP = prev.levelXP
        let skillPoints = prev.skillPoints
        let spRemainder = prev.spRemainder
        if (prev.gameMode === 'tournament') {
          // SP earned based on score and current level
          const spRate = getSPPerHundredScore(prev.playerLevel)
          const spEarned = (prev.score / 100) * spRate
          skillPoints += spEarned

          // Convert SP to XP: every 3 SP = 1 XP (levelXP)
          let xpGained = 0
          while (skillPoints >= 3) {
            skillPoints -= 3
            xpGained++
          }
          spRemainder = skillPoints
          levelXP += xpGained

          tournamentCarryOver = 0
          tournamentPoints += 1
          tournamentGamesPlayed++
        }

        return {
          ...prev,
          battleTimer: 0,
          botBattleResult: result,
          botOpponent: prev.botOpponent ? { ...prev.botOpponent, finalScore: botFinalScore } : null,
          gameOver: true,
          modBestScore: newModBest,
          coinGameWon,
          totalBattlesPlayed: prev.totalBattlesPlayed + 1,
          totalBattlesWon: result === 'win' ? prev.totalBattlesWon + 1 : prev.totalBattlesWon,
          tournamentPoints,
          tournamentCarryOver,
          tournamentGamesPlayed,
          levelXP,
          playerLevel: calculateLevel(levelXP),
          skillPoints,
          spRemainder,
          gameTimeElapsed: newGameTimeElapsed,
        }
      }
      return { ...prev, battleTimer: newTimer, gameTimeElapsed: newGameTimeElapsed }
    })
  }, [])

  // Tick game time elapsed for classic mode (no battle timer, just tracking elapsed time)
  const tickGameTimeElapsed = useCallback(() => {
    setState(prev => {
      if (prev.gameMode !== 'classic' || prev.gameOver) return prev
      return { ...prev, gameTimeElapsed: prev.gameTimeElapsed + 1 }
    })
  }, [])

  const tickCountdown = useCallback(() => {
    setState(prev => {
      if (!prev.countdownActive) return prev
      const newSeconds = prev.countdownSecondsLeft - 1
      if (newSeconds <= 0) {
        return { ...prev, countdownActive: false, countdownSecondsLeft: 0 }
      }
      return { ...prev, countdownSecondsLeft: newSeconds }
    })
  }, [])

  const continueGame = useCallback(() => {
    setState(prev => ({ ...prev, won: false, keepPlaying: true }))
  }, [])

  const useSpinTicket = useCallback(() => {
    setState(prev => {
      if (prev.spinTickets <= 0) return prev
      // Update spin daily task progress
      const today = getTodayStr()
      const tasks = prev.dailyTasks.map(t => {
        if (t.id === `spin-${today}` && !t.claimed) {
          return { ...t, progress: Math.min(t.progress + 1, t.target) }
        }
        return t
      })
      return { ...prev, spinTickets: prev.spinTickets - 1, dailyTasks: tasks }
    })
  }, [])

  const addSpinTickets = useCallback((count: number) => {
    setState(prev => ({ ...prev, spinTickets: prev.spinTickets + count }))
  }, [])

  const claimWelcome = useCallback(() => {
    setState(prev => {
      if (prev.welcomeClaimed) return prev

      // Generate WELCOME60 discount coupon in admin coupons system
      try {
        const existingCoupons = JSON.parse(localStorage.getItem('adminDiscountCoupons') || '[]')
        const userCode = prev.userCode || ''
        const welcomeCouponExists = existingCoupons.some((c: { code: string }) => c.code === 'WELCOME60' && c.targetUserIds?.includes(userCode))
        if (!welcomeCouponExists) {
          existingCoupons.push({
            code: 'WELCOME60',
            discountPercent: 60,
            minPurchase: 29,
            maxUses: 1,
            currentUses: 0,
            oneTime: true,
            targetUserIds: [userCode],
            createdAt: Date.now(),
            createdBy: 'system',
            description: 'Welcome bonus: 60% off on ₹29+ purchases!',
          })
          localStorage.setItem('adminDiscountCoupons', JSON.stringify(existingCoupons))
        }
      } catch { /* ignore localStorage errors */ }

      return {
        ...prev,
        welcomeClaimed: true,
        hammerCount: prev.hammerCount + 5,
        magnetCount: prev.magnetCount + 5,
        blastCount: prev.blastCount + 5,
        undoTotal: prev.undoTotal + 5,
        spinTickets: prev.spinTickets + 10, // 10 Spin Tickets (up from 5)
        coins: prev.coins + 500, // Welcome bonus coins for new users
        multiplier5xCount: prev.multiplier5xCount + 5, // 5x Ability × 5
        multiplier2_5xCount: prev.multiplier2_5xCount + 5, // 2.5x Ability × 5
        extraTimeCount: prev.extraTimeCount + 5, // Timer Ability × 5
        roomCardCount: prev.roomCardCount + 2, // 2 FREE Room Cards
      }
    })
  }, [])

  // Coin rewards for each streak day (base amounts - will be modified by streakWeek)
  const STREAK_COIN_REWARDS = [10, 50, 20, 100, 200, 0, 250]

  const claimStreakDay = useCallback((day: number) => {
    setState(prev => {
      if (prev.streakClaimed[day]) return prev
      const newClaimed = [...prev.streakClaimed]
      newClaimed[day] = true

      let h = 0, m = 0, b = 0, s = 0, et = 0, m5x = 0, m2_5x = 0, u = 0, rc = 0
      switch (day) {
        case 0: m = 1; break // Day 1: Magnet + 10 coins
        case 1: u = 2; break // Day 2: 2 Undo + 50 coins
        case 2: et = 1; break // Day 3: Timer skill + 20 coins
        case 3: h = 5; break // Day 4: 5 Hammers + 100 coins
        case 4: b = 5; break // Day 5: 5 Bombs + 200 coins
        case 5: rc = 1; break // Day 6: 1 Room Card
        case 6: m5x = 1; m2_5x = 1; break // Day 7: 5x + 2.5x + 250 coins
      }

      const baseCoinReward = STREAK_COIN_REWARDS[day] || 0
      const coinBonus = (prev.streakWeek - 1) * 100
      const coinReward = baseCoinReward + coinBonus

      // If day 7 (last day) is claimed, increment streakWeek
      const newStreakWeek = day === 6 ? prev.streakWeek + 1 : prev.streakWeek

      return {
        ...prev,
        streakClaimed: newClaimed,
        hammerCount: prev.hammerCount + h,
        magnetCount: prev.magnetCount + m,
        blastCount: prev.blastCount + b,
        spinTickets: prev.spinTickets + s,
        extraTimeCount: prev.extraTimeCount + et,
        multiplier5xCount: prev.multiplier5xCount + m5x,
        multiplier2_5xCount: prev.multiplier2_5xCount + m2_5x,
        undoTotal: prev.undoTotal + u,
        roomCardCount: prev.roomCardCount + rc,
        coins: prev.coins + coinReward,
        totalCoinsEarned: prev.totalCoinsEarned + coinReward,
        streakWeek: newStreakWeek,
      }
    })
  }, [])

  const addCoins = useCallback((amount: number) => {
    setState(prev => {
      const newCoins = prev.coins + amount
      const newTotalCoinsEarned = prev.totalCoinsEarned + amount
      let newCommissionBalance = prev.commissionBalance
      let newCommissionClaimed = prev.commissionClaimed
      if (prev.autoClaimCommission && prev.commissionBalance > 0) {
        newCommissionClaimed += prev.commissionBalance
        newCommissionBalance = 0
      }
      return { ...prev, coins: newCoins, totalCoinsEarned: newTotalCoinsEarned, commissionBalance: newCommissionBalance, commissionClaimed: newCommissionClaimed }
    })
  }, [])

  // Add coins from WINNING battles only (for leaderboard - purchased coins don't count)
  const addWinningCoins = useCallback((amount: number) => {
    setState(prev => {
      const newCoins = prev.coins + amount
      const newTotalCoinsEarned = prev.totalCoinsEarned + amount
      const newWinningCoins = prev.winningCoins + amount
      let newCommissionBalance = prev.commissionBalance
      let newCommissionClaimed = prev.commissionClaimed
      if (prev.autoClaimCommission && prev.commissionBalance > 0) {
        newCommissionClaimed += prev.commissionBalance
        newCommissionBalance = 0
      }
      return { ...prev, coins: newCoins, totalCoinsEarned: newTotalCoinsEarned, winningCoins: newWinningCoins, commissionBalance: newCommissionBalance, commissionClaimed: newCommissionClaimed }
    })
  }, [])

  const deductCoins = useCallback((amount: number) => {
    setState(prev => {
      if (prev.coins < amount) return prev // Not enough coins
      return { ...prev, coins: prev.coins - amount }
    })
  }, [])

  const addPowerUp = useCallback((pu: PowerUp, count: number) => {
    setState(prev => {
      switch (pu) {
        case 'hammer': return { ...prev, hammerCount: prev.hammerCount + count }
        case 'magnet': return { ...prev, magnetCount: prev.magnetCount + count }
        case 'blast': return { ...prev, blastCount: prev.blastCount + count }
        case 'multiplier5x': return { ...prev, multiplier5xCount: prev.multiplier5xCount + count }
        case 'multiplier2_5x': return { ...prev, multiplier2_5xCount: prev.multiplier2_5xCount + count }
        case 'extraTime': return { ...prev, extraTimeCount: prev.extraTimeCount + count }
        default: return prev
      }
    })
  }, [])

  const addUndos = useCallback((count: number) => {
    setState(prev => ({ ...prev, undoTotal: prev.undoTotal + count }))
  }, [])

  const reviveWithAd = useCallback(() => {
    setState(prev => {
      // NO ad lifeline in tournament mode - game should have ended already
      if (prev.gameMode === 'tournament') return prev
      // Give fresh tiles so user can actually play (old tiles were stuck)
      const tiles = initTiles()
      return {
        ...prev,
        tiles,
        lives: Math.min(prev.lives + 1, prev.maxLives),
        gameOver: false,
        timerPaused: false, // Resume timer after ad revive
        countdownActive: true,
        countdownSecondsLeft: 1, // 1-second hold before resuming gameplay
        consecutiveMerges: 0,
        comboBonus: 0,
        comboMultiplier: 1,
      }
    })
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
      gameMode: 'classic' as GameMode,
      botOpponent: null,
      botBattleResult: null,
      battleTimer: 0,
      timerPaused: false,
      countdownActive: false,
      countdownSecondsLeft: 0,
      consecutiveMerges: 0,
      comboBonus: 0,
      comboMultiplier: 1,
      coinEntryFee: 0,
      coinGameWon: null,
      activeMultiplier: 1,
      multiplierTimeLeft: 0,
      timerAbilitiesUsed: 0,
      gameTimeElapsed: 0,
      realTimeBattleId: null,
      realTimePlayerField: null,
      realTimeOpponentScore: 0,
      realTimeOpponentFinished: false,
      isRealTimeBattle: false,
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
          invitedBy: null,
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

  // Weekly bonus: 400 coins, once per week
  const claimWeeklyBonus = useCallback(() => {
    setState(prev => {
      if (prev.weeklyBonusClaimed) return prev
      return {
        ...prev,
        weeklyBonusClaimed: true,
        coins: prev.coins + 400,
      }
    })
  }, [])

  // Claim daily task reward
  const claimDailyTask = useCallback((taskId: string) => {
    setState(prev => {
      const task = prev.dailyTasks.find(t => t.id === taskId)
      if (!task || task.claimed) return prev

      // For 'claim' action type, auto-complete (progress = target)
      // For other types, require progress >= target
      if (task.actionType !== 'claim' && task.progress < task.target) return prev

      const tasks = prev.dailyTasks.map(t => {
        if (t.id === taskId) return { ...t, claimed: true, progress: Math.max(t.progress, t.target) }
        return t
      })

      // Grant the reward based on type
      const reward = task.reward
      let newState: Partial<GameState> = { dailyTasks: tasks }

      switch (reward.type) {
        case 'coins':
          newState = { ...newState, coins: prev.coins + reward.count }
          break
        case 'spin':
          newState = { ...newState, spinTickets: prev.spinTickets + reward.count }
          break
        case 'hammer':
          newState = { ...newState, hammerCount: prev.hammerCount + reward.count }
          break
        case 'magnet':
          newState = { ...newState, magnetCount: prev.magnetCount + reward.count }
          break
        case 'blast':
          newState = { ...newState, blastCount: prev.blastCount + reward.count }
          break
        case 'multiplier5x':
          newState = { ...newState, multiplier5xCount: prev.multiplier5xCount + reward.count }
          break
        case 'multiplier2_5x':
          newState = { ...newState, multiplier2_5xCount: prev.multiplier2_5xCount + reward.count }
          break
        case 'extraTime':
          newState = { ...newState, extraTimeCount: prev.extraTimeCount + reward.count }
          break
        case 'undo':
          newState = { ...newState, undoTotal: prev.undoTotal + reward.count }
          break
      }

      return { ...prev, ...newState }
    })
  }, [])

  // Reset ALL data to 0 - fresh start (keeps welcome bonus available)
  const resetAllData = useCallback(() => {
    localStorage.removeItem('mergeMaster2048')
    const tiles = initTiles()
    prevState.current = null
    setState({
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
      lastLoginDate: getTodayStr(),
      streakClaimed: [false, false, false, false, false, false, false],
      welcomeClaimed: false, // Reset so welcome bonus can be claimed again
      coins: 0,
      gamePoints: 0,
      gameMode: 'classic',
      botOpponent: null,
      botBattleResult: null,
      modBestScore: 0,
      battleTimer: 0,
      battleTimeLimit: 60,
      timerPaused: false,
      countdownActive: false,
      countdownSecondsLeft: 0,
      consecutiveMerges: 0,
      comboBonus: 0,
      comboMultiplier: 1,
      inviteCode: generateInviteCode(), // New fresh invite code
      invitedBy: null,
      invitedUsers: [],
      commissionBalance: 0,
      commissionClaimed: 0,
      autoClaimCommission: false,
      gamesPlayedToday: 0,
      lastPlayDate: getTodayStr(),
      maxGamesPerDay: 20,
      notifications: [],
      coinEntryFee: 0,
      coinGameWon: null,
      playerName: 'Player',
      playerAvatar: '😎',
      playerLevel: 1,
      playerId: '',
      firebaseReferrals: [],
      firebaseCommissionPending: 0,
      totalBattlesPlayed: 0,
      totalBattlesWon: 0,
      tournamentJoined: false,
      tournamentPoints: 0,
      tournamentCarryOver: 0,
      tournamentGamesPlayed: 0,
      levelXP: 0,
      gameHistory: [],
      weeklyBonusClaimed: false,
      leaderboardMonth: new Date().getFullYear() * 12 + new Date().getMonth(),
      leaderboardYear: new Date().getFullYear(),
      dailyTasks: generateDailyTasks(),
      multiplier5xCount: 0,
      multiplier2_5xCount: 0,
      extraTimeCount: 0,
      activeMultiplier: 1,
      multiplierTimeLeft: 0,
      userCode: generateUserCode(),
      totalCoinsEarned: 0,
      winningCoins: 0,
      roomCardCount: 0,
      streakWeek: 1,
      skillPoints: 0,
      spRemainder: 0,
      timerAbilitiesUsed: 0,
      gameTimeElapsed: 0,
      realTimeBattleId: null,
      realTimePlayerField: null,
      realTimeOpponentScore: 0,
      realTimeOpponentFinished: false,
      isRealTimeBattle: false,
    })
  }, [])

  // Add room cards
  const addRoomCards = useCallback((count: number) => {
    setState(prev => ({
      ...prev,
      roomCardCount: prev.roomCardCount + count,
    }))
  }, [])

  const multiplierTick = useCallback(() => {
    setState(prev => {
      if (prev.multiplierTimeLeft <= 0) return { ...prev, activeMultiplier: 1 }
      const newTime = prev.multiplierTimeLeft - 1
      if (newTime <= 0) return { ...prev, multiplierTimeLeft: 0, activeMultiplier: 1 }
      return { ...prev, multiplierTimeLeft: newTime }
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
    claimWelcome,
    claimStreakDay,
    addCoins,
    addWinningCoins,
    deductCoins,
    addPowerUp,
    addUndos,
    startBotBattle,
    startCoinGame,
    startRealTimeBattle,
    leaveRealTimeBattle,
    startTournamentGame,
    calculateTournamentPoints,
    joinTournament,
    tickBattleTimer,
    tickGameTimeElapsed,
    tickCountdown,
    goBackToDashboard,
    claimInviteReward,
    addInvitedUser,
    addCommission,
    claimCommission,
    toggleAutoClaim,
    claimFirebaseCommission: useCallback(() => {
      setState(prev => {
        const amount = prev.firebaseCommissionPending
        if (amount <= 0) return prev
        return {
          ...prev,
          coins: prev.coins + amount,
          commissionClaimed: prev.commissionClaimed + amount,
          firebaseCommissionPending: 0,
        }
      })
    }, []),
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteReadNotifications,
    updatePlayerName,
    updatePlayerAvatar,
    addGameToHistory,
    claimWeeklyBonus,
    claimDailyTask,
    resetAllData,
    addRoomCards,
    multiplierTick,
    completeVisitWebsiteTask: useCallback(() => {
      setState(prev => {
        const today = getTodayStr()
        const tasks = prev.dailyTasks.map(t => {
          // Update visit1 task
          if (t.id === `visit1-${today}` && !t.claimed) {
            return { ...t, progress: Math.min(t.progress + 1, t.target) }
          }
          // Update visit2 task (requires 2 visits)
          if (t.id === `visit2-${today}` && !t.claimed) {
            return { ...t, progress: Math.min(t.progress + 1, t.target) }
          }
          return t
        })
        return { ...prev, dailyTasks: tasks }
      })
    }, []),
  }
}
