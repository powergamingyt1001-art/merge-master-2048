---
Task ID: 1
Agent: Main Agent
Task: Implement all critical fixes for Merge Master 2048 Challenge

Work Log:
- Read all current key files (GameBoard.tsx, Tournament.tsx, PlayDashboard.tsx, useGame.ts, InterstitialAd.tsx, BannerAd.tsx, RewardedAd.tsx, LoadingScreen.tsx, SpinWheel.tsx, WelcomeGift.tsx, ProfilePanel.tsx, page.tsx, admob.ts)
- Fixed useGame.ts: Added 100 coins welcome bonus, improved combo system with 2x/3x multiplier labels
- Fixed GameBoard.tsx: Mine-style timer with GREEN→MID→RED+BLINK at last 10 seconds, bigger countdown numbers, progress bar, blinking warning indicator
- Fixed Tournament.tsx: Restructured Join→Play flow - Play button directly replaces Join button after joining, compact stats
- Fixed PlayDashboard.tsx: Added PLAY TOURNAMENT button on dashboard when tournament is joined
- Fixed WelcomeGift.tsx: Added 100 coins to welcome gift display
- Fixed InterstitialAd.tsx: Duration prop (8s for app open, 5s for interstitial), progress bar, proper reset logic
- Fixed page.tsx: App open ad 8 seconds, interstitial after game 5 seconds
- Fixed lint errors: setState in effects, ref access during render, unused imports
- Verified all code compiles without lint errors

Stage Summary:
- Timer now shows mine-style countdown: GREEN at start → YELLOW/ORANGE in middle → RED with BLINKING at last 10 seconds
- Tournament flow: Join button → click Join → Play button appears (both in panel AND on dashboard)
- Welcome bonus now includes 100 coins
- Combo system: 2x for 2 consecutive merges, 3x for 3+ consecutive merges (mods only, NOT tournament)
- App open ad: 8 seconds with progress bar
- Interstitial ad: 5 seconds after going back to dashboard from game
- Rewarded ad: In Lucky Spin (already was there)
- LoadingScreen/Intro: Kept as original flash/intro style (no timing/countdown in intro)

---
Task ID: 5
Agent: Main Agent
Task: FIX TIMER VISIBILITY - Create GameContext + Rewrite timer UI EXACTLY per HTML reference

Work Log:
- Diagnosed ROOT CAUSE (again): GameBoard.tsx still had `const game = useGame()` creating SEPARATE state
- Created /src/context/GameContext.tsx with GameProvider and useGameContext hook
- Rewrote /src/app/page.tsx to wrap everything in GameProvider
- Completely rewrote /src/components/game/GameBoard.tsx:
  - Uses useGameContext() instead of useGame() - NOW shares same state as page.tsx
  - Timer UI EXACTLY like user's HTML reference:
    - Timer text: fontSize 28, bold, white (or colored when blinking), monospace
    - Layout: [SCORE] [TIMER] on top row
    - Loading bar: 90% width, 10px height, #333 background, rounded corners
    - Bar decreases left→right based on progress = timeLeft / totalTime
    - Colors: >60% GREEN (#00e676), 30-60% YELLOW (#ffeb3b), 15-30% ORANGE (#ff9800), <15% RED (#ff3d00)
    - Blink animation on BOTH timer text AND bar when <15% (timerBlink keyframes)
  - Final countdown 5-4-3-2-1 overlay preserved
  - Hearts/lives row below loading bar
  - Ad control per mode preserved
  - Background color matches user's reference: #1e1b3a
- Added missing optional props to PlayDashboard.tsx interface (dailyTasks, weeklyBonus, etc.)
- All lint checks pass, dev server compiles successfully

Stage Summary:
- ROOT CAUSE FIXED: GameBoard now uses GameContext instead of creating its own useGame()
- Timer + Loading bar WILL NOW BE VISIBLE because gameMode and battleTimer are correctly shared
- Timer UI matches user's HTML reference EXACTLY (simple text + thin bar + blink)
- Colors match: GREEN >60%, YELLOW 30-60%, ORANGE 15-30%, RED+BLINK <15%
- Background: #1e1b3a (matches user's reference)

---
Task ID: 1
Agent: main
Task: Fix multiple game issues per user request

Work Log:
- Removed the "final countdown 5-4-3-2-1" overlay from GameBoard.tsx that was wasting user's 5 seconds during battle mode
- Added weeklyBonusClaimed state to useGame.ts with 400 coins reward (resets weekly)
- Added claimWeeklyBonus function to useGame.ts
- Added Weekly bonus button (🎁 Weekly / 400 💰) to PlayDashboard Quick Actions
- Fixed Tournament component to always use 7000 pool instead of switching to 15K after week 3
- Added resetAllData function to useGame.ts that clears all data to 0 with fresh invite code
- Added DailyTask type and claimDailyTask function to useGame.ts
- Added Reset All Data button to ProfilePanel with confirmation dialog
- Updated PlayDashboard to pass onResetAllData prop to ProfilePanel
- Weekly bonus resets every week along with tournament
- Reset preserves welcome bonus availability (welcomeClaimed = false)

Stage Summary:
- Final countdown overlay (5-4-3-2-1) completely removed from game board
- Weekly bonus = 400 coins, claimable once per week via 🎁 Weekly button
- Tournament always shows 7K prize pool
- Reset All Data available in Profile settings
- Welcome bonus still works after reset
- All lint checks pass
