'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UploadSimple, File as FileIcon, CheckCircle, X, Warning } from '@phosphor-icons/react'
import { useLibraryStore } from '@/store/libraryStore'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'
import { processBookText } from '@/services/books/books.service'
import { Button, Pill } from '@/components/ui'
import { GENRE_LABELS, type Genre, type Book } from '@/types'
import { formatBytes, generateBookId } from '@/utils'

const GENRES = Object.keys(GENRE_LABELS) as Genre[]
const FORMATS = [
  { ext: 'pdf', emoji: '📄', label: 'PDF' },
  { ext: 'epub', emoji: '📕', label: 'EPUB' },
  { ext: 'txt', emoji: '📃', label: 'TXT' },
  { ext: 'mobi', emoji: '📗', label: 'MOBI' },
]

interface QueuedFile {
  id: string
  file: File
  genre: Genre
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const { addBook, saveChapters } = useLibraryStore()
  const { loadBook } = usePlayerStore()
  const { show } = useToastStore()
  const [queued, setQueued] = useState<QueuedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = (file: File): string | null => {
    if (file.size > 52_428_800) return `File too large (max 50MB)`
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf','epub','txt','mobi'].includes(ext ?? '')) return `Unsupported format .${ext}`
    return null
  }

  const enqueue = useCallback((files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      const err = validate(f)
      if (err) { show(err, 'error'); continue }
      setQueued((q) => [...q, { id: Math.random().toString(36).slice(2), file: f, genre: 'fiction', status: 'pending' }])
    }
  }, [show])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); enqueue(e.dataTransfer.files)
  }

  const setGenre = (id: string, genre: Genre) =>
    setQueued((q) => q.map((f) => f.id === id ? { ...f, genre } : f))

  const remove = (id: string) => setQueued((q) => q.filter((f) => f.id !== id))

  const handleUpload = async () => {
    const pending = queued.filter((f) => f.status === 'pending')
    if (!pending.length) return
    setUploading(true)

    for (const qf of pending) {
      setQueued((q) => q.map((f) => f.id === qf.id ? { ...f, status: 'uploading' } : f))
      try {
        // Send to API route for extraction
        const fd = new FormData()
        fd.append('file', qf.file)
        const res = await fetch('/api/extract-book', { method: 'POST', body: fd })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error ?? 'Extraction failed')

        const bookId = generateBookId('upload', `${Date.now()}-${qf.file.name}`)
        show('Organising chapters with AI…', 'info', 3000)
        const processed = await processBookText(bookId, data.text, data.title, data.author)

        const book: Book = {
          id: bookId, title: data.title, author: data.author,
          genre: qf.genre, source: 'upload', fileSize: qf.file.size,
          totalChapters: processed.chapters.length,
        }

        await addBook(book)
        await saveChapters(bookId, processed.chapters)

        setQueued((q) => q.map((f) => f.id === qf.id ? { ...f, status: 'done' } : f))
        show(`"${data.title}" is ready to listen!`, 'success')

        // Auto-open player for first upload
        if (pending.indexOf(qf) === 0) {
          loadBook(book, processed.chapters, 0, 0)
        }
      } catch (err: any) {
        setQueued((q) => q.map((f) => f.id === qf.id ? { ...f, status: 'error', error: err.message } : f))
        show(`Failed: ${err.message}`, 'error')
      }
    }

    setUploading(false)
    const allDone = queued.every((f) => f.status === 'done')
    if (allDone) setTimeout(() => router.push('/library'), 1200)
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#F9F5EE] pb-nav" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-6 pb-4">
        <h1 className="font-serif text-[2rem] leading-tight text-[#2C2416]">Upload</h1>
        <p className="text-sm text-[#9E8E7A] font-serif mt-1">Add books from your device</p>
      </header>

      <div className="px-4">
        {/* Drop zone */}
        <button type="button" onClick={() => inputRef.current?.click()}
          onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          className={`w-full border-2 border-dashed rounded-2xl py-12 px-6 flex flex-col items-center cursor-pointer mb-6 transition-all duration-200 ${
            dragging ? 'border-[#7C5C3A] bg-[#7C5C3A]/5 scale-[1.01]' : 'border-[#D4C4A8] bg-[#F9F5EE] hover:border-[#7C5C3A]/50 hover:bg-[#F2EAD8]'
          }`}
          aria-label="Click or drag to upload books"
        >
          <UploadSimple size={40} className={`mb-3 transition-colors ${dragging ? 'text-[#7C5C3A]' : 'text-[#9E8E7A]'}`} />
          <p className="text-base font-serif text-[#2C2416] mb-1">{dragging ? 'Drop your books here' : 'Click to browse or drag & drop'}</p>
          <p className="text-sm text-[#9E8E7A] font-serif">PDF, EPUB, TXT, MOBI — up to 50MB</p>
        </button>

        <input ref={inputRef} type="file" multiple accept=".pdf,.epub,.txt,.mobi"
          className="sr-only" onChange={(e) => e.target.files && enqueue(e.target.files)} />

        {/* File list */}
        {queued.length > 0 && (
          <div className="flex flex-col gap-3 mb-6">
            {queued.map((qf) => (
              <div key={qf.id} className="bg-white border border-[#D4C4A8] rounded-xl p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <FileIcon size={24} className="text-[#9E8E7A] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif text-[#2C2416] truncate">{qf.file.name}</p>
                    <p className="text-[10px] font-mono text-[#9E8E7A]">{formatBytes(qf.file.size)}</p>
                    {qf.error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><Warning size={12} />{qf.error}</p>}
                  </div>
                  <div className="shrink-0">
                    {qf.status === 'pending' && (
                      <button onClick={() => remove(qf.id)} className="text-[#9E8E7A] hover:text-[#2C2416]"><X size={16} /></button>
                    )}
                    {qf.status === 'uploading' && <span className="w-5 h-5 border-2 border-[#7C5C3A] border-t-transparent rounded-full animate-spin block" />}
                    {qf.status === 'done' && <CheckCircle size={20} weight="fill" className="text-green-600" />}
                    {qf.status === 'error' && <Warning size={20} weight="fill" className="text-red-500" />}
                  </div>
                </div>
                {(qf.status === 'pending' || qf.status === 'error') && (
                  <div className="mt-3">
                    <p className="text-[10px] text-[#9E8E7A] font-serif mb-2">Genre</p>
                    <div className="flex flex-wrap gap-1.5">
                      {GENRES.map((g) => (
                        <Pill key={g} active={qf.genre === g} onClick={() => setGenre(qf.id, g)} className="text-[11px]">
                          {GENRE_LABELS[g]}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {queued.filter((f) => f.status === 'pending').length > 0 && (
          <Button size="lg" onClick={handleUpload} loading={uploading} className="w-full mb-6">
            Upload {queued.filter((f) => f.status === 'pending').length} {queued.filter((f) => f.status === 'pending').length === 1 ? 'file' : 'files'}
          </Button>
        )}

        {/* Supported formats */}
        <p className="text-[10px] uppercase tracking-widest text-[#9E8E7A] font-serif mb-3">Supported formats</p>
        <div className="grid grid-cols-2 gap-3">
          {FORMATS.map(({ ext, emoji, label }) => (
            <div key={ext} className="flex items-center gap-3 p-3 bg-[#F2EAD8] rounded-xl">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="text-sm font-serif text-[#2C2416]">{label}</p>
                <p className="text-[10px] text-[#9E8E7A] font-mono">.{ext}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
