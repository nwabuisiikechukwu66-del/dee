'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MagnifyingGlass, Plus, Check, Play } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useLibraryStore } from '@/store/libraryStore'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'
import { searchAllSources, browseGutenbergByGenre, fetchGutenbergText, processBookText } from '@/services/books/books.service'
import { Input, Skeleton, Pill } from '@/components/ui'
import { GENRE_LABELS, type Genre, type SearchResult, type Book } from '@/types'
import { generateBookId } from '@/utils'

const GENRES = Object.keys(GENRE_LABELS) as Genre[]

export default function DiscoverPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initGenre = searchParams.get('genre') as Genre | null
  const initBook = searchParams.get('book')

  const [query, setQuery] = useState('')
  const [activeGenre, setActiveGenre] = useState<Genre | null>(initGenre)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBookId, setLoadingBookId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const { addBook, isInLibrary, saveChapters } = useLibraryStore()
  const { loadBook } = usePlayerStore()
  const { show } = useToastStore()

  useEffect(() => {
    if (initGenre) { loadGenre(initGenre) }
    else { loadGenre('fiction') }
  }, [])

  const loadGenre = async (genre: Genre) => {
    setLoading(true)
    try {
      const res = await browseGutenbergByGenre(genre)
      setResults(res)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!query || query.length < 2) {
      if (!activeGenre) setResults([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setActiveGenre(null)
      try {
        const res = await searchAllSources(query)
        setResults(res)
      } finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleGenre = (genre: Genre) => {
    const next = genre === activeGenre ? null : genre
    setActiveGenre(next)
    setQuery('')
    if (next) loadGenre(next)
    else setResults([])
  }

  const handleAdd = async (result: SearchResult) => {
    if (isInLibrary(result.id)) return
    const book: Book = {
      id: result.id, title: result.title, author: result.author,
      genre: result.genre, coverUrl: result.coverUrl, description: result.description,
      source: result.source === 'gutenberg' ? 'gutenberg' : 'openlibrary',
      gutenbergId: result.gutenbergId,
    }
    await addBook(book)
    show(`"${result.title}" added to library`, 'success')
  }

  const handlePlay = async (result: SearchResult) => {
    setLoadingBookId(result.id)
    show('Loading book text…', 'info', 2000)
    try {
      let text = ''
      if (result.gutenbergId) {
        text = await fetchGutenbergText(result.gutenbergId)
      } else {
        show('Full text not available for this source. Try a Gutenberg book.', 'warning')
        setLoadingBookId(null)
        return
      }

      show('Organising chapters…', 'info', 3000)
      const processed = await processBookText(result.id, text, result.title, result.author)

      const book: Book = {
        id: result.id, title: result.title, author: result.author,
        genre: result.genre, coverUrl: result.coverUrl,
        source: 'gutenberg', gutenbergId: result.gutenbergId,
        totalChapters: processed.chapters.length,
      }

      await addBook(book)
      await saveChapters(result.id, processed.chapters)
      loadBook(book, processed.chapters, 0, 0)
      router.push('/player')
    } catch (err: any) {
      show(err.message ?? 'Could not load book. Try another.', 'error')
    } finally {
      setLoadingBookId(null)
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#F9F5EE] pb-nav" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-6 pb-4">
        <h1 className="font-serif text-[2rem] leading-tight text-[#2C2416]">Discover</h1>
        <p className="text-sm text-[#9E8E7A] font-serif mt-1">Free from Gutenberg &amp; Open Library</p>
      </header>

      <div className="px-4 mb-4">
        <Input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, or subject…"
          icon={<MagnifyingGlass size={18} />} aria-label="Search books" />
      </div>

      <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar pb-3 mb-2">
        {GENRES.map((g) => (
          <Pill key={g} active={activeGenre === g} onClick={() => handleGenre(g)} className="shrink-0">
            {GENRE_LABELS[g]}
          </Pill>
        ))}
      </div>

      <section aria-label="Search results">
        {loading
          ? [1,2,3,4,5].map((i) => (
            <div key={i} className="flex gap-3 px-4 py-3.5 border-b border-[#E5D5B8]">
              <Skeleton className="w-10 shrink-0" style={{ height: 56 }} />
              <div className="flex-1 flex flex-col gap-2 justify-center">
                <Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))
          : results.length > 0
            ? results.map((r) => (
              <motion.article key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 px-4 py-3.5 border-b border-[#E5D5B8] hover:bg-[#F2EAD8] transition-colors"
              >
                <div className="shrink-0 w-10 rounded-[4px] overflow-hidden bg-[#F2EAD8]" style={{ height: 56 }}>
                  {r.coverUrl
                    ? <img src={r.coverUrl} alt={r.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">📖</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-serif text-[#2C2416] line-clamp-2 leading-snug">{r.title}</p>
                  <p className="text-xs text-[#9E8E7A] font-serif mt-0.5 truncate">{r.author}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#F2EAD8] text-[#9E8E7A] text-[10px] border border-[#D4C4A8] font-serif">
                    {GENRE_LABELS[r.genre]}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => handleAdd(r)} aria-label={isInLibrary(r.id) ? 'In library' : 'Add to library'}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-serif border transition-all duration-200 ${
                      isInLibrary(r.id) ? 'bg-green-50 border-green-200 text-green-700' : 'bg-[#F9F5EE] border-[#D4C4A8] text-[#5C4A2E] hover:border-[#7C5C3A] hover:text-[#7C5C3A]'
                    }`}
                  >
                    {isInLibrary(r.id) ? <Check size={12} weight="bold" /> : <Plus size={12} />}
                    {isInLibrary(r.id) ? 'Added' : 'Add'}
                  </button>
                  <button onClick={() => handlePlay(r)} disabled={loadingBookId === r.id}
                    aria-label="Play book"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-serif border border-[#7C5C3A]/30 text-[#7C5C3A] hover:bg-[#7C5C3A]/10 transition-colors disabled:opacity-50"
                  >
                    {loadingBookId === r.id
                      ? <span className="w-3 h-3 border border-[#7C5C3A] border-t-transparent rounded-full animate-spin" />
                      : <Play size={12} weight="fill" />
                    }
                    Play
                  </button>
                </div>
              </motion.article>
            ))
            : !loading && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <span className="text-5xl mb-4">🔍</span>
                <h3 className="text-xl font-serif text-[#2C2416] mb-2">Search for books</h3>
                <p className="text-sm text-[#9E8E7A] font-serif">Type a title, author, or browse by genre above</p>
              </div>
            )
        }
      </section>
    </main>
  )
}
