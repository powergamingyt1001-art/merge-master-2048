'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Share2, Users, Coins, Check, ToggleLeft, ToggleRight, Gift, Search, Heart, Swords, UserPlus, MessageCircle, Bell, UserCheck, UserX, Plus } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { InvitedUser } from '@/hooks/useGame'
import type { FirebaseReferral, FirebasePlayer } from '@/lib/firebase-service'
import {
  searchPlayerByInviteCode,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  onFriendRequestsUpdate,
  onFriendsUpdate,
  removeFriend,
} from '@/lib/firebase-service'
import type { FriendData, FriendRequestData } from '@/lib/firebase-service'

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
  playerId?: string
  playerName?: string
  playerAvatar?: string
  playerLevel?: number
  onAddNotification?: (title: string, message: string, type: string, emoji: string) => void
}

type InviteTab = 'refer' | 'friends' | 'requests'

interface FriendWithOnline extends FriendData {
  friendId: string
  online?: boolean
}

interface RequestWithId extends FriendRequestData {
  fromPlayerId: string
}

export function InvitePanel({
  isOpen, onClose, inviteCode, invitedUsers,
  commissionBalance, commissionClaimed, autoClaimCommission,
  onClaimCommission, onClaimFirebaseCommission, onToggleAutoClaim,
  firebaseReferrals = [],
  firebaseCommissionPending = 0,
  userCode = '',
  playerId = '',
  playerName = '',
  playerAvatar = '',
  playerLevel = 1,
  onAddNotification,
}: InvitePanelProps) {
  const [copied, setCopied] = useState(false)
  const [showUserList, setShowUserList] = useState(false)
  const [activeTab, setActiveTab] = useState<InviteTab>('refer')

  // Search state
  const [searchCode, setSearchCode] = useState('')
  const [foundPlayer, setFoundPlayer] = useState<FirebasePlayer | null>(null)
  const [searching, setSearching] = useState(false)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [requestSent, setRequestSent] = useState<string | null>(null)

  // Friends state
  const [friends, setFriends] = useState<FriendWithOnline[]>([])
  const [friendRequests, setFriendRequests] = useState<RequestWithId[]>([])
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

  // Real-time friend requests listener
  useEffect(() => {
    if (!playerId || !isOpen) return
    const unsub = onFriendRequestsUpdate(playerId, (reqs) => {
      setFriendRequests(reqs as RequestWithId[])
    })
    return () => unsub()
  }, [playerId, isOpen])

  // Real-time friends list listener
  useEffect(() => {
    if (!playerId || !isOpen) return
    const unsub = onFriendsUpdate(playerId, (friendsList) => {
      // Check online status for each friend (based on lastActive)
      const enriched = friendsList.map(f => ({
        ...f,
        online: false, // Will be updated by individual lookups if needed
      }))
      setFriends(enriched as FriendWithOnline[])
    })
    return () => unsub()
  }, [playerId, isOpen])

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

  // Search for friend by invite code via Firebase
  const handleSearchFriend = useCallback(async () => {
    if (!searchCode || searchCode.length < 3) return
    setSearching(true)
    setFoundPlayer(null)
    try {
      const result = await searchPlayerByInviteCode(searchCode)
      setFoundPlayer(result)
    } catch {
      setFoundPlayer(null)
    }
    setSearching(false)
  }, [searchCode])

  // Send friend request
  const handleSendRequest = useCallback(async (targetPlayer: FirebasePlayer) => {
    if (!playerId) return
    setSendingRequest(true)
    try {
      const result = await sendFriendRequest(
        playerId,
        playerName,
        playerAvatar,
        playerLevel,
        userCode,
        targetPlayer.id
      )
      if (result.success) {
        setRequestSent(targetPlayer.id)
        onAddNotification?.('Friend Request Sent! 📨', `Request sent to ${targetPlayer.name || 'Player'}`, 'friend_request', '📨')
      } else {
        onAddNotification?.('Cannot Send Request', result.reason || 'Something went wrong', 'system', '⚠️')
      }
    } catch {
      onAddNotification?.('Error', 'Failed to send friend request', 'system', '❌')
    }
    setSendingRequest(false)
  }, [playerId, playerName, playerAvatar, playerLevel, userCode, onAddNotification])

  // Accept friend request
  const handleAcceptRequest = useCallback(async (fromPlayerId: string, fromName: string) => {
    if (!playerId) return
    try {
      await acceptFriendRequest(playerId, fromPlayerId)
      onAddNotification?.('Friend Added! 🎉', `${fromName} is now your friend!`, 'friend_request', '🎉')
    } catch {
      onAddNotification?.('Error', 'Failed to accept request', 'system', '❌')
    }
  }, [playerId, onAddNotification])

  // Decline friend request
  const handleDeclineRequest = useCallback(async (fromPlayerId: string) => {
    if (!playerId) return
    try {
      await declineFriendRequest(playerId, fromPlayerId)
    } catch {
      // silent
    }
  }, [playerId])

  // Remove friend
  const handleRemoveFriend = useCallback(async (friendId: string, friendName: string) => {
    if (!playerId) return
    try {
      await removeFriend(playerId, friendId)
      onAddNotification?.('Friend Removed', `${friendName} removed from friends`, 'system', '👋')
    } catch {
      // silent
    }
  }, [playerId, onAddNotification])

  const handleLike = useCallback((code: string) => {
    setLikedProfiles(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const handleClose = useCallback(() => {
    setActiveTab('refer')
    setSearchCode('')
    setFoundPlayer(null)
    setSearching(false)
    setRequestSent(null)
    onClose()
  }, [onClose])

  // Check if a found player is already a friend
  const isAlreadyFriend = foundPlayer ? friends.some(f => f.friendId === foundPlayer.id) : false
  // Check if request already sent to found player
  const isRequestSentToPlayer = foundPlayer ? requestSent === foundPlayer.id : false

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
            <div className="mx-4 mb-3 flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('refer')}
                className="flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all text-center"
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
                className="flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all text-center relative"
                style={{
                  backgroundColor: activeTab === 'friends' ? 'rgba(237,194,46,0.15)' : 'rgba(255,255,255,0.06)',
                  border: activeTab === 'friends' ? '1px solid rgba(237,194,46,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: activeTab === 'friends' ? '#EDC22E' : 'rgba(255,255,255,0.4)',
                }}
              >
                👥 Friends
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className="flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all text-center relative"
                style={{
                  backgroundColor: activeTab === 'requests' ? 'rgba(246,94,59,0.15)' : 'rgba(255,255,255,0.06)',
                  border: activeTab === 'requests' ? '1px solid rgba(246,94,59,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: activeTab === 'requests' ? '#F65E3B' : 'rgba(255,255,255,0.4)',
                }}
              >
                🔔 Requests
                {friendRequests.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ backgroundColor: '#F65E3B', color: '#FFFFFF' }}>
                    {friendRequests.length}
                  </span>
                )}
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

            {/* ===== FRIENDS TAB ===== */}
            {activeTab === 'friends' && (
              <div className="px-4 pb-4">
                {/* Search Bar */}
                <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Search className="w-3 h-3" style={{ color: '#EDC22E' }} />
                    <span className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>Find Player by UID</span>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={searchCode} onChange={e => setSearchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                      placeholder="Enter player UID..."
                      className="flex-1 px-3 py-2.5 rounded-lg text-xs font-mono outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                      onKeyDown={e => e.key === 'Enter' && handleSearchFriend()} />
                    <button onClick={handleSearchFriend}
                      className="px-4 py-2.5 rounded-lg text-xs font-bold transition-transform active:scale-95"
                      style={{
                        background: searchCode.length >= 3 ? 'linear-gradient(135deg, #EDC22E, #FF7A00)' : 'rgba(255,255,255,0.06)',
                        color: searchCode.length >= 3 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      }}>
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[7px] mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Your UID: <span className="font-mono font-bold" style={{ color: '#EDC22E' }}>{userCode || 'N/A'}</span>
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
                    <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Searching Firebase...</p>
                  </div>
                )}

                {/* Found Player Card */}
                {foundPlayer && !searching && (
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
                            background: `linear-gradient(135deg, ${(Date.now() - (foundPlayer.lastActive || 0)) < 120000 ? '#00E676' : '#666'}, ${(Date.now() - (foundPlayer.lastActive || 0)) < 120000 ? '#00C853' : '#444'})`,
                            border: `2px solid ${(Date.now() - (foundPlayer.lastActive || 0)) < 120000 ? 'rgba(0,230,118,0.5)' : 'rgba(255,255,255,0.15)'}`,
                          }}>
                          <span className="text-2xl">{foundPlayer.avatar || '😎'}</span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: (Date.now() - (foundPlayer.lastActive || 0)) < 120000 ? '#00E676' : '#666', border: '2px solid #1a0533' }}>
                          {(Date.now() - (foundPlayer.lastActive || 0)) < 120000 && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FFFFFF' }} />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>{foundPlayer.name || 'Player'}</p>
                          <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{
                              backgroundColor: (Date.now() - (foundPlayer.lastActive || 0)) < 120000 ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.06)',
                              color: (Date.now() - (foundPlayer.lastActive || 0)) < 120000 ? '#00E676' : 'rgba(255,255,255,0.4)',
                            }}>
                            {(Date.now() - (foundPlayer.lastActive || 0)) < 120000 ? '● Online' : '● Offline'}
                          </span>
                        </div>
                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Lv.{foundPlayer.level || 1} • UID: {foundPlayer.inviteCode || foundPlayer.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Coins</p>
                        <p className="text-[10px] font-bold" style={{ color: '#EDC22E' }}>
                          {(foundPlayer.coins || 0) >= 1000 ? `${((foundPlayer.coins || 0) / 1000).toFixed(1)}K` : foundPlayer.coins || 0}
                        </p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Score</p>
                        <p className="text-[10px] font-bold" style={{ color: '#00E676' }}>{foundPlayer.bestScore || 0}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Level</p>
                        <p className="text-[10px] font-bold" style={{ color: '#F65E3B' }}>{foundPlayer.level || 1}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {/* Like Button */}
                      <button onClick={() => handleLike(foundPlayer.id)}
                        className="flex-1 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                        style={{
                          backgroundColor: likedProfiles.has(foundPlayer.id) ? 'rgba(246,94,59,0.15)' : 'rgba(255,255,255,0.06)',
                          border: likedProfiles.has(foundPlayer.id) ? '1px solid rgba(246,94,59,0.4)' : '1px solid rgba(255,255,255,0.08)',
                          color: likedProfiles.has(foundPlayer.id) ? '#F65E3B' : 'rgba(255,255,255,0.5)',
                        }}>
                        <Heart className="w-3.5 h-3.5" fill={likedProfiles.has(foundPlayer.id) ? '#F65E3B' : 'none'} />
                        {likedProfiles.has(foundPlayer.id) ? 'Liked' : 'Like'}
                      </button>

                      {/* Add Friend / Already Friends / Request Sent */}
                      {isAlreadyFriend ? (
                        <button
                          className="flex-1 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)', color: '#00E676' }}>
                          <UserCheck className="w-3.5 h-3.5" />
                          Friends ✓
                        </button>
                      ) : isRequestSentToPlayer ? (
                        <button
                          className="flex-1 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: 'rgba(237,194,46,0.1)', border: '1px solid rgba(237,194,46,0.3)', color: '#EDC22E' }}>
                          <Bell className="w-3.5 h-3.5" />
                          Request Sent
                        </button>
                      ) : foundPlayer.id === playerId ? (
                        <button
                          className="flex-1 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
                          That&apos;s You!
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(foundPlayer)}
                          disabled={sendingRequest}
                          className="flex-1 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(237,194,46,0.3)' }}>
                          <Plus className="w-3.5 h-3.5" />
                          {sendingRequest ? 'Sending...' : 'Add Friend'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* No Result */}
                {!foundPlayer && !searching && searchCode.length >= 3 && (
                  <div className="text-center py-4">
                    <Search className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>No player found</p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Check the UID and try again</p>
                  </div>
                )}

                {/* Initial State */}
                {!foundPlayer && !searching && searchCode.length < 3 && (
                  <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-3xl block mb-2">👥</span>
                    <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Find Game Friends</p>
                    <p className="text-[8px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Enter a player UID to find and add friends
                    </p>

                    {/* Feature Preview */}
                    <div className="mt-3 space-y-1.5">
                      {[
                        { icon: <Plus className="w-3 h-3" style={{ color: '#EDC22E' }} />, text: 'Send friend requests' },
                        { icon: <Swords className="w-3 h-3" style={{ color: '#F65E3B' }} />, text: 'Invite friends to Room Fight' },
                        { icon: <MessageCircle className="w-3 h-3" style={{ color: '#00E676' }} />, text: 'Chat coming soon!' },
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                          {feature.icon}
                          <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{feature.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real Friends List */}
                <div className="mt-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="p-3 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" style={{ color: '#00E676' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#00E676' }}>My Friends</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(0,230,118,0.1)', color: '#00E676' }}>{friends.length}</span>
                    </div>
                  </div>
                  <div className="px-3 pb-3 space-y-1 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                    {friends.length === 0 ? (
                      <div className="text-center py-3">
                        <Users className="w-6 h-6 mx-auto mb-1" style={{ color: 'rgba(255,255,255,0.15)' }} />
                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No friends yet</p>
                        <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Search by UID to add friends!</p>
                      </div>
                    ) : (
                      friends.map(friend => (
                        <div key={friend.friendId} className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <span className="text-sm">{friend.avatar || '😎'}</span>
                              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                                style={{ backgroundColor: friend.online ? '#00E676' : '#666', border: '1px solid #1a0533' }} />
                            </div>
                            <div>
                              <p className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{friend.name}</p>
                              <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Lv.{friend.level} • {friend.inviteCode || friend.friendId.slice(0, 6)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {friend.online && (
                              <button
                                className="w-5 h-5 rounded flex items-center justify-center"
                                style={{ backgroundColor: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.2)' }}
                                title="Invite to Room">
                                <Swords className="w-2.5 h-2.5" style={{ color: '#00E676' }} />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveFriend(friend.friendId, friend.name)}
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.15)' }}
                              title="Remove friend">
                              <X className="w-2.5 h-2.5" style={{ color: '#F65E3B' }} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===== REQUESTS TAB ===== */}
            {activeTab === 'requests' && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Bell className="w-3.5 h-3.5" style={{ color: '#F65E3B' }} />
                  <span className="text-xs font-bold" style={{ color: '#F65E3B' }}>Friend Requests</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(246,94,59,0.15)', color: '#F65E3B' }}>{friendRequests.length}</span>
                </div>

                {friendRequests.length === 0 ? (
                  <div className="p-6 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>No pending requests</p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.25)' }}>When someone sends you a friend request, it will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friendRequests.map(req => (
                      <motion.div
                        key={req.fromPlayerId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, #F65E3B, #FF7A00)',
                              border: '2px solid rgba(246,94,59,0.3)',
                            }}>
                            <span className="text-lg">{req.avatar || '😎'}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold" style={{ color: '#FFFFFF' }}>{req.name || 'Player'}</p>
                            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              Lv.{req.level || 1} • {req.inviteCode || req.fromPlayerId.slice(0, 6)}
                            </p>
                            <p className="text-[7px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                              {new Date(req.requestedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleAcceptRequest(req.fromPlayerId, req.name)}
                            className="flex-1 py-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-transform active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#FFFFFF' }}>
                            <UserCheck className="w-3.5 h-3.5" />
                            Accept ✅
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req.fromPlayerId)}
                            className="flex-1 py-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-transform active:scale-95"
                            style={{ backgroundColor: 'rgba(246,94,59,0.1)', border: '1px solid rgba(246,94,59,0.3)', color: '#F65E3B' }}>
                            <UserX className="w-3.5 h-3.5" />
                            Decline ❌
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
