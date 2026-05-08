'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Share2, Gift, Users, Coins, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  inviteCode: string
  coins: number
  onClaimInviteReward: () => void
  hasClaimedInviteReward: boolean
  invitedBy: string
  onSetInvitedBy: (code: string) => void
}

export function InviteModal({ isOpen, onClose, inviteCode, coins, onClaimInviteReward, hasClaimedInviteReward, invitedBy, onSetInvitedBy }: InviteModalProps) {
  const [copied, setCopied] = useState(false)
  const [inviteCodeInput, setInviteCodeInput] = useState(invitedBy || '')
  const [showCodeClaimed, setShowCodeClaimed] = useState(false)

  // Generate invite URL
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}?ref=${inviteCode}` : ''

  const handleCopy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [inviteUrl])

  const handleShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Merge Master 2048 Challenge',
          text: `Play Merge Master 2048! Join using my invite code: ${inviteCode}`,
          url: inviteUrl,
        })
      } catch { /* user cancelled */ }
    } else {
      handleCopy()
    }
  }, [inviteCode, inviteUrl, handleCopy])

  const handleClaimInvite = useCallback(() => {
    if (inviteCodeInput.trim().length >= 4 && !hasClaimedInviteReward) {
      onSetInvitedBy(inviteCodeInput.trim().toUpperCase())
      onClaimInviteReward()
      setShowCodeClaimed(true)
      setTimeout(() => setShowCodeClaimed(false), 3000)
    }
  }, [inviteCodeInput, hasClaimedInviteReward, onSetInvitedBy, onClaimInviteReward])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '2px solid rgba(237,194,46,0.2)' }}>

            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)' }}>
                  <Users className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                </div>
                <h3 className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Invite Friends</h3>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4">

              {/* QR Code */}
              <div className="flex flex-col items-center py-4">
                <div className="p-3 rounded-2xl" style={{ backgroundColor: '#FFFFFF' }}>
                  <QRCodeSVG
                    value={inviteUrl}
                    size={140}
                    bgColor="#FFFFFF"
                    fgColor="#1a0533"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-[9px] mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Scan QR code to join
                </p>
              </div>

              {/* Invite Code */}
              <div className="p-3 rounded-xl text-center mb-3"
                style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.2)' }}>
                <p className="text-[8px] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>YOUR INVITE CODE</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl font-extrabold tracking-widest" style={{ color: '#EDC22E', letterSpacing: '0.15em' }}>
                    {inviteCode}
                  </span>
                  <button onClick={handleCopy}
                    className="p-1.5 rounded-lg transition-transform hover:scale-110 active:scale-95"
                    style={{ backgroundColor: 'rgba(237,194,46,0.15)' }}>
                    {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#00E676' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />}
                  </button>
                </div>
                {copied && <p className="text-[8px] mt-1" style={{ color: '#00E676' }}>Copied!</p>}
              </div>

              {/* Invite Link */}
              <div className="p-2.5 rounded-xl mb-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[8px] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>INVITE LINK</p>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] flex-1 truncate font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {inviteUrl}
                  </p>
                  <button onClick={handleCopy}
                    className="text-[8px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: 'rgba(237,194,46,0.1)', color: '#EDC22E' }}>
                    COPY
                  </button>
                </div>
              </div>

              {/* Share Button */}
              <button onClick={handleShare}
                className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 mb-3 transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                <Share2 className="w-3.5 h-3.5" />
                SHARE INVITE
              </button>

              {/* Rewards Info */}
              <div className="p-3 rounded-xl mb-3"
                style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.12)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Gift className="w-3.5 h-3.5" style={{ color: '#00E676' }} />
                  <p className="text-[10px] font-bold" style={{ color: '#00E676' }}>Rewards</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>New User Gets:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <Coins className="w-2.5 h-2.5" style={{ color: '#EDC22E' }} />
                        <span className="text-[8px] font-bold" style={{ color: '#EDC22E' }}>500</span>
                      </div>
                      <span className="text-[8px]">🎫2</span>
                      <span className="text-[8px]">🧲2</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>You Get:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-bold" style={{ color: '#EDC22E' }}>5% commission</span>
                      <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>of their wins</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enter Invite Code */}
              {!hasClaimedInviteReward && (
                <div className="p-3 rounded-xl"
                  style={{ backgroundColor: 'rgba(246,94,59,0.06)', border: '1px solid rgba(246,94,59,0.12)' }}>
                  <p className="text-[9px] font-bold mb-2" style={{ color: '#F65E3B' }}>Got an invite code?</p>
                  <div className="flex items-center gap-2">
                    <input
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      maxLength={6}
                      className="flex-1 px-3 py-2 rounded-lg text-center text-xs font-bold tracking-widest"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', outline: 'none', letterSpacing: '0.15em' }}
                    />
                    <button onClick={handleClaimInvite} disabled={inviteCodeInput.trim().length < 4}
                      className="px-3 py-2 rounded-lg text-[9px] font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-30"
                      style={{ background: 'linear-gradient(135deg, #F65E3B, #EDC22E)', color: '#FFFFFF' }}>
                      CLAIM
                    </button>
                  </div>
                  {showCodeClaimed && (
                    <p className="text-[8px] mt-1.5 text-center" style={{ color: '#00E676' }}>
                      ✅ Code claimed! 500 coins + 2 spins + 2 magnets added!
                    </p>
                  )}
                </div>
              )}

              {hasClaimedInviteReward && (
                <div className="p-2.5 rounded-xl text-center"
                  style={{ backgroundColor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.12)' }}>
                  <p className="text-[9px]" style={{ color: '#00E676' }}>✅ Invite reward claimed!</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
