'use client'
import { useState } from 'react'
import { SignOut, Book, Clock, Fire, User } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { useLibraryStore } from '@/store/libraryStore'
import { Input, Button } from '@/components/ui'
import { getTTSProviderStatus } from '@/services/tts/tts.service'

export default function ProfilePage() {
  const { user, loading, login, signup, logout } = useAuthStore()
  const { show } = useToastStore()
  const { entries } = useLibraryStore()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAuth = async () => {
    setError(null)
    if (!email || !password || (isSignUp && !username)) {
      setError('Please fill in all required fields'); return
    }
    try {
      if (isSignUp) {
        await signup(email, password, username, displayName || username)
        show('Welcome! Your account is ready 🎉', 'success')
      } else {
        await login(email, password)
        show('Welcome back 🌙', 'success')
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    }
  }

  const handleLogout = async () => {
    await logout()
    show('Signed out', 'info')
  }

  const providers = getTTSProviderStatus()
  const completedBooks = entries.filter((e) => e.isCompleted).length
  const inProgress = entries.filter((e) => !e.isCompleted && e.overallProgress > 0).length

  if (user) {
    const initials = (user.displayName ?? user.username ?? 'R')
      .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

    return (
      <main className="flex-1 overflow-y-auto bg-[#F9F5EE] pb-nav" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <header className="px-4 pt-6 pb-4">
          <h1 className="font-serif text-[2rem] leading-tight text-[#2C2416]">Profile</h1>
        </header>

        {/* Avatar + info */}
        <div className="flex flex-col items-center px-4 pb-6">
          <div className="w-20 h-20 rounded-full bg-[#7C5C3A] flex items-center justify-center text-2xl font-serif text-[#F9F5EE] mb-3 shadow-card">
            {user.avatarEmoji ?? initials}
          </div>
          <h2 className="text-xl font-serif text-[#2C2416]">{user.displayName ?? user.username}</h2>
          <p className="text-sm text-[#9E8E7A] font-serif">@{user.username}</p>
          <p className="text-xs text-[#9E8E7A] font-serif">{user.email}</p>
        </div>

        {/* Stats */}
        <section className="px-4 mb-6">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9E8E7A] font-serif mb-3">Reading Stats</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Book size={18} className="text-[#7C5C3A]" />, value: completedBooks, label: 'Completed' },
              { icon: <Clock size={18} className="text-[#7C5C3A]" />, value: entries.length, label: 'In Library' },
              { icon: <Fire size={18} className="text-red-400" />, value: inProgress, label: 'In Progress' },
            ].map(({ icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 p-3 bg-[#F2EAD8] rounded-xl border border-[#D4C4A8]">
                {icon}
                <span className="text-xl font-serif text-[#2C2416]">{value}</span>
                <span className="text-[10px] text-[#9E8E7A] font-serif">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* TTS Providers */}
        <section className="px-4 mb-6">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9E8E7A] font-serif mb-3">Voice Providers</h2>
          <div className="flex flex-col gap-2">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-[#F2EAD8] rounded-xl border border-[#D4C4A8]">
                <span className={`w-2 h-2 rounded-full ${p.available ? 'bg-green-500' : 'bg-red-400'}`} />
                <span className="text-sm font-serif text-[#2C2416] flex-1">{p.name}</span>
                <span className={`text-xs font-serif ${p.available ? 'text-green-600' : 'text-[#9E8E7A]'}`}>
                  {p.available ? 'Ready' : p.reason ?? 'Unavailable'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Sign out */}
        <div className="px-4 mb-8">
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 font-serif text-sm hover:text-red-700 transition-colors py-2">
            <SignOut size={16} /> Sign Out
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#F9F5EE] pb-nav" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-6 pb-6">
        <h1 className="font-serif text-[2rem] leading-tight text-[#2C2416]">Sign In</h1>
        <p className="text-sm text-[#9E8E7A] font-serif mt-1">
          {isSignUp ? 'Create an account to sync your library' : 'Welcome back — your books are waiting'}
        </p>
      </header>

      <div className="px-4 flex flex-col gap-4">
        {isSignUp && (
          <>
            <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="bookworm42" autoComplete="username" />
            <Input label="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name" autoComplete="name" />
          </>
        )}
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email" />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" autoComplete={isSignUp ? 'new-password' : 'current-password'}
          error={error ?? undefined} />

        <Button size="lg" onClick={handleAuth} loading={loading} className="w-full mt-1">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Button>

        <div className="flex flex-col items-center gap-3 mt-2">
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            className="text-sm text-[#7C5C3A] font-serif hover:underline">
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
          <button onClick={() => show("You're in guest mode. Your library is saved locally on this device.", 'info')}
            className="text-sm text-[#9E8E7A] font-serif hover:text-[#5C4A2E] transition-colors">
            Continue as guest
          </button>
        </div>
      </div>
    </main>
  )
}
