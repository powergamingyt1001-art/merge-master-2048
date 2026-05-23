'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Tv } from 'lucide-react'
import { AdsterraBanner300x250, AdsterraBanner320x50 } from './AdsterraAds'

// Direct link URLs for Adsterra revenue - LIMITED to prevent random redirects
// Only used when user explicitly clicks "Visit Sponsor" or "Click to Play" buttons
// These are now gated behind explicit user action only (no auto-redirect)
const DIRECT_LINKS = [
  'https://www.profitablecpmratenetwork.com/cey4s5cn7?key=577edbd0b2800a03a6dbb64c38ecc8c5',
  'https://elementalconsessionconsession.com/nirgtdkxc?key=2fd2bb47ead53d3cc16693a72229e3fb',
]

// Track last time a direct link was opened to limit frequency (5 min cooldown)
const LAST_DIRECT_LINK_KEY = 'mergeMaster2048_lastDirectLink'
const DIRECT_LINK_COOLDOWN = 5 * 60 * 1000 // 5 minutes

// Pick a random direct link each time for balanced revenue distribution
// Only returns a link if cooldown has passed (prevents spam clicking)
const getRandomLink = () => {
  const lastTime = parseInt(localStorage.getItem(LAST_DIRECT_LINK_KEY) || '0', 10)
  const now = Date.now()
  if (now - lastTime < DIRECT_LINK_COOLDOWN) {
    return null // Cooldown not passed, don't open link
  }
  localStorage.setItem(LAST_DIRECT_LINK_KEY, String(now))
  return DIRECT_LINKS[Math.floor(Math.random() * DIRECT_LINKS.length)]
}

// Keep legacy constant for imports - now returns random link
const ADSTERRA_DIRECT_LINK = DIRECT_LINKS[0]

interface AdOverlayProps {
  isOpen: boolean
  onClose: () => void
  countdownSeconds?: number
  title?: string
  subtitle?: string
  overlayKey?: number // Pass from parent to force remount
}

export function AdOverlay({
  isOpen,
  onClose,
  countdownSeconds = 5,
  title = 'Preparing Your Game...',
  subtitle = 'Watch this short ad to continue',
  overlayKey = 0,
}: AdOverlayProps) {
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <AdOverlayInner
          key={overlayKey}
          countdownSeconds={countdownSeconds}
          title={title}
          subtitle={subtitle}
          canCloseHandler={handleClose}
        />
      )}
    </AnimatePresence>
  )
}

