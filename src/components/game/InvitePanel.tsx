'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Share2, Users, Coins, Check, ToggleLeft, ToggleRight, Gift, Search, Heart, Swords, UserPlus, MessageCircle } from 'lucide-react'
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
  userCode?: string
}

// Mock friend profiles for Game Friends search
interface MockProfile {
  code: string
  name: string
  avatar: string
  level: number
  online: boolean
  totalCoins: number
  gamesPlayed: number
  liked: boolean
}

const MOCK_FRIENDS: MockProfile[] = [
  { code: 'ABC1234', name: 'BlazeKing', avatar: '🔥', level: 12, online: true, totalCoins: 15400, gamesPlayed: 89, liked: false },
  { code: 'XYZ5678', name: 'ViperStrike', avatar: '🐍', level: 8, online: false, totalCoins: 8200, gamesPlayed: 45, liked: false },
  { code: 'DEF9012', name: 'StormRider', avatar: '⚡', level: 15, online: true, totalCoins: 28000, gamesPlayed: 134, liked: false },
  { code: 'GHI3456', name: 'NovaFlare', avatar: '💫', level: 6, online: false, totalCoins: 5600, gamesPlayed: 28, liked: false },
  { code: 'JKL7890', name: 'FangWolf', avatar: '🐺', level: 10, online: true, totalCoins: 12300, gamesPlayed: 67, liked: false },
  { code: 'MNO1234', name: 'ApexHunter', avatar: '🏆', level: 18, online: false, totalCoins: 45000, gamesPlayed: 210, liked: false },
  { code: 'PQR5678', name: 'DriftMaster', avatar: '🌪️', level: 9, online: true, totalCoins: 9800, gamesPlayed: 52, liked: false },
  { code: 'STU9012', name: 'VoltRush', avatar: '⚡', level: 11, online: true, totalCoins: 14200, gamesPlayed: 78, liked: false },
]

type InviteTab = 'refer' | 'friends'

