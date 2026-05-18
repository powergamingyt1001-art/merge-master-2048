'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Sun, Moon, Clock, Ticket } from 'lucide-react'

interface CouponCodeProps {
  isOpen: boolean
  onClose: () => void
  onAddCoins: (amount: number) => void
  onAddPowerUp: (pu: 'hammer' | 'magnet' | 'blast' | 'multiplier5x' | 'multiplier2_5x' | 'extraTime', count: number) => void
  onAddSpinTickets: (count: number) => void
  onAddNotification: (title: string, message: string, type: string, emoji: string) => void
}

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Convert a string seed to a numeric hash
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash
}

// Generate a 6-character alphanumeric code from a string seed
function generateCode(seedStr: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous chars: 0/O, 1/I/L
  const rng = mulberry32(hashString(seedStr))
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(rng() * chars.length)]
  }
  return code
}

// ── Day of Year helper ────────────────────────────────────────────
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

// ── Rewards Pool ──────────────────────────────────────────────────
interface RewardInfo {
  type: 'spin' | 'coin' | 'magnet' | 'blast' | 'multiplier5x' | 'multiplier2_5x'
  count: number
  label: string
  emoji: string
  color: string
}

const REWARDS_POOL: RewardInfo[] = [
  { type: 'spin', count: 5, label: '5 Spins', emoji: '🎫', color: '#00FFFF' },
  { type: 'coin', count: 300, label: '300 Coins', emoji: '💰', color: '#EDC22E' },
  { type: 'magnet', count: 5, label: '5 Magnets', emoji: '🧲', color: '#00E676' },
  { type: 'blast', count: 1, label: '1 Bomb', emoji: '💣', color: '#FF7A00' },
  { type: 'multiplier5x', count: 1, label: '1 5x Ability', emoji: '⚡', color: '#F65E3B' },
  { type: 'multiplier2_5x', count: 1, label: '1 2.5x Ability', emoji: '🔥', color: '#FF7A00' },
  { type: 'coin', count: 500, label: '500 Coins', emoji: '💰', color: '#EDC22E' },
]

function getCurrentReward(date: Date): RewardInfo {
  const dayOfYear = getDayOfYear(date)
  const weekIndex = Math.floor(dayOfYear / 7) % 7
  return REWARDS_POOL[weekIndex]
}

function getDaysUntilRewardChange(date: Date): number {
  const dayOfYear = getDayOfYear(date)
  const daysIntoWeek = dayOfYear % 7
  return 7 - daysIntoWeek
}

// ── Special Hidden Codes ──────────────────────────────────────────
const SPECIAL_CODES: Record<string, { type: 'blast' | 'multiplier5x' | 'multiplier2_5x'; count: number; label: string; emoji: string }> = {
  '100Boom': { type: 'blast', count: 100, label: '100 Bombs', emoji: '💣' },
  '1005x': { type: 'multiplier5x', count: 100, label: '100 5x Abilities', emoji: '⚡' },
  '1002.5x': { type: 'multiplier2_5x', count: 100, label: '100 2.5x Abilities', emoji: '🔥' },
}

// ── LocalStorage helpers ──────────────────────────────────────────
const STORAGE_KEY = 'mergeMaster2048_couponClaimed'

interface ClaimedData {
  [code: string]: string // code -> date string (YYYY-MM-DD) when claimed
}

function getClaimedData(): ClaimedData {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setClaimedData(data: ClaimedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable
  }
}

function isCodeClaimed(code: string, dateStr: string): boolean {
  const data = getClaimedData()
  return data[code] === dateStr
}

function markCodeClaimed(code: string, dateStr: string): void {
  const data = getClaimedData()
  data[code] = dateStr
  setClaimedData(data)
}

// ── Time helpers ──────────────────────────────────────────────────
function isDayCodeActive(now: Date): boolean {
  const h = now.getHours()
  return h >= 12 // 12PM to 11:59PM
}

function isNightCodeActive(now: Date): boolean {
  const h = now.getHours()
  return h < 12 // 12AM to 11:59AM
}

