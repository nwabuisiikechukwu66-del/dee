'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useLibraryStore } from '@/store/libraryStore'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'
import { ProgressBar, WaveIndicator, Skeleton, Pill } from '@/components/ui'
import { GENRE_LABELS, type Genre } from '@/types'
import { getGreeting, formatProgress, formatTimeLeft, cn } from '@/utils'

const GENRES = Object.keys(GENRE_LABELS) as Genre[]

const FEATURED_BOOKS = [
  { id: 'gutenberg-1342', title: 'Pride and Prejudice', author: 'Jane Austen', genre: 'romance' as Genre, coverUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg', gutenbergId: 1342 },
  { id: 'gutenberg-11',   title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', genre: 'fantasy' as Genre, coverUrl: 'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg', gutenbergId: 11 },
  { id: 'gutenberg-84',   title: 'Frankenstein', author: 'Mary Shelley', genre: 'fiction' as Genre, coverUrl: 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg', gutenbergId: 84 },
  { id: 'gutenberg-1661', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', genre: 'mystery' as Genre, coverUrl: 'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg', gutenbergId: 1661 },
  { id: 'gutenberg-2701', title: 'Moby Dick', author: 'Herman Melville', genre: 'adventure' as Genre, coverUrl: 'https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg', gutenbergId: 2701 },
  { id: 'gutenberg-345',  title: 'Dracula', author: 'Bram Stoker', genre: 'mystery' as Genre, coverUrl: 'https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg', gutenbergId: 345 },
]

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { entries, loading, loadLibrary } = useLibraryStore()
  const { book: activeBook, isPlaying } = usePlayerStore()
  const { show } = useToastStore()

  useEffect(() => { loadLibrary() }, [loadLibrary])

  const inProgress = entries.filter((e) => !e.isCompleted && e.overallProgress > 0).slice(0, 1)
  const recent = entries.slice(0, 3)

  const handleFeaturedTap = (book: typeof FEATURED_BOOKS[0]) => {
    router.push(`/discover?book=${book.id}`)
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#F9F5EE] pb-nav-player" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Greeting */}
      <header className="px-4 pt-6 pb-4">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="font-serif text-[2rem] leading-tight text-[#2C2416] text-balance">
          {getGreeting(user?.displayName)}
        </motion.h1>
        <p className="text-sm text-[#9E8E7A] font-serif mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      {/* Continue Reading */}
      {inProgress.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9E8E7A] font-serif mb-3">Continue Reading</h2>
          {inProgress.map((entry) => (
            <button key={entry.bookId} onClick={() => router.push('/player')}
              className="w-full bg-white border border-[#D4C4A8] rounded-xl p-4 shadow-card flex gap-4 items-start text-left hover:shadow-card-hover transition-shadow duration-200"
            >
              <div className="shrink-0 w-12 rounded-[4px] overflow-hidden shadow-sm" style={{ height: 68 }}>
                {entry.book?.coverUrl
                  ? <img src={entry.book.coverUrl} alt={entry.book.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-[#F2EAD8] flex items-center justify-center text-xl">📖</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[#2C2416] text-sm leading-snug truncate">{entry.book?.title}</p>
                <p className="text-xs text-[#9E8E7A] font-serif truncate mt-0.5">{entry.book?.author}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <ProgressBar value={entry.overallProgress} height={4} className="flex-1" />
                  <span className="text-[10px] font-mono text-[#9E8E7A] shrink-0">{formatProgress(entry.overallProgress)}</span>
                </div>
                <p className="text-[10px] font-mono text-[#9E8E7A] mt-1">
                  Ch. {entry.chapterIndex + 1} · {isPlaying && activeBook?.id === entry.bookId ? 'Playing now' : 'Tap to continue'}
                </p>
              </div>
              {isPlaying && activeBook?.id === entry.bookId && (
                <div className="shrink-0 mt-1"><WaveIndicator /></div>
              )}
            </button>
          ))}
        </section>
      )}

      {/* Genre shelf */}
      <section className="mb-6">
        <h2 className="px-4 text-[10px] uppercase tracking-widest text-[#9E8E7A] font-serif mb-3">Explore Genres</h2>
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar pb-1">
          {GENRES.map((g) => (
            <Pill key={g} onClick={() => router.push(`/discover?genre=${g}`)} className="shrink-0">
              {GENRE_LABELS[g]}
            </Pill>
          ))}
        </div>
      </section>

      {/* Your Library */}
      {recent.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-[10px] uppercase tracking-widest text-[#9E8E7A] font-serif">Your Library</h2>
            <button onClick={() => router.push('/library')} className="text-xs text-[#7C5C3A] font-serif hover:underline">See all</button>
          </div>
          {loading
            ? [1,2,3].map((i) => <Skeleton key={i} className="mx-4 mb-2 h-16 rounded-xl" />)
            : recent.map((entry) => (
              <button key={entry.bookId} onClick={() => router.push('/player')}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#E5D5B8] hover:bg-[#F2EAD8] transition-colors text-left"
              >
                <div className="shrink-0 w-10 rounded-[4px] overflow-hidden" style={{ height: 56 }}>
                  {entry.book?.coverUrl
                    ? <img src={entry.book.coverUrl} alt={entry.book?.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-[#F2EAD8] flex items-center justify-center">📖</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-serif text-[#2C2416] truncate">{entry.book?.title}</p>
                  <p className="text-xs text-[#9E8E7A] font-serif truncate">{entry.book?.author}</p>
                  <ProgressBar value={entry.overallProgress} height={3} className="mt-1.5 max-w-[120px]" />
                </div>
                {isPlaying && activeBook?.id === entry.bookId && <WaveIndicator size="sm" />}
              </button>
            ))
          }
        </section>
      )}

      {/* Free to Listen */}
      <section className="mb-8">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9E8E7A] font-serif">Free to Listen</h2>
          <span className="text-[10px] text-[#9E8E7A] font-serif">From Gutenberg</span>
        </div>
        <div className="grid grid-cols-3 gap-3 px-4">
          {FEATURED_BOOKS.map((book) => (
            <button key={book.id} onClick={() => handleFeaturedTap(book)} className="flex flex-col items-start group">
              <div className="w-full aspect-[3/4] rounded-[4px] overflow-hidden shadow-sm group-hover:shadow-cover transition-shadow duration-200 bg-[#F2EAD8]">
                <img src={book.coverUrl} alt={`${book.title} by ${book.author}`} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <p className="mt-1.5 text-xs font-serif text-[#2C2416] leading-tight line-clamp-2 text-left w-full">{book.title}</p>
              <p className="text-[10px] text-[#9E8E7A] font-serif truncate w-full text-left mt-0.5">{book.author}</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
