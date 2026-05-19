# Task 5: Add Online/Offline Indicators to Leaderboard Rankings

## Agent: Online/Offline Indicator Agent

## Work Completed

### Changes Made

1. **LeaderboardEntry interface** (`src/components/game/Leaderboard.tsx`)
   - Added `lastActive?: number` field to the interface

2. **isOnline helper function** (`src/components/game/Leaderboard.tsx`)
   - Added `isOnline(lastActive: number | undefined): boolean`
   - Returns `true` if `Date.now() - lastActive < 2 * 60 * 1000` (within 2 minutes)
   - Returns `false` if `lastActive` is undefined or player is offline

3. **buildModesLeaderboard function** (`src/components/game/Leaderboard.tsx`)
   - Updated Firebase player entry to include `lastActive: p.lastActive`

4. **buildCoinsLeaderboard function** (`src/components/game/Leaderboard.tsx`)
   - Updated Firebase player entry to include `lastActive: p.lastActive`

5. **RankRow component** (`src/components/game/Leaderboard.tsx`)
   - Added 8px (`w-2 h-2`) rounded dot indicator between avatar and player name
   - Green dot (`#00E676`) for online players
   - Red dot (`#F65E3B`) for offline players
   - Only affects rank 4+ entries (PodiumSlot for top 3 is unchanged)

### Files Modified
- `/home/z/my-project/src/components/game/Leaderboard.tsx`
- `/home/z/my-project/worklog.md`

### Lint Status
- `bun run lint` passes with zero errors

### Notes
- The `FirebasePlayer` interface already has `lastActive: number` and `syncPlayerToFirebase` already updates it with `Date.now()`, so no Firebase service changes were needed
- Fake/fallback players (when Firebase is unavailable) have no `lastActive` data, so they show as offline (red dot)
- The offline rank tab is unaffected since it doesn't use RankRow or real player data
