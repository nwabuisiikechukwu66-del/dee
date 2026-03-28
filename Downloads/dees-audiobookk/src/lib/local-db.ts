'use client'
// Full local database using IndexedDB + localStorage
// Works 100% without Convex or any backend
// All data persists across sessions

import type { Book, Chapter, LibraryEntry, User } from '@/types'

const DB_NAME = 'dees-audiobook'
const DB_VERSION = 1

// ─── IndexedDB setup ─────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('chapters')) {
        const chapStore = db.createObjectStore('chapters', { keyPath: 'key' })
        chapStore.createIndex('by_book', 'bookId', { unique: false })
      }

      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' })
      }
    }

    req.onsuccess = () => { _db = req.result; resolve(req.result) }
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(store: string, key: string): Promise<T | null> {
  return new Promise(async (resolve) => {
    try {
      const db = await getDB()
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

function idbPut(store: string, value: any): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const db = await getDB()
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put(value)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch { resolve() }
  })
}

function idbGetAllByIndex(store: string, index: string, value: string): Promise<any[]> {
  return new Promise(async (resolve) => {
    try {
      const db = await getDB()
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).index(index).getAll(value)
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = () => resolve([])
    } catch { resolve([]) }
  })
}

// ─── localStorage helpers ────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

function lsSet(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─── Chapters (IndexedDB — can be large) ────────────────────────────────────

export async function saveChaptersLocal(bookId: string, chapters: Chapter[]): Promise<void> {
  for (const ch of chapters) {
    await idbPut('chapters', { key: `${bookId}-${ch.chapterIndex}`, ...ch })
  }
  // Save chapter count to localStorage for quick access
  lsSet(`dees-chaptercount-${bookId}`, chapters.length)
}

export async function getChaptersLocal(bookId: string): Promise<Chapter[]> {
  const results = await idbGetAllByIndex('chapters', 'by_book', bookId)
  return results.sort((a, b) => a.chapterIndex - b.chapterIndex)
}

export async function getChapterLocal(bookId: string, chapterIndex: number): Promise<Chapter | null> {
  return idbGet<Chapter>('chapters', `${bookId}-${chapterIndex}`)
}

export function getChapterCountLocal(bookId: string): number {
  return lsGet<number>(`dees-chaptercount-${bookId}`, 0)
}

export function hasChaptersLocal(bookId: string): boolean {
  return getChapterCountLocal(bookId) > 0
}

// ─── Library (localStorage) ──────────────────────────────────────────────────

export function getLocalLibrary(): LibraryEntry[] {
  return lsGet<LibraryEntry[]>('dees-library', [])
}

export function addToLocalLibrary(book: Book): void {
  const lib = getLocalLibrary()
  const exists = lib.find((e) => e.bookId === book.id)
  if (!exists) {
    lib.unshift({
      _id: `local-${Date.now()}`,
      userId: 'guest',
      bookId: book.id,
      chapterIndex: 0,
      chapterPosition: 0,
      overallProgress: 0,
      isFavourite: false,
      isCompleted: false,
      book,
      createdAt: Date.now(),
    } as any)
    lsSet('dees-library', lib)
  }
  // Also save book record
  saveBookLocal(book)
}

export function updateLocalProgress(
  bookId: string,
  chapterIndex: number,
  chapterPosition: number,
  overallProgress: number
): void {
  const lib = getLocalLibrary()
  const entry = lib.find((e) => e.bookId === bookId)
  if (entry) {
    entry.chapterIndex = chapterIndex
    entry.chapterPosition = chapterPosition
    entry.overallProgress = overallProgress
    entry.lastReadAt = Date.now()
    entry.isCompleted = overallProgress >= 0.99
    lsSet('dees-library', lib)
  }
}

export function toggleLocalFavourite(bookId: string): void {
  const lib = getLocalLibrary()
  const entry = lib.find((e) => e.bookId === bookId)
  if (entry) {
    entry.isFavourite = !entry.isFavourite
    lsSet('dees-library', lib)
  }
}

export function removeFromLocalLibrary(bookId: string): void {
  const lib = getLocalLibrary().filter((e) => e.bookId !== bookId)
  lsSet('dees-library', lib)
}

export function isInLocalLibrary(bookId: string): boolean {
  return getLocalLibrary().some((e) => e.bookId === bookId)
}

// ─── Book records (localStorage) ────────────────────────────────────────────

export function saveBookLocal(book: Book): void {
  const books = lsGet<Record<string, Book>>('dees-books', {})
  books[book.id] = book
  lsSet('dees-books', books)
}

export function getBookLocal(bookId: string): Book | null {
  const books = lsGet<Record<string, Book>>('dees-books', {})
  return books[bookId] ?? null
}

// ─── Local auth (guest + local accounts) ────────────────────────────────────

export interface LocalUser {
  id: string
  username: string
  email: string
  displayName: string
  avatarEmoji: string
  passwordHash: string
  createdAt: number
}

export function getLocalUsers(): LocalUser[] {
  return lsGet<LocalUser[]>('dees-local-users', [])
}

export function saveLocalUser(user: LocalUser): void {
  const users = getLocalUsers()
  const idx = users.findIndex((u) => u.id === user.id)
  if (idx >= 0) users[idx] = user
  else users.push(user)
  lsSet('dees-local-users', users)
}

export function getLocalUserByEmail(email: string): LocalUser | null {
  return getLocalUsers().find((u) => u.email === email.toLowerCase()) ?? null
}

export function getLocalUserByUsername(username: string): LocalUser | null {
  return getLocalUsers().find((u) => u.username === username.toLowerCase()) ?? null
}

export function setCurrentLocalUser(user: Omit<LocalUser, 'passwordHash'> | null): void {
  lsSet('dees-current-user', user)
}

export function getCurrentLocalUser(): Omit<LocalUser, 'passwordHash'> | null {
  return lsGet('dees-current-user', null)
}
