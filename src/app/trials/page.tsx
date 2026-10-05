'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { formatDate } from '@/lib/constants'

interface Trial {
  id: string
  trialDate: string
  notes: string | null
  outcome: string
  job: {
    id: string
    jobNumber: string
    garmentType: string
    order: {
      id: string
      orderNumber: number
      customer: { name: string; mobile: string }
    }
  }
  alterations: Array<{
    id: string
    details: string
    status: string
  }>
}

export default function TrialsPage() {
  const [trials, setTrials] = useState<Trial[]>([])
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    fetch('/api/trials').then(r => r.json()).then(setTrials)
  }, [])

  const filtered = filter === 'All' ? trials : trials.filter(t => t.outcome === filter)

  const outcomeColors: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-emerald-100 text-emerald-700',
    'Needs Alteration': 'bg-amber-100 text-amber-700',
    'Needs Re-Make': 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Trials & Alterations</h1>

      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 overflow-x-auto">
        {['All', 'Pending', 'Approved', 'Needs Alteration', 'Needs Re-Make'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              filter === f ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          No trials found. Record a trial from an order&apos;s job detail page.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Scissors className="w-4 h-4 text-muted-foreground" />
                    <Link href={`/orders/${t.job.order.id}`} className="text-sm font-semibold hover:underline">
                      Job #{t.job.jobNumber}
                    </Link>
                    <span className="text-sm text-muted-foreground">{t.job.garmentType}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeColors[t.outcome] || 'bg-gray-100 text-gray-600'}`}>
                      {t.outcome}
                    </span>
                  </div>
                  <p className="text-sm">{t.job.order.customer.name}</p>
                  <p className="text-xs text-muted-foreground">Order #{t.job.order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatDate(t.trialDate)}</p>
                </div>
              </div>

              {t.notes && (
                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">{t.notes}</p>
              )}

              {t.alterations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Alterations</p>
                  {t.alterations.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-sm py-1">
                      <span>{a.details}</span>
                      <span className={`text-xs font-medium ${a.status === 'Completed' ? 'text-green' : 'text-amber'}`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
