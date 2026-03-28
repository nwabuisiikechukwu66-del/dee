import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatProgress(v: number): string {
  return `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function estimateListenTime(wordCount: number, speed = 1): number {
  // 150 wpm average audiobook listening rate
  return Math.ceil((wordCount / (150 * speed)) * 60)
}

export function formatTimeLeft(wordCount: number, progress: number, speed = 1): string {
  const wordsLeft = wordCount * (1 - progress)
  const secs = estimateListenTime(wordsLeft, speed)
  if (secs <= 0) return 'Done'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m left`
  if (m > 0) return `${m}m left`
  return 'Almost done'
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function getGreeting(name?: string | null): string {
  const h = new Date().getHours()
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  if (name) return `Good ${part}, ${name.split(' ')[0]}`
  return `Good ${part}`
}

export function calcOverallProgress(
  chapterIndex: number,
  chapterPosition: number,
  chapters: Array<{ text: string }>
): number {
  if (!chapters.length) return 0
  const totalChars = chapters.reduce((a, c) => a + c.text.length, 0)
  if (totalChars === 0) return 0
  const charsRead = chapters.slice(0, chapterIndex).reduce((a, c) => a + c.text.length, 0) + chapterPosition
  return Math.min(1, charsRead / totalChars)
}

export function generateBookId(source: string, idOrFilename: string | number): string {
  const clean = String(idOrFilename).replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)
  return `${source}-${clean}`
}
