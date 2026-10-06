'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { SearchBar } from '@/components/SearchBar'
import { useAuth } from '@/lib/auth-context'

function Shell({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  const showSearch = role === 'owner' || role === 'store_manager'
  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen ml-0 lg:ml-56">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 lg:px-8 py-3 min-h-[57px]">
          {showSearch && <SearchBar />}
        </header>
        <main className="flex-1 px-4 lg:px-8 py-6">{children}</main>
      </div>
    </>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/login') return <main className="flex-1">{children}</main>
  return <Shell>{children}</Shell>
}
