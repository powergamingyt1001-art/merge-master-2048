# Admin Approval Flow Fix - Work Record

## Task: Fix admin approval flow so items are correctly delivered to the buyer's account

## Summary of Changes

### 1. `/home/z/my-project/src/lib/firebase-service.ts` - `updateOrderStatus()`

**Problem**: `updateOrderStatus()` was both updating the order status AND delivering items via `deliverOrderItems()`. Since the admin panel also called `deliverOrderItems()` explicitly, this caused **double delivery**.

**Fix**: Removed the delivery logic from `updateOrderStatus()`. The function now ONLY updates the order status (to 'approved' or 'rejected') and sends a rejection notification if applicable. Item delivery is handled separately by the admin panel via `deliverOrderItems()`.

- Removed lines 1521-1534 (the `if (status === 'approved')` block that read the order and called `deliverOrderItems`)
- Updated function comment to clarify it only updates status
- Kept the rejection notification logic intact

### 2. `/home/z/my-project/src/components/game/CouponCode.tsx` - `handleApprovePurchase()` and `handleApproveStoreOrder()`

**Problem in `handleApprovePurchase()`**:
- Called `onAddCoins(coinAmount)` which adds coins to the ADMIN's own account instead of the buyer's
- Called `onAddPowerUp(...)` which adds abilities to the ADMIN's account
- For non-store-order paths (`inr_ability` and `else`), items were only added locally (to admin's account) with no Firebase delivery to the buyer

**Fix in `handleApprovePurchase()`**:
- Removed ALL calls to `onAddCoins()` and `onAddPowerUp()` - these incorrectly add items to the admin's account
- Items are now delivered ONLY via `deliverOrderItems()` which creates Firebase notifications for the actual buyer
- For the `isStoreOrder` path: Added `fbOrder.playerId` validation before calling `deliverOrderItems`, and used `getCoinAmountFromItem()` for accurate coin amounts
- For the `inr_ability` path: Added Firebase delivery by searching for the corresponding Firebase order
- For the `else` (legacy coin) path: Added Firebase delivery by searching for the corresponding Firebase order
- Changed admin notification messages to indicate "approved" rather than "delivered to your inventory" since items go to the buyer
- Removed `onAddCoins` and `onAddPowerUp` from useCallback dependencies

**Problem in `handleApproveStoreOrder()`**:
- `deliveryItems.coins = order.quantity` was wrong - `order.quantity` is the item quantity (e.g., 1), not the coin amount (e.g., 50000)
- Only handled INR abilities (5x/2.5x) and coins, missing other item types like hammers, magnets, bombs, timers, undos, room cards, spin tickets

**Fix in `handleApproveStoreOrder()`**:
- Changed `deliveryItems.coins = order.quantity` to `deliveryItems.coins = getCoinAmountFromItem(order.item)` for accurate coin amounts
- Added detection and delivery for ALL item types: hammer, magnet, bomb/blast, timer, undo, room cards, spin tickets
- Added `fbOrder.playerId` validation before calling `deliverOrderItems`
- Added comment explaining the single-delivery design (since we removed delivery from `updateOrderStatus`)

### 3. `/home/z/my-project/src/hooks/useGame.ts` - Delivery notification listener

**Problems**:
- `deliveryProcessedRef` was a `useRef<Set<string>>` that reset on page refresh, meaning if the page was refreshed after Firebase marked a notification as `delivered: true` but before game state was saved, the delivery would be permanently skipped
- The `notif.delivered` check skipped notifications marked as delivered in Firebase, even if items weren't applied to game state
- The `undo` ability type was missing from the delivery switch statement
- No immediate localStorage persistence after delivery, risking item loss on page refresh

**Fixes**:
- **localStorage-backed tracking**: Added a `useEffect` to load previously processed delivery IDs from localStorage (`mergeMaster2048_deliveryProcessed`) on mount. Added `markDeliveryProcessed()` helper that persists to localStorage (capped at 200 IDs to prevent unbounded growth).
- **Removed `notif.delivered` skip**: The check now only skips if the notification ID is in the local `deliveryProcessedRef` set. This means notifications marked `delivered: true` in Firebase but not yet applied locally will still be processed (critical for page refresh scenarios).
- **Added `undo` ability type**: Added case for `undo` in the ability switch statement that updates `undoCount` and `undoTotal`.
- **Immediate localStorage sync**: After processing a delivery, the code now immediately reads and updates the localStorage save data (`mergeMaster2048`) with the delivered items, ensuring persistence even if the page is closed before the next auto-save.
- Added `markDeliveryProcessed` to the `useEffect` dependency array.

## Lint Results
- All three modified files pass ESLint with no errors
- Pre-existing lint/TS errors in `PlayDashboard.tsx` are unrelated to these changes
