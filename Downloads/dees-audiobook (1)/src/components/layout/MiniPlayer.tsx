'use client'
import { useRouter } from 'next/navigation'
import { Play, Pause, X, SkipForward } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '@/store/playerStore'
import { ProgressBar, WaveIndicator } from '@/components/ui'

export function MiniPlayer() {
  const router = useRouter()
  const { book, isPlaying, overallProgress, chapterIndex, totalChapters, setPlaying, closePlayer } = usePlayerStore()

  if (!book) return null

  return (
    <AnimatePresence>
      <motion.div key="mini"
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 right-0 z-20 frosted border-t border-[#D4C4A8] shadow-player"
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))', height: 64 }}
      >
        {/* Progress line */}
        <div className="absolute top-0 left-0 right-0">
          <ProgressBar value={overallProgress} height={2} fillClassName="bg-[#C8884A]" />
        </div>

        <div className="flex items-center gap-3 px-4 h-full">
          {/* Cover + info → tap to open player */}
          <button onClick={() => router.push('/player')}
            className="flex items-center gap-3 flex-1 min-w-0 text-left" aria-label="Open player">
            <div className="w-10 shrink-0 rounded-[4px] overflow-hidden shadow-sm" style={{ height: 54 }}>
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#F2EAD8] flex items-center justify-center text-lg">📖</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-serif text-[#2C2416] truncate leading-tight">{book.title}</p>
              <p className="text-xs text-[#9E8E7A] font-serif truncate">
                Ch. {chapterIndex + 1}{totalChapters > 0 ? ` of ${totalChapters}` : ''} · {book.author}
              </p>
            </div>
          </button>

          {isPlaying && <WaveIndicator size="sm" />}

          <button onClick={() => setPlaying(!isPlaying)} aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F2EAD8] transition-colors shrink-0">
            {isPlaying
              ? <Pause size={20} weight="fill" className="text-[#7C5C3A]" />
              : <Play size={20} weight="fill" className="text-[#7C5C3A]" />}
          </button>

          <button onClick={closePlayer} aria-label="Close player"
            className="w-8 h-8 flex items-center justify-center text-[#9E8E7A] hover:text-[#2C2416] transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
