import type { AIChunkResult, ChapterMood, Genre } from '@/types'

// ─── Gemini — Smart text chunking ────────────────────────────────────────────

export async function chunkTextWithGemini(
  text: string,
  bookTitle: string,
  author: string
): Promise<AIChunkResult> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    console.log('[AI] No Gemini key — using regex chunker')
    return chunkWithRegex(text)
  }

  // Split text into processable segments (Gemini has token limits)
  const truncated = text.slice(0, 80000) // ~60k tokens

  const prompt = `You are processing the book "${bookTitle}" by ${author} for an audiobook app.

Split the following text into logical chapters or sections. For each chapter:
1. Give it a meaningful title (use the actual chapter title if present, otherwise create a descriptive one)
2. Extract the complete text for that chapter
3. Identify the emotional mood: peaceful, tense, romantic, dark, joyful, solemn, epic, contemplative, magical, exciting, warm, or curious
4. Write a 1-2 sentence summary

Return ONLY valid JSON in this exact format — no markdown, no explanation:
{
  "chapters": [
    {
      "title": "Chapter title",
      "text": "Full chapter text here",
      "mood": "peaceful",
      "summary": "Brief summary."
    }
  ]
}

Important: Include ALL the text. Do not summarize or abbreviate the text field — it must contain the complete original text for that chapter.

TEXT TO PROCESS:
${truncated}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      console.warn('[AI] Gemini API error:', response.status)
      return chunkWithRegex(text)
    }

    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    try {
      const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim())
      if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
        console.log(`[AI] Gemini chunked into ${parsed.chapters.length} chapters`)
        return { chapters: parsed.chapters, provider: 'gemini' }
      }
    } catch {
      console.warn('[AI] Gemini JSON parse failed — falling back to regex')
    }
  } catch (err) {
    console.warn('[AI] Gemini request failed:', err)
  }

  return chunkWithRegex(text)
}

// ─── Regex chunker — always-available fallback ────────────────────────────────

export function chunkWithRegex(text: string): AIChunkResult {
  const lines = text.split('\n')
  const chapters: AIChunkResult['chapters'] = []
  let currentTitle = 'Opening'
  let currentLines: string[] = []

  // Chapter detection patterns
  const chapterPatterns = [
    /^(CHAPTER|Chapter|PART|Part|BOOK|Book)\s+([IVXLC]+|\d+)(\s*[.:-]\s*.+)?$/,
    /^(CHAPTER|Chapter)\s+\w+\s*$/,
    /^[IVX]+\.\s+.{3,40}$/,
    /^[0-9]+\.\s+[A-Z].{2,40}$/,
  ]

  const isChapterHeading = (line: string) =>
    chapterPatterns.some((p) => p.test(line.trim()))

  for (const line of lines) {
    if (isChapterHeading(line) && currentLines.join('').trim().length > 100) {
      const chapterText = currentLines.join('\n').trim()
      if (chapterText.length > 50) {
        chapters.push({
          title: currentTitle,
          text: chapterText,
          mood: inferMoodFromText(chapterText),
          summary: generateSimpleSummary(chapterText),
        })
      }
      currentTitle = line.trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  // Last chapter
  const remainingText = currentLines.join('\n').trim()
  if (remainingText.length > 50) {
    chapters.push({
      title: currentTitle,
      text: remainingText,
      mood: inferMoodFromText(remainingText),
      summary: generateSimpleSummary(remainingText),
    })
  }

  // If no chapters found, split by word count (~3000 words per chapter)
  if (chapters.length <= 1) {
    return splitByWordCount(text, 3000)
  }

  console.log(`[AI] Regex chunked into ${chapters.length} chapters`)
  return { chapters, provider: 'regex' }
}

function splitByWordCount(text: string, wordsPerChapter: number): AIChunkResult {
  const words = text.split(/\s+/)
  const chapters: AIChunkResult['chapters'] = []
  let chapterNum = 1

  for (let i = 0; i < words.length; i += wordsPerChapter) {
    const chunkWords = words.slice(i, i + wordsPerChapter)
    const chapterText = chunkWords.join(' ')
    chapters.push({
      title: `Part ${chapterNum}`,
      text: chapterText,
      mood: inferMoodFromText(chapterText),
      summary: generateSimpleSummary(chapterText),
    })
    chapterNum++
  }

  return { chapters: chapters.length > 0 ? chapters : [{ title: 'Full Text', text, mood: 'peaceful' }], provider: 'regex' }
}

function inferMoodFromText(text: string): ChapterMood {
  const lower = text.toLowerCase().slice(0, 2000)

  const moods: Record<ChapterMood, string[]> = {
    tense: ['fear', 'danger', 'terror', 'threat', 'warning', 'chase', 'escape', 'trap', 'gun', 'knife', 'blood', 'scream'],
    romantic: ['love', 'heart', 'kiss', 'embrace', 'tender', 'darling', 'beloved', 'passion', 'desire', 'adore'],
    dark: ['death', 'murder', 'shadow', 'darkness', 'doom', 'evil', 'sorrow', 'grief', 'despair', 'wept', 'haunted'],
    joyful: ['laugh', 'joy', 'celebration', 'delight', 'happy', 'smile', 'cheer', 'dance', 'merry', 'bright'],
    solemn: ['ceremony', 'funeral', 'honour', 'duty', 'solemn', 'grave', 'dignity', 'sacrifice', 'sacred'],
    epic: ['battle', 'army', 'kingdom', 'war', 'sword', 'dragon', 'hero', 'destiny', 'quest', 'ancient'],
    contemplative: ['thought', 'wonder', 'perhaps', 'consider', 'reflect', 'memory', 'silence', 'alone', 'mind'],
    magical: ['magic', 'spell', 'enchant', 'fairy', 'wizard', 'mystical', 'charm', 'wand', 'potion', 'power'],
    exciting: ['adventure', 'discover', 'race', 'surprise', 'suddenly', 'burst', 'rush', 'plunge', 'leap'],
    warm: ['home', 'family', 'friend', 'comfort', 'cosy', 'hearth', 'welcome', 'kind', 'gentle', 'care'],
    curious: ['strange', 'unusual', 'peculiar', 'wonder', 'mysterious', 'investigate', 'curious', 'secret'],
    peaceful: ['gentle', 'quiet', 'still', 'calm', 'serene', 'soft', 'meadow', 'morning', 'peaceful'],
  }

  let best: ChapterMood = 'peaceful'
  let bestScore = 0

  for (const [mood, words] of Object.entries(moods)) {
    const score = words.reduce((acc, w) => acc + (lower.split(w).length - 1), 0)
    if (score > bestScore) { bestScore = score; best = mood as ChapterMood }
  }

  return best
}

function generateSimpleSummary(text: string): string {
  // Take first 2 sentences as summary
  const sentences = text.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+/g) ?? []
  return sentences.slice(0, 2).join(' ').trim().slice(0, 200) || text.slice(0, 100)
}

// ─── Groq — Character voice detection ────────────────────────────────────────

export interface DialogueLine {
  text: string
  speaker: 'narrator' | 'male' | 'female' | 'unknown'
  original: string
  startIndex: number
}

export async function detectCharacterVoices(
  sentences: string[]
): Promise<DialogueLine[]> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY

  if (!apiKey || sentences.length > 30) {
    // Use regex detection for large chunks or no key
    return detectVoicesWithRegex(sentences)
  }

  const text = sentences.slice(0, 20).join('\n')

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        temperature: 0,
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: 'You detect who is speaking each line of text. For each line, classify as: narrator, male, female, or unknown. Return ONLY JSON array: [{"index": 0, "speaker": "narrator"}]. No markdown.',
          },
          {
            role: 'user',
            content: sentences.slice(0, 20).map((s, i) => `${i}: ${s}`).join('\n'),
          },
        ],
      }),
    })

    if (!response.ok) return detectVoicesWithRegex(sentences)

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content ?? '[]'
    const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim()) as Array<{ index: number; speaker: string }>

    const speakerMap = new Map(parsed.map((p) => [p.index, p.speaker as DialogueLine['speaker']]))

    return sentences.map((s, i) => ({
      text: s,
      speaker: speakerMap.get(i) ?? 'narrator',
      original: s,
      startIndex: i,
    }))
  } catch {
    return detectVoicesWithRegex(sentences)
  }
}

function detectVoicesWithRegex(sentences: string[]): DialogueLine[] {
  // Simple heuristic: quoted speech is dialogue, rest is narrator
  const dialoguePattern = /^["'"'](.+)["'"'](\s*(?:said|asked|cried|exclaimed|replied|whispered|shouted).+)?/

  const maleIndicators = /(?:he said|his voice|the man|mr\.|lord |sir |boy |father |brother |son )/i
  const femaleIndicators = /(?:she said|her voice|the woman|mrs\.|miss |lady |girl |mother |sister |daughter )/i

  // Track context for speaker gender
  let lastSpeakerGender: 'male' | 'female' | null = null

  return sentences.map((sentence, i) => {
    const isDialogue = dialoguePattern.test(sentence.trim())

    if (!isDialogue) {
      if (maleIndicators.test(sentence)) lastSpeakerGender = 'male'
      if (femaleIndicators.test(sentence)) lastSpeakerGender = 'female'
      return { text: sentence, speaker: 'narrator', original: sentence, startIndex: i }
    }

    // It's dialogue — determine gender from surrounding context
    let speaker: DialogueLine['speaker'] = lastSpeakerGender ?? 'unknown'
    if (maleIndicators.test(sentence)) speaker = 'male'
    if (femaleIndicators.test(sentence)) speaker = 'female'

    return { text: sentence, speaker, original: sentence, startIndex: i }
  })
}

// ─── Groq — Chapter summaries ────────────────────────────────────────────────

export async function generateChapterSummary(
  chapterTitle: string,
  chapterText: string
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!apiKey) return generateSimpleSummary(chapterText)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 150,
        messages: [
          {
            role: 'system',
            content: 'Write a warm, engaging 1-2 sentence summary of this book chapter. Be evocative, not dry. Sound like a trusted friend describing a great story.',
          },
          {
            role: 'user',
            content: `Chapter: "${chapterTitle}"\n\n${chapterText.slice(0, 3000)}`,
          },
        ],
      }),
    })

    if (!response.ok) return generateSimpleSummary(chapterText)
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() ?? generateSimpleSummary(chapterText)
  } catch {
    return generateSimpleSummary(chapterText)
  }
}
