'use client'
import type { Chapter, VoiceMode, TTSProvider, TTSSegment } from '@/types'
import {
  getActiveProvider, markProviderExhausted,
  speakElevenLabs, speakGroq, speakBrowser,
  playAudioBlob, pauseAudio, resumeAudio, stopAudio, setAudioVolume,
  pauseBrowserSpeech, resumeBrowserSpeech, stopBrowserSpeech,
  splitIntoSentences,
} from './tts.service'

export type OrchestratorStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export interface OrchestratorCallbacks {
  onStatusChange?: (status: OrchestratorStatus) => void
  onSentenceChange?: (sentenceIndex: number, charIndex: number, text: string) => void
  onChapterEnd?: () => void
  onProviderChange?: (provider: TTSProvider) => void
  onError?: (err: string) => void
}

export class AudiobookOrchestrator {
  private chapter: Chapter | null = null
  private sentences: string[] = []
  private sentenceIndex: number = 0
  private status: OrchestratorStatus = 'idle'
  private provider: TTSProvider = 'browser'
  private voiceMode: VoiceMode = 'narrator'
  private speed: number = 1
  private volume: number = 0.9
  private callbacks: OrchestratorCallbacks = {}
  private destroyed = false
  private sentenceCharOffsets: number[] = []  // char start of each sentence in chapter

  constructor(callbacks: OrchestratorCallbacks = {}) {
    this.callbacks = callbacks
  }

  // ─── Load a chapter ──────────────────────────────────────────────────────

  loadChapter(chapter: Chapter, startCharPosition: number = 0): void {
    this.chapter = chapter
    this.sentences = splitIntoSentences(chapter.text)

    // Build char offset map
    this.sentenceCharOffsets = []
    let offset = 0
    for (const s of this.sentences) {
      this.sentenceCharOffsets.push(offset)
      offset += s.length + 1 // +1 for space
    }

    // Find which sentence to start at based on char position
    this.sentenceIndex = this.findSentenceIndexAtChar(startCharPosition)
    this.provider = getActiveProvider()
    this.callbacks.onProviderChange?.(this.provider)
  }

  private findSentenceIndexAtChar(charPos: number): number {
    if (charPos === 0) return 0
    for (let i = this.sentenceCharOffsets.length - 1; i >= 0; i--) {
      if (this.sentenceCharOffsets[i] <= charPos) return i
    }
    return 0
  }

  getCurrentCharPosition(): number {
    return this.sentenceCharOffsets[this.sentenceIndex] ?? 0
  }

  // ─── Playback control ────────────────────────────────────────────────────

  async play(): Promise<void> {
    if (this.status === 'playing') return
    if (this.status === 'paused') {
      this.status = 'playing'
      this.callbacks.onStatusChange?.('playing')
      if (this.provider === 'browser') resumeBrowserSpeech()
      else resumeAudio()
      return
    }
    this.status = 'playing'
    this.callbacks.onStatusChange?.('playing')
    await this.playFromCurrentSentence()
  }

  pause(): void {
    this.status = 'paused'
    this.callbacks.onStatusChange?.('paused')
    if (this.provider === 'browser') pauseBrowserSpeech()
    else pauseAudio()
  }

  stop(): void {
    this.status = 'idle'
    this.callbacks.onStatusChange?.('idle')
    stopBrowserSpeech()
    stopAudio()
  }

  destroy(): void {
    this.destroyed = true
    this.stop()
  }

  seekToSentence(idx: number): void {
    this.sentenceIndex = Math.max(0, Math.min(idx, this.sentences.length - 1))
    if (this.status === 'playing') {
      stopBrowserSpeech()
      stopAudio()
      this.playFromCurrentSentence()
    }
  }

  seekToChar(charPos: number): void {
    const idx = this.findSentenceIndexAtChar(charPos)
    this.seekToSentence(idx)
  }

  setSpeed(speed: number): void {
    this.speed = speed
    if (this.status === 'playing') {
      // Restart current sentence at new speed
      stopBrowserSpeech()
      stopAudio()
      this.playFromCurrentSentence()
    }
  }

