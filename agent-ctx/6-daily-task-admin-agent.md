# Task 6: Daily Task Creation in Admin Panel + Random Button

## Summary
Added daily task creation functionality to the admin panel, a "Random" button in the Room Fight Join section, and integration between admin custom tasks and the game's daily task system.

## Changes Made

### 1. CouponCode.tsx - Admin Panel Tasks Tab
- Added `'tasks'` to the `AdminTab` type union
- Added `AdminDailyTask` interface with fields: id, name, description, action, requiredCount, rewardType, rewardAmount, active, createdAt
- Added `loadAdminDailyTasks()` and `saveAdminDailyTasks()` functions using localStorage key `adminDailyTasks`
- Added state variables for task creation form (newTaskName, newTaskDesc, newTaskAction, newTaskCount, newTaskRewardType, newTaskRewardAmount, newTaskActive)
- Added `adminDailyTasks` state initialized from localStorage
- Added 'Tasks' tab in both desktop and mobile footer navigation
- Added Tasks tab content with:
  - Create task form (name, description, action selector, required count, reward type, reward amount, active toggle)
  - Existing tasks list with delete and toggle active/inactive buttons
  - Clear All button
  - Empty state message when no tasks exist
  - Partner-restricted access (admin only)
- Exported `AdminDailyTask` interface, `loadAdminDailyTasks()`, and `saveAdminDailyTasks()` functions

### 2. ProfilePanel.tsx - Random Button in Join Room
- Replaced the standalone "Random Match" button with a row containing both "Join" and "🎲 Random" buttons
- Added room code input field for joining specific rooms
- "Join" button (green gradient) triggers join by room code
- "🎲 Random" button (orange gradient, matching spec) triggers `handleJoinRandom` for random matchmaking
- Maintained search animation state when searching

### 3. useGame.ts - Admin Custom Tasks Integration
- Modified `generateDailyTasks()` to check for admin custom tasks first
- If active admin tasks exist in localStorage (`adminDailyTasks`), they are mapped to `DailyTask` format
- Action mapping: play_battle→play, play_classic→play, watch_ad→visit, visit_store→visit, spin_wheel→spin, win_battle→play
- Reward type mapping: coins→coins, spins→spin, hammer→hammer, magnet→magnet, blast→blast, timer→extraTime
- If no active admin tasks, falls back to existing default random task generation

## Files Modified
- `/home/z/my-project/src/components/game/CouponCode.tsx`
- `/home/z/my-project/src/components/game/ProfilePanel.tsx`
- `/home/z/my-project/src/hooks/useGame.ts`
