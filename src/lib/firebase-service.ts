// Firebase Realtime Database Service for Merge Master 2048
// All game data sync, referral system, leaderboard operations

import { db } from './firebase'
import {
  ref,
  set,
  get,
  update,
  push,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  serverTimestamp,
  runTransaction,
} from 'firebase/database'

// ============================================================
// TYPES
// ============================================================
export interface FirebasePlayer {
  id: string
  name: string
  avatar: string
  inviteCode: string
  userCode: string
  tournamentPoints: number
  levelXP: number
  bestScore: number
  modBestScore: number
  battleBestScore: number
  coins: number
  totalCoinsEarned: number
  winningCoins: number
  level: number
  lastActive: number
  joinedAt: number
  totalBattlesPlayed: number
  totalBattlesWon: number
  likes?: number
}

export interface FirebaseReferral {
  id: string
  name: string
  avatar: string
  joinedAt: number
  commissionEarned: number
}

// ============================================================
// UID CONSISTENCY UTILITIES
// ============================================================

/**
 * Validates and returns only digits from a userCode string.
 * Ensures userCode is always stored as a numeric string in Firebase.
 */
export function ensureNumericUserCode(userCode: string): string {
  if (!userCode) return ''
  return String(userCode).replace(/[^0-9]/g, '')
}

/**
 * Get the next sequential user code starting from 5001.
 * Uses Firebase transactions for atomicity (no duplicate UIDs).
 * Falls back to localStorage if Firebase is unavailable.
 */
export async function getNextUserCode(): Promise<string> {
  const START_CODE = 5001
  const LOCAL_KEY = 'mergeMaster2048_nextUserCode'

  // Try Firebase transaction first
  try {
    const counterRef = ref(db, 'system/lastUserCode')
    const result = await runTransaction(counterRef, (currentData) => {
      if (currentData === null) {
        return START_CODE // First user gets 5001
      }
      return (currentData as number) + 1 // Increment
    })
    if (result.committed && result.snapshot.val() !== null) {
      const code = String(result.snapshot.val())
      // Also update localStorage as fallback marker
      try { localStorage.setItem(LOCAL_KEY, String(parseInt(code, 10) + 1)) } catch { /* ignore */ }
      return code
    }
  } catch (err) {
    console.warn('Firebase getNextUserCode failed, using localStorage fallback:', err)
  }

  // Fallback: localStorage
  try {
    const stored = localStorage.getItem(LOCAL_KEY)
    let nextCode = stored ? parseInt(stored, 10) : START_CODE
    if (isNaN(nextCode) || nextCode < START_CODE) nextCode = START_CODE
    const code = String(nextCode)
    localStorage.setItem(LOCAL_KEY, String(nextCode + 1))
    return code
  } catch {
    // Ultimate fallback: timestamp-based unique number
    return String(START_CODE + Math.floor(Math.random() * 900000))
  }
}

/**
 * Look up a player by their numeric userCode using the userCodes mapping.
 * This is a direct lookup (faster than searchPlayerByUserCode which has fallbacks).
 */
export async function getPlayerByUserCode(userCode: string): Promise<FirebasePlayer | null> {
  try {
    const numericCode = ensureNumericUserCode(userCode)
    if (!numericCode) return null

    const mappingRef = ref(db, `userCodes/${numericCode}`)
    const mappingSnapshot = await get(mappingRef)
    if (mappingSnapshot.exists()) {
      const mapping = mappingSnapshot.val()
      const player = await getPlayer(mapping.playerId)
      if (player) return player
    }
    return null
  } catch (err) {
    console.warn('Firebase getPlayerByUserCode failed:', err)
    return null
  }
}

// ============================================================
// PLAYER OPERATIONS
// ============================================================

// Register or update a player in Firebase
export async function syncPlayerToFirebase(playerData: {
  id: string
  name: string
  avatar: string
  inviteCode: string
  userCode: string
  tournamentPoints: number
  levelXP: number
  bestScore: number
  modBestScore: number
  battleBestScore: number
  coins: number
  totalCoinsEarned: number
  winningCoins: number
  level: number
  totalBattlesPlayed: number
  totalBattlesWon: number
  likes?: number
  classicBestScore?: number
  tournamentBestScore?: number
}): Promise<void> {
  try {
    // Ensure userCode is always stored as a numeric string
    const safeUserCode = ensureNumericUserCode(playerData.userCode)

    const playerRef = ref(db, `players/${playerData.id}`)
    await update(playerRef, {
      ...playerData,
      userCode: safeUserCode,
      lastActive: Date.now(),
    })
    // Also store the invite code mapping
    const inviteRef = ref(db, `invites/${playerData.inviteCode}`)
    await set(inviteRef, {
      referrerId: playerData.id,
      referrerName: playerData.name,
    })
    // Also store userCode mapping for UID search
    if (safeUserCode) {
      const userCodeRef = ref(db, `userCodes/${safeUserCode}`)
      await set(userCodeRef, {
        playerId: playerData.id,
        playerName: playerData.name,
      })
    }
  } catch (err) {
    // Silent fail - don't break the game if Firebase is down
    console.warn('Firebase sync failed:', err)
  }
}

// Get a player by ID
export async function getPlayer(playerId: string): Promise<FirebasePlayer | null> {
  try {
    const playerRef = ref(db, `players/${playerId}`)
    const snapshot = await get(playerRef)
    if (snapshot.exists()) {
      return { id: playerId, ...snapshot.val() }
    }
    return null
  } catch (err) {
    console.warn('Firebase getPlayer failed:', err)
    return null
  }
}

// Get top players for leaderboard (by tournamentPoints)
export async function getLeaderboardPlayers(
  sortBy: 'tournamentPoints' | 'bestScore' | 'coins' = 'tournamentPoints',
  limit: number = 50
): Promise<FirebasePlayer[]> {
  try {
    const playersRef = query(
      ref(db, 'players'),
      orderByChild(sortBy),
      limitToLast(limit)
    )
    const snapshot = await get(playersRef)
    if (snapshot.exists()) {
      const players: FirebasePlayer[] = []
      snapshot.forEach((child) => {
        players.push({ id: child.key!, ...child.val() })
      })
      // Firebase returns ascending, we want descending (highest first)
      return players.reverse()
    }
    return []
  } catch (err) {
    console.warn('Firebase getLeaderboardPlayers failed:', err)
    return []
  }
}

// Listen to leaderboard in real-time
export function onLeaderboardUpdate(
  sortBy: 'tournamentPoints' | 'bestScore' | 'coins' = 'tournamentPoints',
  limit: number = 50,
  callback: (players: FirebasePlayer[]) => void
): () => void {
  try {
    const playersRef = query(
      ref(db, 'players'),
      orderByChild(sortBy),
      limitToLast(limit)
    )
    const handler = onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        const players: FirebasePlayer[] = []
        snapshot.forEach((child) => {
          players.push({ id: child.key!, ...child.val() })
        })
        callback(players.reverse())
      } else {
        callback([])
      }
    })
    // Return unsubscribe function
    return () => off(playersRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onLeaderboardUpdate failed:', err)
    callback([])
    return () => {}
  }
}

// ============================================================
// REFERRAL SYSTEM
// ============================================================

// When a new user joins via referral link
export async function processReferral(
  newPlayerId: string,
  newPlayerName: string,
  newPlayerAvatar: string,
  refCode: string
): Promise<{ success: boolean; referrerName?: string }> {
  try {
    // 1. Look up the invite code to find referrer
    const inviteRef = ref(db, `invites/${refCode}`)
    const inviteSnapshot = await get(inviteRef)

    if (!inviteSnapshot.exists()) {
      console.warn('Referral code not found:', refCode)
      return { success: false }
    }

    const inviteData = inviteSnapshot.val()
    const referrerId = inviteData.referrerId
    const referrerName = inviteData.referrerName

    // Don't allow self-referral
    if (referrerId === newPlayerId) {
      return { success: false }
    }

    // 2. Check if this player was already referred
    const alreadyReferredRef = ref(db, `referrals/${referrerId}/${newPlayerId}`)
    const alreadySnapshot = await get(alreadyReferredRef)
    if (alreadySnapshot.exists()) {
      // Already referred, don't process again
      return { success: false }
    }

    // 3. Add to referrer's referral list
    const referralData: FirebaseReferral = {
      id: newPlayerId,
      name: newPlayerName || 'Player',
      avatar: newPlayerAvatar || '😎',
      joinedAt: Date.now(),
      commissionEarned: 0,
    }
    await set(alreadyReferredRef, referralData)

    // 4. Store that this player was invited by referrerId
    await set(ref(db, `invitedBy/${newPlayerId}`), referrerId)

    return { success: true, referrerName }
  } catch (err) {
    console.warn('Firebase processReferral failed:', err)
    return { success: false }
  }
}

