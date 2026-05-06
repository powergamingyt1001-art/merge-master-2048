---
Task ID: 1
Agent: Main
Task: Fix dashboard back button, add ad system, verify all pending tasks

Work Log:
- Read and analyzed PlayDashboard.tsx, useGame.ts, page.tsx, GameBoard.tsx
- Found root cause: handleBackToDashboard in page.tsx only called setPhase('dashboard') without resetting game state
- Fixed by adding game.goBackToDashboard() call in handleBackToDashboard
- Added full ad system: interstitial ad (5s) on every game start, app open ad (8s) after every 2 games
- Updated InterstitialAd component to support isAppOpen prop with different styling
- Verified weeklyBonusClaimed crash fix is already in place (line 92 PlayDashboard.tsx with default value)
- Verified 5-4-3-2-1 countdown is already removed (GameBoard.tsx line 533)
- Verified weekly bonus = 400 coins (useGame.ts line 1203)
- Verified tournament prizes are correct (Tournament.tsx has 7k pool, 1st=700, 2nd=400, 3rd=250, 4th=150, 5th=100, 6th+=50+2spins, non-ranked=3spins)
- Verified resetAllData function exists with welcomeClaimed: false reset
- Lint passes clean, no runtime errors

Stage Summary:
- Dashboard back button now properly resets game state before navigating
- Ad system implemented: 5s interstitial on game start, 8s app open ad every 2 games
- All previous crash issues resolved
- All configuration values verified correct
