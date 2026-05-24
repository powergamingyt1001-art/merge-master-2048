---
Task ID: 8+9+10
Agent: Friends + Leaderboard + History Agent
Task: Implement Friends play modes, Coin leaderboard 4-6 boxes, History delete, Admin Save

Files Modified:
1. src/components/game/PlayDashboard.tsx
   - Added imports for firebase friend functions, X, UserPlus, ChevronDown
   - Added showFriends state and friend-related state (friendsList, friendRequests, etc.)
   - Added real-time listeners for friends and friend requests
   - Added handleFriendSearch, handleSendFriendReq, handleAcceptRequest, handleDeclineRequest
   - Added Users icon with request count badge in top bar
   - Changed quick actions row 2 from 2-col to 3-col (added Friends button)
   - Added full Friends Panel modal with search, requests, and friends list
   - Added onDeleteGameHistory, onClearGameHistory props
   - Passed new props to ProfilePanel

2. src/components/game/Leaderboard.tsx
   - Battle tab: Added 4th-6th position boxes grid after podium, list now starts from 7th
   - Coins tab: Added 4th-6th position boxes grid after podium, list now starts from 7th
   - Empty positions show dashed border with "Empty" label

3. src/components/game/ProfilePanel.tsx
   - Added onDeleteGameHistory, onClearGameHistory props
   - Added "🗑️ Clear All" button in game history header
   - Added X delete button on each history entry (absolute positioned)

4. src/components/game/CouponCode.tsx
   - Added floating Save All button (fixed bottom-right) visible when admin panel is open

5. src/hooks/useGame.ts
   - Added deleteGameHistory(id) callback
   - Added clearGameHistory() callback

6. src/app/page.tsx
   - Added onDeleteGameHistory and onClearGameHistory prop wiring

Stage Summary:
- Friends panel with Play modes (Battle/Classic/Coin), invite buttons, requests
- Friend request badge indicator on dashboard
- Leaderboard 4-6 position boxes with empty states
- History individual delete and Clear All
- Floating Save All button in admin panel