// Get all referrals for a player (people they invited)
export async function getReferrals(
  playerId: string
): Promise<FirebaseReferral[]> {
  try {
    const referralsRef = ref(db, `referrals/${playerId}`)
    const snapshot = await get(referralsRef)
    if (snapshot.exists()) {
      const referrals: FirebaseReferral[] = []
      snapshot.forEach((child) => {
        referrals.push({ id: child.key!, ...child.val() })
      })
      return referrals.sort((a, b) => b.joinedAt - a.joinedAt)
    }
    return []
  } catch (err) {
    console.warn('Firebase getReferrals failed:', err)
    return []
  }
}

// Listen to referrals in real-time (for the inviter)
export function onReferralsUpdate(
  playerId: string,
  callback: (referrals: FirebaseReferral[]) => void
): () => void {
  try {
    const referralsRef = ref(db, `referrals/${playerId}`)
    const handler = onValue(referralsRef, (snapshot) => {
      if (snapshot.exists()) {
        const referrals: FirebaseReferral[] = []
        snapshot.forEach((child) => {
          referrals.push({ id: child.key!, ...child.val() })
        })
        callback(referrals.sort((a, b) => b.joinedAt - a.joinedAt))
      } else {
        callback([])
      }
    })
    return () => off(referralsRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onReferralsUpdate failed:', err)
    callback([])
    return () => {}
  }
}

// Update commission earned for a referral
export async function updateReferralCommission(
  referrerId: string,
  referralId: string,
  totalCommission: number
): Promise<void> {
  try {
    const commissionRef = ref(db, `referrals/${referrerId}/${referralId}/commissionEarned`)
    await set(commissionRef, totalCommission)
  } catch (err) {
    console.warn('Firebase updateReferralCommission failed:', err)
  }
}

// Get who invited this player
export async function getInvitedBy(
  playerId: string
): Promise<string | null> {
  try {
    const invitedByRef = ref(db, `invitedBy/${playerId}`)
    const snapshot = await get(invitedByRef)
    if (snapshot.exists()) {
      return snapshot.val()
    }
    return null
  } catch (err) {
    console.warn('Firebase getInvitedBy failed:', err)
    return null
  }
}

// ============================================================
// COMMISSION SYSTEM - When invitee earns, referrer gets commission
// 20% on WIN, 2% on LOSS per game (Level 1 direct)
// Multi-level: up to 10 levels deep with decreasing rates
// ============================================================

// Call this when a player earns tournament points or coins
// It will calculate and add commission to referrers up the chain (max 10 levels)
export async function processCommissionForReferrer(
  playerId: string,
  amountEarned: number,
  isWin: boolean = true
): Promise<void> {
  try {
    // Walk up the referral chain for up to 10 levels
    let currentId = playerId
    for (let level = 1; level <= 10; level++) {
      const invitedByRef = ref(db, `invitedBy/${currentId}`)
      const snapshot = await get(invitedByRef)
      if (!snapshot.exists()) break // No more referrers up the chain

      const referrerId = snapshot.val()

      // Don't process self-referral
      if (referrerId === playerId) break

      // Calculate commission rate based on level
      let commissionRate: number
      if (level === 1) {
        commissionRate = isWin ? 0.20 : 0.02
      } else if (level === 2) {
        commissionRate = isWin ? 0.10 : 0.01
      } else if (level === 3) {
        commissionRate = isWin ? 0.05 : 0.005
      } else {
        commissionRate = isWin ? 0.02 : 0.002
      }

      const commissionAmount = Math.floor(amountEarned * commissionRate)
      if (commissionAmount <= 0) {
        currentId = referrerId
        continue
      }

      // Update the referral record with total commission
      const referralRef = ref(db, `referrals/${referrerId}/${playerId}`)
      const referralSnapshot = await get(referralRef)
      if (referralSnapshot.exists()) {
        const currentData = referralSnapshot.val()
        const newTotal = (currentData.commissionEarned || 0) + commissionAmount
        await update(referralRef, { commissionEarned: newTotal })
      } else {
        // For multi-level, create an entry if it doesn't exist
        await set(referralRef, {
          id: playerId,
          name: 'Multi-level referral',
          avatar: '🔗',
          joinedAt: Date.now(),
          commissionEarned: commissionAmount,
          level: level,
        })
      }

      // Add commission notification for referrer
      const notificationRef = push(ref(db, `notifications/${referrerId}`))
      await set(notificationRef, {
        type: 'commission',
        amount: commissionAmount,
        fromPlayerId: playerId,
        level: level,
        timestamp: Date.now(),
        claimed: false,
      })

      // Move up the chain
      currentId = referrerId
    }
  } catch (err) {
    console.warn('Firebase processCommissionForReferrer failed:', err)
  }
}

// Get pending commission notifications
export async function getCommissionNotifications(
  playerId: string
): Promise<Array<{ id: string; amount: number; fromPlayerId: string; timestamp: number; claimed: boolean }>> {
  try {
    const notifRef = ref(db, `notifications/${playerId}`)
    const snapshot = await get(notifRef)
    if (snapshot.exists()) {
      const notifications: Array<{ id: string; amount: number; fromPlayerId: string; timestamp: number; claimed: boolean }> = []
      snapshot.forEach((child) => {
        const data = child.val()
        if (data.type === 'commission' && !data.claimed) {
          notifications.push({ id: child.key!, ...data })
        }
      })
      return notifications.sort((a, b) => b.timestamp - a.timestamp)
    }
    return []
  } catch (err) {
    console.warn('Firebase getCommissionNotifications failed:', err)
    return []
  }
}

// Mark commission notification as claimed
export async function claimCommissionNotification(
  playerId: string,
  notificationId: string
): Promise<void> {
  try {
    const notifRef = ref(db, `notifications/${playerId}/${notificationId}`)
    await update(notifRef, { claimed: true })
  } catch (err) {
    console.warn('Firebase claimCommissionNotification failed:', err)
  }
}

// ============================================================
// ADMIN USER STATS
// ============================================================

// Get total user count from Firebase
export async function getTotalUserCount(): Promise<number> {
  try {
    const playersRef = ref(db, 'players')
    const snapshot = await get(playersRef)
    if (snapshot.exists()) {
      return Object.keys(snapshot.val() || {}).length
    }
    return 0
  } catch (err) {
    console.warn('Firebase getTotalUserCount failed:', err)
    return 0
  }
}

// Get online users count (active in last 2 minutes)
export async function getOnlineUserCount(): Promise<number> {
  try {
    const playersRef = ref(db, 'players')
    const snapshot = await get(playersRef)
    if (snapshot.exists()) {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000
      let onlineCount = 0
      snapshot.forEach((child) => {
        const data = child.val()
        if (data.lastActive && data.lastActive > twoMinutesAgo) {
          onlineCount++
        }
      })
      return onlineCount
    }
    return 0
  } catch (err) {
    console.warn('Firebase getOnlineUserCount failed:', err)
    return 0
  }
}

// ============================================================
// FRIEND SYSTEM
// ============================================================

export interface FriendData {
  name: string
  avatar: string
  level: number
  inviteCode: string
  addedAt: number
}

export interface FriendRequestData {
  name: string
  avatar: string
  level: number
  inviteCode: string
  requestedAt: number
  status: 'pending' | 'accepted' | 'declined'
}

// Search for a player by their userCode (UID) - the numeric code users share
export async function searchPlayerByUserCode(userCode: string): Promise<FirebasePlayer | null> {
  try {
    // First, look up the userCode mapping for fast direct lookup
    const mappingRef = ref(db, `userCodes/${userCode}`)
    const mappingSnapshot = await get(mappingRef)
    if (mappingSnapshot.exists()) {
      const mapping = mappingSnapshot.val()
      const player = await getPlayer(mapping.playerId)
      if (player) return player
    }

    // Fallback: search by userCode field in players using orderByChild
    const playersRef = query(
      ref(db, 'players'),
      orderByChild('userCode'),
      equalTo(userCode),
      limitToLast(1)
    )
    const snapshot = await get(playersRef)
    if (snapshot.exists()) {
      let found: FirebasePlayer | null = null
      snapshot.forEach((child) => {
        found = { id: child.key!, ...child.val() }
      })
      return found
    }

    // Second fallback: load all players and search client-side
    const fallbackRef = query(
      ref(db, 'players'),
      limitToLast(200)
    )
    const fallbackSnapshot = await get(fallbackRef)
    if (fallbackSnapshot.exists()) {
      let found: FirebasePlayer | null = null
      fallbackSnapshot.forEach((child) => {
        const data = child.val()
        if (data.userCode && String(data.userCode) === String(userCode)) {
          found = { id: child.key!, ...data }
        }
      })
      return found
    }
    return null
  } catch (err) {
    console.warn('Firebase searchPlayerByUserCode failed:', err)
    return null
  }
}

// Search for a player by their inviteCode using Firebase orderByChild + equalTo for exact match
export async function searchPlayerByInviteCode(inviteCode: string): Promise<FirebasePlayer | null> {
  try {
    // Use Firebase equalTo() for exact match on inviteCode
    const playersRef = query(
      ref(db, 'players'),
      orderByChild('inviteCode'),
      equalTo(inviteCode.toUpperCase()),
      limitToLast(1)
    )
    const snapshot = await get(playersRef)
    if (snapshot.exists()) {
      let found: FirebasePlayer | null = null
      snapshot.forEach((child) => {
        found = { id: child.key!, ...child.val() }
      })
      return found
    }
    // Fallback: try case-insensitive search by loading limited results
    const fallbackRef = query(
      ref(db, 'players'),
      orderByChild('inviteCode'),
      limitToLast(50)
    )
    const fallbackSnapshot = await get(fallbackRef)
    if (fallbackSnapshot.exists()) {
      let found: FirebasePlayer | null = null
      fallbackSnapshot.forEach((child) => {
        const data = child.val()
        if (data.inviteCode && data.inviteCode.toUpperCase() === inviteCode.toUpperCase()) {
          found = { id: child.key!, ...data }
        }
      })
      return found
    }
    return null
  } catch (err) {
    console.warn('Firebase searchPlayerByInviteCode failed:', err)
    return null
  }
}

// Send a friend request from fromPlayerId to targetPlayerId
export async function sendFriendRequest(
  fromPlayerId: string,
  fromPlayerName: string,
  fromPlayerAvatar: string,
  fromPlayerLevel: number,
  fromPlayerInviteCode: string,
  targetPlayerId: string
): Promise<{ success: boolean; reason?: string }> {
  try {
    // Don't allow self-request
    if (fromPlayerId === targetPlayerId) {
      return { success: false, reason: 'Cannot send request to yourself' }
    }

    // Check if already friends
    const friendRef = ref(db, `friends/${fromPlayerId}/${targetPlayerId}`)
    const friendSnapshot = await get(friendRef)
    if (friendSnapshot.exists()) {
      return { success: false, reason: 'Already friends' }
    }

    // Check if request already exists (either direction)
    const existingRequestRef = ref(db, `friendRequests/${targetPlayerId}/${fromPlayerId}`)
    const existingSnapshot = await get(existingRequestRef)
    if (existingSnapshot.exists()) {
      const existing = existingSnapshot.val()
      if (existing.status === 'pending') {
        return { success: false, reason: 'Request already sent' }
      }
    }

    // Also check reverse direction
    const reverseRequestRef = ref(db, `friendRequests/${fromPlayerId}/${targetPlayerId}`)
    const reverseSnapshot = await get(reverseRequestRef)
    if (reverseSnapshot.exists()) {
      const existing = reverseSnapshot.val()
      if (existing.status === 'pending') {
        return { success: false, reason: 'They already sent you a request' }
      }
    }

    const requestData: FriendRequestData = {
      name: fromPlayerName || 'Player',
      avatar: fromPlayerAvatar || '😎',
      level: fromPlayerLevel || 1,
      inviteCode: fromPlayerInviteCode || '',
      requestedAt: Date.now(),
      status: 'pending',
    }

    // Store friend request under target's node
    await set(existingRequestRef, requestData)

    // Add notification for the target user
    const notificationRef = push(ref(db, `notifications/${targetPlayerId}`))
    await set(notificationRef, {
      type: 'friend_request',
      fromPlayerId,
      fromPlayerName: fromPlayerName || 'Player',
      fromPlayerAvatar: fromPlayerAvatar || '😎',
      timestamp: Date.now(),
      read: false,
    })

    return { success: true }
  } catch (err) {
    console.warn('Firebase sendFriendRequest failed:', err)
    return { success: false, reason: 'Network error' }
  }
}

// Get incoming friend requests for a player
export async function getFriendRequests(playerId: string): Promise<Array<{ fromPlayerId: string } & FriendRequestData>> {
  try {
    const requestsRef = ref(db, `friendRequests/${playerId}`)
    const snapshot = await get(requestsRef)
    if (snapshot.exists()) {
      const requests: Array<{ fromPlayerId: string } & FriendRequestData> = []
      snapshot.forEach((child) => {
        const data = child.val()
        if (data.status === 'pending') {
          requests.push({ fromPlayerId: child.key!, ...data })
        }
      })
      return requests.sort((a, b) => b.requestedAt - a.requestedAt)
    }
    return []
  } catch (err) {
    console.warn('Firebase getFriendRequests failed:', err)
    return []
  }
}

// Listen to friend requests in real-time
export function onFriendRequestsUpdate(
  playerId: string,
  callback: (requests: Array<{ fromPlayerId: string } & FriendRequestData>) => void
): () => void {
  try {
    const requestsRef = ref(db, `friendRequests/${playerId}`)
    const handler = onValue(requestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const requests: Array<{ fromPlayerId: string } & FriendRequestData> = []
        snapshot.forEach((child) => {
          const data = child.val()
          if (data.status === 'pending') {
            requests.push({ fromPlayerId: child.key!, ...data })
          }
        })
        callback(requests.sort((a, b) => b.requestedAt - a.requestedAt))
      } else {
        callback([])
      }
    })
    return () => off(requestsRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onFriendRequestsUpdate failed:', err)
    callback([])
    return () => {}
  }
}

