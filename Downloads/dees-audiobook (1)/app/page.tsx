'use client'
import { useState, useEffect } from 'react'
import { Onboarding } from '@/components/onboarding/Onboarding'
import HomePageContent from './(app)/page'

const KEY = 'dees-onboarded-v2'

export default function RootPage() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null)

  useEffect(() => {
    setOnboarded(localStorage.getItem(KEY) === 'true')
  }, [])

  if (onboarded === null) {
    return <div className="min-h-dvh bg-[#F9F5EE]" />
  }

  if (!onboarded) {
    return (
      <Onboarding onComplete={() => {
        localStorage.setItem(KEY, 'true')
        setOnboarded(true)
      }} />
    )
  }

  return <HomePageContent />
}
