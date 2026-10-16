'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { PackageCheck, Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'
import { OrderNoBadge } from '@/components/OrderNoBadge'

interface DeliveredOrder {
  id: string
  orderNumber: number
  internalOrderNo: string | null
  deliveredAt: string | null
  updatedAt: string
  createdAt: string
  totalAmount: number
  netPayable: number
  balanceDue: number
  customer: { id: string; name: string; mobile: string }
  jobs: Array<{ id: string; garmentType: string }>
}

export default function DeliveredOrdersPage() {
  const { canSeeCustomerContact } = useAuth()
  const { data = [], isLoading } = useSWR<DeliveredOrder[]>('/api/orders?status=Completed')
  const [search, setSearch] = useState('')

  const deliveredOn = (o: DeliveredOrder) => o.deliveredAt ?? o.updatedAt
  const q = search.trim().toLowerCase()
  const orders = [...data]
    .sort((a, b) => deliveredOn(b).localeCompare(deliveredOn(a)))
    .filter(o => !q ||
      o.customer.name.toLowerCase().includes(q) ||
      String(o.orderNumber).includes(q) ||
      (o.internalOrderNo ?? '').toLowerCase().includes(q) ||
      o.customer.mobile.includes(q))
  const unpaid = orders.filter(o => o.balanceDue > 0)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><PackageCheck className="w-6 h-6" /> Delivered Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.length} delivered order{data.length !== 1 ? 's' : ''} · kept here permanently for reference
          </p>
        </div>
        <Link href="/orders" className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted">← Active orders</Link>
      </div>

      {unpaid.length > 0 && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm">
          <strong>{unpaid.length}</strong> delivered order{unpaid.length !== 1 ? 's still have' : ' still has'} a balance due of{' '}
          <strong>{formatCurrency(unpaid.reduce((s, o) => s + o.balanceDue, 0))}</strong>.
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search by order no., customer, mobile…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {orders.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {isLoading ? 'Loading…' : q ? 'No delivered orders match your search.' : 'No delivered orders yet.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-muted/50">
              <tr className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Garments</th>
                <th className="px-4 py-3 whitespace-nowrap">Delivered on</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/40 align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <OrderNoBadge no={o.internalOrderNo} />
                      <Link href={`/orders/${o.id}`} className={`hover:underline ${o.internalOrderNo ? 'text-xs text-muted-foreground font-medium' : 'text-sm font-semibold'}`}>
                        #{o.orderNumber}
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Ordered {formatDate(o.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {canSeeCustomerContact ? (
                      <Link href={`/customers/${o.customer.id}`} className="text-sm font-medium hover:underline">{o.customer.name}</Link>
                    ) : (
                      <span className="text-sm font-medium">{o.customer.name}</span>
                    )}
                    {canSeeCustomerContact && <p className="text-xs text-muted-foreground">{o.customer.mobile}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs">
                    <p className="line-clamp-2">{o.jobs.map(j => j.garmentType).join(', ')}</p>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(deliveredOn(o))}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-medium">{formatCurrency(o.netPayable || o.totalAmount)}</p>
                    {o.balanceDue > 0 ? (
                      <p className="text-xs text-red">Due: {formatCurrency(o.balanceDue)}</p>
                    ) : (
                      <p className="text-xs text-green">Paid</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
