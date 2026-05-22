# Task 1: Fix Admin Panel Full Screen Display

## Agent: admin-panel-fix

## Task
Fix the Admin Panel in CouponCode.tsx to display full screen without bottom cutoff.

## Problem
The admin panel was rendered as an `absolute inset-0 z-20` overlay INSIDE a parent modal that had `max-h-[85vh]`. This meant the admin panel was cut off at the bottom - it looked like a photo placed on top, and the bottom portion was hidden.

## Solution
- Moved the admin panel from a nested overlay inside the main modal to a separate full-screen overlay
- Changed positioning from `absolute inset-0 z-20` to `fixed inset-0 z-[300]`
- Changed modal container to `h-[92vh]` with `flex flex-col` layout
- Replaced `maxHeight: 'calc(85vh - 100px)'` with `flex-1 overflow-y-auto`
- Added `flex-shrink-0` to header and tabs to prevent shrinking
- Added spring animation for enter/exit transitions

## Files Modified
- `/home/z/my-project/src/components/game/CouponCode.tsx`

## Result
- Admin panel now renders as a full-screen overlay at z-[300]
- No more bottom cutoff - panel fills 92vh with proper scrolling
- All admin content (payments, coupons, prices, history) preserved
- Lint check passes with 0 errors
