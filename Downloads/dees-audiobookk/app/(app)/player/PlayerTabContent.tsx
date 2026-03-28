'use client'
import { motion } from 'framer-motion'
import { Play, Pause, Rewind, FastForward, SkipBack, SkipForward } from '@phosphor-icons/react'
import { usePlayerStore } from '@/store/playerStore'
import { getTTSProviderStatus } from '@/services/tts/tts.service'
import { ProgressBar } from '@/components/ui'
import type { Book, Chapter, PlayerTab, PlaybackSpeed, VoiceMode, AmbienceMode } from '@/types'
import type { AudiobookOrchestrator } from '@/services/tts/orchestrator'

const SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

interface Props {
  tab: PlayerTab
  book: Book
  chapter: Chapter | null
  chapterIndex: number
  totalChapters: number
  isPlaying: boolean
  speed: PlaybackSpeed
  orchestrator: AudiobookOrchestrator | null
  onTogglePlay: () => void
  onSkipBack: () => void
  onSkipForward: () => void
  onRewind: () => void
  onFastForward: () => void
  onSeekChapter: (i: number) => void
}

export function PlayerTabContent({ tab, book, chapter, chapterIndex, totalChapters, isPlaying, speed, orchestrator, onTogglePlay, onSkipBack, onSkipForward, onRewind, onFastForward }: Props) {
  const { setSpeed, voiceMode, setVoiceMode, activeProvider, setActiveProvider, voiceVolume, setVoiceVolume, musicVolume, setMusicVolume, ambienceMode, setAmbienceMode, fontSize, setFontSize, currentSentenceIndex, currentSentenceText } = usePlayerStore()

  if (tab === 'player') {
    const chapProgress = orchestrator ? orchestrator.getSentenceIndex() / Math.max(1, orchestrator.getSentenceCount()) : 0
    return (
      <div className="flex flex-col items-center px-6 py-4 gap-4">
        {/* Chapter progress */}
        <div className="w-full">
          <ProgressBar value={chapProgress} height={6} seekable
            onSeek={(v) => orchestrator?.seekToSentence(Math.floor(v * (orchestrator?.getSentenceCount() ?? 1)))}
            trackClassName="bg-white/20 cursor-pointer" fillClassName="bg-[#C8884A]"
            aria-label="Chapter progress" />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] font-mono text-[#F9F5EE]/50">
              Sentence {(orchestrator?.getSentenceIndex() ?? 0) + 1} of {orchestrator?.getSentenceCount() ?? 0}
            </span>
            <span className="text-[10px] font-mono text-[#F9F5EE]/50">
              {Math.round(chapProgress * 100)}%
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-1">
          <button onClick={onRewind} aria-label="Rewind" className="w-10 h-10 flex items-center justify-center text-[#F9F5EE]/60 hover:text-[#F9F5EE] transition-colors">
            <Rewind size={24} />
          </button>
          <button onClick={onSkipBack} aria-label="Previous chapter" className="w-10 h-10 flex items-center justify-center text-[#F9F5EE]/75 hover:text-[#F9F5EE] transition-colors">
            <SkipBack size={28} weight="fill" />
          </button>
          <motion.button onClick={onTogglePlay} whileTap={{ scale: 1.07 }} aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-16 h-16 rounded-full bg-[#F9F5EE] flex items-center justify-center shadow-cover hover:bg-[#F2EAD8] transition-colors">
            {isPlaying
              ? <Pause size={28} weight="fill" className="text-[#7C5C3A]" />
              : <Play size={28} weight="fill" className="text-[#7C5C3A] ml-1" />
            }
          </motion.button>
          <button onClick={onSkipForward} aria-label="Next chapter" className="w-10 h-10 flex items-center justify-center text-[#F9F5EE]/75 hover:text-[#F9F5EE] transition-colors">
            <SkipForward size={28} weight="fill" />
          </button>
          <button onClick={onFastForward} aria-label="Fast forward" className="w-10 h-10 flex items-center justify-center text-[#F9F5EE]/60 hover:text-[#F9F5EE] transition-colors">
            <FastForward size={24} />
          </button>
        </div>

        {/* Chapter info */}
        {chapter && (
          <p className="text-xs text-[#F9F5EE]/50 font-serif text-center text-balance px-4 leading-relaxed">
            {chapter.summary ?? chapter.title}
          </p>
        )}

        {/* Speed */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-mono border transition-all duration-150 ${
                speed === s ? 'bg-[#F9F5EE] text-[#7C5C3A] border-[#F9F5EE]' : 'text-[#F9F5EE]/45 border-white/20 hover:border-white/40 hover:text-[#F9F5EE]/70'
              }`}>{s}×</button>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 'text') {
    const sentences = orchestrator?.getSentences() ?? []
    const currentIdx = orchestrator?.getSentenceIndex() ?? 0
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-end gap-2 px-6 py-2">
          <button onClick={() => setFontSize(fontSize - 0.1)} aria-label="Smaller font"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-[#F9F5EE] hover:bg-white/20 font-serif text-sm font-bold">A−</button>
          <button onClick={() => setFontSize(fontSize + 0.1)} aria-label="Larger font"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-[#F9F5EE] hover:bg-white/20 font-serif text-lg font-bold">A+</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-8 no-scrollbar">
          <div className="frosted-dark rounded-xl p-4 font-serif leading-relaxed" style={{ fontSize: `${fontSize}rem` }}>
            {sentences.length > 0 ? sentences.map((s, i) => (
              <span key={i} onClick={() => { orchestrator?.seekToSentence(i); if (!isPlaying) onTogglePlay() }}
                className={`cursor-pointer transition-all duration-200 ${
                  i < currentIdx ? 'text-[#F9F5EE]/40'
                  : i === currentIdx ? 'text-[#F9F5EE] border-b border-[#C8884A]/60'
                  : 'text-[#F9F5EE]/80'
                }`}
              >{s}{' '}
              </span>
            )) : (
              <span className="text-[#F9F5EE]/50">
                {chapter?.text?.slice(0, 500) ?? 'No text available for this chapter.'}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (tab === 'voice') {
    const providers = getTTSProviderStatus()
    const VOICE_MODES: { id: VoiceMode; label: string; emoji: string }[] = [
      { id: 'smart', label: 'Smart', emoji: '🧠' },
      { id: 'narrator', label: 'Narrator', emoji: '🎙️' },
      { id: 'female', label: 'Female', emoji: '👩' },
      { id: 'male', label: 'Male', emoji: '👨' },
    ]
    return (
      <div className="px-6 py-4 flex flex-col gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#F9F5EE]/50 mb-3 font-serif">Voice Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {VOICE_MODES.map(({ id, label, emoji }) => (
              <button key={id} onClick={() => setVoiceMode(id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-serif text-sm transition-all duration-150 ${
                  voiceMode === id ? 'bg-[#F9F5EE]/20 border-[#F9F5EE]/50 text-[#F9F5EE]' : 'bg-white/5 border-white/15 text-[#F9F5EE]/55 hover:border-white/30'
                }`}
              ><span className="text-lg">{emoji}</span>{label}</button>
            ))}
          </div>
          {voiceMode === 'smart' && (
            <div className="mt-3 p-3 frosted-dark rounded-xl">
              <p className="text-[10px] text-[#F9F5EE]/50 font-serif mb-2">Smart mode detects dialogue and assigns voices automatically</p>
              <div className="flex gap-3">
                {[['Narrator','bg-[#F9F5EE]'],['Male char','bg-blue-400'],['Female char','bg-pink-400']].map(([r,c]) => (
                  <div key={r} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${c}`} /><span className="text-[10px] text-[#F9F5EE]/60 font-serif">{r}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#F9F5EE]/50 mb-3 font-serif">TTS Provider</p>
          <div className="flex flex-col gap-2">
            {providers.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 p-3 frosted-dark rounded-xl border ${activeProvider === p.id ? 'border-[#C8884A]/50' : 'border-white/10'}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${!p.available ? 'bg-red-400' : activeProvider === p.id ? 'bg-green-400' : 'bg-white/20'}`} />
                <span className="text-xs text-[#F9F5EE]/70 font-serif flex-1">{p.name}</span>
                {!p.available && <span className="text-[10px] text-[#F9F5EE]/30 font-serif">{p.reason}</span>}
                {p.available && activeProvider !== p.id && (
                  <button onClick={() => setActiveProvider(p.id)} className="text-[10px] text-[#C8884A] font-serif hover:underline">Use</button>
                )}
                {activeProvider === p.id && <span className="text-[10px] text-[#C8884A] font-serif">Active</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Music tab
  const AMBIENCE: { id: AmbienceMode; label: string; emoji: string }[] = [
    { id: 'none', label: 'None', emoji: '🔇' },
    { id: 'ambient', label: 'Ambient', emoji: '🌿' },
    { id: 'spotify', label: 'Spotify', emoji: '🎵' },
  ]
  return (
    <div className="px-6 py-4 flex flex-col gap-5 overflow-y-auto no-scrollbar pb-8">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#F9F5EE]/50 mb-3 font-serif">Background</p>
        <div className="flex gap-2">
          {AMBIENCE.map(({ id, label, emoji }) => (
            <button key={id} onClick={() => setAmbienceMode(id)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-serif transition-all duration-150 ${
                ambienceMode === id ? 'bg-[#F9F5EE]/20 border-[#F9F5EE]/50 text-[#F9F5EE]' : 'bg-white/5 border-white/15 text-[#F9F5EE]/55 hover:border-white/30'
              }`}
            ><span className="text-xl">{emoji}</span><span className="text-xs">{label}</span></button>
          ))}
        </div>
      </div>

      {ambienceMode === 'spotify' && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#F9F5EE]/50 mb-3 font-serif">Playlist</p>
          <div className="rounded-xl overflow-hidden">
            <iframe
              src="https://open.spotify.com/embed/playlist/06gPKur5B71guHzGlq6pSn?utm_source=generator&theme=0"
              width="100%" height="152" frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy" title="Background playlist"
            />
          </div>
        </div>
      )}

      {ambienceMode === 'ambient' && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#F9F5EE]/50 mb-3 font-serif">Preset</p>
          {[['🔥','Reading Room','Crackling fire, soft rain'],['🌳','Forest Path','Birdsong, gentle breeze'],['☕','Coffee House','Soft chatter, espresso'],['🌧️','Rainy Window','Steady rain on glass']].map(([e,n,d]) => (
            <button key={n} className="w-full flex items-center gap-3 p-3 frosted-dark rounded-xl mb-2 text-left hover:bg-white/10 transition-colors">
              <span className="text-2xl">{e}</span>
              <div><p className="text-sm text-[#F9F5EE] font-serif">{n}</p><p className="text-[10px] text-[#F9F5EE]/50 font-serif">{d}</p></div>
            </button>
          ))}
        </div>
      )}

      {ambienceMode !== 'none' && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#F9F5EE]/50 mb-4 font-serif">Volume Mix</p>
          {[['Narrator voice', voiceVolume, setVoiceVolume], ['Background music', musicVolume, setMusicVolume]].map(([label, val, setter]: any) => (
            <div key={label} className="mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-[#F9F5EE]/55 font-serif">{label}</span>
                <span className="text-[10px] text-[#F9F5EE]/35 font-mono">{Math.round(val * 100)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={val}
                onChange={(e) => setter(parseFloat(e.target.value))}
                className="w-full" aria-label={label} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
