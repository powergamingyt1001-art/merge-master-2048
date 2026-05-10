'use client'

import { useEffect, useRef } from 'react'

// ============================================================
// ADSTERRA AD COMPONENTS
// All ad scripts provided by user for Adsterra integration
// IMPORTANT: Each banner uses isolated scope to prevent
// atOptions conflicts between multiple banners on same page
// ============================================================

// --- Popunder Ad (Global - loaded once, with delay) ---
export function AdsterraPopunder() {
  useEffect(() => {
    const existing = document.getElementById('adsterra-popunder')
    if (existing) return
    // Delay loading to prevent redirect on page open
    const timer = setTimeout(() => {
      const script = document.createElement('script')
      script.id = 'adsterra-popunder'
      script.src = 'https://pl29392034.profitablecpmratenetwork.com/40/9d/aa/409daa8e988b716a6a40b571e679667a.js'
      script.async = true
      document.body.appendChild(script)
    }, 8000) // 8 second delay after page load - prevents new tab redirect
    return () => clearTimeout(timer)
  }, [])
  return null
}

// --- Social Bar Ad (Global - loaded once, with delay) ---
export function AdsterraSocialBar() {
  useEffect(() => {
    const existing = document.getElementById('adsterra-socialbar')
    if (existing) return
    // Delay loading to prevent issues on initial load
    const timer = setTimeout(() => {
      const script = document.createElement('script')
      script.id = 'adsterra-socialbar'
      script.src = 'https://pl29392035.profitablecpmratenetwork.com/b7/40/ba/b740ba65f24e56491e9bd88c482e6b7f.js'
      script.async = true
      document.body.appendChild(script)
    }, 5000) // 5 second delay after page load
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

  return <div ref={containerRef} className="w-full" />
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
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (iframeDoc) {
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head><style>body{margin:0;padding:0;overflow:hidden;}</style></head>
      <body>
        <script>
          atOptions = {'key' : '${key}','format' : 'iframe','height' : ${height},'width' : ${width},'params' : {}};
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
    // Small delay to ensure DOM is ready
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

// --- Banner 160x600 ---
export function AdsterraBanner160x600() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return
    loadedRef.current = true
    const timer = setTimeout(() => {
      if (containerRef.current) {
        createIsolatedBanner(containerRef.current, '59714a04048f48cc53c84df9a14ac7b5', 160, 600)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div ref={containerRef} className="w-full flex justify-center" style={{ minHeight: 300 }} />
  )
}

// --- Banner 160x300 ---
export function AdsterraBanner160x300() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return
    loadedRef.current = true
    const timer = setTimeout(() => {
      if (containerRef.current) {
        createIsolatedBanner(containerRef.current, '72d64d305ad7f6b3a407a693880f5328', 160, 300)
      }
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div ref={containerRef} className="w-full flex justify-center" style={{ minHeight: 160 }} />
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
