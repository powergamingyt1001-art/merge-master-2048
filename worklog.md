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

---
Task ID: 2
Agent: Main
Task: Fix Dashboard/Play Again buttons, fair 50/50 gameplay, remove Game Points from Tournament

Work Log:
- Fixed useGame.ts: Changed `generateBotScore` to `generateBotOpponent` (name/avatar only, score=0 at start)
- Added `generateFairBotScore` function: generates bot score at GAME END based on player's actual score with ±30% variance for true 50/50 fairness
- Updated `tickBattleTimer` to generate fair bot score when timer runs out (instead of comparing against pre-generated score)
- Updated `handleMove` to generate fair bot score when game over in bot/coins/tournament modes
- Added `botOpponent` variable tracking in handleMove to update finalScore for display in battle result overlay
- Fixed GameBoard.tsx: Added `onPlayAgain` prop, refactored button handlers
- Created `finalizeGame` helper function (extracted common game finalization logic)
- Fixed `handleBattleEnd`: now calls finalizeGame() + onBackToDashboard() (removed redundant newGame())
- Fixed `handlePlayAgain`: calls finalizeGame() + onPlayAgain() which goes through ad system
- Fixed classic mode "Back to Dashboard": removed redundant newGame() call
- Fixed win overlay "Dashboard" button: removed redundant newGame() call
- Added `handlePlayAgain` in page.tsx: resets game state, then starts new game through ad system
- Removed "Game Points" display from Tournament.tsx play tab
- Removed `gamePoints` prop from Tournament component interface
- Added "Fair play: 50/50 chance, highest score wins!" to tournament rules
- Updated battle mode description to mention fair play

Stage Summary:
- Dashboard button now works: finalizes game → resets state → goes to dashboard
- Play Again now works: finalizes game → shows ad → starts new game of same type
- Fair 50/50 gameplay: bot score generated at game END based on player's actual score
- Game Points removed from Tournament panel (only Coins and Total Pool shown)
- All lint checks pass, dev server compiles successfully
