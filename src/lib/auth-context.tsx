'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Role, ROLE_LABELS, canAccessPage, canDelete as roleCanDelete, isRole } from '@/lib/roles'

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
  currentEmployee: CurrentUser | null
  role: Role
  hasAccess: (path: string) => boolean
  canCreateTodo: boolean
  canSeeCustomerContact: boolean
  canDelete: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (isLoginPage) return
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then((me: CurrentUser | null) => {
        if (!me || !isRole(me.role)) {
          window.location.href = `/login?next=${encodeURIComponent(pathname)}`
          return
        }
        setUser(me)
        setLoaded(true)
      })
  }, [isLoginPage])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  if (isLoginPage) return <>{children}</>
  if (!loaded) return null
  if (!user) return null

  const role = user.role
  const value: AuthContextType = {
    currentEmployee: user,
    role,
    hasAccess: (path: string) => canAccessPage(role, path),
    canCreateTodo: role === 'owner',
    canSeeCustomerContact: role !== 'production_manager',
    canDelete: roleCanDelete(role),
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside a logged-in page')
  return ctx
}
