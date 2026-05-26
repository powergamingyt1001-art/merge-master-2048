# Task 4 - Update InvitePanel and Coin Game Matchmaking

## Summary
Updated InvitePanel with real Firebase UID search, friend request system, and matchmaking for coin games.

## Files Modified
1. **src/lib/firebase-service.ts** - Added friend system (search, send/accept/reject requests, real-time listeners) + matchmaking pool system
2. **src/components/game/InvitePanel.tsx** - Complete rewrite: removed mock data, real Firebase search, Game Friends/Requests tabs, friend requests with bell notifications
3. **src/components/game/PlayDashboard.tsx** - Coin games now prioritize real player matchmaking via Firebase, bot fallback preserved
4. **src/components/game/Leaderboard.tsx** - Added Like ❤️ and Add Friend ➕ buttons on player profile overlay
5. **src/hooks/useGame.ts** - Registers userCode mapping for fast Firebase search

## Key Features
- Real-time Firebase UID search (debounced, auto-search on typing)
- Friend requests: send, accept, reject with Firebase persistence
- Bell 🔔 notification for pending friend requests
- Game Friends / Requests sub-tabs
- Coin game matchmaking pool at /matchmaking/{fee}/
- "🟢 Real Player" badge when matched with real player
- Bot fallback when no real player available
- Leaderboard profile shows Add Friend button