// Accept a friend request
export async function acceptFriendRequest(
  playerId: string,
  fromPlayerId: string
): Promise<void> {
  try {
    // Get the request data
    const requestRef = ref(db, `friendRequests/${playerId}/${fromPlayerId}`)
    const requestSnapshot = await get(requestRef)
    if (!requestSnapshot.exists()) return

    const requestData = requestSnapshot.val()

    // Get the accepting player's data
    const playerData = await getPlayer(playerId)
    if (!playerData) return

    // Add each as friends (bidirectional)
    const now = Date.now()
    await set(ref(db, `friends/${playerId}/${fromPlayerId}`), {
      name: requestData.name || 'Player',
      avatar: requestData.avatar || '😎',
      level: requestData.level || 1,
      inviteCode: requestData.inviteCode || '',
      addedAt: now,
    })
    await set(ref(db, `friends/${fromPlayerId}/${playerId}`), {
      name: playerData.name || 'Player',
      avatar: playerData.avatar || '😎',
      level: playerData.level || 1,
      inviteCode: playerData.inviteCode || '',
      addedAt: now,
    })

    // Remove the friend request
    await set(requestRef, null)
  } catch (err) {
    console.warn('Firebase acceptFriendRequest failed:', err)
  }
}

// Decline a friend request
export async function declineFriendRequest(
  playerId: string,
  fromPlayerId: string
): Promise<void> {
  try {
    const requestRef = ref(db, `friendRequests/${playerId}/${fromPlayerId}`)
    await set(requestRef, null)
  } catch (err) {
    console.warn('Firebase declineFriendRequest failed:', err)
  }
}

// Get friends list for a player
export async function getFriends(playerId: string): Promise<Array<{ friendId: string } & FriendData>> {
  try {
    const friendsRef = ref(db, `friends/${playerId}`)
    const snapshot = await get(friendsRef)
    if (snapshot.exists()) {
      const friends: Array<{ friendId: string } & FriendData> = []
      snapshot.forEach((child) => {
        friends.push({ friendId: child.key!, ...child.val() })
      })
      return friends.sort((a, b) => b.addedAt - a.addedAt)
    }
    return []
  } catch (err) {
    console.warn('Firebase getFriends failed:', err)
    return []
  }
}

