'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Search, Ban, ArrowUpDown } from 'lucide-react'
import { useDiscard } from '@/components/useDiscard'
import { OrderNoBadge } from '@/components/OrderNoBadge'
import { BulkOrderNoEditor } from '@/components/BulkOrderNoEditor'
import { TrialDate } from '@/components/TrialDate'
import { formatCurrency, formatDate, getDeliveryRisk, istDayStart } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'

interface Order {
  id: string
  orderNumber: number
  internalOrderNo: string | null
  status: string
  eventName: string | null
  deliveryDate: string
  trialDate: string | null
  channel: string
  totalAmount: number
  balanceDue: number
  createdAt: string
  customer: { id: string; name: string; customerId: string; mobile: string }
  jobs: Array<{ id: string; garmentType: string; currentStage: string; deliveryDate: string | null; style: { name: string } | null }>
}

export default function OrdersPage() {
  const { canSeeCustomerContact, canDiscard } = useAuth()
  const [filter, setFilter] = useState('Active')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'trial'>(() => {
    try { return localStorage.getItem('bonsoir_orders_sort') === 'trial' ? 'trial' : 'newest' } catch { return 'newest' }
  })
  const changeSort = (v: 'newest' | 'trial') => {
    setSortBy(v)
    try { localStorage.setItem('bonsoir_orders_sort', v) } catch {}
  }
  const { data: orders = [], isLoading } = useSWR<Order[]>(`/api/orders?status=${filter}`, { refreshInterval: 180000 })
  const { data: missingNo = [] } = useSWR<Order[]>(canDiscard ? '/api/orders?missingNo=1' : null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const discard = useDiscard()

  const searched = search
    ? orders.filter(o =>
        o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        o.orderNumber.toString().includes(search) ||
        (o.internalOrderNo ?? '').toLowerCase().includes(search.toLowerCase()) ||
        o.customer.mobile.includes(search)
      )
    : orders

  // Upcoming trials first (closest first), then past trials (most recent first), then orders without one.
  const todayStart = istDayStart().toISOString()
  const trialRank = (o: Order) => (!o.trialDate ? 2 : o.trialDate >= todayStart ? 0 : 1)
  const filtered = sortBy === 'trial'
    ? [...searched].sort((a, b) => {
        const ra = trialRank(a), rb = trialRank(b)
        if (ra !== rb) return ra - rb
        if (ra === 0) return a.trialDate!.localeCompare(b.trialDate!)
        if (ra === 1) return b.trialDate!.localeCompare(a.trialDate!)
        return 0
      })
    : searched
  const firstPastIdx = sortBy === 'trial' ? filtered.findIndex(o => trialRank(o) === 1) : -1

  const statusFilters = [
    { key: 'Active', label: 'Active' },
    { key: 'Discarded', label: 'Discarded' },
    { key: 'Open', label: 'All' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="hidden sm:block text-sm text-muted-foreground">Delivered orders move to the <Link href="/orders/delivered" className="underline underline-offset-2 hover:text-foreground">Delivered Orders</Link> tab</p>
      </div>

      {canDiscard && bulkOpen && (
        <BulkOrderNoEditor orders={missingNo} onClose={() => setBulkOpen(false)} />
      )}
      {canDiscard && !bulkOpen && missingNo.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3">
          <p className="flex-1 text-sm">
            <strong>{missingNo.length}</strong> order{missingNo.length !== 1 ? 's' : ''} {missingNo.length !== 1 ? "don't" : "doesn't"} have an internal order number yet.
          </p>
          <button onClick={() => setBulkOpen(true)} className="self-start sm:self-auto px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90">
            Add order numbers
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order no., customer, mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <ArrowUpDown className="w-4 h-4" />
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            aria-label="Sort orders"
            value={sortBy}
            onChange={e => changeSort(e.target.value as 'newest' | 'trial')}
            className={`px-3 py-2 text-sm border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 ${sortBy === 'trial' ? 'border-accent font-medium' : 'border-border'}`}
          >
            <option value="newest">Newest first</option>
            <option value="trial">Trial date — closest first</option>
          </select>
        </label>
        <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
          {statusFilters.map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                filter === s.key ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
          <Link href="/orders/delivered" className="px-3 py-1.5 text-sm rounded-md whitespace-nowrap text-muted-foreground hover:text-foreground">
            Delivered →
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {isLoading ? 'Loading…' : orders.length === 0 ? (
            <div>
              <p>No orders yet.</p>
              <p className="text-sm mt-1">Create an estimate first, then convert it to an order.</p>
              <Link href="/estimates" className="inline-block mt-3 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium">
                Go to Estimates
              </Link>
            </div>
          ) : 'No orders match your search.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Order</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden md:table-cell">Items</th>
                <th className={`text-left text-xs font-medium uppercase tracking-wide px-4 py-3 whitespace-nowrap ${sortBy === 'trial' ? 'text-foreground' : 'text-muted-foreground'}`}>Trial{sortBy === 'trial' && ' ↑'}</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Delivery</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Risk</th>
                {canDiscard && <th className="px-2 sm:px-4 py-3 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, idx) => {
                const worstRisk = order.jobs.reduce((worst, job) => {
                  const risk = getDeliveryRisk(job.deliveryDate || order.deliveryDate, job.currentStage)
                  if (risk === 'red') return 'red'
                  if (risk === 'amber' && worst !== 'red') return 'amber'
                  return worst
                }, 'green' as 'green' | 'amber' | 'red')

                const riskDot = {
                  green: 'bg-green',
                  amber: 'bg-amber',
                  red: 'bg-red',
                }

                return (
                  <Fragment key={order.id}>
                  {idx === firstPastIdx && (
                    <tr className="bg-muted/60">
                      <td colSpan={20} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Trial date passed
                      </td>
                    </tr>
                  )}
                  <tr className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${order.status === 'Discarded' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <OrderNoBadge no={order.internalOrderNo} />
                        <Link href={`/orders/${order.id}`} className={`hover:underline ${order.status === 'Discarded' ? 'line-through' : ''} ${order.internalOrderNo ? 'text-xs text-muted-foreground font-medium' : 'text-sm font-semibold'}`}>
                          #{order.orderNumber}
                        </Link>
                      </div>
                      {order.status === 'Discarded' && (
                        <span className="lg:hidden ml-1.5 text-[10px] font-semibold uppercase text-red">Discarded</span>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(order.createdAt)}</p>
                        <span className="hidden sm:inline text-xs bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">{order.channel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canSeeCustomerContact ? (
                        <Link href={`/customers/${order.customer.id}`} className="text-sm font-medium hover:underline">
                          {order.customer.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">{order.customer.name}</span>
                      )}
                      {canSeeCustomerContact && (
                        <p className="text-xs text-muted-foreground">{order.customer.mobile}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm">
                        {order.jobs.map(j => j.garmentType).join(', ')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <TrialDate date={order.trialDate} done={order.status !== 'Active'} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm">{formatDate(order.deliveryDate)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{formatCurrency(order.totalAmount)}</p>
                      {order.balanceDue > 0 && (
                        <p className="text-xs text-red">Due: {formatCurrency(order.balanceDue)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        order.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : order.status === 'Discarded'
                          ? 'bg-red/10 text-red'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {order.status === 'Completed' ? 'Delivered' : order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {order.status === 'Active' && (
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${riskDot[worstRisk]}`} />
                      )}
                    </td>
                    {canDiscard && (
                      <td className="px-2 sm:px-4 py-3 text-right">
                        {order.status === 'Active' && (
                          <button
                            onClick={() => discard('order', order.id, `Order #${order.orderNumber}`)}
                            title="Discard order"
                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-red p-1.5 rounded-lg hover:bg-red/10"
                          >
                            <Ban className="w-4 h-4" /><span className="hidden xl:inline">Discard</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
