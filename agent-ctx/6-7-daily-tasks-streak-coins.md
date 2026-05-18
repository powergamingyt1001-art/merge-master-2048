# Task 6-7: Daily Tasks Overhaul + Streak Coin Claims

## Agent: Daily Tasks & Streak Coins Agent

## Status: COMPLETED

## Files Modified
1. `/home/z/my-project/src/hooks/useGame.ts` - Game state and logic
2. `/home/z/my-project/src/components/game/LoginStreak.tsx` - Streak UI
3. `/home/z/my-project/src/components/game/PlayDashboard.tsx` - Dashboard (props + task UI)
4. `/home/z/my-project/src/app/page.tsx` - Main page (pass new props)

## Changes Summary

### Part A: Enhanced Daily Tasks
- DailyTask interface: added `rewardType` and `rewardCount` fields
- generateDailyTasks(): now creates 6 varied tasks from 12 templates (3 categories)
- Task tracking updated in addGameToHistory, activatePowerUp, handleTileClick, useSpinTicket
- completeVisitWebsiteTask handles both visit1 and visit2 task IDs
- claimDailyTask handles bomb/hammer/magnet/spin reward types
- streakAdBonusClaimed + streakAdBonusDate added to GameState
- claimStreakAdBonus() function added (100 coins, once per day)

### Part B: Streak Ad Bonus
- LoginStreak: added +100 Coins ad button with visibilitychange tracking
- PlayDashboard: passes new props to LoginStreak
- page.tsx: passes claimStreakAdBonus callback

## Lint Status
- All modified files pass lint with zero errors
- Pre-existing errors in CouponCode.tsx and Store.tsx (not from this task)
