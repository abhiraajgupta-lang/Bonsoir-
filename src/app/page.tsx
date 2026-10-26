'use client'

import useSWR from 'swr'
import { OrderNoBadge } from '@/components/OrderNoBadge'
import { ShoppingBag, Scissors, Truck, AlertTriangle, IndianRupee, TrendingUp, CalendarDays, type LucideIcon } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/constants'
import { daysFromToday, relativeDay } from '@/components/TrialDate'
import Link from 'next/link'

interface AttentionItem {
  jobNumber: string
  orderNumber: number
  internalOrderNo: string | null
  customerName: string
  garmentType: string
  currentStage: string
  reason: string
  priority: number
  daysLeft: number
}

interface SalePeriod {
  booked: number
  orders: number
  collected: number
}

interface UpcomingTrial {
  orderId: string
  orderNumber: number
  internalOrderNo: string | null
  trialDate: string
  customerName: string
  garments: string[]
  readyForTrial: number
  pieces: number
}

interface DashboardData {
  activeOrders: number
  trialsToday: number
  deliveriesToday: number
  overdue: number
  paymentsPending: number
  paymentsPendingOrders: number
  sales: { today: SalePeriod; month: SalePeriod }
  upcomingTrials: UpcomingTrial[]
  attentionItems: AttentionItem[]
}

export default function Dashboard() {
  const { data } = useSWR<DashboardData>('/api/dashboard', { refreshInterval: 120000 })

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' })
  const cards = [
    { label: 'Active Orders', value: data.activeOrders, icon: ShoppingBag, color: 'text-foreground' },
    { label: 'Trials Today', value: data.trialsToday, icon: Scissors, color: 'text-foreground' },
    { label: 'Deliveries Today', value: data.deliveriesToday, icon: Truck, color: 'text-foreground' },
    { label: 'Overdue', value: data.overdue, icon: AlertTriangle, color: data.overdue > 0 ? 'text-red' : 'text-foreground' },
  ]

  const trialsByDay = data.upcomingTrials.reduce<Record<string, UpcomingTrial[]>>((acc, t) => {
    const key = relativeDay(daysFromToday(t.trialDate))
    ;(acc[key] ||= []).push(t)
    return acc
  }, {})

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <SaleCard title="Today's Sale" icon={TrendingUp} period={data.sales.today} />
        <SaleCard title={`${monthName} Sale`} icon={CalendarDays} period={data.sales.month} />
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Payments</span>
          </div>
          <p className={`text-3xl font-semibold tabular-nums ${data.paymentsPending > 0 ? 'text-red' : ''}`}>{formatCurrency(data.paymentsPending)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Due on {data.paymentsPendingOrders} order{data.paymentsPendingOrders !== 1 ? 's' : ''} (incl. delivered)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <c.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
            </div>
            <p className={`text-2xl font-semibold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Trials — next 3 days</h2>
          <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">All orders →</Link>
        </div>
        {data.upcomingTrials.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No trials scheduled for today or the next two days.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(trialsByDay).map(([day, trials]) => (
              <div key={day}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {day} · {formatDate(trials[0].trialDate)} · {trials.length} trial{trials.length !== 1 ? 's' : ''}
                </p>
                <div className="grid gap-2">
                  {trials.map(t => (
                    <Link
                      key={t.orderId}
                      href={`/orders/${t.orderId}`}
                      className={`flex items-center justify-between gap-3 bg-card border border-border border-l-4 ${day === 'Today' ? 'border-l-amber' : 'border-l-border'} rounded-xl p-4 hover:shadow-sm transition-shadow`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <OrderNoBadge no={t.internalOrderNo} />
                          <span className="text-sm font-semibold">{t.customerName}</span>
                          <span className="text-xs text-muted-foreground">Order #{t.orderNumber}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{t.garments.join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-medium ${t.readyForTrial === t.pieces ? 'text-green' : ''}`}>
                          {t.readyForTrial}/{t.pieces} ready
                        </p>
                        <p className="text-xs text-muted-foreground">for trial</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
                      <OrderNoBadge no={item.internalOrderNo} />
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

function SaleCard({ title, icon: Icon, period }: { title: string; icon: LucideIcon; period: SalePeriod }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
      </div>
      <p className="text-3xl font-semibold tabular-nums">{formatCurrency(period.booked)}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {period.orders} order{period.orders !== 1 ? 's' : ''} booked · <span className="text-green font-medium">{formatCurrency(period.collected)} collected</span>
      </p>
    </div>
  )
}