// Inner component that manages its own countdown timer
// Remounts fresh each time via key change from parent
function AdOverlayInner({ countdownSeconds, title, subtitle, canCloseHandler }: {
  countdownSeconds: number
  title: string
  subtitle: string
  canCloseHandler: () => void
}) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds)
  const canClose = timeLeft <= 0
  const [adOpened, setAdOpened] = useState(false) // Direct link opened, waiting for user return

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Detect when user returns from ad website and close overlay
  useEffect(() => {
    if (!adOpened) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // User came back - close overlay
        canCloseHandler()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [adOpened, canCloseHandler])

  const handlePlayClick = useCallback(() => {
    // Open direct link (only if cooldown has passed)
    const link = getRandomLink()
    if (link) {
      try {
        window.open(link, '_blank')
      } catch {
        // Popup blocked - just close directly
        canCloseHandler()
        return
      }
      // Show "come back" message and wait for user return
      setAdOpened(true)
    } else {
      // Cooldown active - just close the overlay directly
      canCloseHandler()
    }
  }, [canCloseHandler])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#FFFFFF' }}>
            <Tv className="w-4 h-4" style={{ color: '#EDC22E' }} />
            {title}
          </h3>
          {canClose && !adOpened && (
            <button onClick={canCloseHandler} className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
          )}
        </div>

        {/* Subtitle */}
        <p className="text-center text-[10px] px-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {subtitle}
        </p>

        {/* Ad Slot 1 - 300x250 Banner */}
        <div className="px-3 pt-2">
          <div className="rounded-lg overflow-hidden flex justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <AdsterraBanner300x250 />
          </div>
        </div>

        {/* Ad Slot 2 - 320x50 Banner */}
        <div className="px-3 pt-2">
          <div className="rounded-lg overflow-hidden flex justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <AdsterraBanner320x50 />
          </div>
        </div>

        {/* Reward message */}
        <p className="text-center text-[9px] py-2" style={{ color: '#EDC22E' }}>
          ✨ Generating your game reward...
        </p>

        {/* Timer / Close Button */}
        <div className="px-3 pb-3">
          {!canClose ? (
            <div className="w-full py-2.5 rounded-xl text-center flex items-center justify-center gap-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(237,194,46,0.2)', border: '1px solid rgba(237,194,46,0.4)' }}>
                <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>{timeLeft}</span>
              </div>
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Please wait {timeLeft}s...
              </span>
            </div>
          ) : adOpened ? (
            <div className="w-full py-3 rounded-xl text-center"
              style={{ backgroundColor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)' }}>
              <p className="text-[11px] font-semibold" style={{ color: '#00E676' }}>
                🌐 Ad opened in new tab!
              </p>
              <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Come back to start your game!
              </p>
            </div>
          ) : (
            <button
              onClick={handlePlayClick}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #00E676, #00C853)',
                color: '#FFFFFF',
                boxShadow: '0 4px 15px rgba(0,230,118,0.3)',
              }}
            >
              <Play className="w-4 h-4" fill="white" />
              CLICK TO PLAY
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// SPIN WHEEL AD - Opens direct link, waits, gives free spin
// ============================================================
interface SpinWheelAdProps {
  isOpen: boolean
  onClose: () => void
  onAdComplete: () => void
  overlayKey?: number
}

export function SpinWheelAd({ isOpen, onClose, onAdComplete, overlayKey = 0 }: SpinWheelAdProps) {
  return (
    <AnimatePresence>
      {isOpen && <SpinWheelAdInner key={overlayKey} onClose={onClose} onAdComplete={onAdComplete} />}
    </AnimatePresence>
  )
}

function SpinWheelAdInner({ onClose, onAdComplete }: { onClose: () => void; onAdComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState(5)
  const canClaim = timeLeft <= 0

  useEffect(() => {
    // Just countdown - no auto-redirect
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleClaim = useCallback(() => {
    if (!canClaim) return
    onAdComplete()
    onClose()
  }, [canClaim, onAdComplete, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85 }}
        className="w-full max-w-xs rounded-2xl overflow-hidden text-center"
        style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="p-4">
          <span className="text-3xl block mb-2">📺</span>
          <h3 className="text-base font-bold mb-1" style={{ color: '#FFFFFF' }}>Watch Ad for Free Spin!</h3>
          <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Watch for {timeLeft > 0 ? `${timeLeft} more seconds` : 'complete!'} to earn a free spin ticket
          </p>

          {/* 320x50 ad */}
          <div className="rounded-lg overflow-hidden flex justify-center mb-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <AdsterraBanner320x50 />
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: canClaim ? '#00E676' : '#EDC22E' }}
              initial={{ width: '0%' }}
              animate={{ width: canClaim ? '100%' : `${((5 - timeLeft) / 5) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {!canClaim ? (
            <div className="py-2.5 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                ⏳ Watching... {timeLeft}s
              </span>
            </div>
          ) : (
            <button
              onClick={handleClaim}
              className="w-full py-3 rounded-xl font-bold text-sm transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #EDC22E, #FF7A00)',
                color: '#FFFFFF',
                boxShadow: '0 4px 15px rgba(237,194,46,0.3)',
              }}
            >
              🎫 CLAIM FREE SPIN
            </button>
          )}

          <button onClick={onClose} className="mt-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// BACKGROUND IMPRESSION TIMER - DISABLED
// Previously loaded hidden iframes every 30s which caused random
// redirects. Now returns null with no side effects.
// ============================================================
export function BackgroundImpressionTimer() {
  return null
}

// ============================================================
// DASHBOARD RETURN OVERLAY - Shows when user finishes a game
// and returns to dashboard. Opens direct link first, waits for
// user to come back, then shows dashboard. Happens EVERY game.
// ============================================================
interface DashboardReturnOverlayProps {
  isOpen: boolean
  onClose: () => void
  overlayKey?: number
}

export function DashboardReturnOverlay({ isOpen, onClose, overlayKey = 0 }: DashboardReturnOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && <DashboardReturnOverlayInner key={overlayKey} onClose={onClose} />}
    </AnimatePresence>
  )
}

function DashboardReturnOverlayInner({ onClose }: { onClose: () => void }) {
  const [timeLeft, setTimeLeft] = useState(3)

  // Auto-close countdown - no redirect, just wait
  useEffect(() => {
    if (timeLeft <= 0) {
      onClose()
      return
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, onClose])

  const handleVisitSponsor = useCallback(() => {
    const link = getRandomLink()
    if (link) {
      try {
        window.open(link, '_blank')
      } catch {
        // Popup blocked - just continue
      }
    }
    // If cooldown active, do nothing (no redirect)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-xs rounded-2xl overflow-hidden text-center"
        style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="p-5">
          <span className="text-4xl block mb-3">🎮</span>
          <h3 className="text-lg font-bold mb-1" style={{ color: '#FFFFFF' }}>Game Complete!</h3>
          <p className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Returning to dashboard in {timeLeft}s...
          </p>

          {/* Ad banner */}
          <div className="rounded-lg overflow-hidden flex justify-center mb-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <AdsterraBanner320x50 />
          </div>

          {/* Optional sponsor link - user chooses to click */}
          <button
            onClick={handleVisitSponsor}
            className="w-full py-2.5 rounded-xl text-sm font-semibold mb-2 transition-transform active:scale-95"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            🌐 Visit Sponsor (Optional)
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export { ADSTERRA_DIRECT_LINK, DIRECT_LINKS, getRandomLink }
