'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/game/LoadingScreen'
import { PlayDashboard } from '@/components/game/PlayDashboard'
import { GameBoard } from '@/components/game/GameBoard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useGame } from '@/hooks/useGame'
import { GameProvider } from '@/context/GameContext'
import { AdOverlay, BackgroundImpressionTimer } from '@/components/ads/AdOverlay'
import { AdsterraPopunder } from '@/components/ads/AdsterraAds'
import { AdProvider, useAdContext } from '@/hooks/useAds'
import { InterstitialAd } from '@/components/game/InterstitialAd'

type GamePhase = 'loading' | 'dashboard' | 'game'
type PendingGameAction = 'classic' | 'bot' | 'coins' | 'tournament' | null

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [showAdOverlay, setShowAdOverlay] = useState(false)
  const [overlayKey, setOverlayKey] = useState(0)
  const [pendingAction, setPendingAction] = useState<PendingGameAction>(null)
  const [pendingBotTime, setPendingBotTime] = useState(60)
  const [pendingCoinFee, setPendingCoinFee] = useState(0)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : false)
  // Interstitial ad trigger — increments to fire the GameOverAdHandler
  const [gameOverAdTriggerKey, setGameOverAdTriggerKey] = useState(0)
  // Removed: DashboardReturnOverlay state (interstitial ad removed)
  const game = useGame()

  // Online detection
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const handleLoadingComplete = useCallback(() => {
    setPhase('dashboard')
  }, [])

  const handlePlayClassic = useCallback(() => {
    if (isOnline) {
      setPendingAction('classic')
      setOverlayKey(k => k + 1)
      setShowAdOverlay(true)
    } else {
      game.newGame()
      setPhase('game')
    }
  }, [game, isOnline])

  const handleStartBotBattle = useCallback((timeLimit: number) => {
    if (isOnline) {
      setPendingAction('bot')
      setPendingBotTime(timeLimit)
      setOverlayKey(k => k + 1)
      setShowAdOverlay(true)
    } else {
      game.startBotBattle(timeLimit)
      setPhase('game')
    }
  }, [game, isOnline])

  const handleStartCoinGame = useCallback((entryFee: number) => {
    if (isOnline) {
      setPendingAction('coins')
      setPendingCoinFee(entryFee)
      setOverlayKey(k => k + 1)
      setShowAdOverlay(true)
    } else {
      game.startCoinGame(entryFee)
      setPhase('game')
    }
  }, [game, isOnline])

  const handleStartTournamentGame = useCallback(() => {
    if (isOnline) {
      setPendingAction('tournament')
      setOverlayKey(k => k + 1)
      setShowAdOverlay(true)
    } else {
      game.startTournamentGame()
      setPhase('game')
    }
  }, [game, isOnline])

  // Called when ad overlay closes (countdown finished and user clicked PLAY)
  const handleAdOverlayClose = useCallback(() => {
    setShowAdOverlay(false)

    // Execute the pending game action
    if (pendingAction === 'classic') {
      game.newGame()
      setPhase('game')
    } else if (pendingAction === 'bot') {
      game.startBotBattle(pendingBotTime)
      setPhase('game')
    } else if (pendingAction === 'coins') {
      game.startCoinGame(pendingCoinFee)
      setPhase('game')
    } else if (pendingAction === 'tournament') {
      game.startTournamentGame()
      setPhase('game')
    }

    setPendingAction(null)
  }, [pendingAction, pendingBotTime, pendingCoinFee, game])

  const handleBackToDashboard = useCallback(() => {
    // When online, show interstitial ad before returning to dashboard
    if (isOnline) {
      setGameOverAdTriggerKey(k => k + 1)
    } else {
      // Offline — go straight to dashboard
      game.goBackToDashboard()
      setPhase('dashboard')
    }
  }, [game, isOnline])

  // Called after the game-over interstitial ad closes (or is skipped)
  const handleGameOverAdComplete = useCallback(() => {
    game.goBackToDashboard()
    setPhase('dashboard')
  }, [game])

  // Removed: DashboardReturnOverlay close handler

  const handlePlayAgain = useCallback((mode: 'bot' | 'coins' | 'tournament', timeLimit: number, entryFee: number) => {
    game.goBackToDashboard()
    if (mode === 'bot') {
      if (isOnline) {
        setPendingAction('bot')
        setPendingBotTime(timeLimit)
        setOverlayKey(k => k + 1)
        setShowAdOverlay(true)
      } else {
        game.startBotBattle(timeLimit)
        setPhase('game')
      }
    } else if (mode === 'coins') {
      if (isOnline) {
        setPendingAction('coins')
        setPendingCoinFee(entryFee)
        setOverlayKey(k => k + 1)
        setShowAdOverlay(true)
      } else {
        game.startCoinGame(entryFee)
        setPhase('game')
      }
    } else if (mode === 'tournament') {
      if (isOnline) {
        setPendingAction('tournament')
        setOverlayKey(k => k + 1)
        setShowAdOverlay(true)
      } else {
        game.startTournamentGame()
        setPhase('game')
      }
    }
  }, [game, isOnline])

  return (
    <ErrorBoundary>
      <AdProvider>
        {/* Background impression timer for revenue */}
        <BackgroundImpressionTimer />

        {/* Adsterra Global Ads - Popunder only (Social Bar removed) */}
        <AdsterraPopunder />

        {/* Game-over interstitial ad — uses useAdContext for rate-limiting */}
        <GameOverAdHandler
          triggerKey={gameOverAdTriggerKey}
          isOnline={isOnline}
          onAdComplete={handleGameOverAdComplete}
        />

        <GameProvider game={game}>
        <main className="min-h-screen">
          <AnimatePresence mode="wait">
            {phase === 'loading' && <LoadingScreen key="loading" onFinish={handleLoadingComplete} />}
            {phase === 'dashboard' && (
              <PlayDashboard key="dashboard"
                coins={game.coins}
                spinTickets={game.spinTickets}
                streakDay={game.streakDay}
                streakClaimed={game.streakClaimed}
                welcomeClaimed={game.welcomeClaimed}
                hammerCount={game.hammerCount}
                magnetCount={game.magnetCount}
                blastCount={game.blastCount}
                multiplier5xCount={game.multiplier5xCount}
                multiplier2_5xCount={game.multiplier2_5xCount}
                extraTimeCount={game.extraTimeCount}
                undoTotal={game.undoTotal}
                modBestScore={game.modBestScore}
                gamePoints={game.gamePoints}
                bestScore={game.bestScore}
                inviteCode={game.inviteCode}
                invitedUsers={game.invitedUsers}
                commissionBalance={game.commissionBalance}
                commissionClaimed={game.commissionClaimed}
                autoClaimCommission={game.autoClaimCommission}
                gamesPlayedToday={game.gamesPlayedToday}
                maxGamesPerDay={game.maxGamesPerDay}
                notifications={game.notifications}
                playerName={game.playerName}
                playerAvatar={game.playerAvatar}
                playerLevel={game.playerLevel}
                playerId={game.playerId}
                firebaseReferrals={game.firebaseReferrals}
                firebaseCommissionPending={game.firebaseCommissionPending}
                totalBattlesPlayed={game.totalBattlesPlayed}
                totalBattlesWon={game.totalBattlesWon}
                tournamentJoined={game.tournamentJoined}
                tournamentPoints={game.tournamentPoints}
                tournamentCarryOver={game.tournamentCarryOver}
                tournamentGamesPlayed={game.tournamentGamesPlayed}
                levelXP={game.levelXP}
                onPlayClassic={handlePlayClassic}
                onStartBotBattle={handleStartBotBattle}
                onStartCoinGame={handleStartCoinGame}
                onJoinTournament={game.joinTournament}
                onStartTournamentGame={handleStartTournamentGame}
                onUseSpinTicket={game.useSpinTicket}
                onAddSpinTickets={game.addSpinTickets}
                onClaimWelcome={game.claimWelcome}
                onClaimStreakDay={game.claimStreakDay}
                onAddCoins={game.addCoins}
                onDeductCoins={game.deductCoins}
                onAddPowerUp={game.addPowerUp}
                onAddUndos={game.addUndos}
                onClaimCommission={game.claimCommission}
                onClaimFirebaseCommission={game.claimFirebaseCommission}
                onToggleAutoClaim={game.toggleAutoClaim}
                onAddNotification={game.addNotification}
                onMarkNotificationRead={game.markNotificationRead}
                onMarkAllNotificationsRead={game.markAllNotificationsRead}
                onDeleteNotification={game.deleteNotification}
                onDeleteReadNotifications={game.deleteReadNotifications}
                onUpdatePlayerName={game.updatePlayerName}
                onUpdatePlayerAvatar={game.updatePlayerAvatar}
                dailyTasks={game.dailyTasks}
                onClaimDailyTask={game.claimDailyTask}
                onCompleteVisitWebsiteTask={game.completeVisitWebsiteTask}
                onResetAllData={game.resetAllData}
                onDeleteGameHistory={game.deleteGameHistory}
                onClearGameHistory={game.clearGameHistory}
                weeklyBonusClaimed={game.weeklyBonusClaimed}
                onClaimWeeklyBonus={game.claimWeeklyBonus}
                userCode={game.userCode}
                totalCoinsEarned={game.totalCoinsEarned}
                winningCoins={game.winningCoins}
                roomCardCount={game.roomCardCount}
                gameHistory={game.gameHistory}
                streakWeek={game.streakWeek}
                onAddRoomCards={game.addRoomCards}
                classicBestScore={game.classicBestScore}
                tournamentBestScore={game.tournamentBestScore}
                battleBestScore={game.battleBestScore}
                skillPoints={game.skillPoints}
                saveGame={game.saveGame}
                saveAll={game.saveAll}
                setAutoSaveEnabled={game.setAutoSaveEnabled}
              />
            )}
            {phase === 'game' && <GameBoard key="game" onBackToDashboard={handleBackToDashboard} onPlayAgain={handlePlayAgain} />}
          </AnimatePresence>
        </main>

        {/* Ad Overlay - shown before game starts (only when online) */}
        <AdOverlay
          isOpen={showAdOverlay}
          onClose={handleAdOverlayClose}
          countdownSeconds={5}
          title="Preparing Your Game..."
          subtitle="Watch this short ad to continue"
          overlayKey={overlayKey}
        />

        {/* Removed: Dashboard Return Overlay (interstitial ad on game close) */}
        </GameProvider>
      </AdProvider>
    </ErrorBoundary>
  )
}

