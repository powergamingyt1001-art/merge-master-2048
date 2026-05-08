'use client'

import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FooterPageProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

function FooterPage({ isOpen, onClose, title, children }: FooterPageProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-base font-extrabold" style={{ color: '#EDC22E' }}>{title}</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'thin' }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function PrivacyPolicy({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <FooterPage isOpen={isOpen} onClose={onClose} title="Privacy Policy">
      <p className="text-[8px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Last updated: May 2025</p>

      <Section title="Introduction">
        <Text>Welcome to Merge Master 2048 Challenge. We respect your privacy and are committed to protecting your personal data.</Text>
      </Section>

      <Section title="Information We Collect">
        <Bullet>Game Progress: Scores, coins, level, and settings stored locally on your device using browser storage. This data never leaves your device.</Bullet>
        <Bullet>Usage Data: Anonymous usage data such as game sessions and general device information to improve the game.</Bullet>
      </Section>

      <Section title="Advertisements">
        <Text>We use Google AdSense to display advertisements. Google may use cookies to serve ads based on your visits.</Text>
        <Bullet>You can opt out at <Link href="https://www.google.com/settings/ads">Google Ads Settings</Link></Bullet>
        <Bullet>Opt out of vendor cookies at <Link href="https://optout.networkadvertising.org/">NAI opt-out page</Link></Bullet>
      </Section>

      <Section title="Local Storage">
        <Text>All game data is stored exclusively on your device using browser local storage. We do not transmit this data to any server. Clearing browser data will reset your progress.</Text>
      </Section>

      <Section title="Children's Privacy">
        <Text>Our game is suitable for all ages. We do not knowingly collect personal information from children under 13.</Text>
      </Section>

      <Section title="Contact Us">
        <Text>Email: <Link href="mailto:powergamingyt1001@gmail.com">powergamingyt1001@gmail.com</Link></Text>
      </Section>
    </FooterPage>
  )
}

export function AboutPage({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <FooterPage isOpen={isOpen} onClose={onClose} title="About">
      <p className="text-center text-xs font-bold mb-3" style={{ color: '#FF7A00' }}>The Ultimate 2048 Merge Puzzle Challenge</p>

      <Section title="What is Merge Master 2048?">
        <Text>An exciting puzzle game where you swipe tiles to merge them and reach the legendary 2048 tile! Battle opponents, win coins, use power-ups, and climb the leaderboard!</Text>
      </Section>

      <Section title="Game Features">
        <div className="grid grid-cols-4 gap-2 my-2">
          {[
            { emoji: '🎮', name: 'Classic' },
            { emoji: '⚔️', name: '1v1' },
            { emoji: '🪙', name: 'Coins' },
            { emoji: '🏆', name: 'Tour' },
            { emoji: '🎰', name: 'Spin' },
            { emoji: '📅', name: 'Daily' },
            { emoji: '🔨', name: 'Powers' },
            { emoji: '📊', name: 'Levels' },
          ].map(f => (
            <div key={f.name} className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-base">{f.emoji}</span>
              <span className="text-[7px] font-bold" style={{ color: '#EDC22E' }}>{f.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How to Play">
        <Bullet>Swipe tiles in any direction to move them</Bullet>
        <Bullet>Same number tiles merge into one</Bullet>
        <Bullet>Keep merging to reach 2048!</Bullet>
        <Bullet>Battle Mode: compete within a time limit</Bullet>
        <Bullet>Use power-ups: Hammer, Magnet, Blast</Bullet>
      </Section>

      <Section title="Version">
        <Text>Merge Master 2048 Challenge v2.0 — Web Edition</Text>
      </Section>

      <Section title="Contact">
        <Text>Email: <Link href="mailto:powergamingyt1001@gmail.com">powergamingyt1001@gmail.com</Link></Text>
      </Section>
    </FooterPage>
  )
}

export function ContactPage({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <FooterPage isOpen={isOpen} onClose={onClose} title="Contact Us">
      <Section title="Get in Touch">
        <Text>Have questions or feedback? We'd love to hear from you!</Text>
      </Section>

      <Section title="Email">
        <Link href="mailto:powergamingyt1001@gmail.com">powergamingyt1001@gmail.com</Link>
      </Section>

      <Section title="Response Time">
        <Text>We typically respond within 24-48 hours.</Text>
      </Section>

      <Section title="What can we help with?">
        <Bullet>Bug reports and technical issues</Bullet>
        <Bullet>Feature suggestions</Bullet>
        <Bullet>Account or game progress questions</Bullet>
        <Bullet>Ad-related concerns</Bullet>
        <Bullet>Partnership inquiries</Bullet>
      </Section>
    </FooterPage>
  )
}

// Reusable small components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-[10px] font-bold mb-1" style={{ color: '#FF7A00', borderLeft: '2px solid #EDC22E', paddingLeft: 8 }}>{title}</h3>
      {children}
    </div>
  )
}

function Text({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] leading-relaxed mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{children}</p>
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5 mb-0.5">
      <span className="text-[8px] mt-0.5" style={{ color: '#EDC22E' }}>•</span>
      <span className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{children}</span>
    </div>
  )
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-[9px] font-semibold underline" style={{ color: '#00E676' }}>
      {children}
    </a>
  )
}
