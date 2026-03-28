'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { ToastContainer } from '@/components/ui/Toast'
import { BottomNav } from '@/components/layout/BottomNav'
import { MiniPlayer } from '@/components/layout/MiniPlayer'

export function Providers({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore()

  useEffect(() => { initialize() }, [initialize])

  return (
    <>
      {children}
      <MiniPlayer />
      <BottomNav />
      <ToastContainer />
    </>
  )
}
