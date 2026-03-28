'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, MagnifyingGlass, Books, UploadSimple, User } from '@phosphor-icons/react'

const ITEMS = [
  { href: '/', label: 'Home',     Icon: House,           exact: true },
  { href: '/discover', label: 'Discover', Icon: MagnifyingGlass },
  { href: '/library',  label: 'Library',  Icon: Books },
  { href: '/upload',   label: 'Upload',   Icon: UploadSimple },
  { href: '/profile',  label: 'Profile',  Icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-30 frosted border-t border-[#D4C4A8]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-14">
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href} aria-label={label}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors duration-150 no-underline
                ${active ? 'text-[#7C5C3A]' : 'text-[#9E8E7A] hover:text-[#5C4A2E]'}`}
            >
              <Icon size={22} weight={active ? 'fill' : 'regular'} />
              <span className="text-[10px] font-serif">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
