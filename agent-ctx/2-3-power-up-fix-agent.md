# Task 2-3: Fix Hammer and Magnet Power-ups

## Summary
Fixed both hammer and magnet power-ups in `useGame.ts` and updated hint text in `GameBoard.tsx`.

## Changes Made

### 1. Hammer Power-up (`src/hooks/useGame.ts` lines 1136-1148)
- **Before**: Only destroyed the single clicked tile
- **After**: Destroys clicked tile + all 4 adjacent tiles (up, down, left, right)
- Implementation: Creates `adjacentPositions` array with 5 cells, filters to 4x4 grid bounds, removes all matching tiles

### 2. Magnet Power-up (`src/hooks/useGame.ts` lines 1150-1162)
- **Before**: Found one other tile with same value, merged into doubled tile
- **After**: Finds ALL tiles with same value, removes ALL of them (explode), scores `value * count`
- Implementation: Filters tiles by same value, removes them all, adds score gain = value × count

### 3. Hint Text (`src/components/game/GameBoard.tsx` line 762)
- Hammer: 'Tap tile to destroy' → 'Tap tile to destroy area'
- Magnet: 'Tap tile to merge' → 'Tap tile to explode same numbers'

## Lint Status
✅ `bun run lint` passes with zero errors