// Listen to friends list in real-time
export function onFriendsUpdate(
  playerId: string,
  callback: (friends: Array<{ friendId: string } & FriendData>) => void
): () => void {
  try {
    const friendsRef = ref(db, `friends/${playerId}`)
    const handler = onValue(friendsRef, (snapshot) => {
      if (snapshot.exists()) {
        const friends: Array<{ friendId: string } & FriendData> = []
        snapshot.forEach((child) => {
          friends.push({ friendId: child.key!, ...child.val() })
        })
        callback(friends.sort((a, b) => b.addedAt - a.addedAt))
      } else {
        callback([])
      }
    })
    return () => off(friendsRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onFriendsUpdate failed:', err)
    callback([])
    return () => {}
  }
}

// Remove a friend
export async function removeFriend(
  playerId: string,
  friendId: string
): Promise<void> {
  try {
    await set(ref(db, `friends/${playerId}/${friendId}`), null)
    await set(ref(db, `friends/${friendId}/${playerId}`), null)
  } catch (err) {
    console.warn('Firebase removeFriend failed:', err)
  }
}

// Get total referrals count across all players
export async function getTotalReferralsCount(): Promise<number> {
  try {
    const referralsRef = ref(db, 'referrals')
    const snapshot = await get(referralsRef)
    if (snapshot.exists()) {
      let totalReferrals = 0
      snapshot.forEach((child) => {
        const data = child.val()
        if (typeof data === 'object' && data !== null) {
          totalReferrals += Object.keys(data).length
        }
      })
      return totalReferrals
    }
    return 0
  } catch (err) {
    console.warn('Firebase getTotalReferralsCount failed:', err)
    return 0
  }
}

// ============================================================
// GIFT SYSTEM - Send gifts to friends
// ============================================================

export interface GiftNotification {
  type: 'gift_received'
  giftType: 'coins' | 'hammer' | 'magnet' | 'blast'
  giftAmount: number
  fromPlayerId: string
  fromPlayerName: string
  fromAvatar: string
  timestamp: number
  delivered: boolean
}

/**
 * Send a gift notification to a recipient user via Firebase.
 * Writes to userNotifications/{recipientId} so the recipient can receive it in real-time.
 */
export async function sendGiftToUser(
  recipientId: string,
  gift: Omit<GiftNotification, 'type' | 'timestamp' | 'delivered'>
): Promise<{ success: boolean }> {
  try {
    const giftNotifRef = push(ref(db, `userNotifications/${recipientId}`))
    await set(giftNotifRef, {
      type: 'gift_received',
      giftType: gift.giftType,
      giftAmount: gift.giftAmount,
      fromPlayerId: gift.fromPlayerId,
      fromPlayerName: gift.fromPlayerName,
      fromAvatar: gift.fromAvatar,
      timestamp: Date.now(),
      delivered: false,
    } satisfies GiftNotification)
    return { success: true }
  } catch (err) {
    console.warn('Firebase sendGiftToUser failed:', err)
    return { success: false }
  }
}

/**
 * Listen for gift notifications for a user in real-time.
 */
export function onGiftNotificationsUpdate(
  playerId: string,
  callback: (gifts: Array<{ id: string } & GiftNotification>) => void
): () => void {
  try {
    const notifRef = ref(db, `userNotifications/${playerId}`)
    const handler = onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const gifts: Array<{ id: string } & GiftNotification> = []
        snapshot.forEach((child) => {
          const data = child.val()
          if (data.type === 'gift_received') {
            gifts.push({ id: child.key!, ...data })
          }
        })
        callback(gifts.sort((a, b) => b.timestamp - a.timestamp))
      } else {
        callback([])
      }
    })
    return () => off(notifRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onGiftNotificationsUpdate failed:', err)
    callback([])
    return () => {}
  }
}

/**
 * Mark a gift notification as delivered.
 */
export async function markGiftDelivered(
  playerId: string,
  notificationId: string
): Promise<void> {
  try {
    const notifRef = ref(db, `userNotifications/${playerId}/${notificationId}`)
    await update(notifRef, { delivered: true })
  } catch (err) {
    console.warn('Firebase markGiftDelivered failed:', err)
  }
}

// ============================================================
// MATCHMAKING SYSTEM - Real-time player matching for battles
// ============================================================

export interface MatchmakingEntry {
  name: string
  avatar: string
  level: number
  joinedAt: number
  status: 'waiting' | 'matched'
  battleId?: string
}

export interface BattlePlayer {
  id: string
  name: string
  avatar: string
  level: number
  score: number
  finished: boolean
}

export interface FirebaseBattle {
  player1: BattlePlayer
  player2: BattlePlayer | null
  coinAmount: number
  timeLimit: number
  board: number[][] | null  // 4x4 grid of tile values (0 = empty)
  status: 'waiting' | 'playing' | 'finished'
  startedAt: number | null
  winnerId: string | null
}

// Join matchmaking queue at a specific coin amount
export async function joinMatchmaking(
  playerId: string,
  playerName: string,
  playerAvatar: string,
  coinAmount: number,
  level: number
): Promise<void> {
  try {
    const entry: MatchmakingEntry = {
      name: playerName,
      avatar: playerAvatar,
      level,
      joinedAt: Date.now(),
      status: 'waiting',
    }
    await set(ref(db, `matchmaking/${coinAmount}/${playerId}`), entry)
  } catch (err) {
    console.warn('Firebase joinMatchmaking failed:', err)
  }
}

// Leave matchmaking queue
export async function leaveMatchmaking(
  playerId: string,
  coinAmount: number
): Promise<void> {
  try {
    await set(ref(db, `matchmaking/${coinAmount}/${playerId}`), null)
  } catch (err) {
    console.warn('Firebase leaveMatchmaking failed:', err)
  }
}

// Find a waiting player in the matchmaking queue
export async function findMatch(
  coinAmount: number,
  excludePlayerId: string
): Promise<{ playerId: string; data: MatchmakingEntry } | null> {
  try {
    const queueRef = ref(db, `matchmaking/${coinAmount}`)
    const snapshot = await get(queueRef)
    if (!snapshot.exists()) return null

    const now = Date.now()
    const staleThreshold = 30000 // 30 seconds - remove stale entries

    let bestMatch: { playerId: string; data: MatchmakingEntry } | null = null

    snapshot.forEach((child) => {
      const data = child.val() as MatchmakingEntry
      const pid = child.key!

      // Skip self and already matched players
      if (pid === excludePlayerId) return
      if (data.status !== 'waiting') return

      // Skip stale entries (older than 15 seconds)
      if (now - data.joinedAt > staleThreshold) return

      // Take the first valid match (oldest waiting player = fairest)
      if (!bestMatch || data.joinedAt < bestMatch.data.joinedAt) {
        bestMatch = { playerId: pid, data }
      }
    })

    return bestMatch
  } catch (err) {
    console.warn('Firebase findMatch failed:', err)
    return null
  }
}

// Mark a player as matched in the queue
export async function markMatched(
  playerId: string,
  coinAmount: number,
  battleId: string
): Promise<void> {
  try {
    await update(ref(db, `matchmaking/${coinAmount}/${playerId}`), {
      status: 'matched',
      battleId,
    })
  } catch (err) {
    console.warn('Firebase markMatched failed:', err)
  }
}

// Listen for when this player gets matched (status changes to 'matched')
export function onMatchmakingUpdate(
  playerId: string,
  coinAmount: number,
  callback: (entry: MatchmakingEntry | null) => void
): () => void {
  try {
    const playerRef = ref(db, `matchmaking/${coinAmount}/${playerId}`)
    const handler = onValue(playerRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as MatchmakingEntry)
      } else {
        callback(null)
      }
    })
    return () => off(playerRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onMatchmakingUpdate failed:', err)
    callback(null)
    return () => {}
  }
}

// Clean up stale matchmaking entries (older than 15 seconds)
export async function cleanupStaleMatchmaking(coinAmount: number): Promise<void> {
  try {
    const queueRef = ref(db, `matchmaking/${coinAmount}`)
    const snapshot = await get(queueRef)
    if (!snapshot.exists()) return

    const now = Date.now()
    const staleThreshold = 30000

    const staleIds: string[] = []
    snapshot.forEach((child) => {
      const data = child.val() as MatchmakingEntry
      if (now - data.joinedAt > staleThreshold || data.status === 'matched') {
        staleIds.push(child.key!)
      }
    })

    for (const id of staleIds) {
      await set(ref(db, `matchmaking/${coinAmount}/${id}`), null)
    }
  } catch (err) {
    console.warn('Firebase cleanupStaleMatchmaking failed:', err)
  }
}

// ============================================================
// BATTLE SYSTEM - Real-time shared game state
// ============================================================

// Create a new battle
export async function createBattle(
  player1: { id: string; name: string; avatar: string; level: number },
  coinAmount: number,
  timeLimit: number,
  board: number[][]
): Promise<string> {
  try {
    const battleRef = push(ref(db, 'battles'))
    const battleId = battleRef.key!

    const battle: FirebaseBattle = {
      player1: {
        id: player1.id,
        name: player1.name,
        avatar: player1.avatar,
        level: player1.level,
        score: 0,
        finished: false,
      },
      player2: null,
      coinAmount,
      timeLimit,
      board,
      status: 'waiting',
      startedAt: null,
      winnerId: null,
    }

    await set(battleRef, battle)
    return battleId
  } catch (err) {
    console.warn('Firebase createBattle failed:', err)
    return ''
  }
}

// Join an existing battle as player2
export async function joinBattle(
  battleId: string,
  player2: { id: string; name: string; avatar: string; level: number }
): Promise<FirebaseBattle | null> {
  try {
    const battleRef = ref(db, `battles/${battleId}`)
    const snapshot = await get(battleRef)
    if (!snapshot.exists()) return null

    const battle = snapshot.val() as FirebaseBattle
    if (battle.status !== 'waiting') return null
    if (battle.player2 !== null) return null

    const updatedPlayer2: BattlePlayer = {
      id: player2.id,
      name: player2.name,
      avatar: player2.avatar,
      level: player2.level,
      score: 0,
      finished: false,
    }

    await update(battleRef, {
      player2: updatedPlayer2,
      status: 'playing',
      startedAt: Date.now(),
    })

    return { ...battle, player2: updatedPlayer2, status: 'playing', startedAt: Date.now() }
  } catch (err) {
    console.warn('Firebase joinBattle failed:', err)
    return null
  }
}

