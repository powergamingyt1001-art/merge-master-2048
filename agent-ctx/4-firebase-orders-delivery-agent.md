---
Task ID: 4
Agent: Main Agent
Task: Move orders to Firebase, configurable admin password, partner passwords, real-time item delivery

Work Log:

## Summary of Changes

### 1. Firebase Service (`src/lib/firebase-service.ts`)

Added the following new sections:

**ORDER SYSTEM** - Orders now stored in Firebase at `orders/{orderId}`:
- `placeOrder()` - Place a new order in Firebase RTDB
- `onOrdersUpdate()` - Listen for ALL orders (admin panel, real-time)
- `updateOrderStatus()` - Update order status (approve/reject)
- `onUserOrdersUpdate()` - Listen for a specific user's orders (user-side)
- `deliverOrderItems()` - Create a delivery notification in `userNotifications/{playerId}/{notifId}`
- `onUserNotificationsUpdate()` - Listen for user delivery notifications
- `markNotificationDelivered()` - Mark notification as processed

**ADMIN CONFIG** - Configurable admin password and partner system:
- `getAdminPassword()` - Get admin password from Firebase (default: "ADMIN.IN")
- `setAdminPassword()` - Change admin password in Firebase
- `getPartners()` - Get all partners from Firebase
- `savePartner()` - Create or update a partner
- `deletePartner()` - Delete a partner
- `authenticatePartner()` - Check partner password and return permissions
- `checkAdminPassword()` - Verify admin password

**Types added:**
- `FirebaseStoreOrder` - Full order structure with items array, discount, etc.
- `PartnerData` - Partner with name, password, permissions, active status

### 2. Store Component (`src/components/game/Store.tsx`)

- Added `playerName` and `userCode` props to StoreProps
- Added import of `placeOrder` and `onUserOrdersUpdate` from firebase-service
- Added `toFirebaseOrder()` helper to convert StoreOrder to FirebaseStoreOrder format
- Added real-time listener via `onUserOrdersUpdate()` that:
  - Merges Firebase order status into local orders
  - Shows notifications when order is approved or rejected
  - Updates localStorage cache
- Modified `handleOrderPlaced()` to:
  - Save to localStorage (local cache)
  - Also call `firebasePlaceOrder()` for cross-device sync
- Updated `PlayDashboard.tsx` to pass `playerName` and `userCode` to Store

### 3. CouponCode Component (`src/components/game/CouponCode.tsx`)

**Admin Password via Firebase:**
- Removed hardcoded `ADMIN_ACCESS_CODE = 'ADMIN.IN'`
- Admin password now stored in Firebase at `adminConfig/adminPassword`
- Default password is "ADMIN.IN" but can be changed by admin
- `handleClaim` now uses `checkAdminPassword()` and `authenticatePartner()` (async)

**Partner Password System:**
- Added `adminRole` state ('admin' | 'partner')
- Added `partnerPermissions` state (string array of permission keys)
- Added `partnerName` state
- Partners enter their password in coupon code field
- Partners get limited admin access based on their permissions
- Permissions: view_orders, approve_orders, manage_coupons, manage_prices, view_users, ban_users

**Security Tab (new):**
- Added 'security' to AdminTab type
- New Security tab with:
  - Change Admin Password section (with validation, success/error feedback)
  - Partner Passwords section (add new partners, manage existing)
  - Partners can be added with name, password, and toggleable permissions
  - Partners can be disabled/enabled or deleted
- Only visible to main admin (adminRole === 'admin')
- Partners see a "locked" message instead

**Firebase Orders in Admin Panel:**
- Added `firebaseOrders` state
- Added real-time `onOrdersUpdate()` listener when admin panel is open
- Firebase orders merged into the `mergedAllPurchases` array
- Revenue and pending count computed from Firebase orders
- `handleApprovePurchase()` now also:
  - Calls `firebaseUpdateOrderStatus()` to update Firebase
  - Calls `deliverOrderItems()` to create delivery notification for user
- `handleDenyPurchase()` now calls `firebaseUpdateOrderStatus()`
- `handleDisapprovePurchase()` now calls `firebaseUpdateOrderStatus()`
- `handleApproveStoreOrder()` now calls `firebaseUpdateOrderStatus()` and `deliverOrderItems()`
- `handleDenyStoreOrder()` now calls `firebaseUpdateOrderStatus()`

**Admin Tab Navigation:**
- Added Security tab button to dashboard quick actions (4-column grid)
- Added Security tab to footer navigation
- Tab filtering now respects partner permissions:
  - Admin: sees all tabs
  - Partner: sees only tabs matching their permissions
  - Security tab: never visible to partners
  - Legacy URL-based partner mode still supported

### 4. useGame Hook (`src/hooks/useGame.ts`)

**Real-time Item Delivery:**
- Added import of `onUserNotificationsUpdate` and `markNotificationDelivered`
- Added `deliveryProcessedRef` to track processed notifications (prevent double delivery)
- Added `useEffect` that:
  - Listens to `userNotifications/{playerId}` for order_delivery notifications
  - When undelivered notification arrives:
    - Adds coins to user's state (coins + totalCoinsEarned)
    - Adds abilities (multiplier5x, multiplier2_5x, hammer, magnet, blast, extraTime)
    - Adds room cards
    - Adds spin tickets
    - Shows a "📦 Items Delivered!" notification with item details
    - Marks notification as delivered in Firebase via `markNotificationDelivered()`

### Lint Results
- 0 errors, 0 warnings from `bun run lint`
- TypeScript has some pre-existing errors in other files (not from our changes)
- All new code passes ESLint

### Firebase Structure
```
orders/{orderId} = {
  id, date, playerId, playerName, userCode,
  items: [{ name, quantity, price }],
  totalAmount, discountCoupon, discountAmount, finalAmount,
  whatsappNumber, name, transactionId, utrNumber, proofBase64,
  status: 'pending' | 'approved' | 'rejected',
  upiId, createdAt, approvedAt
}

adminConfig/adminPassword = string (default: "ADMIN.IN")
adminConfig/partners/{partnerId} = {
  name, password, permissions: string[],
  createdAt, lastUsedAt, active
}

userNotifications/{playerId}/{notifId} = {
  type: 'order_delivery',
  orderId, items: { coins?, abilities?, roomCards?, spinTickets? },
  deliveredAt, delivered: boolean
}
```
