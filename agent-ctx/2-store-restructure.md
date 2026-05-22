# Task 2: Store Restructure Agent

## Task
Restructure the Store's Ability tab - Move 5x/2.5x multipliers to top, regular coin abilities to bottom, remove Free Reward Ad section.

## File Analyzed
`/home/z/my-project/src/components/game/Store.tsx` (899 lines)

## Findings
The file already matches the desired structure:

### AbilityTab Order (lines 321-379)
1. **5x Multiplier (₹)** — lines 324-340 ✅ Already first
2. **2.5x Multiplier (₹)** — lines 342-358 ✅ Already second
3. **Regular Abilities (Coins)** — lines 360-376 ✅ Already at bottom

### Free Reward Ad Section
- Not present in the current file
- No `canWatchAd` state variable found
- No `handleWatchAd` callback found
- No `Tv` import from lucide-react
- No `canWatchFreeAd` function found

### Import Verification
Line 5: `import { X, Coins, Zap, Clock, MessageCircle, AlertCircle } from 'lucide-react'`
- All imports are actively used in the component
- No unused imports to clean up

## Code Changes
**None required** — the file is already in the desired state.

## Lint Status
✅ `bun run lint` passes with 0 errors
