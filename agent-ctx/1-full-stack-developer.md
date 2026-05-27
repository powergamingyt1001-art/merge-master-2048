# Task 1 - Fix Admin Approval Delivery + Send to UID Feature

## Agent: full-stack-developer

## Summary
Fixed critical bug where admin panel approval does NOT deliver items to the buyer's wallet, and added "Send to UID" feature as a reliable manual delivery option.

## Root Cause
`handleApprovePurchase` in `CouponCode.tsx` only looked in `firebaseOrders` state array to find the buyer's `playerId`. If Firebase sync was slow or the admin was on a different device, the order wouldn't be found in state, and delivery would silently fail (`.catch(() => {})` swallowed errors).

## Changes Made

### File: `src/components/game/CouponCode.tsx`

1. **Imports** (lines 6-8):
   - Added `getPlayerByUserCode` to firebase-service import
   - Added `get as fbGet` to firebase/database import for direct Firebase reads

2. **PurchaseHistoryEntry interface** (line 231):
   - Added `userCode?: string` field

3. **handleApprovePurchase** (lines 1641-1767):
   - Rewrote with 3-step robust fallback logic:
     1. Try `firebaseOrders.find()` (fast, but may be stale)
     2. Read order directly from Firebase via `fbGet(ref(db, 'orders/' + storeOrderId))`
     3. Look up player by `userCode` via `getPlayerByUserCode()`
   - Changed from sync to async for proper await support
   - Added proper delivery success/failure feedback notifications
   - Added console.log/warn/error debugging at every step
   - Removed silent `.catch(() => {})` error swallowing

4. **handleApproveStoreOrder** (lines 2179-2285):
   - Applied same 3-step fallback logic for consistency
   - Added proper delivery feedback notifications
   - Changed to async

5. **Send to UID feature** (lines 1769-1824):
   - Added 10 new state variables: sendToUid, sendCoins, sendSpins, sendHammers, sendMagnets, sendBombs, sendRoomCards, sendLoading, sendResult
   - Added `handleSendToUid` callback: looks up player by UID, delivers items via `deliverOrderItems('admin_send_' + Date.now(), player.id, items)`
   - Shows success/failure result message

6. **Send to UID UI** (lines 2818-2881):
   - Added in Dashboard tab after Referral Stats section
   - Green-themed card with UID input, 6 item fields (coins, spin tickets, hammers, magnets, bombs, room cards)
   - Send button with loading state and result message display

7. **mergedAllPurchases** (lines 2050, 2072):
   - Added `userCode: fo.userCode` to Firebase orders mapping
   - Added `userCode: (order as any).userCode` to localStorage orders mapping

## Verification
- `bun run lint` passes with no errors
- Dev server running on port 3000
