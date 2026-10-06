'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate, getDeliveryRisk } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'

interface Order {
  id: string
  orderNumber: number
  status: string
  eventName: string | null
  deliveryDate: string
  channel: string
  totalAmount: number
  balanceDue: number
  createdAt: string
  customer: { id: string; name: string; customerId: string; mobile: string }
  jobs: Array<{ id: string; garmentType: string; currentStage: string; deliveryDate: string | null; style: { name: string } | null }>
}

export default function OrdersPage() {
  const { canSeeCustomerContact, canDelete } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const load = () => {
    fetch(`/api/orders?status=${filter}`)
      .then(r => r.json())
      .then(setOrders)
  }

  useEffect(load, [filter])

  const deleteOrder = async (order: Order) => {
    if (!confirm(`Delete Order #${order.orderNumber} for ${order.customer.name}? All its jobs, trials and payments will be removed. This cannot be undone.`)) return
    const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' })
    if (res.ok) load()
    else alert('Failed to delete order')
  }

  const filtered = search
    ? orders.filter(o =>
        o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        o.orderNumber.toString().includes(search) ||
        o.customer.mobile.includes(search)
      )
    : orders

  const statusFilters = ['All', 'Active', 'Completed']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">Orders are created from Estimates</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === s ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {orders.length === 0 ? (
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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Order</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden md:table-cell">Items</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Delivery</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Risk</th>
                {canDelete && <th className="px-4 py-3 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
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
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/orders/${order.id}`} className="text-sm font-semibold hover:underline">
                        #{order.orderNumber}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{order.channel}</span>
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
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {order.status !== 'Completed' && (
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${riskDot[worstRisk]}`} />
                      )}
                    </td>
                    {canDelete && (
                      <td className="px-4 py-3">
                        <button onClick={() => deleteOrder(order)} title="Delete order" className="text-muted-foreground hover:text-red p-1">
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
