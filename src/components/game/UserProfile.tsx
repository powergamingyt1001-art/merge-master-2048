'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Edit3, Save, Coins, Trophy, Crown, Calendar, Flame, Users } from 'lucide-react'

interface UserProfileProps {
  isOpen: boolean
  onClose: () => void
  coins: number
  modBestScore: number
  offlineBestScore: number
  gamesPlayed: number
  streakDay: number
  inviteCode: string
  onUpdateName: (name: string) => void
  onShowInvite: () => void
}

export function UserProfile({ isOpen, onClose, coins, modBestScore, offlineBestScore, gamesPlayed, streakDay, inviteCode, onUpdateName, onShowInvite }: UserProfileProps) {
  const [name, setName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('mergeMaster2048_userName') || 'Player'
    setName(saved)
    setEditName(saved)
  }, [isOpen])

  const handleSaveName = useCallback(() => {
    if (editName.trim().length < 2) return
    setName(editName.trim())
    localStorage.setItem('mergeMaster2048_userName', editName.trim())
    onUpdateName(editName.trim())
    setIsEditing(false)
  }, [editName, onUpdateName])

  const userId = typeof window !== 'undefined'
    ? (localStorage.getItem('mergeMaster2048_userId') || (() => {
        const id = 'MM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
        localStorage.setItem('mergeMaster2048_userId', id)
        return id
      })())
    : 'MM0000'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
              <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>👤 Profile</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0">

              {/* Avatar + Name */}
              <div className="flex flex-col items-center py-4 px-5">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', boxShadow: '0 4px 20px rgba(237,194,46,0.3)' }}>
                  <User className="w-10 h-10" style={{ color: '#FFFFFF' }} />
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2 w-full max-w-[200px]">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg text-center text-sm font-bold"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(237,194,46,0.3)', color: '#FFFFFF', outline: 'none' }}
                      maxLength={20}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    />
                    <button onClick={handleSaveName} className="p-1.5 rounded-lg"
                      style={{ backgroundColor: 'rgba(0,230,118,0.15)' }}>
                      <Save className="w-3.5 h-3.5" style={{ color: '#00E676' }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold" style={{ color: '#FFFFFF' }}>{name}</p>
                    <button onClick={() => { setEditName(name); setIsEditing(true) }} className="p-1 rounded"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <Edit3 className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </button>
                  </div>
                )}

                <p className="text-[9px] mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  ID: {userId}
                </p>
              </div>

              {/* Invite Button */}
              <div className="px-4 mb-3">
                <button onClick={() => { onClose(); onShowInvite(); }}
                  className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #EDC22E, #FF7A00)', color: '#FFFFFF', boxShadow: '0 4px 15px rgba(237,194,46,0.3)' }}>
                  <Users className="w-4 h-4" />
                  INVITE FRIENDS
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    Code: {inviteCode}
                  </span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                <StatCard icon={<Coins className="w-3.5 h-3.5" />} label="Coins" value={coins.toLocaleString()} color="#EDC22E" />
                <StatCard icon={<Trophy className="w-3.5 h-3.5" />} label="Battle Best" value={modBestScore.toLocaleString()} color="#F65E3B" />
                <StatCard icon={<Crown className="w-3.5 h-3.5" />} label="Offline Best" value={offlineBestScore.toLocaleString()} color="#00E676" />
                <StatCard icon={<Flame className="w-3.5 h-3.5" />} label="Streak" value={`Day ${Math.min(streakDay + 1, 7)}/7`} color="#FF7A00" />
                <StatCard icon={<Calendar className="w-3.5 h-3.5" />} label="Games" value={gamesPlayed.toString()} color="#8f7a66" />
                <StatCard icon={<User className="w-3.5 h-3.5" />} label="Status" value="Active" color="#00E676" />
              </div>

              {/* Info */}
              <div className="px-4 pb-4">
                <div className="p-2.5 rounded-xl text-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    🔒 Your data is stored locally on your device
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl"
      style={{ backgroundColor: `${color}08`, border: `1px solid ${color}15` }}>
      <div style={{ color }}>{icon}</div>
      <div>
        <p className="text-[7px] font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
        <p className="text-[11px] font-extrabold" style={{ color }}>{value}</p>
      </div>
    </div>
  )
}