function getTimeUntilNextPeriod(now: Date): { dayCodeIn: string; nightCodeIn: string } {
  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()

  // Day code starts at 12PM (noon)
  let dayHours: number, dayMins: number, daySecs: number
  if (h < 12) {
    dayHours = 11 - h
    dayMins = 59 - m
    daySecs = 59 - s
  } else {
    dayHours = 0
    dayMins = 0
    daySecs = 0
  }

  // Night code starts at 12AM (midnight)
  let nightHours: number, nightMins: number, nightSecs: number
  nightHours = 23 - h
  nightMins = 59 - m
  nightSecs = 59 - s

  const pad = (n: number) => n.toString().padStart(2, '0')

  return {
    dayCodeIn: h < 12 ? `${pad(dayHours)}:${pad(dayMins)}:${pad(daySecs)}` : 'Active Now!',
    nightCodeIn: h >= 12 ? `${pad(nightHours)}:${pad(nightMins)}:${pad(nightSecs)}` : 'Active Now!',
  }
}

// ── Main Component ────────────────────────────────────────────────
export function CouponCode({
  isOpen,
  onClose,
  onAddCoins,
  onAddPowerUp,
  onAddSpinTickets,
  onAddNotification,
}: CouponCodeProps) {
  const [now, setNow] = useState<Date>(new Date())
  const [inputCode, setInputCode] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [claimingCode, setClaimingCode] = useState<string | null>(null)
  const [inputError, setInputError] = useState('')
  const [inputSuccess, setInputSuccess] = useState('')
  const [prevIsOpen, setPrevIsOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset input state when modal opens (React-recommended pattern for syncing state with props)
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true)
    setInputCode('')
    setInputError('')
    setInputSuccess('')
  }
  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false)
  }

  // Update time every second via interval callback
  useEffect(() => {
    if (!isOpen) return
    timerRef.current = setInterval(() => setNow(new Date()), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen])

  // Current date string (YYYY-MM-DD)
  const dateStr = now.toISOString().split('T')[0]

  // Generate today's codes
  const dayCode = generateCode(`DAY-${dateStr}`)
  const nightCode = generateCode(`NIGHT-${dateStr}`)

  // Current reward
  const currentReward = getCurrentReward(now)
  const daysUntilChange = getDaysUntilRewardChange(now)

  // Active states
  const dayActive = isDayCodeActive(now)
  const nightActive = isNightCodeActive(now)

  // Claimed states
  const dayClaimed = isCodeClaimed(dayCode, dateStr)
  const nightClaimed = isCodeClaimed(nightCode, dateStr)

  // Time remaining
  const { dayCodeIn, nightCodeIn } = getTimeUntilNextPeriod(now)

  // Copy to clipboard
  const handleCopy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    }
  }, [])

  // Grant reward helper
  const grantReward = useCallback(
    (reward: RewardInfo | (typeof SPECIAL_CODES)[string]) => {
      switch (reward.type) {
        case 'coin':
          onAddCoins(reward.count)
          break
        case 'spin':
          onAddSpinTickets(reward.count)
          break
        case 'magnet':
          onAddPowerUp('magnet', reward.count)
          break
        case 'blast':
          onAddPowerUp('blast', reward.count)
          break
        case 'multiplier5x':
          onAddPowerUp('multiplier5x', reward.count)
          break
        case 'multiplier2_5x':
          onAddPowerUp('multiplier2_5x', reward.count)
          break
      }
      onAddNotification(
        'Coupon Claimed!',
        `You received ${reward.label} ${reward.emoji}`,
        'reward',
        reward.emoji
      )
    },
    [onAddCoins, onAddPowerUp, onAddSpinTickets, onAddNotification]
  )

  // Claim a daily code
  const handleClaimCode = useCallback(
    (code: string, type: 'day' | 'night') => {
      if (claimingCode) return
      const isActive = type === 'day' ? dayActive : nightActive
      const isClaimed = type === 'day' ? dayClaimed : nightClaimed
      if (!isActive || isClaimed) return

      setClaimingCode(code)
      markCodeClaimed(code, dateStr)
      grantReward(currentReward)

      setTimeout(() => setClaimingCode(null), 600)
    },
    [claimingCode, dayActive, nightActive, dayClaimed, nightClaimed, dateStr, currentReward, grantReward]
  )

  // Apply code from input
  const handleApplyCode = useCallback(() => {
    const trimmed = inputCode.trim().toUpperCase()
    setInputError('')
    setInputSuccess('')

    if (!trimmed) {
      setInputError('Please enter a code')
      return
    }

    // Check special hidden codes first (case-insensitive, but "1002.5x" has a dot)
    const specialKey = Object.keys(SPECIAL_CODES).find(
      (k) => k.toUpperCase() === trimmed
    )
    if (specialKey) {
      const special = SPECIAL_CODES[specialKey]
      grantReward(special)
      setInputSuccess(`🎉 Claimed: ${special.label} ${special.emoji}`)
      setInputCode('')
      return
    }

    // Check if it matches today's day code
    if (trimmed === dayCode) {
      if (dayClaimed) {
        setInputError('This code has already been claimed today')
        return
      }
      if (!dayActive) {
        setInputError('Day code is not active yet (available 12PM-12AM)')
        return
      }
      markCodeClaimed(dayCode, dateStr)
      grantReward(currentReward)
      setInputSuccess(`🎉 Claimed: ${currentReward.label} ${currentReward.emoji}`)
      setInputCode('')
      return
    }

    // Check if it matches today's night code
    if (trimmed === nightCode) {
      if (nightClaimed) {
        setInputError('This code has already been claimed today')
        return
      }
      if (!nightActive) {
        setInputError('Night code is not active yet (available 12AM-12PM)')
        return
      }
      markCodeClaimed(nightCode, dateStr)
      grantReward(currentReward)
      setInputSuccess(`🎉 Claimed: ${currentReward.label} ${currentReward.emoji}`)
      setInputCode('')
      return
    }

    setInputError('Invalid code. Check the code and try again.')
  }, [
    inputCode,
    dayCode,
    nightCode,
    dayClaimed,
    nightClaimed,
    dayActive,
    nightActive,
    dateStr,
    currentReward,
    grantReward,
  ])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-3 py-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #1a0533, #0d1b3e)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 60px rgba(237,194,46,0.08), 0 0 120px rgba(13,27,62,0.5)',
            }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5" style={{ color: '#EDC22E' }} />
                <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
                  🎟️ Coupon Code
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-90"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="px-4 pb-5">
              {/* ── Two Code Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Day Code Card */}
                <CodeCard
                  type="day"
                  code={dayCode}
                  isActive={dayActive}
                  isClaimed={dayClaimed}
                  timeLabel={dayCodeIn}
                  reward={currentReward}
                  copiedCode={copiedCode}
                  claimingCode={claimingCode}
                  onCopy={handleCopy}
                  onClaim={handleClaimCode}
                />

                {/* Night Code Card */}
                <CodeCard
                  type="night"
                  code={nightCode}
                  isActive={nightActive}
                  isClaimed={nightClaimed}
                  timeLabel={nightCodeIn}
                  reward={currentReward}
                  copiedCode={copiedCode}
                  claimingCode={claimingCode}
                  onCopy={handleCopy}
                  onClaim={handleClaimCode}
                />
              </div>

              {/* ── Enter Code Section ── */}
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  ✏️ Enter Code
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value)
                      setInputError('')
                      setInputSuccess('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyCode()
                    }}
                    placeholder="Paste or type code..."
                    maxLength={10}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm font-mono font-bold uppercase outline-none transition-all"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#FFFFFF',
                    }}
                  />
                  <button
                    onClick={handleApplyCode}
                    className="px-5 py-2.5 rounded-lg font-bold text-xs transition-transform hover:scale-105 active:scale-95 whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
                      color: '#FFFFFF',
                      boxShadow: '0 2px 10px rgba(237,194,46,0.3)',
                    }}
                  >
                    APPLY
                  </button>
                </div>
                {/* Error / Success messages */}
                <AnimatePresence mode="wait">
                  {inputError && (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] mt-2 font-medium"
                      style={{ color: '#F65E3B' }}
                    >
                      ⚠️ {inputError}
                    </motion.p>
                  )}
                  {inputSuccess && (
                    <motion.p
                      key="success"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] mt-2 font-medium"
                      style={{ color: '#00E676' }}
                    >
                      {inputSuccess}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Reward Change Info ── */}
              <div
                className="rounded-xl p-3 text-center"
                style={{
                  backgroundColor: 'rgba(237,194,46,0.06)',
                  border: '1px solid rgba(237,194,46,0.12)',
                }}
              >
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  🎁 Today&apos;s Reward:{' '}
                  <span className="font-bold" style={{ color: currentReward.color }}>
                    {currentReward.label} {currentReward.emoji}
                  </span>
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  ⏳ Reward changes in: <span style={{ color: '#EDC22E', fontWeight: 'bold' }}>{daysUntilChange} day{daysUntilChange !== 1 ? 's' : ''}</span>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Code Card Sub-Component ───────────────────────────────────────
interface CodeCardProps {
  type: 'day' | 'night'
  code: string
  isActive: boolean
  isClaimed: boolean
  timeLabel: string
  reward: RewardInfo
  copiedCode: string | null
  claimingCode: string | null
  onCopy: (code: string) => void
  onClaim: (code: string, type: 'day' | 'night') => void
}

