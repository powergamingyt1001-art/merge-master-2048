'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Share2, Users, Coins, Check, ToggleLeft, ToggleRight, Gift } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { InvitedUser } from '@/hooks/useGame'
import type { FirebaseReferral } from '@/lib/firebase-service'

interface InvitePanelProps {
  isOpen: boolean
  onClose: () => void
  inviteCode: string
  invitedUsers: InvitedUser[]
  commissionBalance: number
  commissionClaimed: number
  autoClaimCommission: boolean
  onClaimCommission: () => void
  onClaimFirebaseCommission: () => void
  onToggleAutoClaim: () => void
  firebaseReferrals?: FirebaseReferral[]
  firebaseCommissionPending?: number
}

export function InvitePanel({
  isOpen, onClose, inviteCode, invitedUsers,
  commissionBalance, commissionClaimed, autoClaimCommission,
  onClaimCommission, onClaimFirebaseCommission, onToggleAutoClaim,
  firebaseReferrals = [],
  firebaseCommissionPending = 0,
}: InvitePanelProps) {
  const [copied, setCopied] = useState(false)
  const [showUserList, setShowUserList] = useState(false)

  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}?ref=${inviteCode}` : ''

  // Use Firebase referrals if available, otherwise fall back to local
  const activeReferrals = firebaseReferrals.length > 0
    ? firebaseReferrals.map(r => ({
        id: r.id,
        name: r.name,
        joinedAt: new Date(r.joinedAt).toISOString(),
        commissionEarned: r.commissionEarned || 0,
      }))
    : invitedUsers

  const totalCommissionPending = firebaseCommissionPending > 0 ? firebaseCommissionPending : commissionBalance

  const handleCopy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [inviteUrl])

  const handleShare = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Merge Master 2048 Challenge',
        text: `Join me on Merge Master 2048! Use my invite link and get 500 coins + 2 spins + 2 magnets FREE! 🎮`,
        url: inviteUrl,
      }).catch(() => {})
    }
  }, [inviteUrl])

  const handleClaim = useCallback(() => {
    if (firebaseCommissionPending > 0) {
      onClaimFirebaseCommission()
    } else {
      onClaimCommission()
    }
  }, [firebaseCommissionPending, onClaimFirebaseCommission, onClaimCommission])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)' }}>
              <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>🤝 Invite & Earn</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Live indicator */}
            {firebaseReferrals.length > 0 && (
              <div className="mx-4 mb-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#00E676' }} />
                <span className="text-[8px] font-bold" style={{ color: '#00E676' }}>LIVE</span>
                <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>• Real-time tracking</span>
              </div>
            )}

            <div className="px-4 pb-4">
              {/* Reward info */}
              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#00E676' }}>🎁 New User Gets:</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>500 Coins + 2 Spins + 2 Magnets</p>
                <p className="text-xs font-bold mt-1.5 mb-0.5" style={{ color: '#EDC22E' }}>💰 You Get: 5% Commission</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>From every invitee&apos;s winnings forever!</p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center mb-3">
                <div className="p-3 rounded-xl mb-2" style={{ backgroundColor: '#FFFFFF' }}>
                  <QRCodeSVG
                    value={inviteUrl}
                    size={140}
                    bgColor="#FFFFFF"
                    fgColor="#1a0533"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Scan to join</p>
              </div>

              {/* Share buttons */}
              <div className="flex gap-2 mb-3">
                <button onClick={handleCopy}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-95"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: copied ? '#00E676' : 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button onClick={handleShare}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>

              {/* Commission Box */}
              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" style={{ color: '#EDC22E' }} />
                    <span className="text-xs font-bold" style={{ color: '#EDC22E' }}>Commission</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {autoClaimCommission ? 'Auto' : 'Manual'}
                    </span>
                    <button onClick={onToggleAutoClaim} className="flex items-center">
                      {autoClaimCommission ? (
                        <ToggleRight className="w-6 h-6" style={{ color: '#00E676' }} />
                      ) : (
                        <ToggleLeft className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-extrabold" style={{ color: '#EDC22E' }}>
                      {totalCommissionPending > 0 ? totalCommissionPending.toFixed(0) : 0} <span className="text-[8px] font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>pending</span>
                    </p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Total claimed: {commissionClaimed}
                    </p>
                  </div>
                  {!autoClaimCommission && totalCommissionPending > 0 && (
                    <button onClick={handleClaim}
                      className="px-3 py-1.5 rounded-lg font-bold text-[10px] transition-transform hover:scale-105 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
                      CLAIM
                    </button>
                  )}
                </div>
              </div>

              {/* Invited Users */}
              <div className="rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setShowUserList(!showUserList)}
                  className="w-full flex items-center justify-between p-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" style={{ color: '#F65E3B' }} />
                    <span className="text-xs font-bold" style={{ color: '#FFFFFF' }}>Invited Users</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(246,94,59,0.2)', color: '#F65E3B' }}>
                      {activeReferrals.length}
                    </span>
                  </div>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {showUserList ? '▲' : '▼'}
                  </span>
                </button>

                <AnimatePresence>
                  {showUserList && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="px-3 pb-3 max-h-40 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                        {activeReferrals.length === 0 ? (
                          <div className="text-center py-3">
                            <Gift className="w-6 h-6 mx-auto mb-1" style={{ color: 'rgba(255,255,255,0.15)' }} />
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No invited users yet</p>
                            <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Share your link to start earning!</p>
                          </div>
                        ) : (
                          activeReferrals.map((user) => (
                            <div key={user.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">👤</span>
                                <div>
                                  <p className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{user.name}</p>
                                  <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    {new Date(user.joinedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold" style={{ color: '#EDC22E' }}>
                                +{user.commissionEarned} 💰
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
