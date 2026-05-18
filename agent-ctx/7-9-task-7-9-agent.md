# Task 7 + 9: Store Pricing Overhaul + Payment System Overhaul

## Agent: Task 7+9 Agent

## Summary
Verified and enhanced the Store pricing and payment system. Most features were already implemented from prior work; added copy-to-clipboard for UPI ID, enhanced QR code placeholder, and updated the admin panel (CouponCode.tsx) to correctly handle new INR ability purchases and updated coin package amounts.

## Changes Made

### Store.tsx
- Added `Copy`, `Check` icons from lucide-react; removed unused `QrCode` import
- Removed unused `WHATSAPP_NUMBER` constant
- Added `upiCopied` state for copy-to-clipboard feedback (2s auto-reset)
- Enhanced QR code placeholder: replaced simple icon with styled div simulating QR code pattern (3 corner squares + data area dots)
- Added copy button next to UPI ID in payment dialog with Check/Copy icon toggle feedback

### CouponCode.tsx
- Updated `PurchaseHistoryEntry` interface: added `'inr_ability'` type, `buyerName`, `screenshotDataUrl`, `coinAmount`, `abilityType`, `abilityCount` fields
- Updated `handleApprovePurchase`: handles `inr_ability` type separately (no wrong coin grants), uses `entry.coinAmount` for coin purchases
- Updated `getCoinAmountFromItem`: added new INR coin package amounts, kept legacy for backward compatibility
- Admin panel pending purchases: shows "⚡ Ability: 5x × N" for inr_ability entries, screenshot upload indicator
- Updated name display: `entry.buyerName || entry.name` for backward compat

## Lint Status
Passes with no errors
