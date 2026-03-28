'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import {
  getLocalUserByEmail, getLocalUserByUsername,
  saveLocalUser, setCurrentLocalUser, getCurrentLocalUser,
} from '@/lib/local-db'

interface AuthStore {
  user: User | null
  loading: boolean
  initialized: boolean
  isLocalMode: boolean

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, username: string, displayName?: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
}

// Simple client-side hash for local mode (not cryptographic — just demo)
async function simpleHash(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  isLocalMode: false,

  initialize: async () => {
    // Check for persisted local user
    const localUser = getCurrentLocalUser()
    if (localUser) {
      set({
        user: {
          _id: localUser.id,
          username: localUser.username,
          email: localUser.email,
          displayName: localUser.displayName,
          avatarEmoji: localUser.avatarEmoji,
          createdAt: localUser.createdAt,
        },
        isLocalMode: true,
        initialized: true,
      })
      return
    }

    // Try to verify session cookie with backend
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        set({ user: data.user, initialized: true, isLocalMode: false })
        return
      }
    } catch { /* Backend not available */ }

    set({ initialized: true })
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      // Try backend first
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        })

        if (res.ok) {
          const data = await res.json()
          set({ user: data.user, loading: false, isLocalMode: false })
          return
        }

        const err = await res.json()
        if (!err.localMode) {
          throw new Error(err.error ?? 'Login failed')
        }
        // Fall through to local mode
      } catch (err: any) {
        if (!err.message?.includes('fetch') && !err.message?.includes('network')) {
          throw err
        }
        // Network error — fall through to local mode
      }

      // Local mode login
      const localUser = getLocalUserByEmail(email)
      if (!localUser) throw new Error('Invalid email or password')

      const hash = await simpleHash(password)
      if (hash !== localUser.passwordHash) throw new Error('Invalid email or password')

      const user: User = {
        _id: localUser.id,
        username: localUser.username,
        email: localUser.email,
        displayName: localUser.displayName,
        avatarEmoji: localUser.avatarEmoji,
        createdAt: localUser.createdAt,
      }

      setCurrentLocalUser({ ...localUser })
      set({ user, loading: false, isLocalMode: true })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  signup: async (email, password, username, displayName) => {
    set({ loading: true })
    try {
      // Try backend first
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, username, displayName }),
        })

        if (res.ok) {
          const data = await res.json()
          set({ user: data.user, loading: false, isLocalMode: false })
          return
        }

        const err = await res.json()
        if (!err.localMode) {
          throw new Error(err.error ?? 'Signup failed')
        }
        // Fall through to local mode
      } catch (err: any) {
        if (!err.message?.includes('fetch') && !err.message?.includes('network') && !err.message?.includes('CONVEX')) {
          throw err
        }
      }

      // Local mode signup
      if (getLocalUserByEmail(email)) throw new Error('An account with this email already exists')
      if (getLocalUserByUsername(username)) throw new Error('This username is already taken')

      const hash = await simpleHash(password)
      const emojis = ['📖', '🌙', '✨', '🌿', '🕯️', '🌸', '🦋', '🌺', '🍃', '🌊']
      const newUser = {
        id: `local-${Date.now()}`,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        displayName: displayName || username,
        avatarEmoji: emojis[Math.floor(Math.random() * emojis.length)],
        passwordHash: hash,
        createdAt: Date.now(),
      }

      saveLocalUser(newUser)
      setCurrentLocalUser(newUser)

      const user: User = {
        _id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.displayName,
        avatarEmoji: newUser.avatarEmoji,
        createdAt: newUser.createdAt,
      }

      set({ user, loading: false, isLocalMode: true })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    setCurrentLocalUser(null)
    set({ user: null, isLocalMode: false })
  },

  setUser: (user) => set({ user }),
}))
