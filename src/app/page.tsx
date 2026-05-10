'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/game/LoadingScreen'
import { PlayDashboard } from '@/components/game/PlayDashboard'
import { GameBoard } from '@/components/game/GameBoard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useGame } from '@/hooks/useGame'
import { GameProvider } from '@/context/GameContext'
import { AdOverlay, BackgroundImpressionTimer } from '@/components/ads/AdOverlay'

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
  const game = useGame()

  // Online detection
  useState(() => {
    if (typeof window === 'undefined') return
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
  })

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
    game.goBackToDashboard()
    setPhase('dashboard')
  }, [game])

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
      <GameProvider game={game}>
        {/* Background impression timer for revenue */}
        <BackgroundImpressionTimer />

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
                totalBattlesPlayed={game.totalBattlesPlayed}
                totalBattlesWon={game.totalBattlesWon}
                tournamentJoined={game.tournamentJoined}
                tournamentPoints={game.tournamentPoints}
                tournamentCarryOver={game.tournamentCarryOver}
                tournamentGamesPlayed={game.tournamentGamesPlayed}
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
                onAddPowerUp={game.addPowerUp}
                onAddUndos={game.addUndos}
                onClaimCommission={game.claimCommission}
                onToggleAutoClaim={game.toggleAutoClaim}
                onAddNotification={game.addNotification}
                onMarkNotificationRead={game.markNotificationRead}
                onMarkAllNotificationsRead={game.markAllNotificationsRead}
                onUpdatePlayerName={game.updatePlayerName}
                onUpdatePlayerAvatar={game.updatePlayerAvatar}
                dailyTasks={game.dailyTasks}
                onClaimDailyTask={game.claimDailyTask}
                onCompleteVisitWebsiteTask={game.completeVisitWebsiteTask}
                onResetAllData={game.resetAllData}
                weeklyBonusClaimed={game.weeklyBonusClaimed}
                onClaimWeeklyBonus={game.claimWeeklyBonus}
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
      </GameProvider>
    </ErrorBoundary>
  )
}
