// ─── Genres ──────────────────────────────────────────────────────────────────

export type Genre =
  | 'fiction' | 'romance' | 'mystery' | 'fantasy'
  | 'science' | 'history' | 'biography' | 'self-help'
  | 'poetry' | 'adventure'

export const GENRE_LABELS: Record<Genre, string> = {
  fiction: '📖 Fiction',
  romance: '🌹 Romance',
  mystery: '🔍 Mystery',
  fantasy: '✨ Fantasy',
  science: '🔬 Science',
  history: '🏛️ History',
  biography: '👤 Biography',
  'self-help': '🌱 Self-Help',
  poetry: '🖋️ Poetry',
  adventure: '🧭 Adventure',
}

export const GENRE_MOODS: Record<Genre, string[]> = {
  fiction: ['peaceful', 'contemplative'],
  romance: ['romantic', 'warm', 'joyful'],
  mystery: ['tense', 'dark', 'suspenseful'],
  fantasy: ['wonder', 'epic', 'magical'],
  science: ['contemplative', 'curious'],
  history: ['solemn', 'grand', 'contemplative'],
  biography: ['inspiring', 'contemplative'],
  'self-help': ['warm', 'uplifting', 'peaceful'],
  poetry: ['lyrical', 'contemplative', 'romantic'],
  adventure: ['exciting', 'epic', 'tense'],
}

// ─── Book & Chapters ──────────────────────────────────────────────────────────

export interface Book {
  id: string
  title: string
  author: string
  genre: Genre
  coverUrl?: string
  description?: string
  source: 'gutenberg' | 'openlibrary' | 'upload' | 'local'
  gutenbergId?: number
  language?: string
  fileSize?: number
  chapters?: Chapter[]
  totalChapters?: number
}

export interface Chapter {
  bookId: string
  chapterIndex: number
  title: string
  text: string
  wordCount: number
  mood?: ChapterMood
  summary?: string
}

export type ChapterMood =
  | 'peaceful' | 'tense' | 'romantic' | 'dark'
  | 'joyful' | 'solemn' | 'epic' | 'contemplative'
  | 'magical' | 'exciting' | 'warm' | 'curious'

// ─── Library ─────────────────────────────────────────────────────────────────

export interface LibraryEntry {
  _id: string
  userId: string
  bookId: string
  chapterIndex: number
  chapterPosition: number
  overallProgress: number   // 0–1
  isFavourite: boolean
  isCompleted: boolean
  lastReadAt?: number
  totalListenSeconds?: number
  book?: Book
}

// ─── Player ───────────────────────────────────────────────────────────────────

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2
export type PlayerTab = 'player' | 'text' | 'voice' | 'music'
export type AmbienceMode = 'spotify' | 'ambient' | 'none'
export type VoiceMode = 'smart' | 'narrator' | 'female' | 'male'

export interface PlaybackPosition {
  bookId: string
  chapterIndex: number
  chapterPosition: number  // char index within chapter text
  overallProgress: number
}

// ─── TTS ─────────────────────────────────────────────────────────────────────

export type TTSProvider = 'elevenlabs' | 'groq' | 'browser'

export interface TTSProviderStatus {
  id: TTSProvider
  name: string
  available: boolean
  reason?: string
}

export interface TTSSegment {
  text: string
  characterType?: 'narrator' | 'male' | 'female'
  startIndex: number
  endIndex: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  _id: string
  username: string
  email: string
  displayName?: string
  avatarEmoji?: string
  defaultSpeed?: number
  defaultVoiceMode?: string
  defaultAmbience?: string
  createdAt: number
}

export interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  source: 'gutenberg' | 'openlibrary'
  id: string
  title: string
  author: string
  genre: Genre
  coverUrl?: string
  description?: string
  gutenbergId?: number
  textUrl?: string
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface ProcessedBook {
  bookId: string
  chapters: Chapter[]
  totalWords: number
  detectedGenre?: Genre
}

export interface AIChunkResult {
  chapters: Array<{
    title: string
    text: string
    mood?: ChapterMood
    summary?: string
  }>
  provider: 'gemini' | 'regex'
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}
