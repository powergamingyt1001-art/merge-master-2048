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
