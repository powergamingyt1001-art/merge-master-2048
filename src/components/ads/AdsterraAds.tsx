'use client';

import { useEffect, useState } from 'react';

// ===== AD SLOT CONFIGS =====
const AD_SLOTS = {
  banner728x90: {
    id: 'cont-banner-728x90',
    script: '//www.highperformanceformat.com/ce3de5cebae6e3a4b6c7f4a8e5e3e3a2/invoke.js',
  },
  banner300x250: {
    id: 'cont-banner-300x250',
    script: '//www.highperformanceformat.com/5e6d7ecebae6e3a4b6c7f4a8e5e3e3a2/invoke.js',
  },
  banner320x50: {
    id: 'cont-banner-320x50',
    script: '//www.highperformanceformat.com/fe3a8dcebae6e3a4b6c7f4a8e5e3e3a2/invoke.js',
  },
  banner160x600: {
    id: 'cont-banner-160x600',
    script: '//www.highperformanceformat.com/a3e2b1cebae6e3a4b6c7f4a8e5e3e3a2/invoke.js',
  },
  banner160x300: {
    id: 'cont-banner-160x300',
    script: '//www.highperformanceformat.com/b4c5d6cebae6e3a4b6c7f4a8e5e3e3a2/invoke.js',
  },
  popunder: {
    id: 'cont-popunder',
    script: '//www.highperformanceformat.com/ce3de5cebae6e3a4b6c7f4a8e5e3e3a2/invoke.js',
  },
  socialBar: {
    id: 'cont-social-bar',
    script: '//www.highperformanceformat.com/1cfe0cebae6e3a4b6c7f4a8e5e3e3a2/invoke.js',
  },
};

// ===== HELPER: Check if ad should show (50% chance per session) =====
function shouldShowAd(sessionKey: string): boolean {
  if (typeof window === 'undefined') return false;
  const stored = sessionStorage.getItem(sessionKey);
  if (stored !== null) return stored === 'true';
  const show = Math.random() < 0.5;
  sessionStorage.setItem(sessionKey, String(show));
  return show;
}

// ===== BANNER 728x90 =====
export function AdsterraBanner728x90() {
  return <AdsterraAd slot={AD_SLOTS.banner728x90} />;
}

// ===== BANNER 300x250 =====
export function AdsterraBanner300x250() {
  return <AdsterraAd slot={AD_SLOTS.banner300x250} />;
}

// ===== BANNER 320x50 =====
export function AdsterraBanner320x50() {
  return <AdsterraAd slot={AD_SLOTS.banner320x50} />;
}

// ===== BANNER 160x600 =====
export function AdsterraBanner160x600() {
  return <AdsterraAd slot={AD_SLOTS.banner160x600} />;
}

// ===== BANNER 160x300 =====
export function AdsterraBanner160x300() {
  return <AdsterraAd slot={AD_SLOTS.banner160x300} />;
}

// ===== NATIVE BANNER (for compatibility) =====
export function AdsterraNativeBanner() {
  return <div className="h-20 w-full flex items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Ad Space</span>
  </div>;
}

// ===== POPUNDER (50% chance, 15s delay, 5min cooldown) =====
export function AdsterraPopunder() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!shouldShowAd('adsterra_popunder')) return;
    setShouldShow(true);

    const timer = setTimeout(() => {
      const lastPop = localStorage.getItem('adsterra_popunder_last');
      const now = Date.now();
      if (lastPop && now - parseInt(lastPop) < 5 * 60 * 1000) return;

      const script = document.createElement('script');
      script.src = AD_SLOTS.popunder.script;
      script.async = true;
      document.body.appendChild(script);
      localStorage.setItem('adsterra_popunder_last', String(now));
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldShow) return null;
  return <div id={AD_SLOTS.popunder.id} className="hidden" />;
}

// ===== SOCIAL BAR (50% chance, 10s delay) =====
export function AdsterraSocialBar() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!shouldShowAd('adsterra_socialbar')) return;
    setShouldShow(true);

    const timer = setTimeout(() => {
      const script = document.createElement('script');
      script.src = AD_SLOTS.socialBar.script;
      script.async = true;
      document.body.appendChild(script);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldShow) return null;
  return <div id={AD_SLOTS.socialBar.id} className="hidden" />;
}

// ===== GENERIC AD COMPONENT =====
function AdsterraAd({ slot }: { slot: { id: string; script: string } }) {
  useEffect(() => {
    const existing = document.getElementById(slot.id);
    if (existing) return;

    const container = document.createElement('div');
    container.id = slot.id;
    document.body.appendChild(container);

    const script = document.createElement('script');
    script.src = slot.script;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      try {
        container.remove();
        script.remove();
      } catch {}
    };
  }, [slot]);

  return (
    <div className="flex justify-center items-center w-full my-2">
      <div id={`${slot.id}-render`} />
    </div>
  );
}