// Listen to battle state changes in real-time
export function onBattleUpdate(
  battleId: string,
  callback: (battle: FirebaseBattle | null) => void
): () => void {
  try {
    const battleRef = ref(db, `battles/${battleId}`)
    const handler = onValue(battleRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as FirebaseBattle)
      } else {
        callback(null)
      }
    })
    return () => off(battleRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onBattleUpdate failed:', err)
    callback(null)
    return () => {}
  }
}

// Update player's score in the battle
export async function updateBattleScore(
  battleId: string,
  playerField: 'player1' | 'player2',
  score: number,
  finished: boolean
): Promise<void> {
  try {
    const battleRef = ref(db, `battles/${battleId}`)
    await update(battleRef, {
      [`${playerField}.score`]: score,
      [`${playerField}.finished`]: finished,
    })
  } catch (err) {
    console.warn('Firebase updateBattleScore failed:', err)
  }
}

// Mark battle as finished with a winner
export async function finishBattle(
  battleId: string,
  winnerId: string
): Promise<void> {
  try {
    await update(ref(db, `battles/${battleId}`), {
      status: 'finished',
      winnerId,
    })
  } catch (err) {
    console.warn('Firebase finishBattle failed:', err)
  }
}

// Leave battle (disconnect handling)
export async function leaveBattle(
  battleId: string,
  playerField: 'player1' | 'player2',
  opponentField: 'player1' | 'player2'
): Promise<void> {
  try {
    const battleRef = ref(db, `battles/${battleId}`)
    const snapshot = await get(battleRef)
    if (!snapshot.exists()) return

    const battle = snapshot.val() as FirebaseBattle
    if (battle.status === 'finished') return

    // The opponent wins by default
    const winnerId = battle[opponentField]?.id || ''
    await update(battleRef, {
      status: 'finished',
      winnerId,
      [`${playerField}.finished`]: true,
    })
  } catch (err) {
    console.warn('Firebase leaveBattle failed:', err)
  }
}

// Get battle by ID
export async function getBattle(battleId: string): Promise<FirebaseBattle | null> {
  try {
    const snapshot = await get(ref(db, `battles/${battleId}`))
    if (snapshot.exists()) {
      return snapshot.val() as FirebaseBattle
    }
    return null
  } catch (err) {
    console.warn('Firebase getBattle failed:', err)
    return null
  }
}

// ============================================================
// ORDER SYSTEM - Store orders synced via Firebase
// ============================================================

export interface FirebaseStoreOrder {
  id: string
  date: string
  playerId: string
  playerName: string
  userCode: string
  items: Array<{ name: string; quantity: number; price: number }>
  totalAmount: number
  discountCoupon: string
  discountAmount: number
  finalAmount: number
  whatsappNumber: string
  name: string
  transactionId: string
  utrNumber: string
  proofBase64?: string
  status: 'pending' | 'approved' | 'rejected'
  upiId: string
  createdAt: number
  approvedAt: number | null
  paymentType?: 'inr' | 'coins'  // Distinguish between INR and coin purchases
}

// Place a new order in Firebase
export async function placeOrder(order: Omit<FirebaseStoreOrder, 'createdAt' | 'approvedAt'>): Promise<void> {
  try {
    const orderRef = ref(db, `orders/${order.id}`)
    await set(orderRef, {
      ...order,
      createdAt: Date.now(),
      approvedAt: null,
    })

    // For coin purchases, auto-deliver items immediately
    if (order.paymentType === 'coins') {
      const deliveryItems = parseOrderItemsForDelivery(order.items)
      if (order.playerId) {
        await deliverOrderItems(order.id, order.playerId, deliveryItems)
        // Auto-approve coin purchases
        await update(orderRef, {
          status: 'approved',
          approvedAt: Date.now(),
        })
      }
    }
    // For INR purchases, items go to admin panel for approval (status stays 'pending')
  } catch (err) {
    console.warn('Firebase placeOrder failed:', err)
  }
}

// Helper: Parse order items into delivery format
function parseOrderItemsForDelivery(items: Array<{ name: string; quantity: number; price: number }>): {
  coins?: number
  abilities?: Array<{ type: string; count: number }>
  roomCards?: number
  spinTickets?: number
} {
  const deliveryItems: {
    coins?: number
    abilities?: Array<{ type: string; count: number }>
    roomCards?: number
    spinTickets?: number
  } = {}

  if (!items || !Array.isArray(items)) return deliveryItems

  for (const item of items) {
    // Add coins
    if (item.name?.includes('Coins') || item.name?.includes('💰')) {
      const coinMatch = item.name.match(/[\d,]+/)
      if (coinMatch) {
        const coins = parseInt(coinMatch[0].replace(/,/g, ''))
        if (coins > 0) {
          deliveryItems.coins = (deliveryItems.coins || 0) + coins
        }
      }
    }
    // Add abilities based on name
    if (item.name?.includes('Hammer') || item.name?.includes('🔨')) {
      if (!deliveryItems.abilities) deliveryItems.abilities = []
      deliveryItems.abilities.push({ type: 'hammer', count: (item.quantity || 1) * 5 })
    }
    if (item.name?.includes('Magnet') || item.name?.includes('🧲')) {
      if (!deliveryItems.abilities) deliveryItems.abilities = []
      deliveryItems.abilities.push({ type: 'magnet', count: (item.quantity || 1) * 5 })
    }
    if (item.name?.includes('Bomb') || item.name?.includes('💣') || item.name?.includes('Blast')) {
      if (!deliveryItems.abilities) deliveryItems.abilities = []
      deliveryItems.abilities.push({ type: 'blast', count: (item.quantity || 1) * 5 })
    }
    if (item.name?.includes('5x') || item.name?.includes('⚡')) {
      if (!deliveryItems.abilities) deliveryItems.abilities = []
      deliveryItems.abilities.push({ type: 'multiplier5x', count: (item.quantity || 1) * 5 })
    }
    if (item.name?.includes('2.5x') || item.name?.includes('🔥')) {
      if (!deliveryItems.abilities) deliveryItems.abilities = []
      deliveryItems.abilities.push({ type: 'multiplier2_5x', count: (item.quantity || 1) * 5 })
    }
    if (item.name?.includes('Timer') || item.name?.includes('⏱️')) {
      if (!deliveryItems.abilities) deliveryItems.abilities = []
      deliveryItems.abilities.push({ type: 'extraTime', count: (item.quantity || 1) * 5 })
    }
    if (item.name?.includes('Room') || item.name?.includes('🃏')) {
      deliveryItems.roomCards = (deliveryItems.roomCards || 0) + (item.quantity || 1)
    }
    if (item.name?.includes('Spin') || item.name?.includes('🎫')) {
      deliveryItems.spinTickets = (deliveryItems.spinTickets || 0) + (item.quantity || 1)
    }
  }

  return deliveryItems
}

// Listen for all orders (for admin panel)
export function onOrdersUpdate(callback: (orders: FirebaseStoreOrder[]) => void): () => void {
  try {
    const ordersRef = ref(db, 'orders')
    const handler = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const orders: FirebaseStoreOrder[] = []
        snapshot.forEach((child) => {
          const raw = child.val()
          // Ensure items array is always valid (prevent undefined.map crash)
          const safeOrder = {
            id: child.key!,
            ...raw,
            items: Array.isArray(raw?.items) ? raw.items : [],
          }
          orders.push(safeOrder as FirebaseStoreOrder)
        })
        callback(orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
      } else {
        callback([])
      }
    })
    return () => off(ordersRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onOrdersUpdate failed:', err)
    callback([])
    return () => {}
  }
}

// Update order status (approve/reject) - ONLY updates status and notifies on rejection.
// Item delivery is handled separately by the admin panel via deliverOrderItems() to avoid
// double delivery. Previously, this function also called deliverOrderItems() internally,
// which caused items to be delivered twice when the admin panel also called it explicitly.
// Note: This is primarily for INR purchases that need admin approval.
// Coin purchases are auto-approved in placeOrder().
export async function updateOrderStatus(orderId: string, status: 'approved' | 'rejected'): Promise<void> {
  try {
    const orderRef = ref(db, `orders/${orderId}`)
    const updates: Record<string, unknown> = { status }
    if (status === 'approved') {
      updates.approvedAt = Date.now()
    }
    await update(orderRef, updates)

    // If rejected, notify user
    if (status === 'rejected') {
      const orderSnapshot = await get(orderRef)
      if (orderSnapshot.exists()) {
        const order = orderSnapshot.val()
        if (order.playerId) {
          const notifRef = push(ref(db, `userNotifications/${order.playerId}`))
          await set(notifRef, {
            type: 'order_rejected',
            orderId,
            message: `Your payment was not verified. Order cancelled.`,
            deliveredAt: Date.now(),
            delivered: false,
          })
        }
      }
    }
  } catch (err) {
    console.warn('Firebase updateOrderStatus failed:', err)
  }
}

