'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Headphones, Plus } from '@phosphor-icons/react'
import { useLibraryStore } from '@/store/libraryStore'
import { usePlayerStore } from '@/store/playerStore'
import { ProgressBar, WaveIndicator, Skeleton, Pill } from '@/components/ui'
import { formatProgress, formatRelativeTime } from '@/utils'

const FILTERS = [
  { key: 'all' as const, label: 'All' },
  { key: 'in-progress' as const, label: 'In Progress' },
  { key: 'favourites' as const, label: 'Favourites' },
  { key: 'completed' as const, label: 'Completed' },
]

const EMPTY: Record<string, { emoji: string; title: string; sub: string }> = {
  all:          { emoji: '📚', title: 'Your library is empty', sub: 'Discover free books or upload your own' },
  'in-progress':{ emoji: '⏳', title: 'Nothing in progress', sub: 'Start a book to see it here' },
  favourites:   { emoji: '♥',  title: 'No favourites yet', sub: 'Tap the heart on any book to save it here' },
  completed:    { emoji: '✅', title: 'No completed books', sub: 'Finish a book to mark it complete' },
}

export default function LibraryPage() {
  const router = useRouter()
  const { entries, loading, filter, setFilter, getFiltered, toggleFavourite, loadLibrary } = useLibraryStore()
  const { book: activeBook, isPlaying, loadBook, setPlaying } = usePlayerStore()

  useEffect(() => { loadLibrary() }, [loadLibrary])

  const filtered = getFiltered()
  const empty = EMPTY[filter]

  return (
    <main className="flex-1 overflow-y-auto bg-[#F9F5EE] pb-nav" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-[2rem] leading-tight text-[#2C2416]">Library</h1>
            <p className="text-sm text-[#9E8E7A] font-serif mt-0.5">{entries.length} {entries.length === 1 ? 'book' : 'books'}</p>
          </div>
          <button onClick={() => router.push('/upload')}
            className="flex items-center gap-1 text-[#7C5C3A] text-sm font-serif hover:underline">
            <Plus size={16} /> Add books
          </button>
        </div>
      </header>

      <div className="flex gap-1.5 px-4 overflow-x-auto no-scrollbar pb-4">
        {FILTERS.map(({ key, label }) => (
          <Pill key={key} active={filter === key} onClick={() => setFilter(key)} className="shrink-0 text-sm">{label}</Pill>
        ))}
      </div>

      {loading
        ? [1,2,3].map((i) => (
          <div key={i} className="flex gap-3 px-4 py-3.5 border-b border-[#E5D5B8]">
            <Skeleton className="w-12 shrink-0" style={{ height: 68 }} />
            <div className="flex-1 flex flex-col gap-2 justify-center">
              <Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-1 w-full mt-1" />
            </div>
          </div>
        ))
        : filtered.length > 0
          ? filtered.map((entry) => (
            <article key={entry.bookId} className="flex items-start gap-3 px-4 py-3.5 border-b border-[#E5D5B8] hover:bg-[#F2EAD8] transition-colors">
              <button onClick={() => router.push('/player')} className="shrink-0">
                <div className="w-12 rounded-[4px] overflow-hidden shadow-sm" style={{ height: 68 }}>
                  {entry.book?.coverUrl
                    ? <img src={entry.book.coverUrl} alt={entry.book.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-[#F2EAD8] flex items-center justify-center text-xl">📖</div>
                  }
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-serif text-[#2C2416] leading-snug truncate">{entry.book?.title}</p>
                <p className="text-xs text-[#9E8E7A] font-serif truncate mt-0.5">{entry.book?.author}</p>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={entry.overallProgress} height={4} className="flex-1" />
                  <span className="text-[10px] font-mono text-[#9E8E7A] shrink-0">{formatProgress(entry.overallProgress)}</span>
                </div>
                {entry.lastReadAt && (
                  <p className="text-[10px] text-[#9E8E7A]/70 mt-0.5 font-mono">{formatRelativeTime(entry.lastReadAt)}</p>
                )}
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <button onClick={() => toggleFavourite(entry.bookId)} aria-label={entry.isFavourite ? 'Remove favourite' : 'Favourite'}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2EAD8] transition-colors">
                  <Heart size={16} weight={entry.isFavourite ? 'fill' : 'regular'} className={entry.isFavourite ? 'text-red-400' : 'text-[#9E8E7A]'} />
                </button>
                <button onClick={() => router.push('/player')} aria-label="Play"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2EAD8] transition-colors">
                  {isPlaying && activeBook?.id === entry.bookId
                    ? <WaveIndicator size="sm" />
                    : <Headphones size={16} className="text-[#7C5C3A]" />
                  }
                </button>
              </div>
            </article>
          ))
          : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <span className="text-5xl mb-4">{empty.emoji}</span>
              <h3 className="text-xl font-serif text-[#2C2416] mb-2">{empty.title}</h3>
              <p className="text-sm text-[#9E8E7A] font-serif text-balance">{empty.sub}</p>
              {filter === 'all' && (
                <div className="flex gap-3 mt-6">
                  <button onClick={() => router.push('/discover')}
                    className="px-5 py-2.5 bg-[#7C5C3A] text-[#F9F5EE] rounded-xl text-sm font-serif hover:bg-[#9E6F45] transition-colors">
                    Discover Books
                  </button>
                  <button onClick={() => router.push('/upload')}
                    className="px-5 py-2.5 bg-[#F9F5EE] border border-[#D4C4A8] text-[#2C2416] rounded-xl text-sm font-serif hover:bg-[#F2EAD8] transition-colors">
                    Upload
                  </button>
                </div>
              )}
            </div>
          )
      }
    </main>
  )
}
