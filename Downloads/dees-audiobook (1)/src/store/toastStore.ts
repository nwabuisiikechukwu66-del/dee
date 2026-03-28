'use client'
import { create } from 'zustand'
import type { Toast, ToastVariant } from '@/types'

interface ToastStore {
  toasts: Toast[]
  show: (message: string, variant?: ToastVariant, duration?: number) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, variant = 'info', duration = 3500) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, variant, duration }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
