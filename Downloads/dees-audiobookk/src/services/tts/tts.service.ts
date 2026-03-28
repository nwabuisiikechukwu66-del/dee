'use client'
import type { TTSProvider, TTSProviderStatus, VoiceMode } from '@/types'

// ─── Provider availability check ─────────────────────────────────────────────

export function getTTSProviderStatus(): TTSProviderStatus[] {
  return [
    {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      available: !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
      reason: !process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ? 'No API key' : undefined,
    },
    {
      id: 'groq',
      name: 'Groq TTS',
      available: !!process.env.NEXT_PUBLIC_GROQ_API_KEY,
      reason: !process.env.NEXT_PUBLIC_GROQ_API_KEY ? 'No API key' : undefined,
    },
    {
      id: 'browser',
      name: 'Web Speech',
      available: typeof window !== 'undefined' && 'speechSynthesis' in window,
      reason: typeof window !== 'undefined' && !('speechSynthesis' in window) ? 'Not supported' : undefined,
    },
  ]
}

export function getActiveProvider(): TTSProvider {
  const statuses = getTTSProviderStatus()
  // Check localStorage for exhausted providers
  const exhausted = getExhaustedProviders()

  for (const s of statuses) {
    if (s.available && !exhausted.includes(s.id)) {
      return s.id
    }
  }
  return 'browser' // Always available
}

function getExhaustedProviders(): TTSProvider[] {
  try {
    const key = `dees-tts-exhausted-${getMonthKey()}`
    return JSON.parse(localStorage.getItem(key) ?? '[]')
  } catch { return [] }
}

export function markProviderExhausted(provider: TTSProvider) {
  try {
    const key = `dees-tts-exhausted-${getMonthKey()}`
    const current = getExhaustedProviders()
    if (!current.includes(provider)) {
      localStorage.setItem(key, JSON.stringify([...current, provider]))
    }
  } catch {}
}

function getMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Sentence splitter ────────────────────────────────────────────────────────

export function splitIntoSentences(text: string): string[] {
  // Smart sentence splitting — handles abbreviations, quotes, etc.
  const raw = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, ' ¶ ')  // paragraph marker
    .replace(/\n/g, ' ')
    .trim()

  const sentences: string[] = []
  const regex = /[^.!?]*[.!?]+["']?(?:\s|$)|[^.!?]+$/g
  let match

  while ((match = regex.exec(raw)) !== null) {
    const s = match[0].trim()
    if (s.length > 2) sentences.push(s)
  }

  return sentences.length > 0 ? sentences : [text]
}

// ─── ElevenLabs TTS ───────────────────────────────────────────────────────────

const EL_VOICE_MAP: Record<string, string> = {
  narrator: '21m00Tcm4TlvDq8ikWAM',   // Rachel — clear, warm
  female: 'AZnzlk1XvdvUeBnXmlld',     // Domi — female
  male: 'TxGEqnHWrfWFTfGW9XjX',       // Josh — male
  smart: '21m00Tcm4TlvDq8ikWAM',      // Rachel default
}

