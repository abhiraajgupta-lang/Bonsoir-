'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, Scissors, Truck, AlertTriangle, IndianRupee } from 'lucide-react'
import { formatCurrency } from '@/lib/constants'
import Link from 'next/link'

interface AttentionItem {
  jobNumber: string
  orderNumber: number
  customerName: string
  garmentType: string
  currentStage: string
  reason: string
  priority: number
  daysLeft: number
}

interface DashboardData {
  activeOrders: number
  trialsToday: number
  deliveriesToday: number
  overdue: number
  paymentsPending: number
  attentionItems: AttentionItem[]
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const cards = [
    { label: 'Active Orders', value: data.activeOrders, icon: ShoppingBag, color: 'text-foreground' },
    { label: 'Trials Today', value: data.trialsToday, icon: Scissors, color: 'text-foreground' },
    { label: 'Deliveries Today', value: data.deliveriesToday, icon: Truck, color: 'text-foreground' },
    { label: 'Overdue', value: data.overdue, icon: AlertTriangle, color: data.overdue > 0 ? 'text-red' : 'text-foreground' },
    { label: 'Payments Pending', value: formatCurrency(data.paymentsPending), icon: IndianRupee, color: 'text-foreground' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
            </div>
            <p className={`text-2xl font-semibold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Attention Required</h2>

        {data.attentionItems.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            All orders are on track. Nothing needs immediate attention.
          </div>
        ) : (
          <div className="grid gap-3">
            {data.attentionItems.map(item => {
              const borderColor = item.daysLeft < 0 || item.priority >= 3
                ? 'border-l-red'
                : 'border-l-amber'

              return (
                <Link
                  key={item.jobNumber}
                  href={`/orders`}
                  className={`flex items-center justify-between bg-card border border-border border-l-4 ${borderColor} rounded-xl p-4 hover:shadow-sm transition-shadow`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">Job #{item.jobNumber}</span>
                      <span className="text-xs text-muted-foreground">Order #{item.orderNumber}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.customerName} · {item.garmentType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{item.reason}</p>
                    <p className="text-xs text-muted-foreground">Stage: {item.currentStage}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
