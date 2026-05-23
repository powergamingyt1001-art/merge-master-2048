# Task 2: Update SP/XP Leveling System in useGame.ts

## Agent: Main Agent
## Status: Completed

### Work Log:

1. **Read worklog** at `/home/z/my-project/worklog.md` - understood previous agents' work (Task 1-4 fixed game crashes, ability system, TypeScript errors)

2. **Read full useGame.ts** (~2187 lines) to understand the current leveling system structure:
   - Current system: 1 point per tournament game, 3 points = 1 levelXP
   - Level calculated via `calculateLevel(levelXP)` using binary search on `getLevelThreshold(level)`
   - Tournament points processed in `calculateTournamentPoints()` and `tickBattleTimer()`
   - Timer ability in `activatePowerUp()` added +10s with no usage limits

3. **Added new GameState fields:**
   - `skillPoints: number` - Accumulated SP with decimal precision (e.g., 1.5, 3.0)
   - `spRemainder: number` - Fractional SP remainder after 3 SP → 1 XP conversion
   - `timerAbilitiesUsed: number` - Count of timer abilities used in current game
   - `gameTimeElapsed: number` - Seconds elapsed in current game

4. **Added `getSPPerHundredScore()` helper function** (exported):
   - Lv 1-20: returns 1
   - Lv 21-50: returns 1.5
   - Lv 51-150: returns 2
   - Lv 150+: returns 3

5. **Updated `calculateTournamentPoints()`** to use new SP/XP system:
   - SP earned = (score / 100) * getSPPerHundredScore(level)
   - SP added to skillPoints, then while skillPoints >= 3: convert 3 SP → 1 XP
   - Remainder stays in skillPoints and spRemainder
   - levelXP incremented by XP gained, level recalculated

6. **Updated `tickBattleTimer()`** with:
   - gameTimeElapsed tracking (incremented each tick)
   - Same SP/XP conversion logic at tournament game end (when timer hits 0)

7. **Updated `activatePowerUp()` for timer ability:**
   - Can only be used after 20 seconds of game time elapsed (`gameTimeElapsed >= 20`)
   - Battle/tournament/coins mode: max 2 timer abilities per game
   - Classic mode: timer ability doesn't apply (no battle timer to extend)
   - timerAbilitiesUsed incremented on use

8. **Updated all game start/reset functions** to reset new fields:
   - `newGame()` - resets timerAbilitiesUsed, gameTimeElapsed
   - `startBotBattle()` - resets timerAbilitiesUsed, gameTimeElapsed
   - `startCoinGame()` - resets timerAbilitiesUsed, gameTimeElapsed
   - `startTournamentGame()` - resets timerAbilitiesUsed, gameTimeElapsed
   - `goBackToDashboard()` - resets timerAbilitiesUsed, gameTimeElapsed
   - `resetAllData()` - resets all new fields (skillPoints, spRemainder, timerAbilitiesUsed, gameTimeElapsed)

9. **Updated save/load persistence:**
   - skillPoints and spRemainder saved to localStorage and loaded on init
   - timerAbilitiesUsed and gameTimeElapsed NOT persisted (reset each game session)
   - Save useEffect dependency array updated with new fields

10. **Updated levelXP comment** in GameState interface to reflect new system

11. **Verified:** No TypeScript errors in useGame.ts or page.tsx. Lint error only in SpinWheel.tsx (pre-existing, unrelated).

### Key Design Decisions:
- `skillPoints` persists across games (carries over SP remainder)
- `timerAbilitiesUsed` and `gameTimeElapsed` are per-game only (not persisted, reset on each game start)
- In classic mode, timer ability still doesn't work (no battle timer to extend), but the 20-second cooldown and unlimited usage logic is in place for when it might be extended
- Tournament leaderboard points still tracked as 1 point per game (separate from SP/XP system)