// Get orders for a specific user
export function onUserOrdersUpdate(playerId: string, callback: (orders: FirebaseStoreOrder[]) => void): () => void {
  try {
    const ordersRef = ref(db, 'orders')
    const handler = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const orders: FirebaseStoreOrder[] = []
        snapshot.forEach((child) => {
          const raw = child.val()
          if (raw.playerId === playerId) {
            const safeOrder = {
              id: child.key!,
              ...raw,
              items: Array.isArray(raw?.items) ? raw.items : [],
            }
            orders.push(safeOrder as FirebaseStoreOrder)
          }
        })
        callback(orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
      } else {
        callback([])
      }
    })
    return () => off(ordersRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onUserOrdersUpdate failed:', err)
    callback([])
    return () => {}
  }
}

// Deliver items to user after approval - creates a notification in Firebase
export async function deliverOrderItems(
  orderId: string,
  playerId: string,
  items: {
    coins?: number
    abilities?: Array<{ type: string; count: number }>
    roomCards?: number
    spinTickets?: number
  }
): Promise<void> {
  try {
    const notifRef = push(ref(db, `userNotifications/${playerId}`))
    await set(notifRef, {
      type: 'order_delivery',
      orderId,
      items,
      deliveredAt: Date.now(),
      delivered: false, // will be marked true after user's client processes it
    })
  } catch (err) {
    console.warn('Firebase deliverOrderItems failed:', err)
  }
}

// Listen for user item delivery notifications
export function onUserNotificationsUpdate(
  playerId: string,
  callback: (notifications: Array<{ id: string; type: string; orderId?: string; items?: any; deliveredAt: number; delivered: boolean }>) => void
): () => void {
  try {
    const notifRef = ref(db, `userNotifications/${playerId}`)
    const handler = onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const notifs: Array<{ id: string; type: string; orderId?: string; items?: any; deliveredAt: number; delivered: boolean }> = []
        snapshot.forEach((child) => {
          notifs.push({ id: child.key!, ...child.val() })
        })
        callback(notifs.sort((a, b) => b.deliveredAt - a.deliveredAt))
      } else {
        callback([])
      }
    })
    return () => off(notifRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onUserNotificationsUpdate failed:', err)
    callback([])
    return () => {}
  }
}

// Mark a user notification as delivered
export async function markNotificationDelivered(playerId: string, notifId: string): Promise<void> {
  try {
    await update(ref(db, `userNotifications/${playerId}/${notifId}`), { delivered: true })
  } catch (err) {
    console.warn('Firebase markNotificationDelivered failed:', err)
  }
}

// ============================================================
// BROADCAST SYSTEM - Real-time coupon & daily task delivery
// ============================================================

// Broadcast a coupon to all users via Firebase
export async function broadcastCoupon(coupon: {
  code: string
  reward: string
  rewardType: string
  rewardAmount: number
  emoji: string
  maxUses: number
}): Promise<void> {
  try {
    const broadcastRef = push(ref(db, 'broadcasts/coupons'))
    await set(broadcastRef, {
      ...coupon,
      sentAt: Date.now(),
    })
  } catch (err) {
    console.warn('Firebase broadcastCoupon failed:', err)
  }
}

// Listen for coupon broadcasts in real-time
export function onCouponBroadcast(
  callback: (coupons: Array<{ id: string; code: string; reward: string; rewardType: string; rewardAmount: number; emoji: string; maxUses: number; sentAt: number }>) => void
): () => void {
  try {
    const broadcastRef = ref(db, 'broadcasts/coupons')
    const handler = onValue(broadcastRef, (snapshot) => {
      if (snapshot.exists()) {
        const coupons: Array<{ id: string; code: string; reward: string; rewardType: string; rewardAmount: number; emoji: string; maxUses: number; sentAt: number }> = []
        snapshot.forEach((child) => {
          coupons.push({ id: child.key!, ...child.val() })
        })
        callback(coupons.sort((a, b) => b.sentAt - a.sentAt))
      } else {
        callback([])
      }
    })
    return () => off(broadcastRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onCouponBroadcast failed:', err)
    callback([])
    return () => {}
  }
}

// Broadcast a daily task to all users via Firebase
export async function broadcastDailyTask(task: {
  name: string
  description: string
  action: string
  requiredCount: number
  rewardType: string
  rewardAmount: number
}): Promise<void> {
  try {
    const taskRef = push(ref(db, 'broadcasts/dailyTasks'))
    await set(taskRef, {
      ...task,
      active: true,
      createdAt: Date.now(),
    })
  } catch (err) {
    console.warn('Firebase broadcastDailyTask failed:', err)
  }
}

// Listen for daily task broadcasts in real-time
export function onDailyTaskBroadcast(
  callback: (tasks: any[]) => void
): () => void {
  try {
    const taskRef = ref(db, 'broadcasts/dailyTasks')
    const handler = onValue(taskRef, (snapshot) => {
      if (snapshot.exists()) {
        const tasks: any[] = []
        snapshot.forEach((child) => {
          tasks.push({ id: child.key!, ...child.val() })
        })
        callback(tasks.sort((a, b) => b.createdAt - a.createdAt))
      } else {
        callback([])
      }
    })
    return () => off(taskRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onDailyTaskBroadcast failed:', err)
    callback([])
    return () => {}
  }
}

// ============================================================
// ADMIN CONFIG - Configurable admin password, partner passwords
// ============================================================

export interface PartnerData {
  name: string
  password: string
  permissions: string[] // view_orders, approve_orders, manage_coupons, manage_prices, view_users, ban_users
  createdAt: number
  active: boolean
}

// Get the admin password from Firebase (default: "ADMIN.IN")
export async function getAdminPassword(): Promise<string> {
  try {
    const ref_ = ref(db, 'adminConfig/adminPassword')
    const snapshot = await get(ref_)
    if (snapshot.exists()) {
      return snapshot.val()
    }
    // Set default if not exists
    await set(ref_, 'ADMIN.IN')
    return 'ADMIN.IN'
  } catch (err) {
    console.warn('Firebase getAdminPassword failed:', err)
    return 'ADMIN.IN'
  }
}

// Change the admin password
export async function setAdminPassword(newPassword: string): Promise<void> {
  try {
    await set(ref(db, 'adminConfig/adminPassword'), newPassword)
  } catch (err) {
    console.warn('Firebase setAdminPassword failed:', err)
  }
}

// Check admin password (for login) - with timeout fallback
export async function checkAdminPassword(password: string): Promise<boolean> {
  try {
    // Always allow default admin code as hardcoded fallback
    // This ensures admin can ALWAYS access the panel even if Firebase is down
    if (password === 'ADMIN.IN') return true

    // Try Firebase with a 5-second timeout
    const adminPwdPromise = getAdminPassword()
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    )
    const adminPwd = await Promise.race([adminPwdPromise, timeoutPromise]).catch(() => 'ADMIN.IN')
    return password === adminPwd
  } catch (err) {
    console.warn('Firebase checkAdminPassword failed:', err)
    // Fallback: allow default password if Firebase fails
    return password === 'ADMIN.IN'
  }
}

// ============================================================
// ADMIN CONFIG SYNC - Save admin settings to Firebase for cross-device sync
// ============================================================

export async function syncAdminConfigToFirebase(configKey: string, configData: unknown): Promise<void> {
  try {
    const configRef = ref(db, `adminConfig/${configKey}`)
    await set(configRef, configData)
  } catch (err) {
    console.warn(`Firebase syncAdminConfigToFirebase(${configKey}) failed:`, err)
  }
}

export async function getAdminConfigFromFirebase(configKey: string): Promise<unknown> {
  try {
    const configRef = ref(db, `adminConfig/${configKey}`)
    const snapshot = await get(configRef)
    if (snapshot.exists()) {
      return snapshot.val()
    }
    return null
  } catch (err) {
    console.warn(`Firebase getAdminConfigFromFirebase(${configKey}) failed:`, err)
    return null
  }
}

// Listen for admin config changes in real-time
export function onAdminConfigUpdate(
  configKey: string,
  callback: (data: unknown) => void
): () => void {
  try {
    const configRef = ref(db, `adminConfig/${configKey}`)
    const handler = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val())
      } else {
        callback(null)
      }
    })
    return () => off(configRef, 'value', handler)
  } catch (err) {
    console.warn(`Firebase onAdminConfigUpdate(${configKey}) failed:`, err)
    callback(null)
    return () => {}
  }
}

