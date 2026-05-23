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
    // Preserve ALL user data before clearing
    // The crash might be from corrupted cache, not corrupted data
    let preservedData: Record<string, any> = {}
    try {
      const data = localStorage.getItem('mergeMaster2048')
      if (data) {
        preservedData = JSON.parse(data)
      }
    } catch {}

    // Instead of clearing ALL localStorage data and only keeping 5 fields,
    // we keep the FULL saved data intact. The crash is likely from a
    // runtime error (undefined.map), not from corrupted localStorage data.
    // We only clear the specific caches that might cause issues.

    // Clear only temporary/cached data that could be corrupted
    const keysToPreserve = new Set([
      'mergeMaster2048',
      'mergeMaster2048_orders',
      'mergeMaster2048_playerLikes',
      'mergeMaster2048_friendRequests',
      'claimedCoupons',
      'claimedAdminCoupons',
      'multiplierCouponCount',
      'purchaseHistory',
      'usedCoupons',
      'usedAdminCoupons',
      'adminDailyTasks',
      'adminCustomCouponCodes',
      'adminCustomPrices',
      'adminCoinAbilityPrices',
      'adminNightCodeSettings',
      'adminDayCodeSettings',
      'adminLockDuration',
      'adminBannedUsers',
      'adminDiscountCoupons',
      'adminPartnerLinks',
      'adminTournamentPrizes',
    ])

    // Only clear non-essential keys that might cause issues
    try {
      localStorage.removeItem('mergeMaster2048_storeHistory')
      localStorage.removeItem('mergeMaster2048_abilityPurchaseLimits')
      localStorage.removeItem('mergeMaster2048_lastFreeAd')
    } catch {}

    // Ensure the main game data is intact with all fields
    // If preservedData only has identity fields (from a previous buggy reset),
    // we don't overwrite the existing data - we just keep whatever is there
    try {
      if (Object.keys(preservedData).length > 0) {
        // Ensure critical identity fields exist
        if (!preservedData.playerId || !preservedData.userCode) {
          // Data might have been partially cleared by a previous buggy reset
          // Try to recover from Firebase by just keeping what we have
        }
        // Save the full preserved data back (in case any partial write corrupted it)
        localStorage.setItem('mergeMaster2048', JSON.stringify(preservedData))
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
