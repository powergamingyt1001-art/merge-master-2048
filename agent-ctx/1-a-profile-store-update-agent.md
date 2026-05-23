# Task ID: 1-a — ProfilePanel Invite on Own Profile + Store Spin Pack Updates

## Work Record

### 1. ProfilePanel.tsx — Added "Invite Friends" button on OWN profile
- Changed the conditional `{!isOwnProfile && (...)}` to a ternary that shows Invite button on both own and other profiles
- Own profile: "Invite" button copies UID to clipboard, shows "Copied!" feedback
- Other profiles: Keeps existing friend request "Invite" button

### 2. Store.tsx — Updated Spin Buy section pricing
- SPIN_INR_PACKS: 9/₹5 (no tag), 20/₹9 (HOT), 33/₹15 (VERY HOT, color #FF1744), 50/₹25 (no tag)
- SPIN_COIN_PACKS: Removed 1-spin/300 pack, kept 3/900, 5/1500, 10/3000 (+2 FREE)
- Daily Free Room already removed by previous agent

### 3. Leaderboard.tsx — Verified like count shows properly
- Already working correctly, no changes needed

### Lint: 0 errors, 0 warnings
