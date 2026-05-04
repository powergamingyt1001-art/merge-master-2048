'use client'

import { motion } from 'framer-motion'

interface LoadingScreenProps {
  onFinish: () => void
}

export function LoadingScreen({ onFinish }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden">
      {/* Full screen background image */}
      <img
        src="/loading.png"
        alt="Merge Master 2048 Challenge"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay at bottom for loading bar visibility */}
      <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }} />

      {/* Loading bar at the bottom */}
      <div className="relative z-10 w-4/5 max-w-xs mb-12">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #EDC22E, #FF7A00)' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
            onAnimationComplete={() => {
              setTimeout(onFinish, 400)
            }}
          />
        </div>
        <p className="text-center mt-2 text-[10px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>
          LOADING...
        </p>
      </div>
    </div>
  )
}
