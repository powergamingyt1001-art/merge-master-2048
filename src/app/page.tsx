'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/game/LoadingScreen'
import { PlayDashboard } from '@/components/game/PlayDashboard'
import { GameBoard } from '@/components/game/GameBoard'
import { useGame } from '@/hooks/useGame'

type GamePhase = 'loading' | 'dashboard' | 'game'

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>('loading')
  const game = useGame()

  const handleLoadingComplete = useCallback(() => setPhase('dashboard'), [])
  const handlePlayClassic = useCallback(() => setPhase('game'), [])
  const handleStartBotBattle = useCallback((timeLimit: number) => {
    game.startBotBattle(timeLimit)
    setPhase('game')
  }, [game])
  const handleStartCoinGame = useCallback((entryFee: number) => {
    game.startCoinGame(entryFee)
    setPhase('game')
  }, [game])
  const handleBackToDashboard = useCallback(() => setPhase('dashboard'), [])

  return (
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
            onPlayClassic={handlePlayClassic}
            onStartBotBattle={handleStartBotBattle}
            onStartCoinGame={handleStartCoinGame}
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
          />
        )}
        {phase === 'game' && <GameBoard key="game" onBackToDashboard={handleBackToDashboard} />}
      </AnimatePresence>
    </main>
  )
}
