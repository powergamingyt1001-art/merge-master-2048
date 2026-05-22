# Task 1: Profile Panel UI Changes

## Agent: profile-panel-ui-agent

## Summary
Made 4 specific UI changes to the ProfilePanel component:
1. Removed redundant Level inline text between Name and UID
2. Moved UID section up to right below the name
3. Replaced Stats Row from 4 boxes to 3 boxes (removed Coins and Level SP, added Tournament Best)
4. Added Invite Friends button with friend request functionality

## Files Modified
- `src/components/game/ProfilePanel.tsx` - Main component changes
- `src/components/game/PlayDashboard.tsx` - Passed onAddNotification prop

## Key Changes
- Added `UserPlus` icon import from lucide-react
- Added `onAddNotification` optional prop to ProfilePanelProps
- Implemented `handleInviteFriend` with localStorage persistence
- Stats row now uses `modBestScore` for Tournament Best (Crown icon, purple color)
- Invite button only shows for other users' profiles (`!isOwnProfile`)

## Lint: 0 errors, 0 warnings
