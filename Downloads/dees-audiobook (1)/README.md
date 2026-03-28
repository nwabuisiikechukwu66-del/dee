# 📖 Dee's Audiobook

> A warm, literary audiobook experience — made carefully, with someone very specific in mind.

---

## What This Is

Dee's Audiobook is a full-stack Progressive Web App that turns any book into a real, immersive audiobook experience. Built with cream paper tones, Garamond typography, and genre-matched atmospheric backgrounds, it feels like a well-loved paperback — unhurried, human, and made with love.

---

## Features

- **Real audiobook playback** — Books are split into chapters by Gemini AI, narrated sentence by sentence with full position tracking
- **3-provider TTS chain** — ElevenLabs → Groq → Browser Web Speech. Graceful fallback. Always works.
- **Smart voice detection** — Groq LLaMA identifies dialogue vs. narration for character voices
- **7000+ free books** — Gutenberg + OpenLibrary search, instant play
- **Upload your own books** — PDF, EPUB, TXT, MOBI — server extracts text, AI chunks it
- **Genre-aware backgrounds** — Each genre has 5 curated atmospheric Unsplash slideshows
- **Spotify playlist** — Background music iframe from a curated playlist
- **Chapter summaries** — AI-generated before each chapter
- **Works offline** — All library data in IndexedDB + localStorage
- **No backend required** — Runs fully in guest mode with zero config
- **PWA installable** — Add to home screen on iOS and Android
- **Simple auth** — Email + password + username. No OAuth complexity.

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Copy env and fill in your keys (all optional — see below)
cp .env.example .env.local

# 3. Run
npm run dev
# → http://localhost:3000
```

> **The app works with zero API keys.** Browser Web Speech API handles all narration. Add keys to unlock better voice quality.

---

## Environment Variables

```bash
# Convex (optional — enables cross-device library sync)
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
CONVEX_DEPLOYMENT=dev:xxx

# Auth secret (generate: openssl rand -base64 32)
AUTH_SECRET=change-this-in-production

# TTS — all optional, browser speech is always the fallback
NEXT_PUBLIC_ELEVENLABS_API_KEY=     # Best quality voice
NEXT_PUBLIC_GROQ_API_KEY=           # Groq TTS + AI features

# AI features — all optional, regex fallbacks built in
NEXT_PUBLIC_GEMINI_API_KEY=         # Smart chapter chunking
```

---

## Setting Up Convex (optional)

Convex enables library sync across devices. Without it, everything saves locally.

```bash
# Install Convex CLI
npm install -g convex

# Login and initialise
npx convex login
npx convex init

# Deploy schema
npx convex deploy

# Add the CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL to .env.local
```

---

## Deploy to Vercel

```bash
# Build and preview locally
npm run build
npm run start

# Deploy
npx vercel --prod
```

Set env vars in Vercel Dashboard → Project → Settings → Environment Variables.

---

## How the Audiobook Engine Works

```
User clicks "Play"
  → Fetch raw text (Gutenberg API or uploaded file)
  → Server extracts text (PDF/EPUB via Next.js API route)
  → Gemini Flash chunks into chapters with titles, mood, summary
      (fallback: regex chapter detection if no Gemini key)
  → Chapters saved to IndexedDB
  → AudiobookOrchestrator splits current chapter into sentences
  → Groq detects character voices per sentence (Smart mode)
      (fallback: regex dialogue detection)
  → Sentences queued and narrated one by one:
      ElevenLabs → Groq TTS → Browser Web Speech
  → Position tracked to the character
  → Progress auto-saved every 10 seconds
  → On chapter end → advance to next chapter automatically
```

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| State | Zustand (persisted) |
| Database | Convex (optional) + IndexedDB (always) |
| Auth | Custom email/password/username |
| TTS | ElevenLabs + Groq + Browser Web Speech |
| AI | Gemini Flash + Groq LLaMA |
| PWA | next-pwa manifest |
| Hosting | Vercel |

---

## Project Structure

```
app/
├── page.tsx                  ← Onboarding gate → Home
├── (app)/
│   ├── page.tsx              ← Home dashboard
│   ├── discover/page.tsx     ← Search + browse
│   ├── library/page.tsx      ← Your collection
│   ├── upload/page.tsx       ← File upload
│   ├── player/page.tsx       ← Now Playing (full screen)
│   └── profile/page.tsx      ← Auth + settings
├── api/
│   ├── extract-book/         ← PDF/EPUB text extraction
│   └── auth/                 ← Login / signup / logout
src/
├── components/
│   ├── ui/                   ← Button, Input, Toast, WaveIndicator…
│   ├── layout/               ← BottomNav, MiniPlayer
│   ├── player/               ← GenreBackground
│   └── onboarding/           ← 6-step onboarding
├── services/
│   ├── tts/                  ← TTS chain + orchestrator
│   ├── ai/                   ← Gemini + Groq
│   └── books/                ← Gutenberg + extraction
├── store/                    ← Zustand stores
├── lib/                      ← local-db, convex-server
└── types/                    ← All TypeScript types
convex/
├── schema.ts                 ← DB schema
├── users.ts                  ← Auth mutations
└── library.ts                ← Library + chapters
```

---

*Made with care. Every detail chosen deliberately. For someone worth every bit of it.*
