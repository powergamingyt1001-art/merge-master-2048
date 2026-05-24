# Task 2: Fix Like System, Leaderboard Rank Lines, and AI Bot Names

## Work Record

### 1. Fixed Like System (Critical Bug)

**Problem**: The like system was broken due to a double-call bug in Leaderboard.tsx. When a user clicked "Like" in the leaderboard's player profile overlay, it called both `addLike()` directly AND `onLikeProfile()` (which internally calls `transferLike()`). This caused redundant Firebase operations and inconsistent state.

**Changes in Leaderboard.tsx**:
- Replaced `addLike` import with `transferLike` and `onLikeCountUpdate`
- Changed the like button handler to use `onLikeProfile` (which calls `transferLike`) for liking instead of calling `addLike` directly
- For unliking, kept `removeLike` directly
- Removed the optimistic `setLikeCount(prev => prev + 1)` since the real-time Firebase listener now handles count updates
- Added a real-time `onLikeCountUpdate` listener for the selected player's profile overlay, so the like count updates in real-time when viewing a player's profile
- The `onLikeCountUpdate` listener is properly cleaned up when the selected player changes or the component unmounts

**Root cause**: The original code called both `addLike(playerId, pid)` AND `onLikeProfile(pid)` (which calls `transferLike`). While `transferLike` would return early if the like already existed (set by `addLike`), this created confusion and the local like count was only optimistically updated without Firebase real-time sync.

### 2. Fixed Leaderboard Rank Lines (4th-6th Position)

**Problem**: The rank lines between the position number and player name were too long (spanning full width with `flex-1`).

**Changes in Leaderboard.tsx** (both Battle and Coins tabs):
- Changed the line from `flex-1 mx-2` (full width) to `mx-1 flex-shrink-0` with fixed `width: '16px'` (about 15-16px)
- Reduced the position number circle from `w-7 h-7` to `w-5 h-5` for compactness
- Reduced font size in circle from `text-[9px]` to `text-[7px]`
- Reduced avatar size from `text-sm` to `text-xs`
- Reduced padding from `px-2.5 py-1.5` to `px-2 py-1` and gap from `gap-1.5` to `gap-1`
- Reduced bottom margin from `mb-1.5` to `mb-1`

### 3. Updated AI Bot Names

**Changes in useGame.ts**:
- Replaced 25 generic "Name + Number" bot names (like "Aero 4", "Blaze 7") with 20 distinct Indian-style names:
  - Rahul, Priya, Arjun, Ananya, Vikram, Meera, Karan, Ishita, Rohan, Simran
  - Dev, Nisha, Aryan, Pooja, Aditya, Kavita, Varun, Sneha, Manish, Divya
- Each name is unique and natural-sounding

### 4. Adjusted Bot Win Rate to ~45%

**Changes in useGame.ts** (`generateFairBotScore`):
- Added a 10% negative bias to the bot score distribution: `const bias = -base * 0.10`
- This centers the bot's score distribution 10% below the player's score
- Combined with the ±30% variance, this gives the player approximately a 55% win rate (bot wins ~45%)
- Real-time PvP matchmaking remains 50-50 (no changes there)

### 5. Added Opponent Name to Game History

**Changes**:
- Added `opponentName?: string` field to `GameHistoryEntry` interface in useGame.ts
- Updated `addGameToHistory` callback to accept and store `opponentName` parameter
- Updated `GameBoard.tsx` to pass `botOpponent?.name` as the opponent name when creating history entries
- Updated `ProfilePanel.tsx` history display to show the actual bot name instead of generic "BOT"

## Files Modified
- `src/components/game/Leaderboard.tsx` - Like system fix, rank lines compacting
- `src/hooks/useGame.ts` - Bot names, win rate, GameHistoryEntry with opponentName
- `src/components/game/GameBoard.tsx` - Pass opponent name to addGameToHistory
- `src/components/game/ProfilePanel.tsx` - Display opponent name in history

## Lint Status
- All changes pass ESLint
- No new TypeScript errors introduced in modified files
