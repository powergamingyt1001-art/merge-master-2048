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

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    // Clear cached data that might be corrupted
    try {
      localStorage.removeItem('mergeMaster2048')
    } catch {}
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center p-6"
          style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 50%, #1a0533 100%)' }}>
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#EDC22E' }}>Something went wrong</h2>
          <p className="text-sm mb-4 text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
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
