'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/game/LoadingScreen'
import { PlayDashboard } from '@/components/game/PlayDashboard'
import { GameBoard } from '@/components/game/GameBoard'
import { InterstitialAd } from '@/components/game/InterstitialAd'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useGame } from '@/hooks/useGame'
import { GameProvider } from '@/context/GameContext'

type GamePhase = 'loading' | 'dashboard' | 'game' | 'ad'

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>('loading')
  const game = useGame()

  // Ad system state
  const [showInterstitial, setShowInterstitial] = useState(false)
  const [adDuration, setAdDuration] = useState(5)
  const [isAppOpenAd, setIsAppOpenAd] = useState(false)
  const totalGamesPlayedRef = useRef(0)
  const pendingGameActionRef = useRef<(() => void) | null>(null)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : false)

  // Internet detection
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const handleLoadingComplete = useCallback(() => {
    // Show App Open Ad after loading screen, then go to dashboard
    if (isOnline) {
      setIsAppOpenAd(true)
      setAdDuration(6)
      setShowInterstitial(true)
      pendingGameActionRef.current = null // No game action - just go to dashboard
      setPhase('ad')
    } else {
      setPhase('dashboard')
    }
  }, [isOnline])

  // Common game start handler: shows ad before starting game
  const startGameWithAd = useCallback((startAction: () => void) => {
    totalGamesPlayedRef.current += 1

    // After every 2 games, show app open ad (8 seconds)
    // Every other game, show interstitial ad (5 seconds)
    if (totalGamesPlayedRef.current % 2 === 0) {
      // App open ad after every 2 games
      setIsAppOpenAd(true)
      setAdDuration(8)
      setShowInterstitial(true)
      pendingGameActionRef.current = startAction
      setPhase('ad')
    } else {
      // Interstitial ad on every game start
      setIsAppOpenAd(false)
      setAdDuration(5)
      setShowInterstitial(true)
      pendingGameActionRef.current = startAction
      setPhase('ad')
    }
  }, [])

  const handleAdClose = useCallback(() => {
    setShowInterstitial(false)
    // Execute the pending game action after ad closes
    const action = pendingGameActionRef.current
    pendingGameActionRef.current = null
    if (action) {
      action()
      setPhase('game')
    } else {
      setPhase('dashboard')
    }
  }, [])

  const handlePlayClassic = useCallback(() => {
    startGameWithAd(() => { game.newGame() })
  }, [game, startGameWithAd])

  const handleStartBotBattle = useCallback((timeLimit: number) => {
    startGameWithAd(() => { game.startBotBattle(timeLimit) })
  }, [game, startGameWithAd])

  const handleStartCoinGame = useCallback((entryFee: number) => {
    startGameWithAd(() => { game.startCoinGame(entryFee) })
  }, [game, startGameWithAd])

  const handleStartTournamentGame = useCallback(() => {
    startGameWithAd(() => { game.startTournamentGame() })
  }, [game, startGameWithAd])

  const handleBackToDashboard = useCallback(() => {
    // IMPORTANT: Reset game state before going back to dashboard
    game.goBackToDashboard()
    setPhase('dashboard')
  }, [game])

  // Play Again: finalize current game, show ad, then start new game of same type
  const handlePlayAgain = useCallback((mode: 'bot' | 'coins' | 'tournament', timeLimit: number, entryFee: number) => {
    // Reset game state first (goBackToDashboard resets game state without changing phase)
    game.goBackToDashboard()
    // Now start a new game through the ad system
    startGameWithAd(() => {
      if (mode === 'bot') { game.startBotBattle(timeLimit) }
      else if (mode === 'coins') { game.startCoinGame(entryFee) }
      else if (mode === 'tournament') { game.startTournamentGame() }
    })
  }, [game, startGameWithAd])

  return (
    <ErrorBoundary>
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
              onResetAllData={game.resetAllData}
              weeklyBonusClaimed={game.weeklyBonusClaimed}
              onClaimWeeklyBonus={game.claimWeeklyBonus}
            />
          )}
          {phase === 'game' && <GameBoard key="game" onBackToDashboard={handleBackToDashboard} onPlayAgain={handlePlayAgain} />}
          {phase === 'ad' && (
            <InterstitialAd
              key="ad"
              isOpen={showInterstitial}
              onClose={handleAdClose}
              isOnline={isOnline}
              duration={adDuration}
              isAppOpen={isAppOpenAd}
            />
          )}
        </AnimatePresence>
      </main>
    </GameProvider>
    </ErrorBoundary>
  )
}
