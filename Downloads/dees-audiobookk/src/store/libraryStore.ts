'use client'
import { create } from 'zustand'
import type { Book, LibraryEntry, Chapter } from '@/types'
import {
  getLocalLibrary, addToLocalLibrary, updateLocalProgress,
  toggleLocalFavourite, removeFromLocalLibrary, isInLocalLibrary,
  saveChaptersLocal, getChaptersLocal, hasChaptersLocal,
} from '@/lib/local-db'
import { useAuthStore } from './authStore'

type LibraryFilter = 'all' | 'in-progress' | 'favourites' | 'completed'

interface LibraryStore {
  entries: LibraryEntry[]
  filter: LibraryFilter
  loading: boolean

  loadLibrary: () => Promise<void>
  addBook: (book: Book) => Promise<void>
  removeBook: (bookId: string) => Promise<void>
  toggleFavourite: (bookId: string) => void
  updateProgress: (bookId: string, chapterIndex: number, chapterPosition: number, overallProgress: number) => Promise<void>
  isInLibrary: (bookId: string) => boolean
  setFilter: (f: LibraryFilter) => void
  getFiltered: () => LibraryEntry[]

  saveChapters: (bookId: string, chapters: Chapter[]) => Promise<void>
  getChapters: (bookId: string) => Promise<Chapter[]>
  hasChapters: (bookId: string) => boolean
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  entries: [],
  filter: 'all',
  loading: false,

  loadLibrary: async () => {
    set({ loading: true })
    try {
      const user = useAuthStore.getState().user
      const isLocalMode = useAuthStore.getState().isLocalMode

      if (!user || isLocalMode) {
        // Load from localStorage
        const entries = getLocalLibrary()
        set({ entries })
        return
      }

      // Try Convex
      try {
        const res = await fetch(`/api/library?userId=${user._id}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          set({ entries: data.entries ?? [] })
          return
        }
      } catch {}

      // Fallback to local
      set({ entries: getLocalLibrary() })
    } finally {
      set({ loading: false })
    }
  },

  addBook: async (book) => {
    // Always add locally first (optimistic)
    addToLocalLibrary(book)
    set({ entries: getLocalLibrary() })

    // Try to sync to Convex
    const user = useAuthStore.getState().user
    if (user && !useAuthStore.getState().isLocalMode) {
      try {
        await fetch('/api/library/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: user._id, book }),
        })
      } catch {}
    }
  },

  removeBook: (bookId) => {
    removeFromLocalLibrary(bookId)
    set({ entries: getLocalLibrary() })
  },

  toggleFavourite: (bookId) => {
    toggleLocalFavourite(bookId)
    set({ entries: getLocalLibrary() })
  },

  updateProgress: async (bookId, chapterIndex, chapterPosition, overallProgress) => {
    updateLocalProgress(bookId, chapterIndex, chapterPosition, overallProgress)
    set({ entries: getLocalLibrary() })

    const user = useAuthStore.getState().user
    if (user && !useAuthStore.getState().isLocalMode) {
      try {
        await fetch('/api/library/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: user._id, bookId, chapterIndex, chapterPosition, overallProgress }),
        })
      } catch {}
    }
  },

  isInLibrary: (bookId) => {
    return get().entries.some((e) => e.bookId === bookId) || isInLocalLibrary(bookId)
  },

  setFilter: (filter) => set({ filter }),

  getFiltered: () => {
    const { entries, filter } = get()
    switch (filter) {
      case 'in-progress': return entries.filter((e) => !e.isCompleted && e.overallProgress > 0)
      case 'favourites': return entries.filter((e) => e.isFavourite)
      case 'completed': return entries.filter((e) => e.isCompleted)
      default: return entries
    }
  },

  saveChapters: async (bookId, chapters) => {
    await saveChaptersLocal(bookId, chapters)
  },

  getChapters: async (bookId) => {
    return getChaptersLocal(bookId)
  },

  hasChapters: (bookId) => hasChaptersLocal(bookId),
}))
