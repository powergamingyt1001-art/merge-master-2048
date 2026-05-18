# Task 4: Fix Popunder and Social Bar Ads

## Agent: Popunder & Social Bar Fix Agent

## Summary
Fixed AdsterraPopunder and AdsterraSocialBar components in `/home/z/my-project/src/components/ads/AdsterraAds.tsx` to properly load and execute.

## Changes Made

### AdsterraPopunder
1. Added `script.setAttribute('data-cfasync', 'false')` - critical for bypassing Cloudflare's async handling that could prevent script execution
2. Removed `shouldShowAdThisSession('popunder', 50)` check - now loads 100% of sessions instead of 50%
3. Reduced delay from 15000ms to 8000ms
4. Added try/catch fallback: `document.body.appendChild` → `document.head.appendChild`
5. Added `script.onerror` retry: creates new script element with id `adsterra-popunder-retry` and appends to `document.head`

### AdsterraSocialBar
1. Added `script.setAttribute('data-cfasync', 'false')` - same fix as popunder
2. Removed `shouldShowAdThisSession('socialbar', 50)` check - now loads 100% of sessions
3. Reduced delay from 10000ms to 5000ms
4. Added try/catch fallback: `document.body.appendChild` → `document.head.appendChild`
5. Added `script.onerror` retry: creates new script element with id `adsterra-socialbar-retry` and appends to `document.head`

### Comments
- Updated header AD CONDITIONS comments to reflect new behavior
- Updated inline comments for both functions

## Key Insight
The `data-cfasync="false"` attribute was already present on the Native Banner ad (which works) but missing from Popunder and Social Bar. This attribute tells Cloudflare (and some ad blockers) to not defer/async the script, ensuring it executes properly. Combined with the 50% session gate removal, these ads should now reliably load.

## Lint Status
✅ `bun run lint` passes with zero errors
