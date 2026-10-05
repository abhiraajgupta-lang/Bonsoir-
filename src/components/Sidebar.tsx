'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Palette,
  FileText,
  Factory,
  Scissors,
  Footprints,
  ListTodo,
  Menu,
  X,
  UserCircle,
  UsersRound,
  LogOut,
} from 'lucide-react'
import { useAuth, ROLE_LABELS, Employee } from '@/lib/auth-context'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/styles', label: 'Styles', icon: Palette },
  { href: '/estimates', label: 'Estimates', icon: FileText },
  { href: '/production', label: 'Production', icon: Factory },
  { href: '/trials', label: 'Trials', icon: Scissors },
  { href: '/footfall', label: 'Footfall', icon: Footprints },
  { href: '/todos', label: 'To-Do', icon: ListTodo },
  { href: '/employees', label: 'Employees', icon: UsersRound },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { currentEmployee, setCurrentEmployee, hasAccess, role } = useAuth()
  const [showPicker, setShowPicker] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    if (showPicker) {
      fetch('/api/employees').then(r => r.json()).then(setEmployees)
    }
  }, [showPicker])

  const filteredNav = navItems.filter(item => {
    if (!currentEmployee) return true
    if (item.href === '/employees') return role === 'owner'
    return hasAccess(item.href)
  })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-accent text-accent-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-56 bg-accent text-accent-foreground flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <Link href="/" className="text-lg font-semibold tracking-wide">
            BONSOIR
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {filteredNav.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors"
          >
            <UserCircle className="w-4.5 h-4.5 shrink-0" />
            <div className="flex-1 text-left truncate">
              {currentEmployee ? (
                <>
                  <p className="text-xs font-medium text-white truncate">{currentEmployee.name}</p>
                  <p className="text-[10px] text-white/50">{ROLE_LABELS[role] || role}</p>
                </>
              ) : (
                <p className="text-xs">Owner (no login)</p>
              )}
            </div>
          </button>
        </div>

        {showPicker && (
          <div className="absolute bottom-16 left-2 right-2 bg-card text-foreground rounded-xl border border-border shadow-xl max-h-72 overflow-y-auto z-50">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-semibold">Switch User</p>
            </div>
            <div className="p-1">
              <button
                onClick={() => { setCurrentEmployee(null); setShowPicker(false) }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors ${!currentEmployee ? 'bg-muted font-medium' : ''}`}
              >
                <p className="font-medium">Owner</p>
                <p className="text-xs text-muted-foreground">Full access</p>
              </button>
              {employees.filter(e => e.active).map(emp => (
                <button
                  key={emp.id}
                  onClick={() => { setCurrentEmployee(emp); setShowPicker(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors ${currentEmployee?.id === emp.id ? 'bg-muted font-medium' : ''}`}
                >
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[emp.role as keyof typeof ROLE_LABELS] || emp.role}</p>
                </button>
              ))}
              {employees.filter(e => e.active).length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No employees added yet. Go to Employees tab to add.</p>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
