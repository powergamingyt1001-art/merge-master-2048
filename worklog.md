---
Task ID: 3
Agent: Main Agent
Task: Fix SpinWheel component and update Leaderboard component

Work Log:

## Part A: SpinWheel Fixes

### Issues fixed:
1. **Dead 500 coin spin**: Removed the broken `SPIN_COUNTS = [1, 2, 3, 5, 10]` which created odd pricing (300, 450 coins). Changed to `[1, 5, 10]` with clean pricing: 1 spin=150 coins, 5 spins=750 coins, 10 spins=1500 coins.

2. **Free spins logic**: 10 spins for 1500 coins now gives 12 spins total (2 FREE). The "10+2" label is shown in the selector with a green "FREE" badge. Info text clearly shows "+2 FREE 🎉" for both ticket and coin modes.

3. **Show available spins based on coin balance**: 
   - Added `affordableSpins = Math.floor(coins / 150)` calculation
   - Balance display now shows "Available spins: X" count
   - Added "Your coins can buy up to X spins" info text in coin mode
   - Shows "(10+2 FREE deal available!)" when user can afford 10+ spins

4. **Smart affordability fallback**: Used `useMemo` to compute `effectiveMultiplier` - if user's selected spin count is unaffordable, automatically falls back to the highest affordable option. Avoided `useEffect` + `setState` pattern that violates React hooks rules.

5. **Kept all existing functionality**: 
   - Free spin button for watching ads (📺 Watch Ad for Free Spin)
   - Adsterra ad integration at bottom
   - SpinWheelAd overlay for ad watching
   - All prize pool logic, wheel animation, claim flow unchanged

### Technical changes:
- Changed `useEffect` import to `useMemo` for the effective multiplier computation
- `spinMultiplier` state remains as user's selected value
- `effectiveMultiplier` is computed via `useMemo` as the actual usable multiplier
- All UI and logic references updated to use `effectiveMultiplier`
- Removed unused `actualSpins` variable
- Cost labels: 10x now shows "1500🪙" instead of "1500🪙" (same but explicit)

## Part B: Leaderboard Updates

### Changes made:
1. **Renamed "Weekly" tab to "Battle"**: Changed the first tab label from "Weekly" to "Battle" with ⚔️ icon emphasis. Updated the reset indicator to say "⚔️ Battle Mode — Resets every Monday" instead of "🔄 Resets every Monday".

2. **Enhanced player profile popup**: Complete redesign of the profile overlay from a basic 4-line display to a full read-only profile:
   - Avatar with level badge (colored ring based on level)
   - Player name with "(You)" indicator for current player
   - Level title capsule (Lv.X + title + icon) using `getLevelInfo`
   - Online/Offline status indicator ("Online Now" / "Offline")
   - 2x2 stats grid: Classic Best, Battle Score, Coins, Level XP
   - Tournament Points bar
   - Level progress bar with XP thresholds
   - Like button (❤️ heart) with toggle state

3. **Online indicator on PodiumSlot**: Added green/gray dot overlay on avatar for top-3 podium players showing online status.

4. **Online indicator on RankRow**: Already existed, kept with minor improvement (current player shows gold dot instead of red when offline).

5. **Profile overlay is READ-ONLY**: No edit name/avatar, no Create Room, no Theme toggle, no Reset button - just stats display and Like button.

### Technical changes:
- Added imports: `Zap`, `Shield` from lucide-react, `getLevelInfo`, `getLevelThreshold` from useGame
- Added `selectedFirebasePlayer` lookup from `firebasePlayers` array using `selectedPlayer.playerId`
- Added `selectedLevel`, `selectedLevelInfo`, `onlineStatus` computed values
- Profile overlay width increased from `w-64` to `w-72` for better stats display
- Added `max-h-[80vh] overflow-y-auto` for scrollable profile on small screens
- Added `hover:bg-white/5` transition on RankRow for better UX
- Kept all Firebase real-time listeners (`onLeaderboardUpdate`)
- Kept deduplication logic in `buildModesLeaderboard` and `buildCoinsLeaderboard`

## Lint Results
- 0 errors, 0 warnings after all changes
- Fixed React hooks `set-state-in-effect` error by switching from `useEffect` to `useMemo` for affordability computation

Stage Summary:
- SpinWheel: Clean pricing (150/750/1500), 10+2 FREE spins deal, affordable spins display
- Leaderboard: "Battle" tab, rich read-only player profiles, online indicators everywhere
- All existing functionality preserved (ads, Firebase, prizes, etc.)