export function InvitePanel({
  isOpen, onClose, inviteCode, invitedUsers,
  commissionBalance, commissionClaimed, autoClaimCommission,
  onClaimCommission, onClaimFirebaseCommission, onToggleAutoClaim,
  firebaseReferrals = [],
  firebaseCommissionPending = 0,
  userCode = '',
}: InvitePanelProps) {
  const [copied, setCopied] = useState(false)
  const [showUserList, setShowUserList] = useState(false)
  const [activeTab, setActiveTab] = useState<InviteTab>('refer')

  // Game Friends state
  const [searchCode, setSearchCode] = useState('')
  const [foundProfile, setFoundProfile] = useState<MockProfile | null>(null)
  const [searching, setSearching] = useState(false)
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set())

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

  // Search for friend by code
  const handleSearchFriend = useCallback(() => {
    if (!searchCode || searchCode.length < 6) return
    setSearching(true)
    setFoundProfile(null)
    // Simulate search delay
    setTimeout(() => {
      const normalized = searchCode.toUpperCase()
      const found = MOCK_FRIENDS.find(f => f.code === normalized)
      if (found) {
        setFoundProfile({ ...found, liked: likedProfiles.has(found.code) })
      } else {
        setFoundProfile(null)
      }
      setSearching(false)
    }, 800)
  }, [searchCode, likedProfiles])

  const handleLike = useCallback((code: string) => {
    setLikedProfiles(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
    setFoundProfile(prev => prev ? { ...prev, liked: !prev.liked } : null)
  }, [])

  const handleClose = useCallback(() => {
    setActiveTab('refer')
    setSearchCode('')
    setFoundProfile(null)
    setSearching(false)
    onClose()
  }, [onClose])

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
              <button onClick={handleClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Tab Toggle */}
            <div className="mx-4 mb-3 flex items-center gap-2">
              <button
                onClick={() => setActiveTab('refer')}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all text-center"
                style={{
                  backgroundColor: activeTab === 'refer' ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.06)',
                  border: activeTab === 'refer' ? '1px solid rgba(0,230,118,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: activeTab === 'refer' ? '#00E676' : 'rgba(255,255,255,0.4)',
                }}
              >
                🤝 Refer
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all text-center"
                style={{
                  backgroundColor: activeTab === 'friends' ? 'rgba(237,194,46,0.15)' : 'rgba(255,255,255,0.06)',
                  border: activeTab === 'friends' ? '1px solid rgba(237,194,46,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: activeTab === 'friends' ? '#EDC22E' : 'rgba(255,255,255,0.4)',
                }}
              >
                👥 Game Friends
              </button>
            </div>

            {/* ===== REFER TAB ===== */}
            {activeTab === 'refer' && (
              <>
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
                    <p className="text-xs font-bold mt-1.5 mb-0.5" style={{ color: '#EDC22E' }}>💰 You Get Commission:</p>
                    <p className="text-[10px]" style={{ color: '#00E676' }}>🏆 20% on WIN &nbsp;•&nbsp; 💸 2% on LOSS</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>From every invitee&apos;s game forever! Up to 10 levels deep!</p>
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
              </>
            )}

            {/* ===== GAME FRIENDS TAB ===== */}
            {activeTab === 'friends' && (
              <div className="px-4 pb-4">
                {/* Search Bar */}
                <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Search className="w-3 h-3" style={{ color: '#EDC22E' }} />
                    <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Find Player</span>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={searchCode} onChange={e => setSearchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                      placeholder="Enter player code..."
                      className="flex-1 px-3 py-2.5 rounded-lg text-xs font-mono outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                      onKeyDown={e => e.key === 'Enter' && handleSearchFriend()} />
                    <button onClick={handleSearchFriend}
                      className="px-4 py-2.5 rounded-lg text-xs font-bold transition-transform active:scale-95"
                      style={{
                        background: searchCode.length >= 6 ? 'linear-gradient(135deg, #EDC22E, #FF7A00)' : 'rgba(255,255,255,0.06)',
                        color: searchCode.length >= 6 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      }}>
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[7px] mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Your code: <span className="font-mono font-bold" style={{ color: '#EDC22E' }}>{userCode || 'N/A'}</span>
                  </p>
                </div>

                {/* Searching Animation */}
                {searching && (
                  <div className="flex flex-col items-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                      style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', boxShadow: '0 0 15px rgba(237,194,46,0.3)' }}>
                      <Search className="w-5 h-5" style={{ color: '#FFFFFF' }} />
                    </motion.div>
                    <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Searching...</p>
                  </div>
                )}

                {/* Profile Card */}
                {foundProfile && !searching && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl mb-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {/* Profile Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${foundProfile.online ? '#00E676' : '#666'}, ${foundProfile.online ? '#00C853' : '#444'})`,
                            border: `2px solid ${foundProfile.online ? 'rgba(0,230,118,0.5)' : 'rgba(255,255,255,0.15)'}`,
                          }}>
                          <span className="text-2xl">{foundProfile.avatar}</span>
                        </div>
                        {/* Online/Offline indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: foundProfile.online ? '#00E676' : '#666', border: '2px solid #1a0533' }}>
                          {foundProfile.online && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FFFFFF' }} />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>{foundProfile.name}</p>
                          <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{
                              backgroundColor: foundProfile.online ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.06)',
                              color: foundProfile.online ? '#00E676' : 'rgba(255,255,255,0.4)',
                            }}>
                            {foundProfile.online ? '● Online' : '● Offline'}
                          </span>
                        </div>
                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Lv.{foundProfile.level} • Code: {foundProfile.code}
                        </p>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Coins</p>
                        <p className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>
                          {foundProfile.totalCoins >= 1000 ? `${(foundProfile.totalCoins / 1000).toFixed(1)}K` : foundProfile.totalCoins}
                        </p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Games</p>
                        <p className="text-[10px] font-bold" style={{ color: '#00E676' }}>{foundProfile.gamesPlayed}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Level</p>
                        <p className="text-[10px] font-bold" style={{ color: '#F65E3B' }}>{foundProfile.level}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {/* Like Button */}
                      <button onClick={() => handleLike(foundProfile.code)}
                        className="flex-1 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                        style={{
                          backgroundColor: foundProfile.liked ? 'rgba(246,94,59,0.15)' : 'rgba(255,255,255,0.06)',
                          border: foundProfile.liked ? '1px solid rgba(246,94,59,0.4)' : '1px solid rgba(255,255,255,0.08)',
                          color: foundProfile.liked ? '#F65E3B' : 'rgba(255,255,255,0.5)',
                        }}>
                        <Heart className="w-3.5 h-3.5" fill={foundProfile.liked ? '#F65E3B' : 'none'} />
                        {foundProfile.liked ? 'Liked' : 'Like'}
                      </button>

                      {/* Invite to Room - only if online */}
                      {foundProfile.online ? (
                        <button
                          className="flex-1 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(237,194,46,0.3)' }}>
                          <Swords className="w-3.5 h-3.5" />
                          Invite to Room
                        </button>
                      ) : (
                        <button
                          className="flex-1 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)', cursor: 'not-allowed' }}>
                          <UserPlus className="w-3.5 h-3.5" />
                          Offline
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* No Result */}
                {!foundProfile && !searching && searchCode.length >= 6 && (
                  <div className="text-center py-4">
                    <Search className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>No player found</p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Check the code and try again</p>
                  </div>
                )}

                {/* Initial State */}
                {!foundProfile && !searching && searchCode.length < 6 && (
                  <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-3xl block mb-2">👥</span>
                    <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Find Game Friends</p>
                    <p className="text-[8px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Enter a 6-8 digit player code to find and connect with other players
                    </p>

                    {/* Feature Preview */}
                    <div className="mt-3 space-y-1.5">
                      {[
                        { icon: <Heart className="w-3 h-3" style={{ color: '#F65E3B' }} />, text: 'Like player profiles' },
                        { icon: <Swords className="w-3 h-3" style={{ color: '#EDC22E' }} />, text: 'Invite to Room Fight' },
                        { icon: <MessageCircle className="w-3 h-3" style={{ color: '#00E676' }} />, text: 'Chat coming soon!' },
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                          {feature.icon}
                          <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{feature.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Quick Try */}
                    <div className="mt-3">
                      <p className="text-[7px] mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Try these codes:</p>
                      <div className="flex flex-wrap justify-center gap-1">
                        {['ABC1234', 'DEF9012', 'JKL7890'].map(code => (
                          <button key={code} onClick={() => { setSearchCode(code) }}
                            className="px-2 py-1 rounded text-[8px] font-mono font-bold transition-transform active:scale-95"
                            style={{ backgroundColor: 'rgba(237,194,46,0.08)', border: '1px solid rgba(237,194,46,0.15)', color: '#EDC22E' }}>
                            {code}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Online Friends List */}
                <div className="mt-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="p-3 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" style={{ color: '#00E676' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#00E676' }}>Players Nearby</span>
                    </div>
                  </div>
                  <div className="px-3 pb-3 space-y-1">
                    {MOCK_FRIENDS.slice(0, 4).map(friend => (
                      <div key={friend.code} className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="text-sm">{friend.avatar}</span>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                              style={{ backgroundColor: friend.online ? '#00E676' : '#666', border: '1px solid #1a0533' }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{friend.name}</p>
                            </div>
                            <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Lv.{friend.level}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[7px] font-bold" style={{ color: friend.online ? '#00E676' : 'rgba(255,255,255,0.25)' }}>
                            {friend.online ? '● Online' : '● Offline'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
