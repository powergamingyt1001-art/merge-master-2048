---
Task ID: 3+6
Agent: Coupon + Tournament Agent
Task: Implement WELCOME60 auto-coupon + Tournament ₹7K/₹15K rotation

## Changes Made

### 1. useGame.ts - WELCOME60 Auto-Coupon
- Added `welcomeCouponClaimed: boolean` field to `GameState` interface
- On first load (no saved data), auto-adds WELCOME60 coupon to `adminDiscountCoupons` localStorage
- On returning user load (saved data exists but `welcomeCouponClaimed` is false), also auto-adds WELCOME60
- Sets `welcomeCouponClaimed: true` to prevent re-adding
- Added field to save/load persistence and useEffect dependency array

### 2. Store.tsx - Cart Coupon Display
- Added "🎫 Your Coupons" section in the cart drawer before the coupon input
- Reads from both `adminDiscountCoupons` and `adminCoupons` localStorage keys
- Filters out disabled, used, and max-uses-reached coupons
- Shows coupon buttons that auto-fill the coupon code on tap

### 3. SpinWheel.tsx - Cart Coupon Display
- Same "🎫 Your Coupons" section added in the SpinWheel cart drawer
- Identical logic: reads available coupons, filters, displays as tappable buttons

### 4. Tournament.tsx - ₹7K/₹15K Weekly Rotation
- Added weekly rotation logic: even weeks = ₹15K pool, odd weeks = ₹7K pool
- Week calculated from Jan 6, 2025 baseline
- New `WEEK_PRIZES_15K` prize distribution (₹3000/₹2500/₹2000/₹1500/₹1000/₹500)
- Entry fee unified to 100 coins for both tournament types
- Added `PARTICIPATION_REWARDS` array (5 spins, 5 magnets, 5 hammers, 50 coins)
- Updated header to show current week type (₹7K or ₹15K)
- Added "Week Type" indicator box in pool/fee section
- Updated "How Tournament Works" to show dynamic prize pool info
- Updated prize distribution to show 100 coins for lower ranks (was 50)
- Added participation rewards section in prize tab

## Files Modified
- `/home/z/my-project/src/hooks/useGame.ts`
- `/home/z/my-project/src/components/game/Store.tsx`
- `/home/z/my-project/src/components/game/SpinWheel.tsx`
- `/home/z/my-project/src/components/game/Tournament.tsx`
