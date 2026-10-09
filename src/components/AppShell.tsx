'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import { Bell, ChevronRight } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { SearchBar } from '@/components/SearchBar'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { useAuth } from '@/lib/auth-context'

export function usePendingTasks() {
  const { data } = useSWR<{ count: number }>('/api/todos/pending', { refreshInterval: 20000 })
  return data?.count ?? 0
}

function Shell({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  const pending = usePendingTasks()
  const showSearch = role === 'owner' || role === 'store_manager'

  return (
    <>
      <Sidebar pendingTasks={pending} />
      <div className="flex-1 flex flex-col min-h-screen min-w-0 ml-0 lg:ml-56">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border pl-16 pr-4 lg:px-8 py-3 min-h-[57px] flex items-center gap-3">
          <div className="flex-1 min-w-0">{showSearch && <SearchBar />}</div>
          <Link
            href="/todos"
            aria-label={pending ? `${pending} pending tasks` : 'My tasks'}
            className="relative shrink-0 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-5 h-5" />
            {pending > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red text-white text-[10px] font-semibold flex items-center justify-center">
                {pending > 99 ? '99+' : pending}
              </span>
            )}
          </Link>
        </header>
        {pending > 0 && (
          <Link
            href="/todos"
            className="flex items-center gap-2 px-4 lg:px-8 py-2 bg-amber/10 border-b border-amber/30 text-sm text-foreground hover:bg-amber/15"
          >
            <Bell className="w-4 h-4 text-amber shrink-0" />
            <span className="flex-1 min-w-0">
              You have <strong>{pending}</strong> task{pending !== 1 ? 's' : ''} assigned to you that {pending !== 1 ? 'are' : 'is'} not completed yet.
            </span>
            <span className="hidden sm:inline text-xs font-medium">View tasks</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </Link>
        )}
        <main className="flex-1 min-w-0 px-4 lg:px-8 py-6">{children}</main>
      </div>
    </>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/login') return <main className="flex-1">{children}</main>
  return (
    <ConfirmProvider>
      <Shell>{children}</Shell>
    </ConfirmProvider>
  )
}
