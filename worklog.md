---
Task ID: 8+9+10
Agent: Friends + Leaderboard + History Agent
Task: Implement Friends play modes, Coin leaderboard 4-6 boxes, History delete, Admin Save

Work Log:
- Added Friends panel to PlayDashboard.tsx with full functionality:
  - Search by UID to add friends (using Firebase searchPlayerByUserCode)
  - Send friend requests via Firebase (sendFriendRequest)
  - Accept/Decline friend requests with real-time updates (onFriendRequestsUpdate)
  - Friends list with Play button showing 3 modes: ⚔️ Battle, 🎮 Classic, 🪙 Coin
  - Plus (+) invite button next to each friend
  - Friend request count indicator on Dashboard header (Users icon with badge)
  - Friends button in quick actions row with friend count and request badge

- Added 4th-6th position boxes in Leaderboard.tsx:
  - Battle tab: 4th-6th shown as 3-column grid boxes between podium and list
  - Coins tab: 4th-6th shown as 3-column grid boxes between podium and list
  - Empty positions display dashed border boxes with "Empty" label
  - Player's own position highlighted with gold/battle color border
  - List now starts from 7th position onwards (was 4th before)

- Added history delete and Clear All in ProfilePanel.tsx:
  - Each history entry has X delete button (top-right corner)
  - "🗑️ Clear All" button in history header (visible when entries exist)
  - Added onDeleteGameHistory and onClearGameHistory props
  - Props wired through PlayDashboard.tsx to page.tsx to useGame.ts

- Added deleteGameHistory and clearGameHistory to useGame.ts:
  - deleteGameHistory(id) removes single entry by ID
  - clearGameHistory() clears all game history
  - Both update state and persist via localStorage

- Added floating Save All button in CouponCode.tsx admin panel:
  - Fixed position bottom-right corner when admin panel is open
  - Uses existing handleSaveAllAdmin function
  - Shows save confirmation message (✓ Saved!)
  - Gradient styling matching app theme (EDC22E → FF7A00)

Stage Summary:
- Friends can be played with in Battle/Classic/Coin modes via dropdown
- Friend requests shown with Accept/Cancel buttons and badge indicator
- Leaderboard shows special 4-6 position boxes with empty state
- Game history can be individually deleted or cleared entirely
- Admin panel has floating Save All button at bottom-right
- All ESLint checks pass
