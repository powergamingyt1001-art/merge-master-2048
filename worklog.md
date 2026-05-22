---
Task ID: 5
Agent: Main Agent
Task: Fix Friends/Invite System + Store Cart System

Work Log:

## Part A: Fix Friends/Invite System

### Issues fixed:
1. **Real-time Firebase search using equalTo()**: The `searchPlayerByInviteCode` function in `firebase-service.ts` was loading all players (`limitToLast(10)`) and filtering client-side. This didn't work because Firebase returns the last 10 by inviteCode sort, not matching a specific code. Changed to use `equalTo(inviteCode.toUpperCase())` for exact match with `limitToLast(1)`, plus a fallback that does client-side filtering on a larger set.

2. **Real-time search as user types**: Added debounced search (500ms) in InvitePanel.tsx. When the user types 3+ characters, the search fires automatically after they stop typing. The manual search button still works for immediate search. Added `searchAttempted` state to properly show "No player found" only after a search completes, not while typing.

3. **No dummy/mock friends**: Verified the InvitePanel uses only Firebase real-time data (`onFriendsUpdate`, `onFriendRequestsUpdate`). No hardcoded friend arrays exist.

4. **Friend request system already working**: The existing implementation already had:
   - Three tabs: Refer | Friends | Requests
   - Search by UID with found player card showing avatar, name, level, online status
   - Send friend request with Plus (+) icon
   - Accept/Decline buttons on requests
   - Real-time listeners for friend requests and friends list
   - All Firebase functions: `sendFriendRequest`, `acceptFriendRequest`, `declineFriendRequest`, `onFriendRequestsUpdate`, `onFriendsUpdate`, `removeFriend`

### Technical changes:
- `firebase-service.ts`: Added `equalTo` import from `firebase/database`
- `firebase-service.ts`: Rewrote `searchPlayerByInviteCode` to use `equalTo()` with fallback
- `InvitePanel.tsx`: Added `useRef` import for timeout ref
- `InvitePanel.tsx`: Added `searchAttempted` state and `searchTimeoutRef` ref
- `InvitePanel.tsx`: Added `useEffect` for debounced real-time search on `searchCode` change
- `InvitePanel.tsx`: Updated "No Result" condition to use `searchAttempted` instead of `searchCode.length >= 3`
- `InvitePanel.tsx`: Added searching indicator in UID hint text

## Part B: Store Cart System

### Changes made:
1. **Quantity selector on store items**: Each `AbilityCard` now receives `cartQuantity`, `onAddToCart`, and `onUpdateCartQuantity` props. When an item is in the cart, it shows +/- buttons with quantity count instead of the Buy/Add button. For INR items, the button says "Add 🛒" which adds to cart. For coin items, it still says "BUY" and buys immediately.

2. **Cart session state only**: Removed localStorage persistence for cart. Changed `useState<CartItem[]>(() => { ... localStorage ... })` to `useState<CartItem[]>([])` and removed the `useEffect` that wrote to localStorage. Cart now persists only during the component session.

3. **Coupon validation for adminDiscountCoupons**: The `applyCoupon` function now checks both `adminDiscountCoupons` key (where WELCOME60 and admin-created discount coupons are stored) and the legacy `adminCoupons` key. Added validation for `disabled`, `maxUses`, `currentUses` fields from the discount coupon schema.

4. **Welcome bonus verification**: Verified `useGame.ts` `claimWelcome` already has correct values:
   - 5x Ability × 5 (multiplier5xCount: +5) ✅
   - 2.5x Ability × 5 (multiplier2_5xCount: +5) ✅
   - Timer Ability × 5 (extraTimeCount: +5) ✅
   - 2 FREE Room Cards (roomCardCount: +2) ✅
   - 10 Spin Tickets (spinTickets: +10) ✅
   - WELCOME60 coupon: 60% off, ₹29+ only, one-time use ✅

5. **All Part B UI elements verified present**:
   - "15 per 2 weeks" subtitle on ABILITIES (COINS) heading ✅
   - Daily Streak section replacing old DAILY FREE section ✅
   - Room tab with room card packs + coin room card ✅
   - History tab with order list ✅
   - Cart slide-in panel from right with coupon field ✅
   - UPI QR code in payment modal ✅
   - Place Order button ✅
   - Adsterra ads ✅
   - Admin price override system ✅
   - Daily streak system ✅

