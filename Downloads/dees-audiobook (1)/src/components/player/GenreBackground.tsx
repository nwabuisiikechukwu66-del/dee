'use client'
import { useState, useEffect } from 'react'
import { GENRE_IMAGES, MOOD_OVERLAYS } from './genreImages'
import type { ChapterMood } from '@/types'

interface GenreBackgroundProps {
  genre: string
  mood?: ChapterMood
}

export function GenreBackground({ genre, mood }: GenreBackgroundProps) {
  const images = GENRE_IMAGES[genre] ?? GENRE_IMAGES.fiction
  const [idx, setIdx] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [fading, setFading] = useState(false)

  // Reset on genre change
  useEffect(() => {
    setIdx(0); setPrev(null); setFading(false)
  }, [genre])

  // 12s crossfade cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setPrev(idx)
      setFading(true)
      const next = (idx + 1) % images.length
      setTimeout(() => {
        setIdx(next)
        setFading(false)
        setPrev(null)
      }, 1500)
    }, 12000)
    return () => clearInterval(timer)
  }, [idx, images.length])

  const moodOverlay = mood ? MOOD_OVERLAYS[mood] : undefined

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Next image underneath */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${images[(idx + 1) % images.length]})`, transform: 'scale(1.04)' }}
      />

      {/* Current image on top — fades out to reveal next */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${images[idx]})`,
          opacity: fading ? 0 : 1,
          transition: 'opacity 1.5s ease',
          animation: !fading ? 'ken-burns 12s ease-out forwards' : 'none',
        }}
      />

      {/* Base dark overlay */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Mood tint overlay */}
      {moodOverlay && (
        <div className="absolute inset-0 transition-colors duration-[3000ms]" style={{ background: moodOverlay }} />
      )}
    </div>
  )
}
