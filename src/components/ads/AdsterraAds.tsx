'use client'

import { useEffect, useRef } from 'react'

// ============================================================
// ADSTERRA AD COMPONENTS
// All ad scripts provided by user for Adsterra integration
// ============================================================

// --- Popunder Ad (Global - loaded once) ---
export function AdsterraPopunder() {
  useEffect(() => {
    const existing = document.getElementById('adsterra-popunder')
    if (existing) return
    const script = document.createElement('script')
    script.id = 'adsterra-popunder'
    script.src = 'https://pl29392034.profitablecpmratenetwork.com/40/9d/aa/409daa8e988b716a6a40b571e679667a.js'
    script.async = true
    document.body.appendChild(script)
  }, [])
  return null
}

// --- Social Bar Ad (Global - loaded once) ---
export function AdsterraSocialBar() {
  useEffect(() => {
    const existing = document.getElementById('adsterra-socialbar')
    if (existing) return
    const script = document.createElement('script')
    script.id = 'adsterra-socialbar'
    script.src = 'https://pl29392035.profitablecpmratenetwork.com/b7/40/ba/b740ba65f24e56491e9bd88c482e6b7f.js'
    script.async = true
    document.body.appendChild(script)
  }, [])
  return null
}

// --- Native Banner Ad ---
export function AdsterraNativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
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

// --- Banner 728x90 ---
export function AdsterraBanner728x90() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    container.innerHTML = ''

    const optionsScript = document.createElement('script')
    optionsScript.textContent = `atOptions = {'key' : '23e07d223b190b8e97e26dad42844982','format' : 'iframe','height' : 90,'width' : 728,'params' : {}};`
    container.appendChild(optionsScript)

    const invokeScript = document.createElement('script')
    invokeScript.src = 'https://www.highperformanceformat.com/23e07d223b190b8e97e26dad42844982/invoke.js'
    invokeScript.async = true
    container.appendChild(invokeScript)
  }, [])

  return <div ref={containerRef} className="w-full flex justify-center" />
}

// --- Banner 300x250 ---
export function AdsterraBanner300x250() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    container.innerHTML = ''

    const optionsScript = document.createElement('script')
    optionsScript.textContent = `atOptions = {'key' : '28ee70730f6d9a4745a4e8b56c3693bd','format' : 'iframe','height' : 250,'width' : 300,'params' : {}};`
    container.appendChild(optionsScript)

    const invokeScript = document.createElement('script')
    invokeScript.src = 'https://www.highperformanceformat.com/28ee70730f6d9a4745a4e8b56c3693bd/invoke.js'
    invokeScript.async = true
    container.appendChild(invokeScript)
  }, [])

  return <div ref={containerRef} className="w-full flex justify-center" />
}

// --- Banner 160x600 ---
export function AdsterraBanner160x600() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    container.innerHTML = ''

    const optionsScript = document.createElement('script')
    optionsScript.textContent = `atOptions = {'key' : '59714a04048f48cc53c84df9a14ac7b5','format' : 'iframe','height' : 600,'width' : 160,'params' : {}};`
    container.appendChild(optionsScript)

    const invokeScript = document.createElement('script')
    invokeScript.src = 'https://www.highperformanceformat.com/59714a04048f48cc53c84df9a14ac7b5/invoke.js'
    invokeScript.async = true
    container.appendChild(invokeScript)
  }, [])

  return <div ref={containerRef} className="w-full flex justify-center" />
}

// --- Banner 160x300 ---
export function AdsterraBanner160x300() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    container.innerHTML = ''

    const optionsScript = document.createElement('script')
    optionsScript.textContent = `atOptions = {'key' : '72d64d305ad7f6b3a407a693880f5328','format' : 'iframe','height' : 300,'width' : 160,'params' : {}};`
    container.appendChild(optionsScript)

    const invokeScript = document.createElement('script')
    invokeScript.src = 'https://www.highperformanceformat.com/72d64d305ad7f6b3a407a693880f5328/invoke.js'
    invokeScript.async = true
    container.appendChild(invokeScript)
  }, [])

  return <div ref={containerRef} className="w-full flex justify-center" />
}

// --- Banner 468x60 ---
export function AdsterraBanner468x60() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    container.innerHTML = ''

    const optionsScript = document.createElement('script')
    optionsScript.textContent = `atOptions = {'key' : '775b637466f146ce8138a6adaa661063','format' : 'iframe','height' : 60,'width' : 468,'params' : {}};`
    container.appendChild(optionsScript)

    const invokeScript = document.createElement('script')
    invokeScript.src = 'https://www.highperformanceformat.com/775b637466f146ce8138a6adaa661063/invoke.js'
    invokeScript.async = true
    container.appendChild(invokeScript)
  }, [])

  return <div ref={containerRef} className="w-full flex justify-center" />
}

// --- Banner 320x50 ---
export function AdsterraBanner320x50() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    container.innerHTML = ''

    const optionsScript = document.createElement('script')
    optionsScript.textContent = `atOptions = {'key' : '14dda57ff56632821027d924e1ff5e1c','format' : 'iframe','height' : 50,'width' : 320,'params' : {}};`
    container.appendChild(optionsScript)

    const invokeScript = document.createElement('script')
    invokeScript.src = 'https://www.highperformanceformat.com/14dda57ff56632821027d924e1ff5e1c/invoke.js'
    invokeScript.async = true
    container.appendChild(invokeScript)
  }, [])

  return <div ref={containerRef} className="w-full flex justify-center" />
}
