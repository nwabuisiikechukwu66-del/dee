'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft } from '@phosphor-icons/react'
import { usePlayerStore } from '@/store/playerStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useToastStore } from '@/store/toastStore'
import { AudiobookOrchestrator } from '@/services/tts/orchestrator'
import { GenreBackground } from '@/components/player/GenreBackground'
import { ProgressBar, WaveIndicator } from '@/components/ui'
import { calcOverallProgress, formatProgress } from '@/utils'
import { PlayerTabContent } from './PlayerTabContent'
import type { PlayerTab } from '@/types'

const TABS: { id: PlayerTab; label: string }[] = [
  { id: 'player', label: 'Player' },
  { id: 'text', label: 'Text' },
  { id: 'voice', label: 'Voice' },
  { id: 'music', label: 'Music' },
]

const SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export default function PlayerPage() {
  const router = useRouter()
  const {
    book, chapters, chapterIndex, chapterPosition, overallProgress, isPlaying,
    speed, voiceMode, voiceVolume, activeTab,
    setPlaying, setChapterIndex, setChapterPosition, setOverallProgress,
    setActiveTab, setActiveProvider, setCurrentSentence, nextChapter,
  } = usePlayerStore()
  const { updateProgress } = useLibraryStore()
  const { show } = useToastStore()
  const orchestratorRef = useRef<AudiobookOrchestrator | null>(null)
  const saveIntervalRef = useRef<ReturnType<typeof setInterval>>()

  const currentChapter = chapters[chapterIndex] ?? null

  // Init orchestrator
  useEffect(() => {
    orchestratorRef.current = new AudiobookOrchestrator({
      onStatusChange: (status) => {
        setPlaying(status === 'playing')
      },
      onSentenceChange: (sentIdx, charIdx, text) => {
        setCurrentSentence(sentIdx, text)
        setChapterPosition(charIdx)
        if (book && chapters.length > 0) {
          const prog = calcOverallProgress(chapterIndex, charIdx, chapters)
          setOverallProgress(prog)
        }
      },
      onChapterEnd: () => {
        const hasNext = nextChapter()
        if (!hasNext) {
          setPlaying(false)
          show('🎉 You finished the book!', 'success', 5000)
        }
      },
      onProviderChange: (provider) => {
        setActiveProvider(provider)
      },
    })

    return () => {
      orchestratorRef.current?.destroy()
    }
  }, [])

  // Load chapter when chapterIndex changes
  useEffect(() => {
    if (!currentChapter || !orchestratorRef.current) return
    orchestratorRef.current.loadChapter(currentChapter, chapterIndex === 0 ? chapterPosition : 0)
  }, [chapterIndex, currentChapter?.bookId])

  // Sync voice settings
  useEffect(() => {
    orchestratorRef.current?.setSpeed(speed)
  }, [speed])

  useEffect(() => {
    orchestratorRef.current?.setVoiceMode(voiceMode)
  }, [voiceMode])

  useEffect(() => {
    orchestratorRef.current?.setVolume(voiceVolume)
  }, [voiceVolume])

  // Play/pause control
  useEffect(() => {
    if (!orchestratorRef.current || !currentChapter) return
    if (isPlaying) {
      orchestratorRef.current.play()
    } else {
      orchestratorRef.current.pause()
    }
  }, [isPlaying])

  // Auto-save progress every 10s
  useEffect(() => {
    if (!book) return
    saveIntervalRef.current = setInterval(() => {
      if (book) updateProgress(book.id, chapterIndex, chapterPosition, overallProgress)
    }, 10000)
    return () => clearInterval(saveIntervalRef.current)
  }, [book?.id, chapterIndex])

  if (!book) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#1A130A] text-[#F9F5EE] px-6 text-center">
        <span className="text-5xl mb-4">🎧</span>
        <h2 className="text-2xl font-serif text-[#F9F5EE] mb-2">Nothing playing</h2>
        <p className="text-sm text-[#F9F5EE]/60 font-serif mb-6">Find a book in your library or discover something new</p>
        <button onClick={() => router.push('/')}
          className="px-6 py-3 bg-[#F9F5EE] text-[#2C2416] rounded-xl font-serif hover:bg-[#F2EAD8] transition-colors">
          Go Home
        </button>
      </div>
    )
  }

  const chap = currentChapter

  return (
    <div className="min-h-dvh relative overflow-hidden bg-[#1A130A]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <GenreBackground genre={book.genre} mood={chap?.mood} />

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{ height: 80, background: 'linear-gradient(to bottom, rgba(249,245,238,0.55), transparent)' }} />
      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{ height: 220, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }} />

      <div className="relative z-20 flex flex-col min-h-dvh">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} aria-label="Go back"
            className="w-10 h-10 flex items-center justify-center rounded-full frosted-dark text-[#F9F5EE] hover:bg-white/20 transition-colors">
            <CaretLeft size={20} weight="bold" />
          </button>
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-widest text-[#F9F5EE]/70 font-serif block">Now Playing</span>
            {chapters.length > 0 && (
              <span className="text-[10px] text-[#F9F5EE]/50 font-serif">Ch. {chapterIndex + 1} of {chapters.length}</span>
            )}
          </div>
          <div className="w-10" />
        </div>

        {/* Cover + Info */}
        <div className="flex flex-col items-center px-6 pt-2 pb-4">
          <motion.div animate={{ scale: isPlaying ? 1 : 0.92 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="rounded-lg overflow-hidden shadow-cover mb-5"
            style={{ width: 200, height: 280 }}
          >
            {book.coverUrl
              ? <img src={book.coverUrl} alt={`${book.title} by ${book.author}`} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-[#F2EAD8] flex items-center justify-center text-6xl">📖</div>
            }
          </motion.div>

          <div className="text-center">
            <h1 className="text-xl font-serif text-[#F9F5EE] font-bold leading-tight mb-1 text-balance">{book.title}</h1>
            <p className="text-sm text-[#F9F5EE]/65 font-serif">{book.author}</p>
            {chap && (
              <p className="text-xs text-[#C8884A] font-serif mt-1">{chap.title}</p>
            )}
          </div>
        </div>

        {/* Overall progress */}
        <div className="px-6 mb-1">
          <ProgressBar value={overallProgress} height={3}
            trackClassName="bg-white/15" fillClassName="bg-[#C8884A]"
            aria-label="Overall book progress" />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono text-[#F9F5EE]/50">{formatProgress(overallProgress)}</span>
            <span className="text-[10px] font-mono text-[#F9F5EE]/50">{chapters.length > 0 ? `${chapters.length} chapters` : ''}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-4 mb-1 border-b border-white/10">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 text-xs font-serif tracking-wide transition-all duration-150 border-b-2 -mb-px ${
                activeTab === id ? 'text-[#F9F5EE] border-[#F9F5EE]' : 'text-[#F9F5EE]/35 border-transparent hover:text-[#F9F5EE]/60'
              }`}
            >{label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="h-full"
            >
              <PlayerTabContent
                tab={activeTab}
                book={book}
                chapter={currentChapter}
                chapterIndex={chapterIndex}
                totalChapters={chapters.length}
                isPlaying={isPlaying}
                speed={speed}
                orchestrator={orchestratorRef.current}
                onSeekChapter={(i) => {
                  setChapterIndex(i)
                  if (isPlaying) setPlaying(false)
                  setTimeout(() => setPlaying(true), 100)
                }}
                onSkipBack={() => {
                  if (chapterIndex > 0) { setChapterIndex(chapterIndex - 1) }
                  else { orchestratorRef.current?.seekToSentence(0) }
                }}
                onSkipForward={() => {
                  if (chapterIndex < chapters.length - 1) setChapterIndex(chapterIndex + 1)
                }}
                onTogglePlay={() => setPlaying(!isPlaying)}
                onRewind={() => orchestratorRef.current?.seekToChar(Math.max(0, chapterPosition - 1500))}
                onFastForward={() => orchestratorRef.current?.seekToChar(chapterPosition + 1500)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
