# Task 4: SpinWheel Cart Integration for INR Purchases

## Agent: spin-cart-agent

## Summary
Updated SpinWheel component to support INR spin pack purchases via a shared cart system with the Store component.

## Files Modified
1. **`src/components/game/shared-cart.ts`** (NEW) - Shared cart types and localStorage helpers
2. **`src/components/game/SpinWheel.tsx`** - Major update with cart, INR packs, payment modal
3. **`src/components/game/Store.tsx`** - Synced cart with shared localStorage
4. **`src/components/game/PlayDashboard.tsx`** - Passed new props to SpinWheel

## Key Features Added
- **INR Spin Packs section** at bottom of SpinWheel (9/₹5, 20/₹9 HOT, 33/₹15 VERY HOT, 50/₹25)
- **Shared cart** via localStorage `mergeMaster2048_cart` - works across SpinWheel and Store
- **Cart badge** on SpinWheel header showing item count
- **Cart drawer** with item list, quantity controls, coupon support, and Buy Now
- **UPI Payment Modal** with QR code, payment form, proof upload
- **Coupon system** supporting admin coupons and discount coupons
- **Order placement** to Firebase and localStorage

## Backward Compatibility
- All existing spin functionality (ticket, coin, ad-based) preserved unchanged
- Store.tsx cart now syncs with shared localStorage (items from SpinWheel appear in Store)
