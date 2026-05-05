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