// Get all partners (stored at partners/{partnerId})
export async function getPartners(): Promise<Array<{ id: string } & PartnerData>> {
  try {
    const ref_ = ref(db, 'partners')
    const snapshot = await get(ref_)
    if (snapshot.exists()) {
      const partners: Array<{ id: string } & PartnerData> = []
      snapshot.forEach((child) => {
        partners.push({ id: child.key!, ...child.val() })
      })
      return partners.sort((a, b) => b.createdAt - a.createdAt)
    }
    return []
  } catch (err) {
    console.warn('Firebase getPartners failed:', err)
    return []
  }
}

// Create or update a partner (stored at partners/{partnerId})
export async function savePartner(partnerId: string, data: PartnerData): Promise<void> {
  try {
    await set(ref(db, `partners/${partnerId}`), data)
  } catch (err) {
    console.warn('Firebase savePartner failed:', err)
  }
}

// Delete a partner
export async function deletePartner(partnerId: string): Promise<void> {
  try {
    await set(ref(db, `partners/${partnerId}`), null)
  } catch (err) {
    console.warn('Firebase deletePartner failed:', err)
  }
}

// Authenticate as a partner (check password)
export async function authenticatePartner(password: string): Promise<{ id: string; data: PartnerData } | null> {
  try {
    const ref_ = ref(db, 'partners')
    const snapshot = await get(ref_)
    if (snapshot.exists()) {
      let found: { id: string; data: PartnerData } | null = null
      snapshot.forEach((child) => {
        const data = child.val() as Omit<PartnerData, never> & Record<string, unknown>
        const partnerData: PartnerData = {
          name: data.name as string,
          password: data.password as string,
          permissions: data.permissions as string[],
          createdAt: data.createdAt as number,
          active: data.active as boolean,
        }
        if (partnerData.password === password && partnerData.active) {
          found = { id: child.key as string, data: partnerData }
        }
      })
      return found
    }
    return null
  } catch (err) {
    console.warn('Firebase authenticatePartner failed:', err)
    return null
  }
}

// ============================================================
// LIKE SYSTEM - Firebase real-time sync
// One like per user: a user can only like one profile at a time.
// If they like a new profile, their previous like is removed.
// ============================================================

/**
 * Find which player the given user has currently liked.
 * Returns the player ID of the liked profile, or null if none.
 */
async function getCurrentLikedPlayer(fromPlayerId: string): Promise<string | null> {
  try {
    const userLikeRef = ref(db, `userLikes/${fromPlayerId}`)
    const snapshot = await get(userLikeRef)
    if (snapshot.exists()) {
      return snapshot.val().toPlayerId || null
    }
    return null
  } catch (err) {
    console.warn('Firebase getCurrentLikedPlayer failed:', err)
    return null
  }
}

// Add a like from one player to another (enforces one-like-per-user)
export async function addLike(
  fromPlayerId: string,
  toPlayerId: string
): Promise<void> {
  try {
    // Don't allow self-like
    if (fromPlayerId === toPlayerId) return

    // Check if this user already liked someone else
    const currentLikedId = await getCurrentLikedPlayer(fromPlayerId)

    // If they already liked this same player, do nothing
    if (currentLikedId === toPlayerId) return

    // If they liked a different player, remove the old like first
    if (currentLikedId) {
      await removeLike(fromPlayerId, currentLikedId)
    }

    // Set the like in the likes collection
    await set(ref(db, `likes/${toPlayerId}/${fromPlayerId}`), {
      timestamp: Date.now()
    })

    // Track which player this user has liked (for one-like enforcement)
    await set(ref(db, `userLikes/${fromPlayerId}`), {
      toPlayerId: toPlayerId,
      timestamp: Date.now()
    })

    // Increment the like count on the target player
    const playerRef = ref(db, `players/${toPlayerId}`)
    const snapshot = await get(playerRef)
    if (snapshot.exists()) {
      const currentLikes = snapshot.val().likes || 0
      await update(playerRef, { likes: currentLikes + 1 })
    }
  } catch (err) {
    console.warn('Firebase addLike failed:', err)
  }
}

// Remove a like
export async function removeLike(
  fromPlayerId: string,
  toPlayerId: string
): Promise<void> {
  try {
    // Remove the like entry
    await set(ref(db, `likes/${toPlayerId}/${fromPlayerId}`), null)

    // Clear the user's current like tracking
    await set(ref(db, `userLikes/${fromPlayerId}`), null)

    // Decrement the like count on the target player
    const playerRef = ref(db, `players/${toPlayerId}`)
    const snapshot = await get(playerRef)
    if (snapshot.exists()) {
      const currentLikes = snapshot.val().likes || 0
      await update(playerRef, { likes: Math.max(0, currentLikes - 1) })
    }
  } catch (err) {
    console.warn('Firebase removeLike failed:', err)
  }
}

/**
 * Transfer a like from one player to another atomically.
 * Removes the previous like (if any) and adds a new one.
 * This is the recommended way to "move" a like between profiles.
 */
export async function transferLike(
  fromPlayerId: string,
  toPlayerId: string
): Promise<void> {
  try {
    // Don't allow self-like
    if (fromPlayerId === toPlayerId) return

    // Check current like
    const currentLikedId = await getCurrentLikedPlayer(fromPlayerId)

    // If already liking this player, nothing to do
    if (currentLikedId === toPlayerId) return

    // If liking someone else, remove old like and add new one
    if (currentLikedId) {
      // Remove old like
      await set(ref(db, `likes/${currentLikedId}/${fromPlayerId}`), null)

      // Decrement old player's like count
      const oldPlayerRef = ref(db, `players/${currentLikedId}`)
      const oldSnapshot = await get(oldPlayerRef)
      if (oldSnapshot.exists()) {
        const oldLikes = oldSnapshot.val().likes || 0
        await update(oldPlayerRef, { likes: Math.max(0, oldLikes - 1) })
      }
    }

    // Add new like
    await set(ref(db, `likes/${toPlayerId}/${fromPlayerId}`), {
      timestamp: Date.now()
    })

    // Update user's like tracking
    await set(ref(db, `userLikes/${fromPlayerId}`), {
      toPlayerId: toPlayerId,
      timestamp: Date.now()
    })

    // Increment new player's like count
    const newPlayerRef = ref(db, `players/${toPlayerId}`)
    const newSnapshot = await get(newPlayerRef)
    if (newSnapshot.exists()) {
      const newLikes = newSnapshot.val().likes || 0
      await update(newPlayerRef, { likes: newLikes + 1 })
    }
  } catch (err) {
    console.warn('Firebase transferLike failed:', err)
  }
}

// Listen to a player's like count in real-time
export function onLikeCountUpdate(
  playerId: string,
  callback: (count: number) => void
): () => void {
  try {
    const likeRef = ref(db, `players/${playerId}/likes`)
    const handler = onValue(likeRef, (snapshot) => {
      callback(snapshot.exists() ? (snapshot.val() || 0) : 0)
    })
    return () => off(likeRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onLikeCountUpdate failed:', err)
    callback(0)
    return () => {}
  }
}

// Check if a viewer (fromPlayerId) has liked the target (toPlayerId)
export async function hasLiked(
  fromPlayerId: string,
  toPlayerId: string
): Promise<boolean> {
  try {
    const likeRef = ref(db, `likes/${toPlayerId}/${fromPlayerId}`)
    const snapshot = await get(likeRef)
    return snapshot.exists()
  } catch (err) {
    console.warn('Firebase hasLiked failed:', err)
    return false
  }
}

// Listen to likes count for a player in real-time
export function onLikesUpdate(
  playerId: string,
  callback: (count: number) => void
): () => void {
  try {
    const likesRef = ref(db, `players/${playerId}/likes`)
    const handler = onValue(likesRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : 0)
    })
    return () => off(likesRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onLikesUpdate failed:', err)
    callback(0)
    return () => {}
  }
}

// ============================================================
// ROOM SYSTEM - Firebase support for 2-4 player rooms
// ============================================================

export interface FirebaseRoomOpponent {
  id: string
  name: string
  avatar: string
  level: number
  userCode: string
  status: 'pending' | 'accepted' | 'declined'
}

export interface FirebaseRoom {
  id: string
  code: string
  creatorId: string
  creatorName: string
  creatorAvatar: string
  creatorLevel: number
  creatorUserCode: string
  password?: string
  opponentIds: FirebaseRoomOpponent[]
  coinAmount: number
  timeLimit: number
  mode: 'coin' | 'time'
  abilities: string[]
  status: 'waiting' | 'ready' | 'playing' | 'finished'
  createdAt: number
  winnerId: string | null
  taxAmount: number
  playerCount: number
}

