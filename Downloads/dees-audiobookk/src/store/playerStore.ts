'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Book, Chapter, PlaybackSpeed, PlayerTab, AmbienceMode, VoiceMode, TTSProvider } from '@/types'

interface PlayerStore {
  // Current book
  book: Book | null
  chapters: Chapter[]
  totalChapters: number

  // Playback position
  chapterIndex: number
  chapterPosition: number  // char index within chapter text
  overallProgress: number  // 0–1

  // Playback state
  isPlaying: boolean
  isLoading: boolean       // loading/processing book
  isProcessing: boolean    // AI chunking in progress

  // Settings (persisted)
  speed: PlaybackSpeed
  voiceMode: VoiceMode
  activeProvider: TTSProvider
  voiceVolume: number
  musicVolume: number
  fontSize: number
  ambienceMode: AmbienceMode
  activeTab: PlayerTab

  // Current sentence highlight
  currentSentenceIndex: number
  currentSentenceText: string

  // Actions
  loadBook: (book: Book, chapters: Chapter[], savedChapterIndex?: number, savedPosition?: number) => void
  setChapters: (chapters: Chapter[]) => void
  setPlaying: (v: boolean) => void
  setLoading: (v: boolean) => void
  setProcessing: (v: boolean) => void
  setChapterIndex: (i: number) => void
  setChapterPosition: (pos: number) => void
  setOverallProgress: (p: number) => void
  setSpeed: (s: PlaybackSpeed) => void
  setVoiceMode: (m: VoiceMode) => void
  setActiveProvider: (p: TTSProvider) => void
  setVoiceVolume: (v: number) => void
  setMusicVolume: (v: number) => void
  setFontSize: (s: number) => void
  setAmbienceMode: (m: AmbienceMode) => void
  setActiveTab: (t: PlayerTab) => void
  setCurrentSentence: (idx: number, text: string) => void
  nextChapter: () => boolean
  prevChapter: () => boolean
  closePlayer: () => void
  getCurrentChapter: () => Chapter | null
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      book: null,
      chapters: [],
      totalChapters: 0,
      chapterIndex: 0,
      chapterPosition: 0,
      overallProgress: 0,
      isPlaying: false,
      isLoading: false,
      isProcessing: false,
      speed: 1,
      voiceMode: 'narrator',
      activeProvider: 'browser',
      voiceVolume: 0.9,
      musicVolume: 0.3,
      fontSize: 1,
      ambienceMode: 'ambient',
      activeTab: 'player',
      currentSentenceIndex: 0,
      currentSentenceText: '',

      loadBook: (book, chapters, savedChapterIndex = 0, savedPosition = 0) => {
        set({
          book,
          chapters,
          totalChapters: chapters.length,
          chapterIndex: savedChapterIndex,
          chapterPosition: savedPosition,
          isPlaying: false,
          isLoading: false,
          currentSentenceIndex: 0,
          currentSentenceText: '',
          activeTab: 'player',
        })
      },

      setChapters: (chapters) => set({ chapters, totalChapters: chapters.length }),
      setPlaying: (v) => set({ isPlaying: v }),
      setLoading: (v) => set({ isLoading: v }),
      setProcessing: (v) => set({ isProcessing: v }),
      setChapterIndex: (i) => set({ chapterIndex: i, chapterPosition: 0, currentSentenceIndex: 0 }),
      setChapterPosition: (pos) => set({ chapterPosition: pos }),
      setOverallProgress: (p) => set({ overallProgress: Math.max(0, Math.min(1, p)) }),
      setSpeed: (s) => set({ speed: s }),
      setVoiceMode: (m) => set({ voiceMode: m }),
      setActiveProvider: (p) => set({ activeProvider: p }),
      setVoiceVolume: (v) => set({ voiceVolume: Math.max(0, Math.min(1, v)) }),
      setMusicVolume: (v) => set({ musicVolume: Math.max(0, Math.min(1, v)) }),
      setFontSize: (s) => set({ fontSize: Math.max(0.8, Math.min(1.5, s)) }),
      setAmbienceMode: (m) => set({ ambienceMode: m }),
      setActiveTab: (t) => set({ activeTab: t }),
      setCurrentSentence: (idx, text) => set({ currentSentenceIndex: idx, currentSentenceText: text }),

      nextChapter: () => {
        const { chapterIndex, totalChapters } = get()
        if (chapterIndex < totalChapters - 1) {
          set({ chapterIndex: chapterIndex + 1, chapterPosition: 0, currentSentenceIndex: 0 })
          return true
        }
        return false
      },

      prevChapter: () => {
        const { chapterIndex } = get()
        if (chapterIndex > 0) {
          set({ chapterIndex: chapterIndex - 1, chapterPosition: 0, currentSentenceIndex: 0 })
          return true
        }
        return false
      },

      closePlayer: () => set({
        book: null,
        chapters: [],
        isPlaying: false,
        chapterIndex: 0,
        chapterPosition: 0,
        overallProgress: 0,
      }),

      getCurrentChapter: () => {
        const { chapters, chapterIndex } = get()
        return chapters[chapterIndex] ?? null
      },
    }),
    {
      name: 'dees-player-v2',
      partialize: (s) => ({
        speed: s.speed,
        voiceMode: s.voiceMode,
        voiceVolume: s.voiceVolume,
        musicVolume: s.musicVolume,
        fontSize: s.fontSize,
        ambienceMode: s.ambienceMode,
        activeProvider: s.activeProvider,
      }),
    }
  )
)
