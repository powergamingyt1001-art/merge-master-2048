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

---
Task ID: 1
Agent: profile-panel-ui-agent
Task: Profile Panel UI Changes - Remove Level Inline, Move UID, Update Stats Row, Add Invite Button

Work Log:

### Changes Made:

1. **Removed Level inline text between Name and UID** (was section 4):
   - Deleted the `<div className="flex items-center gap-1 mt-1 cursor-pointer" onClick={() => setShowLevelList(true)}>` block that showed level icon + "Lv.X Title" text
   - Level info is already shown in the Level XP Progress Box (section 10) at the bottom, so it was redundant

2. **Moved UID up to right below the name** (replacing where level was):
   - UID section now appears directly after the name edit section
   - Updated section comment from "5. UID with copy" to "4. UID with copy + Invite button"
   - Added "Invite" button with `UserPlus` icon next to the UID copy button (visible only when `!isOwnProfile`)

3. **Replaced Stats Row from 4 boxes to 3 boxes**:
   - Changed `grid-cols-4` to `grid-cols-3`
   - Kept: Classic Best (Trophy, gold) and Battle Best (Swords, red)
   - Removed: Coins and Level SP boxes
   - Added: Tournament Best (Crown, purple #E040FB) using `modBestScore` prop

4. **Added Invite Friends button functionality**:
   - Added `UserPlus` to lucide-react imports
   - Added `onAddNotification` optional prop to `ProfilePanelProps` interface
   - Implemented `handleInviteFriend` function that:
     - Saves friend request to localStorage key `mergeMaster2048_friendRequests`
     - Checks for duplicate requests (same UID)
     - Pushes new request with uid, name, avatar, level, date, status='pending'
     - Calls `onAddNotification` with success message
   - Invite button only shown when viewing another user's profile (`!isOwnProfile`)

5. **Passed `onAddNotification` prop from PlayDashboard.tsx**:
   - Added `onAddNotification={(title, message, type, emoji) => onAddNotification(title, message, type as Notification['type'], emoji)}` to ProfilePanel usage

### Technical changes:
- `ProfilePanel.tsx`: Added `UserPlus` to lucide-react imports
- `ProfilePanel.tsx`: Added `onAddNotification` prop to interface and destructuring
- `ProfilePanel.tsx`: Removed level inline text section (4 lines)
- `ProfilePanel.tsx`: Moved UID section up, added Invite button
- `ProfilePanel.tsx`: Changed stats row from 4 to 3 boxes with Tournament Best
- `ProfilePanel.tsx`: Added `handleInviteFriend` function
- `PlayDashboard.tsx`: Passed `onAddNotification` prop to ProfilePanel

### Lint Results
- 0 errors, 0 warnings after all changes

---
Task ID: 5
Agent: spin-wheel-update-agent
Task: Update SpinWheel Component - Pricing & Pack Options

Work Log:

### Changes Made:

1. **Updated COIN_COST_PER_SPIN from 500 to 300**: Changed the constant on line 94 from 500 to 300, reducing the per-spin coin cost.

2. **Updated SPIN_COUNTS from [1, 5, 10] to [1, 3, 5, 10]**: Added the 3-spin pack option so users have more granular choices.

3. **Updated coin spin button text**: Changed from "🪙 Coin Spin (500/spin)" to "🪙 Coin Spin (300🪙)" to reflect the new price and use the coin emoji.

4. **Simplified coinCost calculation**: Removed the special case `effectiveMultiplier === 10 ? 1500 : ...` and simplified to `effectiveMultiplier * COIN_COST_PER_SPIN`. Since 10 × 300 = 3000, the 10-pack now costs 3000 coins (previously 1500). The 2 extra free spins are still given (12 total for 10-pack).

5. **Updated cost labels in multiplier selector**: Removed the hardcoded `count === 10 ? '1500🪙'` special case. Now all labels are computed as `${count * COIN_COST_PER_SPIN}🪙`, producing:
   - 1x: "300🪙"
   - 3x: "900🪙"
   - 5x: "1500🪙"
   - 10x: "3000🪙"

6. **Updated FREE badge to "+2 FREE"**: Changed the 10x pack badge from "FREE" to "+2 FREE" for clearer communication of the bonus.

7. **Updated info text**: Changed "1,500 coins = 12 spins!" to "3,000 coins = 12 spins!" in the multi-spin info section.

8. **Fixed missing useEffect import**: Added `useEffect` to the React import (was missing from a previous agent's change that used `useEffect` without importing it).

### Pricing Summary:
- 1 spin = 300 coins
- 3 spins = 900 coins
- 5 spins = 1500 coins
- 10 spins = 3000 coins (12 total with +2 FREE)

### Lint Results
- 0 errors, 0 warnings

---
Task ID: 4
Agent: leaderboard-profile-overlay-agent
Task: Update Leaderboard Player Profile Overlay View

Work Log:

### Changes Made to `/home/z/my-project/src/components/game/Leaderboard.tsx`:

1. **Updated imports**: Added `UserPlus` and `Copy` to the lucide-react import statement.

2. **Added `formatCoinCount` utility function**: Same as ProfilePanel — formats 1000→1K, 2500→2.5K, 1000000→1M.

3. **Added like tracking with localStorage**: Since `FirebasePlayer` interface doesn't have a `likes` field, added `getPlayerLikes()` and `setPlayerLikes()` helper functions that read/write to `mergeMaster2048_playerLikes` localStorage key (a map of playerId → like count).

4. **Added new state variables**: `likeCount` (number, initialized from localStorage on player select) and `copiedUid` (boolean for copy feedback).

5. **Updated `setSelectedPlayer` wrapper**: Now also loads `likeCount` from localStorage via `getPlayerLikes()` and resets `copiedUid` when changing selected player.

6. **Added `handleCopyUid` function**: Copies the last 8 chars of `selectedPlayer.playerId` to clipboard with fallback for older browsers, shows "Copied!" feedback for 2 seconds.

7. **Added `handleSendFriendRequest` function**: Saves friend request to `mergeMaster2048_friendRequests` localStorage key with uid, name, avatar, level, date, status='pending'. Checks for duplicate requests.

8. **Restructured Name + Level section**: Changed from separate Name and Level Title capsule to inline layout — Name on one line with "(You)" tag, level inline text on next line (icon + "Lv.X Title"), removed the capsule pill styling.

9. **Added UID + Invite section**: Between level inline and online indicator. Shows "ID:" label, last 8 chars of playerId in cyan monospace, copy button with visual feedback, and green "Invite" button (UserPlus icon) — only shown for other players, not yourself.

10. **Replaced stats grid (6-box → new layout)**:
    - **Win Rate** — now shown prominently in its own large box with big percentage text and W/L sub-text
    - **3-column score row**: Classic Best (Trophy/gold), Battle Best (Swords/red), Tournament Best (Crown/purple using tournamentPoints)
    - **Total Coins** — display box with emoji, formatted count (formatCoinCount), and exact number badge
    - Removed: "Total Battles" box, "Level XP" box, "Tournament Points" standalone row, "Level Progress Bar"

11. **Updated Like button**: Now shows like count: `{liked ? 'Liked ❤️' : 'Like'} ({likeCount})`. Toggling like increments/decrements the count in localStorage and updates the displayed count.

### Lint Results
- 0 errors, 0 warnings after all changes

---
Task ID: 2
Agent: store-spins-room-agent
Task: Store Component Changes - Remove Daily Free Room, Add Spins Tab, Add Room Card Coin Purchase

Work Log:

### 1. Removed "Daily Free Room Card" section
- Removed the entire "DAILY FREE ROOM CARD" section from RoomTab (7-day visit tracker with claim button)
- Removed `onClaimFreeRoomCard`, `consecutiveVisits`, `freeRoomCardAvailable` props from RoomTab
- Cleaned up AbilityTab: removed free room card related props and code
- Removed `consecutiveVisits`, `freeRoomCardAvailable` state and `handleClaimFreeRoomCard` from main Store component
- Kept helper functions: `getStoreVisitDays`, `recordStoreVisit`, `getConsecutiveVisitCount`, `canClaimFreeRoomCard`, `markFreeRoomCardClaimed`

### 2. Added "Spins" tab
- Updated TabId type to include 'spins'
- Created SpinPack interface, SPIN_INR_PACKS (9/₹5 HOT, 20/₹9 POPULAR, 33/₹15 VERY HOT with glow, 50/₹25 BEST VALUE), SPIN_COIN_PACKS (1/300, 3/900, 5/1500, 10/3000 +2 FREE)
- Created SpinsTab component with INR grid and coin list layouts
- Tab positioned between Ability and Room with 🎫 icon

### 3. Spin Purchase Limits (15 spins/3 days via coins)
- localStorage key: mergeMaster2048_spinPurchaseLimits

### 4. Room Card coin purchase (once per day)
- localStorage key: mergeMaster2048_roomCardCoinPurchase
- Shows "1/day" badge, "SOLD OUT" when purchased today

### 5. Added onAddSpinTickets prop to StoreProps
- PlayDashboard.tsx updated to pass it to Store

### 6. Spin Delivery: INR via UPI order system, Coins instant (10-pack = 12 spins total)

### Lint: 0 errors, 0 warnings

---
Task ID: 1-a
Agent: profile-store-update-agent
Task: ProfilePanel Invite on Own Profile + Store Spin Pack Updates

Work Log:

## 1. ProfilePanel.tsx - Added "Invite Friends" button on OWN profile

### Change:
- Previously, the "Invite" button (UserPlus icon) only showed for non-own profiles (`!isOwnProfile`)
- Now shows an "Invite" button next to the UID on BOTH own and other profiles, with different behavior:
  - **Own profile**: "Invite" button copies the user's invite code (UID) to clipboard, shows "Copied!" feedback
  - **Other profiles**: Keeps existing "Invite" button that sends a friend request via `handleInviteFriend`

### Technical change:
- Changed the conditional `{!isOwnProfile && (...)}` block to a ternary `{isOwnProfile ? (copy invite) : (send friend request)}`
- Own profile button calls `handleCopyCode` (already existed), shows `{copiedCode ? 'Copied!' : 'Invite'}`
- Other profile button keeps calling `handleInviteFriend` as before

## 2. Store.tsx - Updated Spin Buy section pricing per spec

### Changes to SPIN_INR_PACKS:
- 9 spins = ₹5 (removed HOT tag)
- 20 spins = ₹9 (tag changed from POPULAR/green to HOT/red #F65E3B)
- 33 spins = ₹15 (VERY HOT tag color changed from #F65E3B to #FF1744 per spec, kept fireStyling)
- 50 spins = ₹25 (removed BEST VALUE tag)

### Changes to SPIN_COIN_PACKS:
- Removed the 1-spin for 300 coins pack (spec only lists 3/5/10 packs)
- Kept: 3 spins = 900 coins, 5 spins = 1500 coins, 10 spins = 3000 coins (+2 FREE = 12 total)

### Note on Daily Free Room:
- Already removed by previous agent (Task ID: 2, store-spins-room-agent)
- No additional changes needed

## 3. Leaderboard.tsx - Verified like count display
- Like button at line 641 already shows `{liked ? 'Liked ❤️' : 'Like'} ({likeCount})`
- likeCount initialized from localStorage via `getPlayerLikes()` on player select
- Updated properly on like toggle via `setPlayerLikes()` and `setLikeCount()`
- No changes needed

## Lint Results
- 0 errors, 0 warnings after all changes

---
Task ID: critical-fix-1
Agent: Main Agent
Task: Fix App Crash & Account Reset Bug (Critical Priority)

Work Log:
- Analyzed screenshot: app showing "Something went wrong - Cannot read properties of undefined (reading 'map')"
- Identified ROOT CAUSE: In CouponCode.tsx line 1647, `fo.items.map(...)` crashes when Firebase order doesn't have `items` field (undefined)
- This crash triggers ErrorBoundary, which PREVIOUSLY only preserved 5 fields (playerId, userCode, playerName, playerAvatar, inviteCode) and cleared ALL other data
- When ErrorBoundary reloads, user gets a "new account" with only identity data - all coins, abilities, progress lost
- This explains the user's report: "entering admin code resets the account" - the admin panel opens, loads Firebase orders, some order has missing `items`, crash, account reset

Fixes Applied:
1. CouponCode.tsx: Added `Array.isArray(fo.items) ? fo.items : []` null safety for Firebase orders items
2. firebase-service.ts: Added items array safety in `onOrdersUpdate` and `onUserOrdersUpdate`
3. ErrorBoundary.tsx: Complete rewrite - now preserves FULL localStorage data instead of clearing it
4. InvitePanel.tsx: Added null safety for `friendsList.map()` and `friendRequests` callbacks from Firebase
5. Leaderboard.tsx: Fixed NaN display when `totalBattlesWon` is undefined
6. Store.tsx: Added null safety for `fbOrder.items.map()` in notification messages
7. PlayDashboard.tsx: Changed "Buy" to "Add" on Store button and tooltip
8. Store.tsx: Changed "BUY 💰" to "ADD 💰" on room card coin purchase button

Stage Summary:
- ROOT CAUSE FIXED: App no longer crashes on Firebase orders with missing `items` field
- ErrorBoundary now preserves ALL user data on crash recovery - no more account resets
- All .map() calls on Firebase data now have null safety checks
- Store buttons changed from "Buy" to "Add" as requested
- Git pushed to origin/main, Vercel will auto-deploy

---
Task ID: 2
Agent: Store Cart & Coupon System Agent
Task: Store Component - Cart System, Coin Buy, Coupons, Scratch Card, Admin History

Work Log:

## Changes Made:

### 1. Store.tsx - Coin Items "Buy" Button (Auto-Approve)
- Changed AbilityCard button text: coin items show "Buy", INR items show "Add"
- Updated BuyButton component to accept a `label` prop ('Add' | 'Buy') with different styling
- Coin purchases are auto-approved: no admin approval needed
- Coins are deducted instantly and items delivered immediately

### 2. Store.tsx - Firebase Coin Purchase Recording
- Added `CoinPurchaseRecord` interface and `recordCoinPurchaseToFirebase` function
- All coin purchases (abilities, spins, room cards) are recorded to Firebase `coinPurchases` path
- Records include: id, date, playerId, playerName, userCode, item, coinPrice, quantity, abilityType, status='auto_approved', createdAt
- Applied in: `handleCoinBuy`, `SpinsTab.handleCoinBuy`, `RoomTab.handleBuyRoomCardWithCoins`, and cart checkout for coin items

### 3. Store.tsx - Cart Coupon System
- Updated `applyCoupon` to use `validateDiscountCoupon` from CouponCode.tsx instead of manual localStorage parsing
- Validates against user's userCode and cart total
- Added "Cancel" button next to applied coupon to remove it
- Coupon consumption via `consumeDiscountCoupon` when order is placed

### 4. Store.tsx - Purchase Threshold Coupons
- **₹29+ purchase**: Auto 60% discount on current order. When INR subtotal ≥ ₹29 and < ₹200, automatically applies 60% off and adjusts payment modal price
- **₹200+ purchase**: 70% off coupon for NEXT purchase. Generates unique coupon code `NEXT70{userCode}{timestamp}`, stores it in `adminDiscountCoupons` targeting user's userCode, shows ScratchCardPopup after 1.5s delay

### 5. Store.tsx - ScratchCardPopup Component
- Full scratch card popup with grey canvas overlay
- User can click/drag to scratch or just click to reveal
- Hidden content: 70% OFF coupon code
- 🤑 emoji rain falling from top for 3 seconds (30 animated emojis)
- ✨ sparkle effects around the card after reveal
- "Claim" button stores coupon and closes popup
- Custom CSS animation for sparkle-fade effect

### 6. CouponCode.tsx - Admin Panel History Toggle
- Added `historyFilter` state: 'all' | 'inr' | 'coins'
- Added toggle buttons (All / ₹ INR / 💰 Coins) in History tab header
- When "Coins" is selected, shows Firebase coin purchases from `coinPurchases` path
- Real-time Firebase listener for coin purchases via `onValue(ref(db, 'coinPurchases'))`
- Coin purchase entries show: item, playerName, userCode, date, coinPrice, "Auto-Approved" badge
- INR/All filter shows existing payment history with lock duration settings

### 7. Firebase Integration
- Added imports: `db` from `@/lib/firebase`, `ref` and `set` from `firebase/database` (Store.tsx)
- Added imports: `db` from `@/lib/firebase`, `ref` and `onValue` from `firebase/database` (CouponCode.tsx)
- Coin purchase data stored at `coinPurchases/{purchaseId}` in Firebase Realtime Database

### Technical changes:
- `Store.tsx`: Added `validateDiscountCoupon`, `consumeDiscountCoupon`, `DiscountCoupon` imports from CouponCode.tsx
- `Store.tsx`: Added `db`, `ref`, `set` imports from firebase
- `Store.tsx`: Updated `BuyButton` to accept `label` prop
- `Store.tsx`: Changed AbilityCard button text for coin items to "Buy"
- `Store.tsx`: Added `ScratchCardPopup` component (~200 lines)
- `Store.tsx`: Added `CoinPurchaseRecord` interface and `recordCoinPurchaseToFirebase` async function
- `Store.tsx`: Updated `handleCoinBuy` to record to Firebase
- `Store.tsx`: Updated `SpinsTab` signature to include `playerId`, `playerName`, `userCode` props
- `Store.tsx`: Updated `RoomTab` signature to include `playerId`, `playerName`, `userCode` props
- `Store.tsx`: Updated `applyCoupon` to use `validateDiscountCoupon`
- `Store.tsx`: Added cancel coupon button in cart
- `Store.tsx`: Updated `handlePlaceOrder` to async with 60%/70% threshold logic
- `Store.tsx`: Added `scratchCard` state and ScratchCardPopup rendering
- `CouponCode.tsx`: Added `Filter` icon import
- `CouponCode.tsx`: Added `db`, `ref`, `onValue` imports from firebase
- `CouponCode.tsx`: Added `historyFilter` and `firebaseCoinPurchases` state
- `CouponCode.tsx`: Added Firebase coin purchases listener in admin panel useEffect
- `CouponCode.tsx`: Added history filter toggle UI and coin purchases display section

### Lint Results
- 0 errors, 0 warnings
