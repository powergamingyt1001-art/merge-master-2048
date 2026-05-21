# Task 6 - Level System Redesign + Daily Rewards Cycling + Tournament/Store Room Cards

## Agent: Main Agent

## Summary
Completed all 4 sub-tasks (A-D) plus profile panel updates and prop wiring.

## Changes Made

### A. Level System Redesign (useGame.ts)
- `calculateTournamentPoints`: `points = 1` per tournament game (was `Math.floor(score / 20)`)
- Level XP: `levelXP += Math.floor(points / 3)` (3 points = 1 SP)
- Removed carryOver (not needed with fixed 1 point per game)
- Added `streakWeek: number` to GameState
- Added `addRoomCards(count)` callback
- Updated both `calculateTournamentPoints` and `tickBattleTimer` tournament calculations

### B. Daily Rewards Cycling (LoginStreak.tsx)
- Complete rewrite with `getRotatedRewards(streakWeek)` function
- Days 1-5 rotate forward each week, Day 6 = Room Card, Day 7 = 5x + 2.5x + coins
- Coins increase by (streakWeek - 1) * 100 each week
- Added streakWeek prop and week display

### C. Tournament 1st Place: 2 Room Cards (Tournament.tsx)
- Added `roomCards: 2` to 1st place prize
- Display "+2 🃏" badge in prize tab
- Updated "How Tournament Works" text

### D. Daily Store: Free Room Card on 7th Day (Store.tsx)
- Added 7-day consecutive visit tracking via localStorage
- "Daily Free" section at top of ability tab with progress dots
- "Claim Free Room Card" button requires ad watch
- Can only claim once per day
- Added `onAddRoomCards` prop to Store

### E. Profile Panel Updates (ProfilePanel.tsx)
- Updated level bonus text: "Guaranteed coins + 2 random abilities!"
- Updated "How Leveling Works" section with new system

### F. Prop Wiring (PlayDashboard.tsx, page.tsx)
- Added `streakWeek` and `onAddRoomCards` props
- Passed through to LoginStreak and Store components

## Lint: 0 errors
