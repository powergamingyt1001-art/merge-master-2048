'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Clock, WifiOff, Megaphone, Download, Star, ExternalLink } from 'lucide-react'
import { ADMOB_IDS } from '@/hooks/useAds'

// ─── App Open Ad ───
// Uses key-based remount from parent for state reset
export function AppOpenAd({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [canClose, setCanClose] = useState(false)
  const [timeLeft, setTimeLeft] = useState(5)

  useEffect(() => {
    if (!isOpen) return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanClose(true)
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ backgroundColor: '#000000' }}>
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        {/* Ad Content - Looks like a real app install ad */}
        <div className="flex-1 flex flex-col items-center justify-center px-6"
          style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)' }}>

          {/* App icon area */}
          <div className="w-28 h-28 rounded-3xl flex flex-col items-center justify-center gap-2 mb-5 relative"
            style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '2px solid rgba(237,194,46,0.2)', boxShadow: '0 8px 32px rgba(237,194,46,0.15)' }}>
            <span className="text-5xl">🎮</span>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#00E676' }}>
              <Download className="w-3 h-3" style={{ color: '#FFFFFF' }} />
            </div>
          </div>

          {/* Ad title */}
          <p className="text-base font-bold mb-1" style={{ color: '#FFFFFF' }}>Merge Master 2048</p>
          <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>The Ultimate Number Puzzle Game</p>

          {/* Star rating - realistic */}
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-3 h-3" style={{ color: i <= 4 ? '#FFD700' : 'rgba(255,255,255,0.2)', fill: i <= 4 ? '#FFD700' : 'none' }} />
            ))}
            <span className="text-[9px] ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>4.6 ★</span>
          </div>

          {/* CTA button */}
          <div className="px-8 py-2.5 rounded-full flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', boxShadow: '0 4px 15px rgba(237,194,46,0.4)' }}>
            <Download className="w-4 h-4" style={{ color: '#FFFFFF' }} />
            <span className="text-sm font-bold" style={{ color: '#FFFFFF' }}>INSTALL NOW</span>
          </div>
        </div>

        {/* Close button / Timer */}
        <div className="absolute top-4 right-4">
          {canClose ? (
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
              <X className="w-5 h-5" style={{ color: '#FFFFFF' }} />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>{timeLeft}</span>
            </div>
          )}
        </div>

        {/* Ad label - bottom left */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-2 py-1 rounded"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <Megaphone className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-[7px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>Ad</span>
        </div>

        {/* Ad ID indicator */}
        <div className="absolute bottom-4 right-4">
          <span className="text-[6px]" style={{ color: 'rgba(255,255,255,0.1)' }}>{ADMOB_IDS.openAd.slice(-8)}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Banner Ad ───
export function BannerAd({ isOnline }: { isOnline: boolean }) {
  if (!isOnline) return null

  return (
    <div className="w-full flex items-center justify-center py-1.5 px-3"
      style={{ background: 'linear-gradient(90deg, #1a0533, #0d1b3e, #1a0533)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 px-3 py-1 rounded-lg max-w-md w-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* App icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.12)' }}>
          <span className="text-base">🎮</span>
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[8px] sm:text-[9px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Merge Master 2048
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map(i => (
              <Star key={i} className="w-1.5 h-1.5" style={{ color: '#FFD700', fill: '#FFD700' }} />
            ))}
            <span className="text-[6px]" style={{ color: 'rgba(255,255,255,0.3)' }}>4.6</span>
          </div>
        </div>
        {/* Install button */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[7px] font-bold flex-shrink-0"
          style={{ backgroundColor: 'rgba(237,194,46,0.12)', border: '1px solid rgba(237,194,46,0.2)', color: '#EDC22E' }}>
          <ExternalLink className="w-2 h-2" />
          INSTALL
        </div>
        {/* Ad label */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Megaphone className="w-2 h-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <span className="text-[5px] font-medium" style={{ color: 'rgba(255,255,255,0.15)' }}>Ad</span>
        </div>
      </div>
    </div>
  )
}

// ─── Interstitial Ad ───
// Uses key-based remount from parent for state reset
export function InterstitialAd({ isOpen, onClose, reason }: { isOpen: boolean; onClose: () => void; reason: 'battle' | 'death' }) {
  const [canClose, setCanClose] = useState(false)
  const [timeLeft, setTimeLeft] = useState(5)

  useEffect(() => {
    if (!isOpen) return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanClose(true)
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.97)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Ad content */}
        <div className="p-5 text-center">
          {/* App icon */}
          <div className="w-24 h-24 mx-auto rounded-2xl flex flex-col items-center justify-center gap-1.5 mb-4 relative"
            style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.12)', boxShadow: '0 4px 20px rgba(237,194,46,0.1)' }}>
            <span className="text-4xl">🎮</span>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#00E676' }}>
              <Download className="w-2.5 h-2.5" style={{ color: '#FFFFFF' }} />
            </div>
          </div>

          <p className="text-sm font-bold mb-0.5" style={{ color: '#FFFFFF' }}>Merge Master 2048</p>
          <p className="text-[9px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>The Ultimate Number Puzzle</p>

          {/* Stars */}
          <div className="flex items-center justify-center gap-0.5 mb-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-3 h-3" style={{ color: i <= 4 ? '#FFD700' : 'rgba(255,255,255,0.15)', fill: i <= 4 ? '#FFD700' : 'none' }} />
            ))}
            <span className="text-[8px] ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>4.6 (12K+ reviews)</span>
          </div>

          {/* Install CTA */}
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full mb-2"
            style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', boxShadow: '0 4px 15px rgba(237,194,46,0.3)' }}>
            <Download className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} />
            <span className="text-xs font-bold" style={{ color: '#FFFFFF' }}>Install Free</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Megaphone className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Ad • {reason === 'battle' ? '⏱️' : '💀'}
            </span>
          </div>
          {canClose ? (
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg font-bold text-[10px]"
              style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
              Close
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{timeLeft}s</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Offline Ad Placeholder ───
export function OfflineBanner() {
  return (
    <div className="w-full flex items-center justify-center py-1.5 px-3"
      style={{ background: 'linear-gradient(90deg, #1a0533, #0d1b3e, #1a0533)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 px-3 py-1 rounded-lg max-w-md w-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <WifiOff className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Ads disabled • Connect to internet</p>
      </div>
    </div>
  )
}
