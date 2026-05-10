---
Task ID: 1
Agent: Main Agent
Task: Switch from AdSense to Adsterra ads, fix layout, remove extra boxes

Work Log:
- Fixed git merge conflict that was blocking all tools (git rebase --abort resolved it)
- Read all current project files (PlayDashboard, BannerAd, MultiplexAd, InterstitialAd, AdComponents, RewardedAd, useAds, adsense.ts, admob.ts, FooterPages, GameBoard, page.tsx, layout.tsx)
- Deleted all old AdSense/AdMob files: BannerAd.tsx, MultiplexAd.tsx, InterstitialAd.tsx, AdComponents.tsx, RewardedAd.tsx, useAds.tsx, adsense.ts, admob.ts
- Created new Adsterra ad component: src/components/ads/AdsterraAds.tsx with all 9 ad types
- Updated layout.tsx: Added Adsterra Popunder + Social Bar scripts via next/script
- Updated page.tsx: Removed InterstitialAd, simplified game flow (no more ad phase), added AdsterraPopunder and AdsterraSocialBar components
- Rewrote PlayDashboard.tsx: Removed old BannerAd/MultiplexAd imports, added Adsterra ad placements in proper positions (top 320x50, native banner, 300x250, 468x60, 160x300+160x600, bottom 728x90)
- Updated FooterPages.tsx: Changed "Google AdSense" to "Adsterra" in privacy policy
- Fixed dev server startup (changed package.json dev script from `tee` to direct output)
- Verified build succeeds (next build ✅)
- Verified dev server runs and returns HTTP 200

Stage Summary:
- All AdSense ads completely removed
- All 9 Adsterra ad scripts integrated: Popup, Native Banner, Social Bar, 728x90, 300x250, 160x600, 160x300, 468x60, 320x50
- Game structure preserved as user requested
- No more InterstitialAd blocking gameplay
- No extra boxes below invite section
- Ads placed at top, middle content areas, and bottom - not blocking game controls
- Dev server running on port 3000
