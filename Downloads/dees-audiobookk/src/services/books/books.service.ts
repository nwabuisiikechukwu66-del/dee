import type { SearchResult, Genre, ProcessedBook } from '@/types'
import { chunkTextWithGemini } from '../ai/ai.service'

// ─── Gutenberg ────────────────────────────────────────────────────────────────

const GUTENDEX = 'https://gutendex.com/books'

export async function searchGutenberg(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`${GUTENDEX}?search=${encodeURIComponent(query)}&mime_type=text/plain`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).slice(0, 12).map(gutenbergToResult)
  } catch { return [] }
}

export async function browseGutenbergByGenre(genre: Genre, page = 1): Promise<SearchResult[]> {
  const subjectMap: Record<Genre, string> = {
    fiction: 'fiction',
    romance: 'love stories',
    mystery: 'detective and mystery stories',
    fantasy: 'fantasy fiction',
    science: 'science fiction',
    history: 'history',
    biography: 'biography',
    'self-help': 'self-realization',
    poetry: 'poetry',
    adventure: 'adventure stories',
  }
  try {
    const res = await fetch(`${GUTENDEX}?topic=${encodeURIComponent(subjectMap[genre])}&page=${page}&mime_type=text/plain`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).slice(0, 12).map(gutenbergToResult)
  } catch { return [] }
}

export async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,subject,cover_i,first_sentence`
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.docs ?? []).slice(0, 8).map((d: any) => ({
      source: 'openlibrary' as const,
      id: `ol-${d.key?.replace('/works/', '') ?? Math.random()}`,
      title: d.title ?? 'Unknown',
      author: d.author_name?.[0] ?? 'Unknown Author',
      genre: inferGenre(d.subject ?? []),
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
      description: d.first_sentence?.value,
    }))
  } catch { return [] }
}

export async function searchAllSources(query: string): Promise<SearchResult[]> {
  const [g, ol] = await Promise.allSettled([searchGutenberg(query), searchOpenLibrary(query)])
  const results: SearchResult[] = []
  const seen = new Set<string>()
  const add = (items: SearchResult[]) => {
    for (const r of items) {
      const key = `${r.title.toLowerCase().slice(0, 20)}${r.author.toLowerCase().slice(0, 10)}`
      if (!seen.has(key)) { seen.add(key); results.push(r) }
    }
  }
  if (g.status === 'fulfilled') add(g.value)
  if (ol.status === 'fulfilled') add(ol.value)
  return results
}

// ─── Fetch & extract full book text ──────────────────────────────────────────

export async function fetchGutenbergText(gutenbergId: number): Promise<string> {
  const candidates = [
    `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-0.txt`,
    `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`,
    `https://gutenberg.org/ebooks/${gutenbergId}.txt.utf-8`,
  ]

  for (const url of candidates) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const text = await res.text()
        return cleanGutenbergText(text)
      }
    } catch { continue }
  }
  throw new Error('Could not fetch book text from Project Gutenberg')
}

function cleanGutenbergText(text: string): string {
  const startMarkers = [
    '*** START OF THE PROJECT GUTENBERG EBOOK',
    '*** START OF THIS PROJECT GUTENBERG EBOOK',
    '*END*THE SMALL PRINT',
    '***START OF THE PROJECT GUTENBERG EBOOK',
  ]
  const endMarkers = [
    '*** END OF THE PROJECT GUTENBERG EBOOK',
    '*** END OF THIS PROJECT GUTENBERG EBOOK',
    'End of the Project Gutenberg EBook',
    'End of Project Gutenberg',
    '***END OF THE PROJECT GUTENBERG EBOOK',
  ]

  let start = 0
  let end = text.length

  for (const m of startMarkers) {
    const idx = text.indexOf(m)
    if (idx >= 0) { start = text.indexOf('\n', idx) + 1; break }
  }
  for (const m of endMarkers) {
    const idx = text.lastIndexOf(m)
    if (idx >= 0) { end = idx; break }
  }

  return text.slice(start, end)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Process book → chapters ─────────────────────────────────────────────────

export async function processBookText(
  bookId: string,
  rawText: string,
  title: string,
  author: string
): Promise<ProcessedBook> {
  const { chapters } = await chunkTextWithGemini(rawText, title, author)

  const totalWords = chapters.reduce((acc, c) => acc + c.text.split(/\s+/).length, 0)

  return {
    bookId,
    chapters: chapters.map((c, i) => ({
      bookId,
      chapterIndex: i,
      title: c.title,
      text: c.text,
      wordCount: c.text.split(/\s+/).length,
      mood: c.mood,
      summary: c.summary,
    })),
    totalWords,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gutenbergToResult(book: any): SearchResult {
  const author = book.authors?.[0]?.name ?? 'Unknown Author'
  const formattedAuthor = author.includes(',')
    ? author.split(',').reverse().map((s: string) => s.trim()).join(' ')
    : author

  const textUrl = book.formats?.['text/plain; charset=utf-8']
    ?? book.formats?.['text/plain']

  return {
    source: 'gutenberg',
    id: `gutenberg-${book.id}`,
    title: book.title,
    author: formattedAuthor,
    genre: inferGenre([...(book.subjects ?? []), ...(book.bookshelves ?? [])]),
    coverUrl: book.formats?.['image/jpeg'],
    gutenbergId: book.id,
    textUrl,
  }
}

function inferGenre(subjects: string[]): Genre {
  const all = subjects.join(' ').toLowerCase()
  if (/romance|love stor/.test(all)) return 'romance'
  if (/mystery|detective|crime/.test(all)) return 'mystery'
  if (/fantasy|magic|wizard/.test(all)) return 'fantasy'
  if (/science fiction|sci.fi/.test(all)) return 'science'
  if (/histor/.test(all)) return 'history'
  if (/bio|autobio/.test(all)) return 'biography'
  if (/self.help|motivat|personal dev/.test(all)) return 'self-help'
  if (/poetr|poem/.test(all)) return 'poetry'
  if (/adventure|travel/.test(all)) return 'adventure'
  return 'fiction'
}