// Create a new room using a 6-digit code as the key
export async function createRoomWithCode(roomData: {
  code: string
  creatorId: string
  creatorName: string
  creatorAvatar: string
  creatorLevel: number
  creatorUserCode: string
  password?: string
  coinAmount: number
  timeLimit: number
  mode: 'coin' | 'time'
  abilities: string[]
  opponentIds: FirebaseRoomOpponent[]
  taxAmount: number
  playerCount: number
}): Promise<string> {
  try {
    const roomRef = ref(db, `rooms/${roomData.code}`)

    const room: FirebaseRoom = {
      id: roomData.code,
      code: roomData.code,
      creatorId: roomData.creatorId,
      creatorName: roomData.creatorName,
      creatorAvatar: roomData.creatorAvatar,
      creatorLevel: roomData.creatorLevel,
      creatorUserCode: roomData.creatorUserCode,
      password: roomData.password || '',
      opponentIds: roomData.opponentIds,
      coinAmount: roomData.coinAmount,
      timeLimit: roomData.timeLimit,
      mode: roomData.mode,
      abilities: roomData.abilities,
      status: 'waiting',
      createdAt: Date.now(),
      winnerId: null,
      taxAmount: roomData.taxAmount,
      playerCount: roomData.playerCount,
    }

    await set(roomRef, room)
    return roomData.code
  } catch (err) {
    console.warn('Firebase createRoomWithCode failed:', err)
    return ''
  }
}

// Create a new room (legacy push-based, kept for compatibility)
export async function createRoom(roomData: {
  creatorId: string
  creatorName: string
  creatorAvatar: string
  creatorLevel: number
  creatorUserCode: string
  coinAmount: number
  timeLimit: number
  mode: 'coin' | 'time'
  abilities: string[]
  opponentIds: FirebaseRoomOpponent[]
  taxAmount: number
}): Promise<string> {
  try {
    const roomRef = push(ref(db, 'rooms'))
    const roomId = roomRef.key!

    const room: FirebaseRoom = {
      id: roomId,
      code: roomId,
      creatorId: roomData.creatorId,
      creatorName: roomData.creatorName,
      creatorAvatar: roomData.creatorAvatar,
      creatorLevel: roomData.creatorLevel,
      creatorUserCode: roomData.creatorUserCode,
      opponentIds: roomData.opponentIds,
      coinAmount: roomData.coinAmount,
      timeLimit: roomData.timeLimit,
      mode: roomData.mode,
      abilities: roomData.abilities,
      status: 'waiting',
      createdAt: Date.now(),
      winnerId: null,
      taxAmount: roomData.taxAmount,
      playerCount: 2,
    }

    await set(roomRef, room)
    return roomId
  } catch (err) {
    console.warn('Firebase createRoom failed:', err)
    return ''
  }
}

// Join a room by code - adds the player as an opponent instantly (no invite needed)
export async function joinRoomByCode(
  code: string,
  player: { id: string; name: string; avatar: string; level: number; userCode: string },
  password?: string
): Promise<{ success: boolean; reason?: string; room?: FirebaseRoom }> {
  try {
    const roomRef = ref(db, `rooms/${code}`)
    const snapshot = await get(roomRef)
    if (!snapshot.exists()) {
      return { success: false, reason: 'Room not found' }
    }

    const room = snapshot.val() as FirebaseRoom
    if (room.status !== 'waiting' && room.status !== 'ready') {
      return { success: false, reason: 'Room is no longer available' }
    }

    // Check password if the room has one
    if (room.password && room.password !== password) {
      return { success: false, reason: 'Incorrect password' }
    }

    // Don't allow the creator to join their own room
    if (room.creatorId === player.id) {
      return { success: false, reason: 'You cannot join your own room' }
    }

    // Check if already joined
    const alreadyJoined = (room.opponentIds || []).find(o => o.id === player.id)
    if (alreadyJoined && alreadyJoined.status === 'accepted') {
      return { success: false, reason: 'You have already joined this room' }
    }

    // Check if room is full
    const acceptedOpponents = (room.opponentIds || []).filter(o => o.status === 'accepted')
    const maxOpponents = (room.playerCount || 2) - 1
    if (acceptedOpponents.length >= maxOpponents) {
      return { success: false, reason: 'Room is full' }
    }

    // Add the player as an opponent with 'accepted' status (instant, no accept step)
    const newOpponent: FirebaseRoomOpponent = {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      level: player.level,
      userCode: player.userCode,
      status: 'accepted',
    }

    // Remove any previous pending/declined entry for this player, then add
    let updatedOpponents = (room.opponentIds || []).filter(o => o.id !== player.id)
    updatedOpponents = [...updatedOpponents, newOpponent]

    // Check if we have enough opponents to be ready
    const allAcceptedCount = updatedOpponents.filter(o => o.status === 'accepted').length
    const newStatus = allAcceptedCount >= maxOpponents ? 'ready' as const : 'waiting' as const

    await update(roomRef, {
      opponentIds: updatedOpponents,
      status: newStatus,
    })

    return { success: true, room: { ...room, opponentIds: updatedOpponents, status: newStatus } }
  } catch (err) {
    console.warn('Firebase joinRoomByCode failed:', err)
    return { success: false, reason: 'Network error' }
  }
}

// Join a room as an opponent (accept invitation) - legacy
export async function joinRoom(
  roomId: string,
  playerId: string
): Promise<{ success: boolean; reason?: string }> {
  try {
    const roomRef = ref(db, `rooms/${roomId}`)
    const snapshot = await get(roomRef)
    if (!snapshot.exists()) {
      return { success: false, reason: 'Room not found' }
    }

    const room = snapshot.val() as FirebaseRoom
    if (room.status !== 'waiting' && room.status !== 'ready') {
      return { success: false, reason: 'Room is no longer waiting' }
    }

    // Check if player is in the opponent list
    const opponentIndex = room.opponentIds?.findIndex(o => o.id === playerId) ?? -1
    if (opponentIndex === -1) {
      return { success: false, reason: 'You are not invited to this room' }
    }

    // Update opponent status to accepted
    const updatedOpponents = [...(room.opponentIds || [])]
    updatedOpponents[opponentIndex] = {
      ...updatedOpponents[opponentIndex],
      status: 'accepted' as const,
    }

    // Check if all opponents have accepted (room can start)
    const maxOpponents = (room.playerCount || 2) - 1
    const allAccepted = updatedOpponents.filter(o => o.status === 'accepted').length >= maxOpponents
    const newStatus = allAccepted ? 'ready' as const : 'waiting' as const

    await update(roomRef, {
      opponentIds: updatedOpponents,
      status: newStatus,
    })

    return { success: true }
  } catch (err) {
    console.warn('Firebase joinRoom failed:', err)
    return { success: false, reason: 'Network error' }
  }
}

// Listen to room state changes in real-time
export function onRoomUpdate(
  roomId: string,
  callback: (room: FirebaseRoom | null) => void
): () => void {
  try {
    const roomRef = ref(db, `rooms/${roomId}`)
    const handler = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as FirebaseRoom)
      } else {
        callback(null)
      }
    })
    return () => off(roomRef, 'value', handler)
  } catch (err) {
    console.warn('Firebase onRoomUpdate failed:', err)
    callback(null)
    return () => {}
  }
}

// Update room status
export async function updateRoomStatus(
  roomId: string,
  status: 'waiting' | 'playing' | 'finished',
  winnerId?: string
): Promise<void> {
  try {
    const updates: Record<string, unknown> = { status }
    if (winnerId) {
      updates.winnerId = winnerId
    }
    await update(ref(db, `rooms/${roomId}`), updates)
  } catch (err) {
    console.warn('Firebase updateRoomStatus failed:', err)
  }
}

// Leave a room (decline invitation or leave during waiting)
export async function leaveRoom(
  roomId: string,
  playerId: string
): Promise<void> {
  try {
    const roomRef = ref(db, `rooms/${roomId}`)
    const snapshot = await get(roomRef)
    if (!snapshot.exists()) return

    const room = snapshot.val() as FirebaseRoom

    // If the creator leaves, delete the room
    if (room.creatorId === playerId) {
      await set(roomRef, null)
      return
    }

    // If an opponent leaves, mark them as declined
    const updatedOpponents = (room.opponentIds || []).map(o => {
      if (o.id === playerId) {
        return { ...o, status: 'declined' as const }
      }
      return o
    })

    await update(roomRef, { opponentIds: updatedOpponents })
  } catch (err) {
    console.warn('Firebase leaveRoom failed:', err)
  }
}

// Get room by ID
export async function getRoom(roomId: string): Promise<FirebaseRoom | null> {
  try {
    const snapshot = await get(ref(db, `rooms/${roomId}`))
    if (snapshot.exists()) {
      return snapshot.val() as FirebaseRoom
    }
    return null
  } catch (err) {
    console.warn('Firebase getRoom failed:', err)
    return null
  }
}