### Technical changes:
- `Store.tsx`: Removed `CART_KEY` constant, added `ADMIN_DISCOUNT_COUPONS_KEY`
- `Store.tsx`: Changed cart state from localStorage-backed to session-only
- `Store.tsx`: Removed localStorage persist effect for cart
- `Store.tsx`: Simplified `addToCart` to only accept `AbilityItem` (not union type)
- `Store.tsx`: Updated `AbilityCard` with new props: `cartQuantity`, `onAddToCart`, `onUpdateCartQuantity`
- `Store.tsx`: Updated `AbilityTab` and `RoomTab` signatures to include cart props
- `Store.tsx`: Updated all `AbilityCard` usage in AbilityTab (5x, 2.5x, regular) and RoomTab to pass cart props
- `Store.tsx`: Updated `applyCoupon` to check `adminDiscountCoupons` first, then legacy `adminCoupons`
- `Store.tsx`: INR items show "Add 🛒" button, coin items still show "BUY"

## Lint Results
- 0 errors, 0 warnings after all changes
- Pre-existing TypeScript errors in `firebase-service.ts` (numChildren, id) and `CouponCode.tsx` (await in non-async) are NOT from this task's changes

---
Task ID: 2
Agent: admin-panel-fix-agent
Task: Fix Admin Panel cross-device access

Work Log:
- Read worklog.md and agent-ctx/4-firebase-orders-delivery-agent.md to understand previous work (Firebase order system already set up by Task 4)
- Analyzed CouponCode.tsx admin panel: identified `mergedAllPurchases` was using localStorage `storeOrders` and `purchaseHistory` as primary sources, with Firebase as supplement
- Analyzed Store.tsx: verified `handleOrderPlaced` already calls `firebasePlaceOrder` for cross-device sync (no fix needed)
- Analyzed firebase-service.ts: confirmed all required Firebase functions exist and work correctly
- Fixed `mergedAllPurchases` in CouponCode.tsx: changed to use `firebaseOrders` as PRIMARY source, with localStorage `storeOrders` only as fallback for unsynced orders; removed `purchaseHistory` (local coupon claims) from admin panel order display entirely
- Fixed admin panel open effect: removed localStorage-based revenue/pending count calculation that used `loadStoreOrders()`, now relies exclusively on Firebase real-time listener (`onOrdersUpdate`)
- Fixed tab switching effect: stopped reloading `purchaseHistory` from localStorage when switching to payments/history tabs; only reloads `storeOrders` as fallback
- Ran `bun run lint` - 0 errors, 0 warnings
- Wrote work record to /home/z/my-project/agent-ctx/2-admin-panel-fix-agent.md

Stage Summary:
- Fixed critical bug where admin panel displayed orders from localStorage (device-only) instead of Firebase (cross-device)
- Admin on Phone B can now see ALL orders from ALL devices via Firebase real-time listener
- Revenue and pending count computed from Firebase, not localStorage
- Store.tsx already pushes orders to Firebase (no changes needed)
- Partner data already comes from Firebase (verified)
- All existing functionality preserved (coupon codes, ads, discount coupons)

---
Task ID: 6+7
Agent: battle-spin-fix-agent
Task: Fix Battle Matching + Spin Wheel

Work Log:

## Part A: Battle Matching Fix (Task ID 7)

### Root Cause
The `startCoinGame` and `startBotBattle` functions always created bot opponents with separate local boards. The `startRealTimeBattle` function existed but was never called — it wasn't even in the hook's return value. The PlayDashboard's "searching" overlay was a fake animation that just picked a random bot name.

### Fix: Real Firebase Matchmaking Flow
1. Moved `startRealTimeBattle` before other game start functions so it can be referenced by `startBotBattle` and `startCoinGame`
2. Rewrote `startCoinGame` as async with Firebase matchmaking: try findMatch first, if found create shared board battle, else join queue and wait 5s, fallback to bot
3. Rewrote `startBotBattle` as async with same matchmaking flow (coinAmount=0 for free battle)
4. Added `startRealTimeBattle` and `leaveRealTimeBattle` to useGame hook return
5. Updated PlayDashboard searching overlay to call real async game start functions instead of fake bot animation
6. Increased stale matchmaking threshold from 15s to 30s in firebase-service.ts

### Technical changes:
- `useGame.ts`: Moved `startRealTimeBattle` before `startBotBattle`
- `useGame.ts`: Rewrote `startCoinGame` as async with Firebase matchmaking (findMatch → createBattle → joinBattle → startRealTimeBattle, fallback to bot)
- `useGame.ts`: Rewrote `startBotBattle` as async with Firebase matchmaking (same flow, coinAmount=0)
- `useGame.ts`: Added `startRealTimeBattle` and `leaveRealTimeBattle` to return object
- `PlayDashboard.tsx`: Replaced fake searching animation with real async game start calls
- `firebase-service.ts`: Increased stale threshold from 15s to 30s

