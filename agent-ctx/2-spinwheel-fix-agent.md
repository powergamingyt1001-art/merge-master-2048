# Task 2: SpinWheel Fix Agent

## Task
Fix spin wheel pointer landing between slices + Add multi-spin feature

## Files Modified
1. `/home/z/my-project/src/components/game/SpinWheel.tsx` - Main fix + new features
2. `/home/z/my-project/src/components/game/PlayDashboard.tsx` - Handle unhandled prize types

## Key Changes

### 1. Rotation Calculation Fix (SpinWheel.tsx)
- **Problem**: Pointer landed between two slices 50/50, giving wrong prize
- **Root Cause**: Old formula `rotation + 360 * 5 + (360 - targetSliceCenter)` accumulated rotation without snapping, causing floating-point drift
- **Fix**: New formula `baseRotation + fullRotations + (360 - targetAngle)` where `baseRotation = Math.ceil(rotation / 360) * 360`
- **Added**: Random offset within ±25% of slice half-width to avoid edge hits
- **Added**: Random 5-7 full rotations for variety

### 2. Multi-Spin Feature (SpinWheel.tsx)
- Spin count selector: [1x] [2x] [3x] [5x] [10x]
- 10x gives 1 bonus spin (11 total)
- Buttons dim when user can't afford
- Multi-spin: decorative wheel spin → animated results grid
- Results grid: 4-column, staggered reveal (250ms per box), flip animation
- "CLAIM ALL" button after all revealed
- Single spin (1x): Same behavior as before

### 3. Timeout Management (SpinWheel.tsx)
- `timeoutRefs` tracks all setTimeout IDs
- `clearPendingTimeouts()` cancels on spin start or modal close
- Prevents stale state race conditions

### 4. Auto-Claim on Close (SpinWheel.tsx)
- `handleClose` auto-claims unclaimed prizes when user closes modal
- Prevents prize loss from accidental close

### 5. Unhandled Prize Types (PlayDashboard.tsx)
- `multiply5` → 500 coins
- `multiply2_5` → 250 coins
- `timeExtend` → 150 coins
- Notification shows conversion text

## Lint Status
✅ No errors, no warnings
