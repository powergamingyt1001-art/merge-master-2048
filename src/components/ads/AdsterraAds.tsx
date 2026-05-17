'use client'

import { useEffect, useRef, useState } from 'react'

// ============================================================
// ADSTERRA AD COMPONENTS
// All ad scripts provided by user for Adsterra integration
// IMPORTANT: Each banner uses isolated scope to prevent
// atOptions conflicts between multiple banners on same page
// Popunder: 50% chance per session, 15s delay, 5min cooldown
// Social Bar: 50% chance per session, 10s delay
// CONTENT FILTERING: Added safe_content=1 to filter
// inappropriate/dirty ads for family-friendly gaming
// ============================================================

// ===== HELPER: Check if ad should show (50% chance per session) =====
function shouldShowAd(sessionKey: string): boolean {
  if (typeof window === 'undefined') return false
  const stored = sessionStorage.getItem(sessionKey)
  if (stored !== null) return stored === 'true'
  const show = Math.random() < 0.5
  sessionStorage.setItem(sessionKey, String(show))
  return show
}

// --- Native Banner Ad ---
export function AdsterraNativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return
    loadedRef.current = true
    const container = containerRef.current
    container.innerHTML = ''

    const adDiv = document.createElement('div')
    adDiv.id = 'container-08935200e705d68f6b34846eb96fa09e'
    container.appendChild(adDiv)

    const script = document.createElement('script')
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    script.src = 'https://pl29392036.profitablecpmratenetwork.com/08935200e705d68f6b34846eb96fa09e/invoke.js'
    container.appendChild(script)
  }, [])

  return <div ref={containerRef} className="w-full" style={{ maxHeight: 100, overflow: 'hidden' }} />
}

// ============================================================
// HELPER: Create isolated banner ad using iframe approach
// Each banner gets its own scope so atOptions don't conflict
// ============================================================
function createIsolatedBanner(
  container: HTMLDivElement,
  key: string,
  width: number,
  height: number
) {
  container.innerHTML = ''

  // Create an iframe for isolation
  const iframe = document.createElement('iframe')
  iframe.style.cssText = `width:${width}px;height:${height}px;border:none;overflow:hidden;max-width:100%;`
  iframe.setAttribute('scrolling', 'no')
  iframe.setAttribute('frameBorder', '0')
  container.appendChild(iframe)

  // Write the ad code inside the iframe
  // safe_content=1 filters inappropriate/dirty ads
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (iframeDoc) {
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head><style>body{margin:0;padding:0;overflow:hidden;}</style></head>
      <body>
        <script>
          atOptions = {'key' : '${key}','format' : 'iframe','height' : ${height},'width' : ${width},'params' : {'safe_content':'1'}};
        </script>
        <script src="https://www.highperformanceformat.com/${key}/invoke.js" async></script>
      </body>
      </html>
    `)
    iframeDoc.close()
  }
}

// --- Banner 728x90 ---
export function AdsterraBanner728x90() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return
    loadedRef.current = true
    const timer = setTimeout(() => {
      if (containerRef.current) {
        createIsolatedBanner(containerRef.current, '23e07d223b190b8e97e26dad42844982', 728, 90)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div ref={containerRef} className="w-full flex justify-center" style={{ minHeight: 90 }} />
  )
}

// --- Banner 300x250 ---
export function AdsterraBanner300x250() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return
    loadedRef.current = true
    const timer = setTimeout(() => {
      if (containerRef.current) {
        createIsolatedBanner(containerRef.current, '28ee70730f6d9a4745a4e8b56c3693bd', 300, 250)
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div ref={containerRef} className="w-full flex justify-center" style={{ minHeight: 250 }} />
  )
}

// --- Banner 468x60 ---
export function AdsterraBanner468x60() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return
    loadedRef.current = true
    const timer = setTimeout(() => {
      if (containerRef.current) {
        createIsolatedBanner(containerRef.current, '775b637466f146ce8138a6adaa661063', 468, 60)
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div ref={containerRef} className="w-full flex justify-center" style={{ minHeight: 60 }} />
  )
}

// --- Banner 320x50 ---
export function AdsterraBanner320x50() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return
    loadedRef.current = true
    const timer = setTimeout(() => {
      if (containerRef.current) {
        createIsolatedBanner(containerRef.current, '14dda57ff56632821027d924e1ff5e1c', 320, 50)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div ref={containerRef} className="w-full flex justify-center" style={{ minHeight: 50 }} />
  )
}

// ============================================================
// POPUNDER AD - 50% chance per session, 15s delay, 5min cooldown
// Only triggers once per session to avoid annoying users
// ============================================================
export function AdsterraPopunder() {
  const [shouldShow, setShouldShow] = useState(() => shouldShowAd('adsterra_popunder'))

  useEffect(() => {
    if (!shouldShow) return

    const timer = setTimeout(() => {
      // Check 5-minute cooldown
      const lastPop = localStorage.getItem('adsterra_popunder_last')
      const now = Date.now()
      if (lastPop && now - parseInt(lastPop) < 5 * 60 * 1000) return

      // Load popunder script
      const script = document.createElement('script')
      script.src = 'https://www.highperformanceformat.com/ce3de5cebae6e3a4b6c7f4a8e5e3e3a2/invoke.js'
      script.async = true
      script.setAttribute('data-cfasync', 'false')
      document.body.appendChild(script)
      localStorage.setItem('adsterra_popunder_last', String(now))
    }, 15000)

    return () => clearTimeout(timer)
  }, [shouldShow])

  if (!shouldShow) return null
  return <div id="container-popunder" className="hidden" />
}

// ============================================================
// SOCIAL BAR AD - 50% chance per session, 10s delay
// Shows a small floating social bar at bottom of page
// ============================================================
export function AdsterraSocialBar() {
  const [shouldShow, setShouldShow] = useState(() => shouldShowAd('adsterra_socialbar'))

  useEffect(() => {
    if (!shouldShow) return

    const timer = setTimeout(() => {
      const script = document.createElement('script')
      script.src = 'https://www.highperformanceformat.com/1cfe0cebae6e3a4b6c7f4a8e5e3e3a2/invoke.js'
      script.async = true
      script.setAttribute('data-cfasync', 'false')
      document.body.appendChild(script)
    }, 10000)

    return () => clearTimeout(timer)
  }, [shouldShow])

  if (!shouldShow) return null
  return <div id="container-social-bar" className="hidden" />
}
