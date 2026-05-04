---
Task ID: 2
Agent: Main Agent
Task: Major game upgrade - Welcome gift, Spin wheel, Login streak, Lives, Power-ups, Ad system

Work Log:
- Rewrote useGame.ts with: lives system (3 hearts), power-ups (5 each), undo limit (5), spin tickets (3), 7-day login streak, welcome gift, coins, localStorage persistence
- Rewrote LoadingScreen - full screen background image with just a loading bar at bottom
- Rewrote PlayDashboard - center Play button, Online (Coming Soon), Battle Mode (Coming Soon) with 2min/5min/10min/6hr modes, Streak + Spin quick access
- Created WelcomeGift component - shows on first load with 5 Blast, 5 Magnet, 5 Hammer, 5 Undo, 3 Spins
- Rewrote SpinWheel - 8 items with weighted probabilities: 2 Blast (13%), 3 Magnet (11%), 1 Blast (18%), 2 Hammer (11%), Re-Spin (7%), 3 Undo (11%), 1 Spin Ticket (16%), 100 Coins (13%)
- Rewrote LoginStreak - 7-day boxes: D1=2 Magnet, D2=2 Spin, D3=1Magnet+1Blast, D4=2 Blast, D5=1Hammer+2Magnet, D6=3Magnet+2Hammer, D7=5 Spin (BIG reward)
- Rewrote RewardedAd - only for revive, 10-sec auto-dismiss timer, cross button, offline gives free revive
- Rewrote GameBoard - lives+powerups next to each other, derived state for stuck/gameover, internet detection, mobile direction buttons
- Fixed all lint errors (setState in effects, access-before-declaration, hook rules)
- Internet detection: if online → show ads, if offline → free rewards (no ads)

Stage Summary:
- Complete game with all requested features
- Files: useGame.ts, LoadingScreen.tsx, PlayDashboard.tsx, GameBoard.tsx, Tile.tsx, RewardedAd.tsx, SpinWheel.tsx, LoginStreak.tsx, WelcomeGift.tsx, BannerAd.tsx, page.tsx
- All lint checks pass clean