## Part B: Spin Wheel Fix (Task ID 6)

### Issues Fixed:
1. **500 coin single spin**: Changed `COIN_COST_PER_SPIN` from 150 to 500
2. **1500 coins = 10 spins (12 with bonus)**: Updated `coinCost` calculation so 10-spin bundle costs 1500 instead of 5000
3. **2 free spins daily**: Added `freeSpinsClaimed` state tracked in localStorage with date-based reset at midnight; shows green "Claim 2 Free Spins!" button when available

### Technical changes:
- `SpinWheel.tsx`: Changed `COIN_COST_PER_SPIN` from 150 to 500
- `SpinWheel.tsx`: Updated `coinCost` to use 1500 for 10-spin bundle
- `SpinWheel.tsx`: Added `onAddSpinTickets` prop to interface
- `SpinWheel.tsx`: Added `freeSpinsClaimed` state with localStorage persistence and date-based reset
- `SpinWheel.tsx`: Added `handleClaimFreeSpins` callback and "Claim Free Spins" button UI
- `SpinWheel.tsx`: Updated coin spin label from "150/spin" to "500/spin"
- `PlayDashboard.tsx`: Passed `onAddSpinTickets` prop to SpinWheel component

## Lint Results
- 0 errors, 0 warnings after all changes

Stage Summary:
- Battle matching now uses Firebase real-time matchmaking: two players clicking same coin amount get matched on a SHARED board
- Falls back to bot opponent if no real player found within 5 seconds
- Spin wheel pricing: 500 coins/single spin, 1500 coins/10 spins, 2 free daily spins with midnight reset
- All existing functionality preserved (ads, game modes, real-time score sync)

---
Task ID: 4+5
Agent: timer-leaderboard-agent
Task: Fix Timer Ability Rules + Leaderboard Rename

Work Log:
- Read worklog.md to understand previous agents' work (Firebase orders, admin panel, battle matching, spin wheel)
- Analyzed useGame.ts: found activatePowerUp('extraTime') at line 1602 — already has 20s check, max 2 in battle, unlimited in classic, +10s in battle mode
- Analyzed GameBoard.tsx: found handleTimerPowerUp at line 253 — already has 20s and max-2 checks with feedback messages
- Fixed timer message wording: changed "Timer available after 20 seconds" → "Timer available after 20s" to match spec
- Enhanced timer button disabled state: changed from `isBattleMode && timerAbilitiesUsed >= 2 && extraTimeCount > 0` to `extraTimeCount > 0 && (gameTimeElapsed < 20 || (isBattleMode && timerAbilitiesUsed >= 2))` — now also visually disables when <20s elapsed
- Added subtitle hint for classic mode when <20s: shows "20s" subtitle on timer button before cooldown expires
- Analyzed Leaderboard.tsx: found tab label already renamed from "Weekly" to "Battle" — no change needed
- Verified player profile popup already exists with like button — no change needed for base structure
- Enhanced player profile popup stats grid: replaced "Battle Score" (which showed current leaderboard value) with "Battle Best" (shows modBestScore from FirebasePlayer), added "Total Battles" stat, added "Win Rate" stat (calculated from totalBattlesWon/totalBattlesPlayed), changed Level XP color from green to cyan to avoid color collision
- Stats grid now shows 6 items in 3x2 layout: Classic Best, Battle Best, Coins, Total Battles, Win Rate, Level XP
- Verified FirebasePlayer interface has totalBattlesPlayed and totalBattlesWon fields needed for new stats
- Ran `bun run lint` — 0 errors, 0 warnings

Stage Summary:
- Timer ability rules fully implemented: 20s cooldown, +10s only in battle, max 2 per battle game, unlimited in classic mode
- Timer button visually disabled when <20s elapsed AND when max timers used in battle mode
- "Timer available after 20s" message shown when attempting to use timer before 20s
- "Max timers used (2/2)" message shown when battle mode limit reached
- Leaderboard "Weekly" tab already renamed to "Battle" by previous agent
- Player profile popup enhanced with Battle Best Score, Total Battles, and Win Rate stats
- Like/heart button already present in player profile popup
- All existing functionality preserved (ads, game modes, real-time battle, Firebase sync)
