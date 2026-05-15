'use client'

import { useEffect, useRef } from 'react'

// ============================================================
// ADSTERRA AD COMPONENTS
// All ad scripts provided by user for Adsterra integration
// IMPORTANT: Each banner uses isolated scope to prevent
// atOptions conflicts between multiple banners on same page
// CONTENT FILTERING: Added safe_content=1 to filter
// inappropriate/dirty ads for family-friendly gaming
//
// AD CONDITIONS:
// - Popunder: 50% chance per session, 15s delay, once per 5 min
// - Social Bar: 50% chance per session, 10s delay
// - Big banners (728x90, 300x250): Only ONE per page view (rotated)
// - Small banners (320x50, 468x60): Always shown (small, non-intrusive)
// ============================================================

// ============================================================
// SESSION AD CONTROLLER - Controls which ads show per session
// Uses sessionStorage so it resets on new tab/session
// ============================================================
function shouldShowAdThisSession(adKey: string, chancePercent: number): boolean {
  if (typeof window === 'undefined') return false
  const stored = sessionStorage.getItem(`ad_show_${adKey}`)
  if (stored !== null) return stored === 'true'
  const result = Math.random() * 100 < chancePercent
  sessionStorage.setItem(`ad_show_${adKey}`, String(result))
  return result
}

function canShowPopunderNow(): boolean {
  if (typeof window === 'undefined') return false
  const lastTime = parseInt(localStorage.getItem('last_popunder_time') || '0', 10)
  const now = Date.now()
  // Minimum 5 minutes between popunders
  return now - lastTime > 5 * 60 * 1000
}

function markPopunderShown(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('last_popunder_time', String(Date.now()))
}

// Decide which BIG banner to show on dashboard (only 1 per page)
// Returns: 'top' | 'middle' | 'footer' | 'none'
export function getDashboardBigBannerSlot(): string {
  if (typeof window === 'undefined') return 'middle'
  const stored = sessionStorage.getItem('dash_big_banner_slot')
  if (stored) return stored
  const slots = ['top', 'middle', 'footer']
  const chosen = slots[Math.floor(Math.random() * slots.length)]
  sessionStorage.setItem('dash_big_banner_slot', chosen)
  return chosen
}

// --- Popunder Ad (Global - with conditions) ---
// 50% chance per session, 15s delay, once per 5 minutes
export function AdsterraPopunder() {
  useEffect(() => {
    // Check session chance
    if (!shouldShowAdThisSession('popunder', 50)) return

    const existing = document.getElementById('adsterra-popunder')
    if (existing) return

    // 15 second delay after page load - prevents redirect on page open
    const timer = setTimeout(() => {
      // Check if we can show popunder now (5 min cooldown)
      if (!canShowPopunderNow()) return

      const script = document.createElement('script')
      script.id = 'adsterra-popunder'
      script.src = 'https://pl29392034.profitablecpmratenetwork.com/40/9d/aa/409daa8e988b716a6a40b571e679667a.js'
      script.async = true
      document.body.appendChild(script)
      markPopunderShown()
    }, 15000) // 15 second delay

    return () => clearTimeout(timer)
  }, [])

  return null
}

// --- Social Bar Ad (Global - with conditions) ---
// 50% chance per session, 10s delay
export function AdsterraSocialBar() {
  useEffect(() => {
    // Check session chance
    if (!shouldShowAdThisSession('socialbar', 50)) return

    const existing = document.getElementById('adsterra-socialbar')
    if (existing) return

    // 10 second delay after page load
    const timer = setTimeout(() => {
      const script = document.createElement('script')
      script.id = 'adsterra-socialbar'
      script.src = 'https://pl29392035.profitablecpmratenetwork.com/b7/40/ba/b740ba65f24e56491e9bd88c482e6b7f.js'
      script.async = true
      document.body.appendChild(script)
    }, 10000) // 10 second delay

    return () => clearTimeout(timer)
  }, [])

  return null
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
