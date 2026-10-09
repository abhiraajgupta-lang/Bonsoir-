'use client'

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SWRConfig } from 'swr'
import { Role, ROLE_LABELS, canAccessPage, canDiscard as roleCanDiscard, isRole } from '@/lib/roles'
import { clearDeviceCache, createPersistentCache, fetcher } from '@/lib/api'

export { ROLE_LABELS }
export type { Role }

export interface Employee {
  id: string
  name: string
  role: string
  mobile: string | null
  email: string | null
  active: boolean
  hasPassword?: boolean
}

export interface CurrentUser {
  id: string
  name: string
  role: Role
  mobile: string | null
  email: string | null
}

interface AuthContextType {
  currentEmployee: CurrentUser
  role: Role
  hasAccess: (path: string) => boolean
  isOwner: boolean
  canCreateTodo: boolean
  canSeeCustomerContact: boolean
  canDiscard: boolean
  logout: () => Promise<void>
}

const USER_KEY = 'bonsoir_user'
const AuthContext = createContext<AuthContextType | null>(null)

function readCachedUser(): CurrentUser | null {
  try {
    const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    return u && isRole(u.role) ? u : null
  } catch {
    return null
  }
}

function toLogin(pathname: string) {
  window.location.href = `/login?next=${encodeURIComponent(pathname)}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    if (isLoginPage) return
    const cached = readCachedUser()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the cached user instantly while /me revalidates
    if (cached) setUser(cached)
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then((me: CurrentUser | null) => {
        if (!me || !isRole(me.role)) {
          localStorage.removeItem(USER_KEY)
          clearDeviceCache()
          return toLogin(pathname)
        }
        if (cached && cached.id !== me.id) clearDeviceCache()
        localStorage.setItem(USER_KEY, JSON.stringify(me))
        setUser(me)
      })
      .catch(() => { if (!cached) toLogin(pathname) })
  }, [isLoginPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const userId = user?.id
  const swrConfig = useMemo(() => userId ? {
    fetcher,
    provider: () => createPersistentCache(userId),
    revalidateOnFocus: true,
    dedupingInterval: 4000,
    keepPreviousData: true,
  } : null, [userId])

  if (isLoginPage) return <>{children}</>
  if (!user || !swrConfig) return null

  const role = user.role
  const value: AuthContextType = {
    currentEmployee: user,
    role,
    hasAccess: (path: string) => canAccessPage(role, path),
    isOwner: role === 'owner',
    canCreateTodo: role === 'owner',
    canSeeCustomerContact: role !== 'production_manager',
    canDiscard: roleCanDiscard(role),
    logout: async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem(USER_KEY)
      clearDeviceCache()
      window.location.href = '/login'
    },
  }

  return (
    <AuthContext.Provider value={value}>
      <SWRConfig value={swrConfig}>{children}</SWRConfig>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside a logged-in page')
  return ctx
}
