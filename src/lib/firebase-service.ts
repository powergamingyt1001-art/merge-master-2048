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
  tournamentPoints: number
  levelXP: number
  bestScore: number
  coins: number
  level: number
  lastActive: number
  joinedAt: number
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
  tournamentPoints: number
  levelXP: number
  bestScore: number
  coins: number
  level: number
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
// COMMISSION SYSTEM - When invitee earns, referrer gets 5%
// ============================================================

// Call this when a player earns tournament points or coins
// It will calculate and add 5% commission to the referrer
export async function processCommissionForReferrer(
  playerId: string,
  amountEarned: number
): Promise<void> {
  try {
    // Find who invited this player
    const invitedByRef = ref(db, `invitedBy/${playerId}`)
    const snapshot = await get(invitedByRef)
    if (!snapshot.exists()) return

    const referrerId = snapshot.val()
    const commissionAmount = Math.floor(amountEarned * 0.05) // 5% commission

    if (commissionAmount <= 0) return

    // Update the referral record with total commission
    const referralRef = ref(db, `referrals/${referrerId}/${playerId}`)
    const referralSnapshot = await get(referralRef)
    if (referralSnapshot.exists()) {
      const currentData = referralSnapshot.val()
      const newTotal = (currentData.commissionEarned || 0) + commissionAmount
      await update(referralRef, { commissionEarned: newTotal })
    }

    // Add commission notification for referrer
    const notificationRef = push(ref(db, `notifications/${referrerId}`))
    await set(notificationRef, {
      type: 'commission',
      amount: commissionAmount,
      fromPlayerId: playerId,
      timestamp: Date.now(),
      claimed: false,
    })
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
