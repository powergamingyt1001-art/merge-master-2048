---
Task ID: 4+5
Agent: Room & Spin Fix Agent
Task: Fix Room Fight coin options, tax, timer, abilities + Remove spin coin purchase

Work Log:
- Changed room coin options from 100/200/500 to 1K/10K/20K/50K/75K/1L range
- Separated COIN_OPTIONS and ABILITY_OPTIONS into distinct arrays
- Added timer options (30/60/90/120 sec) with selectedTimer state defaulting to 60s
- Changed tax from 20% to 5% in Info tab (all 3 references updated)
- Added minimum 100 coins check for create room, join room, and random match
- Added max 2 abilities selection limit with notification when exceeded
- Added friend invite in room creation with onFriendsUpdate from firebase-service
- Friend list dropdown with auto-fill opponent UID on selection
- Added playerId prop to RoomFight component and PlayDashboard integration
- Removed COIN_COST_PER_SPIN constant from SpinWheel
- Removed spinMode state and all 'coin' mode logic from SpinWheel
- Removed coin mode toggle UI from SpinWheel
- Updated effectiveMultiplier, canAffordSpin to only use ticket mode
- Updated handleSpin to only deduct tickets (removed coin deduction path)
- Updated spin button text to only show ticket cost
- Removed coin-related info displays (coin spin counts, coin mode info)
- Kept ticket spins, free daily spins, INR packs, and ad-based spins
- Verified no card-type prizes exist in PRIZE_POOL (already clean)
- Lint passes with no errors

Stage Summary:
- Room Fight now has proper coin options (1K to 1L)
- Tax is 5% (was 20%)
- Timer options available (30/60/90/120 sec) with default 60s
- Max 2 abilities selectable with notification on limit
- Friend invite available in room creation
- Min 100 coins required to create/join/play rooms
- Spin wheel only uses tickets/INR packs (no coin purchase mode removed)
- All changes lint clean
