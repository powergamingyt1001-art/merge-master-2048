'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { syncPlayerToFirebase, processReferral, processCommissionForReferrer, getReferrals, onReferralsUpdate, getCommissionNotifications, claimCommissionNotification, type FirebaseReferral } from '@/lib/firebase-service'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type PowerUp = 'hammer' | 'magnet' | 'blast'
export type GameMode = 'classic' | 'bot' | 'coins' | 'tournament'
export type AbilityType = 'multiply5' | 'multiply2_5' | 'timeExtend'

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

export interface GameHistoryEntry {
  id: string
  date: string
  mode: GameMode
  score: number
  result: 'win' | 'lose' | 'classic'
  entryFee: number
  timeLimit: number
}

export interface DailyTask {
  id: string
  description: string
  emoji: string
  target: number
  progress: number
  reward: number
  claimed: boolean
}

export interface CouponCode {
  code: string
  reward: string
  expiresAt: number
  claimed: boolean
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
  // Timer paused by visibility (tab switch)
  timerPausedByVisibility: boolean
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
  levelXP: number // 50% of tournament points go here for level calculation
  // Score-to-points conversion: 50 score = 1.5 points, carry-over for precision
  scorePoints: number // accumulated tournament points not yet converted to XP
  scorePointsCarryOver: number // fractional points carry-over
  // Game history
  gameHistory: GameHistoryEntry[]
  // Weekly bonus
  weeklyBonusClaimed: boolean
  // Daily tasks
  dailyTasks: DailyTask[]
  // Ability system
  multiply5Count: number
  multiply2_5Count: number
  timeExtendCount: number
  activeAbility: AbilityType | null
  abilityTimer: number // seconds remaining for active ability
  // Level completion rewards
  pendingLevelUpCoins: number // coins to add when level increases
  // Coupon code system
  couponCodes: CouponCode[]
  lastCouponRefresh: number
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

// Generate bot name/avatar for display (score generated at game end for fairness)
function generateBotOpponent(): BotOpponent {
  const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
  return { ...bot, finalScore: 0 } // Score set to 0; will be generated at game end
}

// Generate fair bot score at game end - 50/50 win chance
// Score is based on player's ACTUAL score, not best score
// Ties go to the player (>= comparison) to balance the 50/50
function generateFairBotScore(playerScore: number): number {
  const base = Math.max(playerScore, 100)
  // ±30% variance around player's score for close, exciting games
  const variance = base * 0.3
  return Math.round(Math.max(50, base + (Math.random() * variance * 2 - variance)))
}

// ============================================================
// LEVEL SYSTEM - 200 Levels, based on LEVEL XP
// Level XP comes from score conversion:
//   50 score = 1.5 tournament points
//   3 tournament points = 1 XP
//   So effectively: 100 score → 3 points → 1 XP
// 50% of points → levelXP (permanent, never resets)
// 50% of points → tournamentPoints (for weekly leaderboard)
// levelXP never resets on weekly tournament reset
// ============================================================

export const MAX_LEVEL = 200

// Exact XP lookup table for levels 1-100
const LEVEL_XP_TABLE: Record<number, number> = {
  1: 0, 2: 10, 3: 50, 4: 75, 5: 90,
  6: 100, 7: 120, 8: 140, 9: 160, 10: 200,
  11: 230, 12: 260, 13: 290, 14: 320, 15: 350,
  16: 380, 17: 410, 18: 440, 19: 470, 20: 500,
  21: 550, 22: 600, 23: 650, 24: 700, 25: 750,
  26: 800, 27: 850, 28: 900, 29: 950, 30: 1000,
  31: 1100, 32: 1200, 33: 1300, 34: 1400, 35: 1500,
  36: 1600, 37: 1700, 38: 1800, 39: 1900, 40: 2000,
  41: 2150, 42: 2300, 43: 2450, 44: 2600, 45: 2750,
  46: 2900, 47: 3050, 48: 3200, 49: 3350, 50: 3500,
  51: 3700, 52: 3900, 53: 4100, 54: 4300, 55: 4500,
  56: 4700, 57: 4900, 58: 5100, 59: 5300, 60: 5500,
  61: 5800, 62: 6100, 63: 6400, 64: 6700, 65: 7000,
  66: 7300, 67: 7600, 68: 7900, 69: 8200, 70: 8500,
  71: 8900, 72: 9300, 73: 9700, 74: 10100, 75: 10500,
  76: 10900, 77: 11300, 78: 11700, 79: 12100, 80: 12500,
  81: 13000, 82: 13500, 83: 14000, 84: 14500, 85: 15000,
  86: 15500, 87: 16000, 88: 16500, 89: 17000, 90: 17500,
  91: 18100, 92: 18700, 93: 19300, 94: 19900, 95: 20500,
  96: 21100, 97: 21700, 98: 22300, 99: 23000, 100: 25000,
}

// Compute the XP threshold for a given level (1-200)
// Levels 1-100: exact lookup table
// Levels 101-200: threshold = 25000 + (n-100) * 2500 + (n-100)^2 * 50
export function getLevelThreshold(level: number): number {
  if (level <= 1) return 0
  if (level <= 100) return LEVEL_XP_TABLE[level] ?? 0
  if (level > MAX_LEVEL) level = MAX_LEVEL
  // Formula for levels 101-200
  const n = level - 100
  return 25000 + n * 2500 + n * n * 50
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

// Generate title for a given level (1-200)
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
  const prefixes = ['Fire', 'Ice', 'Storm', 'Shadow', 'Light', 'Thunder', 'Frost', 'Void', 'Arcane', 'Sacred']
  const suffixes = ['Lord', 'Sage', 'Master', 'King', 'Oracle', 'Archon', 'Titan', 'Deity', 'Phoenix', 'Dragon']
  const idx = clampedLevel - 101
  return `${prefixes[Math.floor(idx / 10) % prefixes.length]} ${suffixes[idx % suffixes.length]}`
}

// Generate icon for a given level (1-200)
export function getLevelIcon(level: number): string {
  const clampedLevel = Math.min(Math.max(level, 1), MAX_LEVEL)
  if (clampedLevel <= 50) return ORIGINAL_ICONS[clampedLevel - 1]

  // Icon pools by level range
  if (clampedLevel <= 100) {
    const pool = ['⚔️', '🛡️', '🏹', '🗡️', '🏇', '🏰', '💎', '🎺', '📯', '⚔️']
    return pool[(clampedLevel - 51) % pool.length]
  }
  // 101-200
  const pool = ['🔥', '❄️', '⚡', '🌑', '✨', '🌩️', '🏔️', '🌀', '🔮', '☀️']
  return pool[(clampedLevel - 101) % pool.length]
}

// Generate color for a given level (1-200)
export function getLevelColor(level: number): string {
  const clampedLevel = Math.min(Math.max(level, 1), MAX_LEVEL)
  if (clampedLevel <= 50) return ORIGINAL_COLORS[clampedLevel - 1]

  // HSL rotation for levels 51+ using golden angle for even distribution
  const hue = ((clampedLevel - 51) * 137.508) % 360
  const saturation = 70 + ((clampedLevel - 51) % 5) * 5 // 70-90%
  const lightness = 50 + ((clampedLevel - 51) % 3) * 5  // 50-60%
  return hslToHex(hue, saturation, lightness)
}

// Calculate player level from level XP using binary search
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

// Calculate level-up coin rewards
// 100 coins per level, every 5 levels: bonus 200 + 100 extra (total 400)
function calculateLevelUpCoins(oldLevel: number, newLevel: number): number {
  let totalCoins = 0
  for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
    totalCoins += 100 // Base 100 coins per level
    if (lvl % 5 === 0) {
      totalCoins += 300 // Bonus: 200 + 100 extra on every 5th level
    }
  }
  return totalCoins
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

// Generate daily tasks for today
function generateDailyTasks(): DailyTask[] {
  const today = getTodayStr()
  return [
    { id: `visit-${today}`, description: 'Visit Sponsor Website', emoji: '🌐', target: 1, progress: 0, reward: 50, claimed: false },
    { id: `play3-${today}`, description: 'Play 3 Games', emoji: '🎮', target: 3, progress: 0, reward: 30, claimed: false },
    { id: `score500-${today}`, description: 'Score 500+ in a game', emoji: '🏆', target: 1, progress: 0, reward: 40, claimed: false },
    { id: `spin-${today}`, description: 'Spin the Wheel', emoji: '🎰', target: 1, progress: 0, reward: 20, claimed: false },
  ]
}

// ============================================================
// COUPON CODE SYSTEM
// ============================================================

// Get current IST hour to determine which coupon is active
function getISTHour(): number {
  const now = new Date()
  // IST = UTC + 5:30
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  return istTime.getUTCHours()
}

// Generate daily coupon codes based on current IST time
function generateDailyCoupons(existingCodes: CouponCode[], lastRefresh: number): CouponCode[] {
  const now = Date.now()
  const istHour = getISTHour()

  // Check if we need to regenerate (every 12 hours based on IST)
  // Day coupon: 12:00 PM to 11:59 PM IST (hours 12-23)
  // Night coupon: 12:00 AM to 11:59 AM IST (hours 0-11)
  const currentPeriod = istHour >= 12 ? 'day' : 'night'

  // Check if existing codes are still valid
  const validCodes = existingCodes.filter(c => c.expiresAt > now && !c.claimed)
  if (validCodes.length >= 2) return validCodes

  // Calculate expiry: end of current IST period
  const istNow = new Date(now + (5.5 * 60 * 60 * 1000))
  let expiryDate: Date
  if (currentPeriod === 'day') {
    // Expires at midnight IST (start of next day)
    expiryDate = new Date(istNow)
    expiryDate.setUTCHours(0, 0, 0, 0)
    expiryDate = new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000) // Next day midnight
  } else {
    // Expires at noon IST
    expiryDate = new Date(istNow)
    expiryDate.setUTCHours(12, 0, 0, 0)
    if (expiryDate.getTime() <= now) {
      expiryDate = new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000)
    }
  }
  const expiresAt = expiryDate.getTime() - (5.5 * 60 * 60 * 1000) // Convert back to UTC ms

  // Keep unclaimed codes from same period
  const keptCodes = existingCodes.filter(c => c.expiresAt > now && !c.claimed)

  // Generate new codes if needed
  const newCodes: CouponCode[] = [...keptCodes]

  // Special codes
  const specialCodes = [
    { code: '100Boom', reward: '100 blast' },
    { code: '10kCoin', reward: '10000 coins' },
  ]

  // Regular rewards
  const regularRewards = [
    () => `${50 + Math.floor(Math.random() * 150)} coins`,
    () => `${1 + Math.floor(Math.random() * 3)} power-ups`,
  ]

  // Add special codes periodically (one per day period)
  if (currentPeriod === 'day' && !newCodes.some(c => c.code === '100Boom')) {
    newCodes.push({ code: '100Boom', reward: '100 blast', expiresAt, claimed: false })
  } else if (currentPeriod === 'night' && !newCodes.some(c => c.code === '10kCoin')) {
    newCodes.push({ code: '10kCoin', reward: '10000 coins', expiresAt, claimed: false })
  }

  // Add a regular coupon code
  const regularCodeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let regularCode = ''
  for (let i = 0; i < 8; i++) {
    regularCode += regularCodeChars[Math.floor(Math.random() * regularCodeChars.length)]
  }
  const rewardFn = regularRewards[Math.floor(Math.random() * regularRewards.length)]
  newCodes.push({ code: regularCode, reward: rewardFn(), expiresAt, claimed: false })

  return newCodes
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
      timerPausedByVisibility: false,
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
      scorePoints: 0,
      scorePointsCarryOver: 0,
      gameHistory: [],
      weeklyBonusClaimed: false,
      dailyTasks: generateDailyTasks(),
      multiply5Count: 0,
      multiply2_5Count: 0,
      timeExtendCount: 0,
      activeAbility: null,
      abilityTimer: 0,
      pendingLevelUpCoins: 0,
      couponCodes: [],
      lastCouponRefresh: 0,
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
      scorePoints: saved.scorePoints || 0,
      scorePointsCarryOver: saved.scorePointsCarryOver || 0,
      gameHistory: saved.gameHistory || [],
      weeklyBonusClaimed,
      // Regenerate daily tasks if it's a new day or tasks are empty/stale
      dailyTasks: (() => {
        const savedTasks = saved.dailyTasks || []
        if (savedTasks.length === 0) return generateDailyTasks()
        // Check if tasks are from today
        const hasTodayTasks = savedTasks.some(t => t.id.includes(today))
        if (!hasTodayTasks) return generateDailyTasks()
        return savedTasks
      })(),
      // New fields with fallbacks for backward compatibility
      multiply5Count: saved.multiply5Count ?? 0,
      multiply2_5Count: saved.multiply2_5Count ?? 0,
      timeExtendCount: saved.timeExtendCount ?? 0,
      activeAbility: saved.activeAbility ?? null,
      abilityTimer: saved.abilityTimer ?? 0,
      pendingLevelUpCoins: saved.pendingLevelUpCoins ?? 0,
      couponCodes: saved.couponCodes ?? [],
      lastCouponRefresh: saved.lastCouponRefresh ?? 0,
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
      scorePoints: state.scorePoints,
      scorePointsCarryOver: state.scorePointsCarryOver,
      tournamentWeek: currentWeek,
      gameHistory: state.gameHistory.slice(0, 30),
      weeklyBonusClaimed: state.weeklyBonusClaimed,
      dailyTasks: state.dailyTasks,
      multiply5Count: state.multiply5Count,
      multiply2_5Count: state.multiply2_5Count,
      timeExtendCount: state.timeExtendCount,
      activeAbility: state.activeAbility,
      abilityTimer: state.abilityTimer,
      pendingLevelUpCoins: state.pendingLevelUpCoins,
      couponCodes: state.couponCodes,
      lastCouponRefresh: state.lastCouponRefresh,
    }
    localStorage.setItem('mergeMaster2048', JSON.stringify(data))
  }, [state.bestScore, state.spinTickets, state.streakDay, state.lastLoginDate, state.streakClaimed, state.welcomeClaimed, state.hammerCount, state.magnetCount, state.blastCount, state.undoTotal, state.coins, state.gamePoints, state.modBestScore, state.inviteCode, state.invitedBy, state.invitedUsers, state.commissionBalance, state.commissionClaimed, state.autoClaimCommission, state.gamesPlayedToday, state.lastPlayDate, state.notifications, state.playerName, state.playerAvatar, state.playerLevel, state.playerId, state.totalBattlesPlayed, state.totalBattlesWon, state.tournamentJoined, state.tournamentPoints, state.tournamentCarryOver, state.tournamentGamesPlayed, state.levelXP, state.scorePoints, state.scorePointsCarryOver, state.gameHistory, state.weeklyBonusClaimed, state.dailyTasks, state.multiply5Count, state.multiply2_5Count, state.timeExtendCount, state.activeAbility, state.abilityTimer, state.pendingLevelUpCoins, state.couponCodes, state.lastCouponRefresh])

  // ============================================================
  // VISIBILITY CHANGE - Pause timer when tab is hidden
  // ============================================================
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      setState(prev => {
        const isBattleMode = prev.gameMode === 'bot' || prev.gameMode === 'coins' || prev.gameMode === 'tournament'
        if (!isBattleMode) return prev

        if (document.hidden) {
          // Tab became hidden - pause timer
          return { ...prev, timerPausedByVisibility: true, timerPaused: true }
        } else {
          // Tab became visible - resume timer only if it was paused by visibility (not by lives=0)
          if (prev.timerPausedByVisibility && prev.lives > 0) {
            return { ...prev, timerPausedByVisibility: false, timerPaused: false }
          }
          // If paused by lives=0, don't auto-resume
          if (prev.timerPausedByVisibility) {
            return { ...prev, timerPausedByVisibility: false }
          }
          return prev
        }
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

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
        tournamentPoints: state.tournamentPoints,
        levelXP: state.levelXP,
        bestScore: state.bestScore,
        coins: state.coins,
        level: state.playerLevel,
      }).catch(() => {/* silent fail */})
    }, 2000) // 2 second debounce
    return () => clearTimeout(timer)
  }, [state.playerId, state.playerName, state.playerAvatar, state.inviteCode, state.tournamentPoints, state.levelXP, state.bestScore, state.coins, state.playerLevel])

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
  useEffect(() => {
    if (!state.playerId || state.tournamentPoints <= 0) return
    // Only process after a game ends (tournamentPoints just changed)
    processCommissionForReferrer(state.playerId, state.tournamentPoints).catch(() => {/* silent */})
  }, [state.tournamentPoints, state.playerId])

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
      // Update daily task progress for games played and score
      const today = getTodayStr()
      const tasks = prev.dailyTasks.map(t => {
        if (t.id === `play3-${today}` && !t.claimed) {
          return { ...t, progress: Math.min(t.progress + 1, t.target) }
        }
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

  // ============================================================
  // Score-to-Points-to-XP conversion helper
  // 50 score = 1.5 tournament points
  // 3 tournament points = 1 XP
  // 50% of points → levelXP, 50% → tournamentPoints
  // ============================================================
  function convertScoreToXPAndTournamentPoints(
    score: number,
    currentScorePoints: number,
    currentScorePointsCarryOver: number,
    currentLevelXP: number,
    currentTournamentPoints: number
  ): { newScorePoints: number; newScorePointsCarryOver: number; newLevelXP: number; newTournamentPoints: number; newPlayerLevel: number; levelUpCoins: number } {
    // Step 1: Convert score to tournament points
    // 50 score = 1.5 points → points = (score + carryOver) * 1.5 / 50
    const totalScoreInput = score + currentScorePointsCarryOver
    const rawPoints = totalScoreInput * 1.5 / 50
    const newPoints = Math.floor(rawPoints)
    const newCarryOver = (totalScoreInput * 1.5) % 50 // Keep fractional part

    // Step 2: Convert tournament points to XP
    // 3 points = 1 XP
    const totalPoints = currentScorePoints + newPoints
    const xpFromPoints = Math.floor(totalPoints / 3)
    const remainingPoints = totalPoints % 3

    // Step 3: Split XP into levelXP (50%) and tournamentPoints (50%)
    const levelXPAdd = Math.floor(xpFromPoints / 2)
    const tournamentPointsAdd = xpFromPoints - levelXPAdd

    const newLevelXP = currentLevelXP + levelXPAdd
    const newTournamentPoints = currentTournamentPoints + tournamentPointsAdd

    // Calculate new level and level-up coins
    const oldLevel = calculateLevel(currentLevelXP)
    const newPlayerLevel = calculateLevel(newLevelXP)
    const levelUpCoins = calculateLevelUpCoins(oldLevel, newPlayerLevel)

    return {
      newScorePoints: remainingPoints,
      newScorePointsCarryOver: newCarryOver,
      newLevelXP,
      newTournamentPoints,
      newPlayerLevel,
      levelUpCoins,
    }
  }

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
      // 1st merge move = 1x (base), 2nd consecutive = 2x, 3rd = 3x, 4th = 4th, 5+ = 5x
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

      // Apply ability multipliers to score gain
      let abilityExtra = 0
      if (prev.activeAbility === 'multiply5' && prev.abilityTimer > 0) {
        abilityExtra = (scoreGain + comboExtra) * 4 // 5x total = base + 4x extra
      } else if (prev.activeAbility === 'multiply2_5' && prev.abilityTimer > 0) {
        abilityExtra = Math.floor((scoreGain + comboExtra) * 1.5) // 2.5x total = base + 1.5x extra
      }

      const newScore = prev.score + scoreGain + comboExtra + abilityExtra
      const newBestScore = Math.max(newScore, prev.bestScore)
      const isStuck = !canMove(tilesWithNew)
      const won = !prev.won && hasWon(tilesWithNew)

      let newLives = prev.lives
      let isGameOver = false
      let newTimerPaused = prev.timerPaused
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
      if (prev.gameMode === 'bot' && prev.botOpponent && !botBattleResult) {
        if (isGameOver) {
          const botFinalScore = generateFairBotScore(newScore)
          botBattleResult = newScore >= botFinalScore ? 'win' : 'lose' // Ties = win for player
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
        coinGameWon = newScore >= botFinalScore ? true : false // Ties = win for player
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
        botBattleResult = newScore >= generateFairBotScore(newScore) ? 'win' : 'lose' // Ties = win for player
        // Re-generate for the opponent score display
        const botFinalScore = generateFairBotScore(newScore)
        botBattleResult = newScore >= botFinalScore ? 'win' : 'lose'
        botOpponent = prev.botOpponent ? { ...prev.botOpponent, finalScore: botFinalScore } : null
        totalBattlesPlayed++
        if (botBattleResult === 'win') {
          modBestScore = Math.max(modBestScore, newScore)
          totalBattlesWon++
        }
      }

      // Game points only from actual gameplay (combo only counts in mods mode)
      const newGamePoints = prev.gamePoints + scoreGain + comboExtra + abilityExtra

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
        gamePoints: newGamePoints,
        coinGameWon,
        playerLevel: calculateLevel(prev.levelXP),
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
      timerPaused: false,
      timerPausedByVisibility: false,
      countdownActive: false,
      countdownSecondsLeft: 0,
      consecutiveMerges: 0,
      comboBonus: 0,
      comboMultiplier: 1,
      coinEntryFee: 0,
      coinGameWon: null,
      activeAbility: null,
      abilityTimer: 0,
    }))
  }, [])

  const startBotBattle = useCallback((timeLimit: number = 60) => {
    const tiles = initTiles()
    prevState.current = null
    setState(prev => {
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
        gameMode: 'bot' as GameMode,
        botOpponent: opponent,
        botBattleResult: null,
        battleTimer: timeLimit,
        battleTimeLimit: timeLimit,
        timerPaused: false,
        timerPausedByVisibility: false,
        countdownActive: true,
        countdownSecondsLeft: 3,
        consecutiveMerges: 0,
        comboBonus: 0,
        gamesPlayedToday: gamesToday + 1,
        lastPlayDate: today,
        coinEntryFee: 0,
        coinGameWon: null,
        activeAbility: null,
        abilityTimer: 0,
      }
    })
  }, [])

  const startCoinGame = useCallback((entryFee: number) => {
    const tiles = initTiles()
    prevState.current = null
    setState(prev => {
      const today = getTodayStr()
      const gamesToday = prev.lastPlayDate === today ? prev.gamesPlayedToday : 0
      if (gamesToday >= prev.maxGamesPerDay) return prev
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
        battleTimer: 120, // 2 minutes for coins game
        battleTimeLimit: 120,
        timerPaused: false,
        timerPausedByVisibility: false,
        countdownActive: true,
        countdownSecondsLeft: 3,
        consecutiveMerges: 0,
        comboBonus: 0,
        coins: prev.coins - entryFee,
        coinEntryFee: entryFee,
        coinGameWon: null,
        gamesPlayedToday: gamesToday + 1,
        lastPlayDate: today,
        activeAbility: null,
        abilityTimer: 0,
      }
    })
  }, [])

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
        timerPausedByVisibility: false,
        countdownActive: true,
        countdownSecondsLeft: 3,
        consecutiveMerges: 0,
        comboBonus: 0,
        coinEntryFee: 0,
        coinGameWon: null,
        gamesPlayedToday: gamesToday + 1,
        lastPlayDate: today,
        activeAbility: null,
        abilityTimer: 0,
      }
    })
  }, [])

  // Calculate and add tournament points after a game
  // NEW: 50 score = 1.5 tournament points, 3 tournament points = 1 XP
  // 50% of XP → levelXP, 50% → tournamentPoints
  const calculateTournamentPoints = useCallback((finalScore: number) => {
    setState(prev => {
      if (prev.gameMode !== 'tournament') return prev

      const result = convertScoreToXPAndTournamentPoints(
        finalScore,
        prev.scorePoints,
        prev.scorePointsCarryOver,
        prev.levelXP,
        prev.tournamentPoints
      )

      return {
        ...prev,
        tournamentPoints: result.newTournamentPoints,
        tournamentCarryOver: 0, // Using new carry-over system
        tournamentGamesPlayed: prev.tournamentGamesPlayed + 1,
        levelXP: result.newLevelXP,
        scorePoints: result.newScorePoints,
        scorePointsCarryOver: result.newScorePointsCarryOver,
        playerLevel: result.newPlayerLevel,
        pendingLevelUpCoins: prev.pendingLevelUpCoins + result.levelUpCoins,
        coins: prev.coins + result.levelUpCoins, // Add level-up coins silently
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
      const newTimer = prev.battleTimer - 1
      if (newTimer <= 0) {
        // Time's up - generate FAIR bot score based on player's actual score
        // Ties go to player (>=) for balanced 50/50
        const botFinalScore = generateFairBotScore(prev.score)
        const result = prev.score >= botFinalScore ? 'win' : 'lose'
        const newModBest = result === 'win' ? Math.max(prev.modBestScore, prev.score) : prev.modBestScore
        const coinGameWon = result === 'win' ? true : false

        // Calculate tournament points if tournament mode
        let tournamentPoints = prev.tournamentPoints
        let tournamentCarryOver = prev.tournamentCarryOver
        let tournamentGamesPlayed = prev.tournamentGamesPlayed
        let levelXP = prev.levelXP
        let scorePoints = prev.scorePoints
        let scorePointsCarryOver = prev.scorePointsCarryOver
        let pendingLevelUpCoins = prev.pendingLevelUpCoins
        let coins = prev.coins

        if (prev.gameMode === 'tournament') {
          const convResult = convertScoreToXPAndTournamentPoints(
            prev.score,
            prev.scorePoints,
            prev.scorePointsCarryOver,
            prev.levelXP,
            prev.tournamentPoints
          )
          tournamentPoints = convResult.newTournamentPoints
          tournamentCarryOver = 0
          tournamentGamesPlayed++
          levelXP = convResult.newLevelXP
          scorePoints = convResult.newScorePoints
          scorePointsCarryOver = convResult.newScorePointsCarryOver
          pendingLevelUpCoins += convResult.levelUpCoins
          coins += convResult.levelUpCoins
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
          scorePoints,
          scorePointsCarryOver,
          playerLevel: calculateLevel(levelXP),
          pendingLevelUpCoins,
          coins,
        }
      }
      return { ...prev, battleTimer: newTimer }
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

  // ============================================================
  // ABILITY SYSTEM - Tick ability timer each second
  // ============================================================
  const tickAbilityTimer = useCallback(() => {
    setState(prev => {
      if (!prev.activeAbility || prev.abilityTimer <= 0) return prev
      const newTimer = prev.abilityTimer - 1
      if (newTimer <= 0) {
        return { ...prev, activeAbility: null, abilityTimer: 0 }
      }
      return { ...prev, abilityTimer: newTimer }
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
      return {
        ...prev,
        welcomeClaimed: true,
        hammerCount: prev.hammerCount + 5,
        magnetCount: prev.magnetCount + 5,
        blastCount: prev.blastCount + 5,
        undoTotal: prev.undoTotal + 5,
        spinTickets: prev.spinTickets + 5,
        coins: prev.coins + 500, // Welcome bonus coins for new users
      }
    })
  }, [])

  // Coin rewards for each streak day
  const STREAK_COIN_REWARDS = [10, 25, 35, 50, 65, 100, 200]

  const claimStreakDay = useCallback((day: number) => {
    setState(prev => {
      if (prev.streakClaimed[day]) return prev
      const newClaimed = [...prev.streakClaimed]
      newClaimed[day] = true

      let h = 0, m = 0, b = 0, s = 0
      let addMultiply5 = 0, addMultiply2_5 = 0, addTimeExtend = 0
      switch (day) {
        case 0: m = 2; break
        case 1: s = 2; break
        case 2: m = 1; b = 1; addMultiply2_5 = 1; break
        case 3: b = 2; break
        case 4: h = 1; m = 2; addTimeExtend = 1; break
        case 5: m = 3; h = 2; break
        case 6: s = 5; addMultiply5 = 1; addMultiply2_5 = 1; addTimeExtend = 1; break
      }

      const coinReward = STREAK_COIN_REWARDS[day] || 0

      return {
        ...prev,
        streakClaimed: newClaimed,
        hammerCount: prev.hammerCount + h,
        magnetCount: prev.magnetCount + m,
        blastCount: prev.blastCount + b,
        spinTickets: prev.spinTickets + s,
        coins: prev.coins + coinReward,
        multiply5Count: prev.multiply5Count + addMultiply5,
        multiply2_5Count: prev.multiply2_5Count + addMultiply2_5,
        timeExtendCount: prev.timeExtendCount + addTimeExtend,
      }
    })
  }, [])

  const addCoins = useCallback((amount: number) => {
    setState(prev => {
      const newCoins = prev.coins + amount
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
        timerPausedByVisibility: false,
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
      timerPausedByVisibility: false,
      countdownActive: false,
      countdownSecondsLeft: 0,
      consecutiveMerges: 0,
      comboBonus: 0,
      comboMultiplier: 1,
      coinEntryFee: 0,
      coinGameWon: null,
      activeAbility: null,
      abilityTimer: 0,
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
      const tasks = prev.dailyTasks.map(t => {
        if (t.id === taskId && !t.claimed && t.progress >= t.target) {
          return { ...t, claimed: true }
        }
        return t
      })
      const task = prev.dailyTasks.find(t => t.id === taskId)
      if (!task || task.claimed || task.progress < task.target) return prev
      return {
        ...prev,
        dailyTasks: tasks,
        coins: prev.coins + task.reward,
      }
    })
  }, [])

  // ============================================================
  // ABILITY SYSTEM - Activation functions
  // ============================================================
  const activateMultiply5 = useCallback(() => {
    setState(prev => {
      if (prev.multiply5Count <= 0 || prev.activeAbility) return prev
      return {
        ...prev,
        multiply5Count: prev.multiply5Count - 1,
        activeAbility: 'multiply5' as AbilityType,
        abilityTimer: 10,
      }
    })
  }, [])

  const activateMultiply2_5 = useCallback(() => {
    setState(prev => {
      if (prev.multiply2_5Count <= 0 || prev.activeAbility) return prev
      return {
        ...prev,
        multiply2_5Count: prev.multiply2_5Count - 1,
        activeAbility: 'multiply2_5' as AbilityType,
        abilityTimer: 10,
      }
    })
  }, [])

  const activateTimeExtend = useCallback(() => {
    setState(prev => {
      if (prev.timeExtendCount <= 0) return prev
      // Only works in battle modes
      const isBattleMode = prev.gameMode === 'bot' || prev.gameMode === 'coins' || prev.gameMode === 'tournament'
      if (!isBattleMode) return prev
      return {
        ...prev,
        timeExtendCount: prev.timeExtendCount - 1,
        battleTimer: prev.battleTimer + 10,
      }
    })
  }, [])

  // Add ability counts (e.g., from spin wheel or purchases)
  const addAbility = useCallback((ability: AbilityType, count: number) => {
    setState(prev => {
      switch (ability) {
        case 'multiply5': return { ...prev, multiply5Count: prev.multiply5Count + count }
        case 'multiply2_5': return { ...prev, multiply2_5Count: prev.multiply2_5Count + count }
        case 'timeExtend': return { ...prev, timeExtendCount: prev.timeExtendCount + count }
        default: return prev
      }
    })
  }, [])

  // ============================================================
  // COUPON CODE SYSTEM
  // ============================================================
  const validateCouponCode = useCallback((code: string): { valid: boolean; reward?: string; alreadyClaimed?: boolean } => {
    const coupon = state.couponCodes.find(c => c.code === code)
    if (!coupon) return { valid: false }
    if (coupon.claimed) return { valid: false, alreadyClaimed: true }
    if (coupon.expiresAt < Date.now()) return { valid: false }
    return { valid: true, reward: coupon.reward }
  }, [state.couponCodes])

  const claimCouponCode = useCallback((code: string) => {
    setState(prev => {
      const coupon = prev.couponCodes.find(c => c.code === code)
      if (!coupon || coupon.claimed || coupon.expiresAt < Date.now()) return prev

      // Parse and apply reward
      const reward = coupon.reward.toLowerCase()
      const updatedCoupons = prev.couponCodes.map(c =>
        c.code === code ? { ...c, claimed: true } : c
      )

      let coins = prev.coins
      let blastCount = prev.blastCount
      let hammerCount = prev.hammerCount
      let magnetCount = prev.magnetCount

      if (reward.includes('coin')) {
        const amount = parseInt(reward) || 0
        coins += amount
      } else if (reward.includes('blast')) {
        const amount = parseInt(reward) || 0
        blastCount += amount
      } else if (reward.includes('power-up') || reward.includes('powerup')) {
        const amount = parseInt(reward) || 1
        hammerCount += amount
        magnetCount += amount
        blastCount += amount
      }

      return {
        ...prev,
        couponCodes: updatedCoupons,
        coins,
        blastCount,
        hammerCount,
        magnetCount,
      }
    })
  }, [])

  const generateCoupons = useCallback(() => {
    setState(prev => {
      const newCoupons = generateDailyCoupons(prev.couponCodes, prev.lastCouponRefresh)
      return {
        ...prev,
        couponCodes: newCoupons,
        lastCouponRefresh: Date.now(),
      }
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
      timerPausedByVisibility: false,
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
      scorePoints: 0,
      scorePointsCarryOver: 0,
      gameHistory: [],
      weeklyBonusClaimed: false,
      dailyTasks: generateDailyTasks(),
      multiply5Count: 0,
      multiply2_5Count: 0,
      timeExtendCount: 0,
      activeAbility: null,
      abilityTimer: 0,
      pendingLevelUpCoins: 0,
      couponCodes: [],
      lastCouponRefresh: 0,
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
    addPowerUp,
    addUndos,
    startBotBattle,
    startCoinGame,
    startTournamentGame,
    calculateTournamentPoints,
    joinTournament,
    tickBattleTimer,
    tickCountdown,
    tickAbilityTimer,
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
    updatePlayerName,
    updatePlayerAvatar,
    addGameToHistory,
    claimWeeklyBonus,
    claimDailyTask,
    resetAllData,
    // Ability system
    activateMultiply5,
    activateMultiply2_5,
    activateTimeExtend,
    addAbility,
    // Coupon code system
    validateCouponCode,
    claimCouponCode,
    generateCoupons,
    // Visit website task
    completeVisitWebsiteTask: useCallback(() => {
      setState(prev => {
        const today = getTodayStr()
        const tasks = prev.dailyTasks.map(t => {
          if (t.id === `visit-${today}` && !t.claimed) {
            return { ...t, progress: Math.min(t.progress + 1, t.target) }
          }
          return t
        })
        return { ...prev, dailyTasks: tasks }
      })
    }, []),
  }
}