function CodeCard({
  type,
  code,
  isActive,
  isClaimed,
  timeLabel,
  reward,
  copiedCode,
  claimingCode,
  onCopy,
  onClaim,
}: CodeCardProps) {
  const isDay = type === 'day'
  const tintBg = isDay ? 'rgba(237,194,46,0.06)' : 'rgba(100,140,255,0.06)'
  const tintBorder = isDay ? 'rgba(237,194,46,0.15)' : 'rgba(100,140,255,0.15)'
  const accentColor = isDay ? '#EDC22E' : '#648CFF'
  const iconBg = isDay ? 'rgba(237,194,46,0.12)' : 'rgba(100,140,255,0.12)'
  const isCopied = copiedCode === code
  const isClaiming = claimingCode === code

  const canClaim = isActive && !isClaimed

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: isDay ? 0.1 : 0.2 }}
      className="rounded-xl p-3.5"
      style={{
        backgroundColor: tintBg,
        border: `1px solid ${tintBorder}`,
        boxShadow: isActive && !isClaimed
          ? `0 0 20px ${accentColor}15`
          : 'none',
      }}
    >
      {/* Card Header: Icon + Title + Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: iconBg }}
          >
            {isDay ? (
              <Sun className="w-3.5 h-3.5" style={{ color: accentColor }} />
            ) : (
              <Moon className="w-3.5 h-3.5" style={{ color: accentColor }} />
            )}
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: accentColor }}>
              {isDay ? 'Day Code' : 'Night Code'}
            </p>
            <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {isDay ? 'Valid 12PM–12AM' : 'Valid 12AM–12PM'}
            </p>
          </div>
        </div>

        {/* Status badge */}
        {isActive ? (
          isClaimed ? (
            <span
              className="text-[8px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              ✅ Claimed
            </span>
          ) : (
            <motion.span
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-[8px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${accentColor}20`,
                color: accentColor,
              }}
            >
              🔥 Active Now!
            </motion.span>
          )
        ) : (
          <span
            className="text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            <Clock className="w-2.5 h-2.5" />
            {timeLabel}
          </span>
        )}
      </div>

      {/* Code Display Box */}
      <div
        className="flex items-center gap-2 rounded-lg p-2.5 mb-3"
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          border: `1px solid ${isActive ? accentColor + '30' : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        <span
          className="flex-1 text-center font-mono text-sm font-extrabold tracking-[0.2em]"
          style={{
            color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
            letterSpacing: '0.25em',
          }}
        >
          {code}
        </span>
        <button
          onClick={() => onCopy(code)}
          disabled={!isActive}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-transform hover:scale-110 active:scale-90 disabled:opacity-30"
          style={{
            backgroundColor: isCopied ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.08)',
          }}
          title="Copy code"
        >
          {isCopied ? (
            <Check className="w-3 h-3" style={{ color: '#00E676' }} />
          ) : (
            <Copy className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
          )}
        </button>
      </div>

      {/* Reward Description */}
      <p className="text-[10px] mb-3 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Reward:{' '}
        <span className="font-bold" style={{ color: reward.color }}>
          {reward.label} {reward.emoji}
        </span>
      </p>

      {/* Claim Button */}
      <button
        onClick={() => onClaim(code, type)}
        disabled={!canClaim}
        className="w-full py-2.5 rounded-lg font-bold text-xs transition-all active:scale-95 disabled:active:scale-100"
        style={{
          background: canClaim
            ? isClaiming
              ? 'linear-gradient(135deg, #00E676, #00C853)'
              : 'linear-gradient(135deg, #00E676, #00C853)'
            : 'rgba(255,255,255,0.06)',
          color: canClaim ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
          boxShadow: canClaim ? '0 2px 12px rgba(0,230,118,0.3)' : 'none',
          cursor: canClaim ? 'pointer' : 'not-allowed',
        }}
      >
        {isClaiming ? (
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center gap-1"
          >
            ✅ Claimed!
          </motion.span>
        ) : isClaimed ? (
          '✅ Claimed'
        ) : !isActive ? (
          `⏳ ${isDay ? 'Starts at 12PM' : 'Starts at 12AM'}`
        ) : (
          '🎉 CLAIM'
        )}
      </button>
    </motion.div>
  )
}
