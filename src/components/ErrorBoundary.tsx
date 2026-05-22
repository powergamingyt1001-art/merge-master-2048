'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = async () => {
    // Preserve critical user identity data before clearing
    let preservedPlayerId = ''
    let preservedUserCode = ''
    let preservedPlayerName = ''
    let preservedPlayerAvatar = ''
    let preservedInviteCode = ''
    try {
      const data = localStorage.getItem('mergeMaster2048')
      if (data) {
        const parsed = JSON.parse(data)
        preservedPlayerId = parsed.playerId || ''
        preservedUserCode = parsed.userCode || ''
        preservedPlayerName = parsed.playerName || ''
        preservedPlayerAvatar = parsed.playerAvatar || ''
        preservedInviteCode = parsed.inviteCode || ''
      }
    } catch {}

    // Clear ALL cached data that might be corrupted
    try {
      localStorage.removeItem('mergeMaster2048')
      localStorage.removeItem('mergeMaster2048_storeHistory')
      localStorage.removeItem('mergeMaster2048_abilityPurchaseLimits')
      localStorage.removeItem('mergeMaster2048_lastFreeAd')
    } catch {}

    // Restore preserved identity data so user doesn't lose their ID
    try {
      if (preservedPlayerId || preservedUserCode) {
        const restoredData = {
          playerId: preservedPlayerId,
          userCode: preservedUserCode,
          playerName: preservedPlayerName || 'Player',
          playerAvatar: preservedPlayerAvatar || '😎',
          inviteCode: preservedInviteCode,
        }
        localStorage.setItem('mergeMaster2048', JSON.stringify(restoredData))
      }
    } catch {}

    // Clear service worker caches
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
      // Unregister service workers so fresh code loads
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(reg => reg.unregister()))
      }
    } catch {}

    // Hard reload - bypass browser cache
    window.location.href = window.location.pathname + '?t=' + Date.now()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center p-6"
          style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)' }}>
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#EDC22E' }}>Something went wrong</h2>
          <p className="text-sm mb-1 text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <p className="text-xs mb-4 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Your player ID and data will be preserved on reload
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF' }}>
            🔄 Reload Game
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
