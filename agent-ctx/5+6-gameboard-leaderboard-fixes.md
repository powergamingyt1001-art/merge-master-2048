# Task 5+6: GameBoard Abilities + Leaderboard Reset

## Task 6: GameBoard abilities bigger with effects

### Changes to OvalAbilitySlot component in GameBoard.tsx

- **Button size**: width 86→100, height 44→52, borderRadius 22→26
- **Icon size**: 18→22
- **Label fontSize**: 9→10, marginLeft 3→4
- **Count badge**: fontSize 9→10, top -6→-7, right -3→-4, minWidth 16→18, height 16→18, borderRadius 8→9, padding 0 3px→0 4px
- **Active border**: 2px→2.5px
- **Idle glow**: Added `idleGlow = 0 2px 8px rgba(0,0,0,0.3), 0 0 6px ${glowColor}15`
- **Press effect**: whileTap scale changed from 0.85→0.9 (active:scale-90)
- **Hover effect**: Enhanced shadow with `0 0 12px ${glowColor}50, 0 0 24px ${glowColor}25, 0 4px 12px rgba(0,0,0,0.2)`
- **Transition**: Added `box-shadow 0.25s` to style transition
- **Empty slot**: Updated to 100x52 to match new button size
- **Row gap**: 10→12
- **Section gap**: 6→8

## Task 5: Leaderboard Reset Logic in useGame.ts

### New constants/functions added

- `LEADERBOARD_RESET_KEY` = 'mergeMaster2048_leaderboardResets'
- `LeaderboardResets` interface with weeklyLastReset, monthlyLastReset, yearlyLastReset
- `loadLeaderboardResets()` - loads from localStorage, defaults to now
- `saveLeaderboardResets()` - saves to localStorage
- `needsWeeklyReset()` - checks if last reset was before most recent Monday midnight
- `needsMonthlyReset()` - checks if last reset was before 1st of current month
- `needsYearlyReset()` - checks if last reset was before January 1st of current year

### Integration in useGame hook

- Reset checks run in `useState` initializer (not useEffect, to avoid lint error)
- Weekly reset: resets bestScore, modBestScore to 0
- Monthly reset: resets modBestScore to 0
- Yearly reset: resets bestScore, modBestScore to 0
- Timestamps saved after any reset occurs
- Works alongside existing leaderboardMonth/leaderboardYear logic
