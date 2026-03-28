'use client'
import { forwardRef } from 'react'
import { cn } from '@/utils'

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center font-serif rounded-lg select-none',
        'transition-all duration-150 active:translate-y-px',
        'focus-visible:outline-2 focus-visible:outline-[#7C5C3A] focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0',
        variant === 'primary' && 'bg-[#7C5C3A] text-[#F9F5EE] hover:bg-[#9E6F45] shadow-sm',
        variant === 'secondary' && 'bg-[#F2EAD8] border border-[#D4C4A8] text-[#2C2416] hover:bg-[#E5D5B8]',
        variant === 'ghost' && 'text-[#5C4A2E] hover:text-[#7C5C3A] hover:bg-[#F2EAD8]',
        variant === 'danger' && 'text-red-600 hover:bg-red-50',
        size === 'sm' && 'px-3 py-1.5 text-sm h-8',
        size === 'md' && 'px-4 py-2.5 text-base h-11',
        size === 'lg' && 'px-6 py-3 text-lg h-13',
        size === 'icon' && 'w-11 h-11 p-0',
        className
      )}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </span>
      )}
      <span className={loading ? 'invisible' : ''}>{children}</span>
    </button>
  )
)
Button.displayName = 'Button'

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm text-[#5C4A2E] mb-1.5 font-serif">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E8E7A] pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref} id={inputId}
            className={cn(
              'w-full bg-[#F9F5EE] border border-[#D4C4A8] rounded-lg text-[#2C2416] font-serif',
              'placeholder:text-[#9E8E7A]/70 px-4 py-2.5 h-11',
              'focus:outline-none focus:border-[#7C5C3A] focus:ring-2 focus:ring-[#7C5C3A]/20',
              'transition-colors duration-150',
              icon && 'pl-10',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-200',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-600 font-serif">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ─── ProgressBar ─────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number
  height?: number
  className?: string
  fillClassName?: string
  seekable?: boolean
  onSeek?: (v: number) => void
  'aria-label'?: string
}
export function ProgressBar({ value, height = 4, className, fillClassName, seekable, onSeek, 'aria-label': ariaLabel }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div
      role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      aria-label={ariaLabel ?? 'Progress'}
      style={{ height }}
      onClick={seekable && onSeek ? (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
      } : undefined}
      className={cn('relative w-full rounded-full bg-[#D4C4A8]/50 overflow-hidden', seekable && 'cursor-pointer', className)}
    >
      <div
        className={cn('h-full rounded-full bg-[#C8884A] transition-all duration-300', fillClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── WaveIndicator ────────────────────────────────────────────────────────────
export function WaveIndicator({ size = 'sm', color = '#C8884A' }: { size?: 'sm' | 'md'; color?: string }) {
  const h = size === 'sm' ? 16 : 24
  return (
    <span aria-label="Currently playing" className="inline-flex items-end gap-[2px]" style={{ height: h }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="rounded-full" style={{
          width: size === 'sm' ? 3 : 4, height: '100%',
          background: color,
          animation: `wave 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
          minHeight: `${h * 0.2}px`,
        }} />
      ))}
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('shimmer rounded-lg', className)} style={style} aria-hidden="true" />
}

// ─── Badge / Pill ─────────────────────────────────────────────────────────────
export function Pill({ children, active, onClick, className }: {
  children: React.ReactNode; active?: boolean; onClick?: () => void; className?: string
}) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-serif border transition-all duration-200 whitespace-nowrap',
        active
          ? 'bg-[#7C5C3A] text-[#F9F5EE] border-[#7C5C3A]'
          : 'bg-[#F9F5EE] border-[#D4C4A8] text-[#5C4A2E] hover:border-[#7C5C3A] hover:text-[#7C5C3A]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </Tag>
  )
}
