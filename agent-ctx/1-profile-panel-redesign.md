---
Task ID: 1
Agent: Profile Panel Redesign Agent
Task: Redesign ProfilePanel component with 11 specific changes

Work Log:
- Read worklog.md to understand previous agent work (Tasks 1-4)
- Read full ProfilePanel.tsx (1125 lines) to understand current structure
- Read PlayDashboard.tsx to understand prop passing to ProfilePanel

Changes Implemented:

1. **Level capsule → inline text**: Removed the rounded-full capsule with border/background styling. Replaced with simple inline text showing icon + "Lv.{level} {title}" with level color, no capsule/box.

2. **UID moved to capsule position**: UID with copy button now appears right below the level inline text (where the capsule was). Level text goes below name, then UID directly after.

3. **Stats Row → 4 boxes**: Changed from `grid-cols-3` to `grid-cols-4`. Added Level SP box with Target icon and "#00E676" color. Uses `skillPoints` prop (falls back to `gamePoints`). Labels shortened for 4-col fit (Classic, Battle, Coins, Level SP).

4. **Bottom Row → Today, History, Room Cards**: Replaced Level XP box with Room Cards box showing `roomCardCount` with DoorOpen icon and "#E040FB" color. Today and History boxes preserved.

5. **Total Coins Earned**: Kept exactly as is, positioned after bottom row.

6. **Create/Join Room expandable boxes**: Replaced tabbed room section with two separate expandable boxes using AnimatePresence + motion.div slide animation. When Create is expanded, Join collapses and vice versa. Uses `expandedRoom` state instead of `roomTab`. Styled like Total Coins box with chevron rotation indicator.

7. **Level XP moved under Total Coins**: Level XP progress section (with progress bar) now appears right after Total Coins Earned box.

8. **Room Fight Section under Level XP**: Room section (Create/Join expandable boxes) appears after Level XP.

9. **How Leveling Works updated**: Replaced generic bullet list with detailed SP/XP formula showing tiered SP rates (Lv.1-20: 1 SP, Lv.21-50: 1.5 SP, Lv.51-150: 2 SP, Lv.150+: 3 SP = 1 XP), with proper formatting and visual hierarchy.

10. **Like button in header**: Added Heart icon button next to close button in header. Shows filled/outline heart based on liked state, displays like count. Stores like state in localStorage keyed by `profile-like-{userCode}`. Calls `onToggleLike` callback.

11. **New props added**: 
    - `skillPoints?: number` - for SP display (defaults to gamePoints)
    - `isOwnProfile?: boolean` - defaults to true; when false, hides: Create/Join room, Theme toggle, Reset button, edit name/avatar buttons
    - `likeCount?: number` - likes on profile
    - `isLiked?: boolean` - current user liked status
    - `onToggleLike?: () => void` - toggle like callback

Additional details:
- ESLint passes with 0 errors for ProfilePanel.tsx
- All existing functionality preserved (room creation, game history, notifications)
- NotificationsPanel export maintained
- Dark game theme styling preserved throughout
- Component compiles cleanly with TypeScript

Stage Summary:
- Complete redesign of ProfilePanel with all 11 requested changes
- New expandable Create/Join room UX with slide animations
- Added like system with localStorage persistence
- Added isOwnProfile gating for edit controls
- All lint checks pass
