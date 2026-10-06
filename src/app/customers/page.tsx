'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, AlertCircle, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency } from '@/lib/constants'

interface Customer {
  id: string
  customerId: string
  name: string
  countryCode: string
  mobile: string
  email: string | null
  city: string | null
  createdAt: string
  orders: Array<{ id: string; totalAmount: number; status: string }>
  _count: { orders: number }
}

const COUNTRY_CODES = [
  { code: '+91', label: 'IN +91', digits: 10 },
  { code: '+1', label: 'US +1', digits: 10 },
  { code: '+44', label: 'UK +44', digits: 10 },
  { code: '+971', label: 'AE +971', digits: 9 },
  { code: '+61', label: 'AU +61', digits: 9 },
  { code: '+65', label: 'SG +65', digits: 8 },
  { code: '+974', label: 'QA +974', digits: 8 },
  { code: '+966', label: 'SA +966', digits: 9 },
]

export default function CustomersPage() {
  const { canDelete } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', countryCode: '+91', mobile: '', email: '', city: '' })
  const [mobileError, setMobileError] = useState('')

  const load = (q = '') => {
    fetch(`/api/customers?search=${encodeURIComponent(q)}`).then(r => r.json()).then(setCustomers)
  }

  useEffect(() => { load() }, [])

  const deleteCustomer = async (c: Customer) => {
    if (!confirm(`Delete customer ${c.name} (${c.customerId})? This also deletes their ${c._count.orders} order(s), estimates and measurements. This cannot be undone.`)) return
    const res = await fetch(`/api/customers/${c.id}`, { method: 'DELETE' })
    if (res.ok) load(search)
    else alert('Failed to delete customer')
  }

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const validateMobile = (mobile: string, countryCode: string) => {
    const digits = mobile.replace(/\D/g, '')
    const cc = COUNTRY_CODES.find(c => c.code === countryCode)
    const expectedDigits = cc?.digits || 10
    if (digits.length > 0 && digits.length !== expectedDigits) {
      setMobileError(`Expected ${expectedDigits} digits for ${countryCode}, got ${digits.length}`)
    } else {
      setMobileError('')
    }
  }

  const createCustomer = async () => {
    if (!form.name || !form.mobile) return
    const digits = form.mobile.replace(/\D/g, '')
    const cc = COUNTRY_CODES.find(c => c.code === form.countryCode)
    if (cc && digits.length !== cc.digits) {
      setMobileError(`Expected ${cc.digits} digits for ${form.countryCode}, got ${digits.length}`)
      return
    }
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, mobile: digits }),
    })
    if (res.ok) {
      setShowNew(false)
      setForm({ name: '', countryCode: '+91', mobile: '', email: '', city: '' })
      setMobileError('')
      load(search)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Customer
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold">New Customer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Full Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <div className="flex gap-2">
              <select
                value={form.countryCode}
                onChange={e => {
                  setForm(p => ({ ...p, countryCode: e.target.value }))
                  validateMobile(form.mobile, e.target.value)
                }}
                className="w-28 px-2 py-2 text-sm border border-border rounded-lg bg-background shrink-0"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Mobile Number *"
                  value={form.mobile}
                  onChange={e => {
                    setForm(p => ({ ...p, mobile: e.target.value }))
                    validateMobile(e.target.value, form.countryCode)
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 ${mobileError ? 'border-red' : 'border-border'}`}
                />
              </div>
            </div>
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <input type="text" placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
          </div>
          {mobileError && (
            <div className="flex items-center gap-1.5 text-xs text-red">
              <AlertCircle className="w-3.5 h-3.5" />
              {mobileError}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={createCustomer} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium">Create</button>
            <button onClick={() => { setShowNew(false); setMobileError('') }} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, mobile, or customer ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {customers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {search ? 'No customers match your search.' : 'No customers yet.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Mobile</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden md:table-cell">City</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Orders</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Total Spend</th>
                {canDelete && <th className="px-4 py-3 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const totalSpend = c.orders.reduce((sum, o) => sum + o.totalAmount, 0)
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/customers/${c.id}`} className="text-sm font-medium hover:underline">{c.name}</Link>
                      <p className="text-xs text-muted-foreground">{c.customerId}</p>
                    </td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell">{c.countryCode} {c.mobile}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{c.city || '—'}</td>
                    <td className="px-4 py-3 text-sm">{c._count.orders}</td>
                    <td className="px-4 py-3 text-sm font-medium hidden lg:table-cell">{formatCurrency(totalSpend)}</td>
                    {canDelete && (
                      <td className="px-4 py-3">
                        <button onClick={() => deleteCustomer(c)} title="Delete customer" className="text-muted-foreground hover:text-red p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
