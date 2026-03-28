import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60 // seconds

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const allowedExts = ['pdf', 'epub', 'txt', 'mobi']

    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: `Unsupported format: .${ext}` }, { status: 400 })
    }

    if (file.size > 52_428_800) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    let text = ''
    let title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim()
    let author = 'Unknown Author'

    const buffer = Buffer.from(await file.arrayBuffer())

    if (ext === 'txt') {
      text = buffer.toString('utf-8')
    } else if (ext === 'pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        text = data.text
        // Try to extract title/author from PDF info
        if (data.info?.Title) title = data.info.Title
        if (data.info?.Author) author = data.info.Author
      } catch (e) {
        return NextResponse.json({ error: 'Failed to parse PDF. Try a text file instead.' }, { status: 422 })
      }
    } else if (ext === 'epub') {
      try {
        const EPub = (await import('epub2')).default
        const epub = await EPub.createAsync(buffer as any, undefined, undefined)
        const chapters: string[] = []
        for (const item of epub.flow) {
          try {
            const chapterText = await new Promise<string>((resolve, reject) => {
              epub.getChapter(item.id, (err, text) => {
                if (err) reject(err)
                else resolve(text ?? '')
              })
            })
            // Strip HTML tags
            chapters.push(chapterText.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' '))
          } catch { continue }
        }
        text = chapters.join('\n\n')
        if (epub.metadata?.title) title = epub.metadata.title
        if (epub.metadata?.creator) author = epub.metadata.creator
      } catch (e) {
        return NextResponse.json({ error: 'Failed to parse EPUB. Try a text file instead.' }, { status: 422 })
      }
    } else if (ext === 'mobi') {
      // MOBI is complex — treat as binary text extraction
      text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n\n')
    }

    if (!text || text.trim().length < 100) {
      return NextResponse.json({ error: 'Could not extract readable text from this file.' }, { status: 422 })
    }

    // Clean up text
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()

    const wordCount = text.split(/\s+/).length
    const estimatedMinutes = Math.ceil(wordCount / 150) // ~150 wpm listening

    return NextResponse.json({
      text,
      title,
      author,
      wordCount,
      estimatedMinutes,
      format: ext,
    })
  } catch (err) {
    console.error('[extract-book] Error:', err)
    return NextResponse.json(
      { error: 'Failed to process file. Please try again.' },
      { status: 500 }
    )
  }
}
