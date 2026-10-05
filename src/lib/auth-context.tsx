'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Role = 'owner' | 'store_manager' | 'production_manager' | 'designer'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  store_manager: 'Store Manager',
  production_manager: 'Production Manager',
  designer: 'Designer / Merchandiser',
}

export interface Employee {
  id: string
  name: string
  role: string
  mobile: string | null
  email: string | null
  active: boolean
}

interface AuthContextType {
  currentEmployee: Employee | null
  setCurrentEmployee: (emp: Employee | null) => void
  role: Role
  hasAccess: (path: string) => boolean
  canCreateTodo: boolean
  canSeeCustomerContact: boolean
}

const ROLE_ALLOWED_PATHS: Record<Role, string[]> = {
  owner: ['/', '/orders', '/customers', '/styles', '/estimates', '/production', '/trials', '/footfall', '/todos', '/employees'],
  store_manager: ['/', '/orders', '/customers', '/styles', '/estimates', '/production', '/trials', '/footfall', '/todos'],
  production_manager: ['/orders'],
  designer: ['/styles'],
}

const AuthContext = createContext<AuthContextType>({
  currentEmployee: null,
  setCurrentEmployee: () => {},
  role: 'owner',
  hasAccess: () => true,
  canCreateTodo: true,
  canSeeCustomerContact: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentEmployee, setCurrentEmployeeState] = useState<Employee | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bonsoir_employee')
      if (stored) setCurrentEmployeeState(JSON.parse(stored))
    } catch {}
    setLoaded(true)
  }, [])

  const setCurrentEmployee = (emp: Employee | null) => {
    setCurrentEmployeeState(emp)
    if (emp) {
      localStorage.setItem('bonsoir_employee', JSON.stringify(emp))
    } else {
      localStorage.removeItem('bonsoir_employee')
    }
  }

  const role = (currentEmployee?.role as Role) || 'owner'

  const hasAccess = (path: string) => {
    if (!currentEmployee) return true
    const allowed = ROLE_ALLOWED_PATHS[role] || []
    return allowed.some(p => p === '/' ? path === '/' : path.startsWith(p))
  }

  const canCreateTodo = role === 'owner'
  const canSeeCustomerContact = role !== 'production_manager'

  if (!loaded) return null

  return (
    <AuthContext.Provider value={{ currentEmployee, setCurrentEmployee, role, hasAccess, canCreateTodo, canSeeCustomerContact }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