  setVolume(vol: number): void {
    this.volume = vol
    setAudioVolume(vol)
  }

  setVoiceMode(mode: VoiceMode): void {
    this.voiceMode = mode
  }

  getStatus(): OrchestratorStatus { return this.status }
  getProvider(): TTSProvider { return this.provider }
  getSentenceCount(): number { return this.sentences.length }
  getSentenceIndex(): number { return this.sentenceIndex }
  getSentences(): string[] { return this.sentences }

  // ─── Core playback loop ──────────────────────────────────────────────────

  private async playFromCurrentSentence(): Promise<void> {
    if (this.destroyed || this.status !== 'playing') return
    if (!this.chapter || this.sentenceIndex >= this.sentences.length) {
      this.status = 'idle'
      this.callbacks.onStatusChange?.('idle')
      this.callbacks.onChapterEnd?.()
      return
    }

    const sentence = this.sentences[this.sentenceIndex]
    const charOffset = this.sentenceCharOffsets[this.sentenceIndex] ?? 0

    this.callbacks.onSentenceChange?.(this.sentenceIndex, charOffset, sentence)

    // Notify loading for first sentence
    if (this.sentenceIndex === 0) {
      this.callbacks.onStatusChange?.('loading')
    }

    const onSentenceDone = async () => {
      if (this.destroyed || this.status !== 'playing') return
      this.sentenceIndex++
      await this.playFromCurrentSentence()
    }

    await this.speakWithFallback(sentence, onSentenceDone)
  }

  private async speakWithFallback(
    text: string,
    onDone: () => void
  ): Promise<void> {
    if (this.destroyed || this.status !== 'playing') return

    this.callbacks.onStatusChange?.('playing')

    // Try providers in order
    const tryProvider = async (provider: TTSProvider): Promise<void> => {
      if (provider === 'browser') {
        await speakBrowser({
          text,
          rate: this.speed,
          voiceMode: this.voiceMode,
          onEnd: onDone,
          onError: () => {
            if (!this.destroyed) {
              this.callbacks.onError?.('Speech synthesis failed')
              onDone()  // Skip on error, continue
            }
          },
        })
        return
      }

      const speakFn = provider === 'elevenlabs' ? speakElevenLabs : speakGroq

      await speakFn(
        text,
        this.voiceMode,
        (blob) => {
          playAudioBlob(blob, this.volume, onDone, async () => {
            // Audio playback error — fall to next provider
            await this.fallbackToNextProvider(text, onDone)
          })
        },
        async (err) => {
          if (err.message === 'QUOTA_EXCEEDED' || err.message.includes('No')) {
            markProviderExhausted(provider)
            await this.fallbackToNextProvider(text, onDone)
          } else {
            await this.fallbackToNextProvider(text, onDone)
          }
        }
      )
    }

    await tryProvider(this.provider)
  }

  private async fallbackToNextProvider(
    text: string,
    onDone: () => void
  ): Promise<void> {
    if (this.destroyed) return

    const order: TTSProvider[] = ['elevenlabs', 'groq', 'browser']
    const currentIdx = order.indexOf(this.provider)
    const nextProviders = order.slice(currentIdx + 1)

    for (const next of nextProviders) {
      this.provider = next
      this.callbacks.onProviderChange?.(next)

      if (next === 'browser') {
        await speakBrowser({
          text,
          rate: this.speed,
          voiceMode: this.voiceMode,
          onEnd: onDone,
          onError: onDone,
        })
        return
      }

      const speakFn = next === 'elevenlabs' ? speakElevenLabs : speakGroq
      let succeeded = false

      await speakFn(
        text,
        this.voiceMode,
        (blob) => {
          succeeded = true
          playAudioBlob(blob, this.volume, onDone, onDone)
        },
        async (err) => {
          if (err.message === 'QUOTA_EXCEEDED') markProviderExhausted(next)
        }
      )

      if (succeeded) return
    }

    // All failed — skip sentence
    onDone()
  }
}
