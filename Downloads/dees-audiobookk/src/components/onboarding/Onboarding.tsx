'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from '@phosphor-icons/react'

const STEPS = [
  {
    id: 'welcome', emoji: '📖',
    title: "Welcome to Dee's Audiobook",
    subtitle: "This was made carefully, with someone very specific in mind. You. Every detail was chosen with love.",
    cta: 'Begin',
  },
  {
    id: 'free', emoji: '🏛️',
    title: 'Thousands of free books',
    subtitle: "Austen. Dickens. Tolstoy. Shelley. The world's greatest stories, free forever from Project Gutenberg.",
    cta: 'Next',
  },
  {
    id: 'real', emoji: '🎧',
    title: 'A real audiobook experience',
    subtitle: "Books are split into proper chapters by AI. Each sentence narrated in turn. Navigation, speed control, character voices — all of it.",
    features: ['AI-generated chapters & summaries', 'Smart character voice detection', '7 narrators with auto-fallback', 'Speed 0.5× to 2×'],
    cta: 'Next',
  },
  {
    id: 'upload', emoji: '📁',
    title: 'Bring your own books',
    subtitle: "Upload PDFs, EPUBs, TXTs, and MOBIs from your device. Dee reads anything you bring her.",
    formats: ['PDF', 'EPUB', 'TXT', 'MOBI'],
    cta: 'Next',
  },
  {
    id: 'atmosphere', emoji: '🌿',
    title: 'Feel the story',
    subtitle: "Genre-matched backgrounds, ambient soundscapes, and a Spotify playlist — the atmosphere shifts with the mood of each chapter.",
    cta: 'Next',
  },
  {
    id: 'ready', emoji: '✨',
    title: "You're ready",
    subtitle: "No account needed to start. Your library saves automatically. Sign in whenever you want to sync across devices.",
    cta: 'Start Listening',
  },
]

interface OnboardingProps {
  onComplete: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (isLast) { onComplete(); return }
    setDir(1); setStep((s) => s + 1)
  }

  const goTo = (i: number) => { setDir(i > step ? 1 : -1); setStep(i) }

  return (
    <div className="min-h-dvh flex flex-col bg-[#F9F5EE]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {!isLast && (
        <div className="flex justify-end px-6 pt-5 pb-2">
          <button onClick={onComplete} className="text-sm text-[#9E8E7A] font-serif hover:text-[#5C4A2E] transition-colors px-2 py-1">
            Skip
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={current.id} custom={dir}
            initial={{ opacity: 0, x: dir * 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex-1 flex flex-col items-center justify-center px-8 py-10"
          >
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 220 }}
              className="w-28 h-28 rounded-full bg-white border border-[#D4C4A8] shadow-card flex items-center justify-center mb-8"
            >
              <span className="text-5xl select-none">{current.emoji}</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.28 }} className="text-center"
            >
              <h1 className="text-[2rem] leading-tight font-serif text-[#2C2416] text-balance mb-4">
                {current.title}
              </h1>
              <p className="text-base text-[#5C4A2E] font-serif leading-relaxed text-balance max-w-sm mx-auto">
                {current.subtitle}
              </p>

              {'features' in current && current.features && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }} className="mt-7 flex flex-col gap-2 max-w-xs mx-auto"
                >
                  {current.features.map((f) => (
                    <div key={f} className="flex items-center gap-3 px-4 py-2.5 bg-white/70 rounded-xl border border-[#D4C4A8]">
                      <Check size={14} className="text-[#7C5C3A] shrink-0" weight="bold" />
                      <span className="text-sm font-serif text-[#2C2416]">{f}</span>
                    </div>
                  ))}
                </motion.div>
              )}

              {'formats' in current && current.formats && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }} className="mt-7 flex gap-3 flex-wrap justify-center"
                >
                  {current.formats.map((f) => (
                    <span key={f} className="px-4 py-2 bg-white border border-[#D4C4A8] rounded-lg text-sm font-mono text-[#5C4A2E] shadow-sm">
                      .{f.toLowerCase()}
                    </span>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`Step ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2 bg-[#7C5C3A]' : i < step ? 'w-2 h-2 bg-[#7C5C3A]/40' : 'w-2 h-2 bg-[#D4C4A8]'}`}
            />
          ))}
        </div>

        <button onClick={next}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#7C5C3A] text-[#F9F5EE] rounded-xl font-serif text-base shadow-card hover:bg-[#9E6F45] transition-colors active:bg-[#5C3E22]"
        >
          {current.cta}
          {!isLast && <ArrowRight size={18} weight="bold" />}
        </button>

        {step === 0 && (
          <p className="text-center text-xs text-[#9E8E7A] font-serif mt-4">No account needed · Works offline · Free forever</p>
        )}
      </div>
    </div>
  )
}
