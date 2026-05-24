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
  coins: number
  totalCoinsEarned: number
  winningCoins: number
  level: number
  totalBattlesPlayed: number
  totalBattlesWon: number
}): Promise<void> {
  try {
    const playerRef = ref(db, `players/${playerData.id}`)
    await update(playerRef, {
      ...playerData,
      lastActive: Date.now(),
    })
    // Also store the invite code mapping
    const inviteRef = ref(db, `invites/${playerData.inviteCode}`)
    await set(inviteRef, {
      referrerId: playerData.id,
      referrerName: playerData.name,
    })
    // Also store userCode mapping for UID search
    if (playerData.userCode) {
      const userCodeRef = ref(db, `userCodes/${playerData.userCode}`)
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
      return snapshot.numChildren()
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
  } catch (err) {
    console.warn('Firebase placeOrder failed:', err)
  }
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

// Update order status (approve/reject) - auto-delivers items on approval, notifies on rejection
export async function updateOrderStatus(orderId: string, status: 'approved' | 'rejected'): Promise<void> {
  try {
    const orderRef = ref(db, `orders/${orderId}`)
    const updates: Record<string, unknown> = { status }
    if (status === 'approved') {
      updates.approvedAt = Date.now()
    }
    await update(orderRef, updates)

    // If approved, auto-deliver items and notify user
    if (status === 'approved') {
      const orderSnapshot = await get(orderRef)
      if (orderSnapshot.exists()) {
        const order = orderSnapshot.val()
        // Parse items from the order and deliver them
        const deliveryItems: {
          coins?: number
          abilities?: Array<{ type: string; count: number }>
          roomCards?: number
          spinTickets?: number
        } = {}

        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
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
        }

        // Deliver items via the existing delivery system
        if (order.playerId) {
          await deliverOrderItems(orderId, order.playerId, deliveryItems)
        }
      }
    }

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
  lastUsedAt: number | null
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

// Get all partners
export async function getPartners(): Promise<Array<{ id: string } & PartnerData>> {
  try {
    const ref_ = ref(db, 'adminConfig/partners')
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

// Create or update a partner
export async function savePartner(partnerId: string, data: PartnerData): Promise<void> {
  try {
    await set(ref(db, `adminConfig/partners/${partnerId}`), data)
  } catch (err) {
    console.warn('Firebase savePartner failed:', err)
  }
}

// Delete a partner
export async function deletePartner(partnerId: string): Promise<void> {
  try {
    await set(ref(db, `adminConfig/partners/${partnerId}`), null)
  } catch (err) {
    console.warn('Firebase deletePartner failed:', err)
  }
}

// Authenticate as a partner (check password)
export async function authenticatePartner(password: string): Promise<{ id: string; data: PartnerData } | null> {
  try {
    const ref_ = ref(db, 'adminConfig/partners')
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
          lastUsedAt: data.lastUsedAt as number | null,
          active: data.active as boolean,
        }
        if (partnerData.password === password && partnerData.active) {
          found = { id: child.key as string, data: partnerData }
        }
      })
      // Update lastUsedAt if found
      if (found) {
        await update(ref(db, `adminConfig/partners/${found.id}`), { lastUsedAt: Date.now() })
      }
      return found
    }
    return null
  } catch (err) {
    console.warn('Firebase authenticatePartner failed:', err)
    return null
  }
}

// Check admin password (for login)
export async function checkAdminPassword(password: string): Promise<boolean> {
  try {
    const adminPwd = await getAdminPassword()
    return password === adminPwd
  } catch (err) {
    console.warn('Firebase checkAdminPassword failed:', err)
    return false
  }
}

// ============================================================
// LIKE SYSTEM - Firebase real-time sync
// ============================================================

// Add a like from one player to another
export async function addLike(
  fromPlayerId: string,
  toPlayerId: string
): Promise<void> {
  try {
    // Set the like in the likes collection (prevents duplicate likes)
    await set(ref(db, `likes/${toPlayerId}/${fromPlayerId}`), {
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
    await set(ref(db, `likes/${toPlayerId}/${fromPlayerId}`), null)
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

// Check if a player has liked another player
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