// ============================================================
// GameOverAdHandler — Lives INSIDE AdProvider so it can call
// useAdContext(). On game over, triggers an interstitial ad
// (rate-limited by the AdProvider's showInterstitialAd logic).
// ============================================================
function GameOverAdHandler({
  triggerKey,
  isOnline,
  onAdComplete,
}: {
  triggerKey: number
  isOnline: boolean
  onAdComplete: () => void
}) {
  // Safe — this component is always rendered inside <AdProvider>
  const adCtx = useAdContext()
  const [showAd, setShowAd] = useState(false)
  const prevTriggerKey = useRef(0)
  const completedRef = useRef(false)

  useEffect(() => {
    if (triggerKey === 0) return
    if (triggerKey === prevTriggerKey.current) return
    prevTriggerKey.current = triggerKey
    completedRef.current = false

    // No internet → skip ad entirely
    if (!isOnline) {
      onAdComplete()
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        // Record this game played (drives the quick-death + games-played counters
        // that showInterstitialAd uses for rate-limiting decisions)
        adCtx.recordGamePlayed(0)
        const shouldShow = await adCtx.showInterstitialAd('death')
        if (cancelled) return
        if (shouldShow) {
          setShowAd(true)
        } else {
          // Rate-limit / quick-death logic skipped the ad — proceed to dashboard
          onAdComplete()
        }
      } catch {
        if (!cancelled) onAdComplete()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [triggerKey, isOnline, adCtx, onAdComplete])

  const handleClose = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setShowAd(false)
    onAdComplete()
  }, [onAdComplete])

  if (!showAd) return null

  return (
    <InterstitialAd
      isOpen={showAd}
      onClose={handleClose}
      isOnline={isOnline}
      duration={5}
    />
  )
}