export async function speakElevenLabs(
  text: string,
  voiceMode: VoiceMode = 'narrator',
  onAudio: (blob: Blob) => void,
  onError: (err: Error) => void
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
  if (!apiKey) { onError(new Error('No ElevenLabs key')); return }

  const voiceId = EL_VOICE_MAP[voiceMode] ?? EL_VOICE_MAP.narrator

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
        }),
      }
    )

    if (response.status === 429) {
      markProviderExhausted('elevenlabs')
      onError(new Error('QUOTA_EXCEEDED'))
      return
    }

    if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`)

    const blob = await response.blob()
    onAudio(blob)
  } catch (err) {
    onError(err instanceof Error ? err : new Error('ElevenLabs failed'))
  }
}

// ─── Groq TTS ─────────────────────────────────────────────────────────────────

export async function speakGroq(
  text: string,
  voiceMode: VoiceMode = 'narrator',
  onAudio: (blob: Blob) => void,
  onError: (err: Error) => void
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!apiKey) { onError(new Error('No Groq key')); return }

  const voice = voiceMode === 'male' ? 'Fritz-PlayAI' :
                voiceMode === 'female' ? 'Celeste-PlayAI' :
                'Arista-PlayAI'

  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'playai-tts',
        input: text,
        voice,
        response_format: 'mp3',
      }),
    })

    if (response.status === 429) {
      markProviderExhausted('groq')
      onError(new Error('QUOTA_EXCEEDED'))
      return
    }

    if (!response.ok) throw new Error(`Groq TTS error: ${response.status}`)

    const blob = await response.blob()
    onAudio(blob)
  } catch (err) {
    onError(err instanceof Error ? err : new Error('Groq TTS failed'))
  }
}

// ─── Browser TTS ──────────────────────────────────────────────────────────────

export interface BrowserSpeakOptions {
  text: string
  rate?: number
  voiceMode?: VoiceMode
  onWord?: (charIndex: number, text: string) => void
  onEnd?: () => void
  onError?: () => void
}

let _utterance: SpeechSynthesisUtterance | null = null
let _voicesLoaded = false

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) { resolve(voices); return }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices())
      _voicesLoaded = true
    }
    // Timeout fallback
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500)
  })
}

export async function speakBrowser(opts: BrowserSpeakOptions): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(opts.text)
  utterance.rate = opts.rate ?? 1
  utterance.lang = 'en-US'
  utterance.volume = 1

  const voices = await loadVoices()
  if (voices.length > 0) {
    let picked: SpeechSynthesisVoice | undefined

    if (opts.voiceMode === 'female') {
      picked = voices.find((v) =>
        /female|woman|samantha|karen|victoria|alice|emma|zira|susan/i.test(v.name)
      )
    } else if (opts.voiceMode === 'male') {
      picked = voices.find((v) =>
        /male|man|daniel|alex|david|james|mark|fred|jorge/i.test(v.name)
      )
    }

    if (!picked) {
      // Prefer high-quality enhanced/premium voices
      picked = voices.find((v) => /enhanced|premium|neural/i.test(v.name))
        ?? voices.find((v) => v.lang.startsWith('en'))
    }

    if (picked) utterance.voice = picked
  }

  utterance.onboundary = (e) => {
    if (e.name === 'word') opts.onWord?.(e.charIndex, opts.text)
  }
  utterance.onend = () => opts.onEnd?.()
  utterance.onerror = () => opts.onError?.()

  _utterance = utterance
  window.speechSynthesis.speak(utterance)
}

export function pauseBrowserSpeech(): void {
  if (typeof window !== 'undefined') window.speechSynthesis.pause()
}

export function resumeBrowserSpeech(): void {
  if (typeof window !== 'undefined') window.speechSynthesis.resume()
}

export function stopBrowserSpeech(): void {
  if (typeof window !== 'undefined') {
    window.speechSynthesis.cancel()
    _utterance = null
  }
}

// ─── Audio blob player ────────────────────────────────────────────────────────

let _audioElement: HTMLAudioElement | null = null

export function playAudioBlob(
  blob: Blob,
  volume: number = 1,
  onEnd?: () => void,
  onError?: () => void
): void {
  if (_audioElement) {
    _audioElement.pause()
    _audioElement.src = ''
  }

  const url = URL.createObjectURL(blob)
  _audioElement = new Audio(url)
  _audioElement.volume = volume
  _audioElement.onended = () => {
    URL.revokeObjectURL(url)
    onEnd?.()
  }
  _audioElement.onerror = () => {
    URL.revokeObjectURL(url)
    onError?.()
  }
  _audioElement.play().catch(() => onError?.())
}

export function pauseAudio(): void {
  _audioElement?.pause()
}

export function resumeAudio(): void {
  _audioElement?.play().catch(() => {})
}

export function stopAudio(): void {
  if (_audioElement) {
    _audioElement.pause()
    _audioElement.src = ''
    _audioElement = null
  }
}

export function setAudioVolume(volume: number): void {
  if (_audioElement) _audioElement.volume = Math.max(0, Math.min(1, volume))
}

export const PROVIDER_NAMES: Record<TTSProvider, string> = {
  elevenlabs: 'ElevenLabs',
  groq: 'Groq TTS',
  browser: 'Web Speech API',
}
