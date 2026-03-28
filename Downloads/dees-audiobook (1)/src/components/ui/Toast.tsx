'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info, Warning, X } from '@phosphor-icons/react'
import { useToastStore } from '@/store/toastStore'
import type { ToastVariant } from '@/types'

const CONFIG: Record<ToastVariant, { icon: React.ReactNode; bg: string }> = {
  success: { icon: <CheckCircle weight="fill" className="text-green-600" size={18} />, bg: 'bg-white border-green-200' },
  error:   { icon: <XCircle weight="fill" className="text-red-500" size={18} />,   bg: 'bg-white border-red-200' },
  info:    { icon: <Info weight="fill" className="text-[#7C5C3A]" size={18} />,    bg: 'bg-[#F9F5EE] border-[#D4C4A8]' },
  warning: { icon: <Warning weight="fill" className="text-amber-500" size={18} />, bg: 'bg-white border-amber-200' },
}

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 120 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 120 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-card text-sm font-serif max-w-[320px] ${CONFIG[t.variant].bg}`}
          >
            {CONFIG[t.variant].icon}
            <span className="text-[#2C2416] flex-1 leading-snug">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-[#9E8E7A] hover:text-[#2C2416] transition-colors ml-1 shrink-0" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
