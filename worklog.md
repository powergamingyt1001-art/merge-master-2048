---
Task ID: 1
Agent: Main Agent
Task: Enhanced Daily Tasks System - New task types, ability rewards, coins claim, +100 popup ad

Work Log:
- Updated DailyTask interface: Added DailyTaskReward type (coins/spin/hammer/magnet/blast/multiplier5x/multiplier2_5x/extraTime/undo), actionType field (visit/play/spin/claim/auto), visitCount field
- Updated generateDailyTasks(): 7 daily tasks now instead of 4 - Visit 1x (50 coins), Visit 2x (100 coins), Play 3 Games (30 coins), Score 500+ (40 coins), Spin Wheel (20 coins), Play 5 Games for ability reward (varies daily: 3-5 bombs/hammers/magnets/timers/undos), Claim Free Coins (100 coins)
- Updated claimDailyTask(): Handles all reward types (not just coins), auto-completes 'claim' action type tasks, grants spins/abilities/coins based on reward type
- Updated PlayDashboard UI: Shows reward emoji + label, VISIT button for visit tasks, SPIN button for spin task, CLAIM 💰 + +100 📺 buttons for claim task (popup ad gives bonus 100 coins)
- Updated addGameToHistory(): Tracks play3, ability, and score500 tasks
- Updated completeVisitWebsiteTask(): Tracks both visit1 and visit2 tasks
- Build verified: No lint errors, production build succeeds

Stage Summary:
- Daily tasks now have 7 varied tasks with ability rewards
- Claim Coins task with +100 popup ad button implemented
- Visit 2x task (visit 2 sponsor pages) implemented
- Ability task rotates daily (3-5 bombs/hammers/magnets/timers/undos)
- All rewards go directly to wallet/inventory
