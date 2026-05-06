'use client'

import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/game/LoadingScreen'
import { PlayDashboard } from '@/components/game/PlayDashboard'
import { GameBoard } from '@/components/game/GameBoard'
import { InterstitialAd } from '@/components/game/InterstitialAd'
import { useGame } from '@/hooks/useGame'
import { GameProvider } from '@/context/GameContext'
import { canShowAppOpen, canShowInterstitial, markAppOpenShown, markInterstitialShown } from '@/lib/admob'

type GamePhase = 'loading' | 'dashboard' | 'game'

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [showAppOpenAd, setShowAppOpenAd] = useState(false)
  const [showInterstitialAd, setShowInterstitialAd] = useState(false)
  const game = useGame()

  // Show App Open ad when app first loads
  useEffect(() => {
    const timer = setTimeout(() => {
      if (navigator.onLine && canShowAppOpen()) {
        setShowAppOpenAd(true)
      }
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  const handleLoadingComplete = useCallback(() => {
    setPhase('dashboard')
  }, [])

  const handlePlayClassic = useCallback(() => {
    game.newGame()
    setPhase('game')
  }, [game])

  const handleStartBotBattle = useCallback((timeLimit: number) => {
    game.startBotBattle(timeLimit)
    setPhase('game')
  }, [game])

  // AD CONTROL: Coin game start ad state
  const [pendingCoinGameFee, setPendingCoinGameFee] = useState<number | null>(null)
  const [showCoinStartAd, setShowCoinStartAd] = useState(false)

  const handleStartCoinGame = useCallback((entryFee: number) => {
    // COINS MODE: Show 1 ad at START, then NO ads during game
    if (navigator.onLine && canShowInterstitial()) {
      setPendingCoinGameFee(entryFee)
      setShowCoinStartAd(true)
    } else {
      game.startCoinGame(entryFee)
      setPhase('game')
    }
  }, [game])

  const handleCoinStartAdClose = useCallback(() => {
    markInterstitialShown()
    setShowCoinStartAd(false)
    if (pendingCoinGameFee !== null) {
      game.startCoinGame(pendingCoinGameFee)
      setPendingCoinGameFee(null)
      setPhase('game')
    }
  }, [pendingCoinGameFee, game])

  const handleStartTournamentGame = useCallback(() => {
    // TOURNAMENT: NO ads before game, ads only AFTER
    game.startTournamentGame()
    setPhase('game')
  }, [game])

  const handleBackToDashboard = useCallback(() => {
    // AD CONTROL: Show interstitial ad AFTER game ends
    // TIME MODE (bot): Show ad after game (1 mid-game ad already shown at halfway)
    // COINS MODE: NO ad after game (1 ad at start already shown)
    // TOURNAMENT: Show ad after game ONLY (no ads before/during)
    // CLASSIC: Show ad after game
    if (phase === 'game' && navigator.onLine && canShowInterstitial()) {
      // Coins mode: NO ad at end (only 1 ad at start)
      if (game.gameMode !== 'coins') {
        setShowInterstitialAd(true)
      }
    }
    setPhase('dashboard')
  }, [phase, game.gameMode])

  const handleInterstitialClose = useCallback(() => {
    markInterstitialShown()
    setShowInterstitialAd(false)
  }, [])

  return (
    <GameProvider game={game}>
      <main className="min-h-screen" style={{ touchAction: 'none' }}>
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
          {phase === 'game' && <GameBoard key="game" onBackToDashboard={handleBackToDashboard} />}
        </AnimatePresence>

        {/* App Open Ad - 8 seconds */}
        <InterstitialAd
          isOpen={showAppOpenAd}
          onClose={() => { markAppOpenShown(); setShowAppOpenAd(false) }}
          isOnline={typeof window !== 'undefined' ? navigator.onLine : false}
          duration={8}
        />

        {/* Interstitial Ad - 5 seconds, shown when going back to dashboard after game */}
        <InterstitialAd
          isOpen={showInterstitialAd}
          onClose={handleInterstitialClose}
          isOnline={typeof window !== 'undefined' ? navigator.onLine : false}
          duration={5}
        />

        {/* COINS MODE: 1 ad at game START only, NO ads during gameplay */}
        <InterstitialAd
          isOpen={showCoinStartAd}
          onClose={handleCoinStartAdClose}
          isOnline={typeof window !== 'undefined' ? navigator.onLine : false}
          duration={5}
        />
      </main>
    </GameProvider>
  )
}
