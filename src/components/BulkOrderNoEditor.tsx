'use client'

import { useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { Check, X } from 'lucide-react'
import { send } from '@/lib/api'
import { formatDate } from '@/lib/constants'
import { OrderNoBadge } from '@/components/OrderNoBadge'

interface MissingOrder {
  id: string
  orderNumber: number
  createdAt: string
  status: string
  customer: { name: string }
  jobs: Array<{ garmentType: string }>
}

type RowState = { value: string; error?: string; saving?: boolean; saved?: string }

export function BulkOrderNoEditor({ orders, onClose }: { orders: MissingOrder[]; onClose: () => void }) {
  const { mutate } = useSWRConfig()
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  // Keep the list fixed while editing so rows don't jump as they get saved.
  const [list] = useState(orders)

  const setRow = (id: string, patch: Partial<RowState>) =>
    setRows(r => ({ ...r, [id]: { ...{ value: '' }, ...r[id], ...patch } }))

  const focusNext = (idx: number) => {
    const next = list.slice(idx + 1).find(o => !rows[o.id]?.saved)
    if (next) inputs.current[next.id]?.focus()
  }

  const save = async (o: MissingOrder, idx: number) => {
    const row = rows[o.id]
    const value = row?.value.trim()
    if (!value || row?.saving) return
    setRow(o.id, { saving: true, error: undefined })
    const res = await send<{ internalOrderNo: string }>(`/api/orders/${o.id}`, 'PUT', { internalOrderNo: value })
    if (!res.ok) return setRow(o.id, { saving: false, error: res.error || 'Could not save' })
    setRow(o.id, { saving: false, saved: res.data?.internalOrderNo ?? value.toUpperCase() })
    focusNext(idx)
  }

  const close = () => {
    mutate(k => typeof k === 'string' && /^\/api\/(orders|estimates|jobs|dashboard|customers)/.test(k))
    onClose()
  }

  const savedCount = list.filter(o => rows[o.id]?.saved).length

  return (
    <div className="bg-card border-2 border-accent/80 rounded-xl mb-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 border-b border-border">
        <div>
          <h2 className="text-base font-semibold">Add internal order numbers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Type the number and press <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px]">Enter</kbd> — it saves and jumps to the next order. It also updates the linked estimate and every piece.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tabular-nums">{savedCount} / {list.length} done</span>
          <button onClick={close} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted">
            <X className="w-4 h-4" /> Done
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Every order already has an internal order number.</p>
      ) : (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-muted/60 sticky top-0 z-10">
              <tr className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2.5 w-24">Order</th>
                <th className="px-4 py-2.5 w-28">Date</th>
                <th className="px-4 py-2.5">Customer · Garments</th>
                <th className="px-4 py-2.5 w-72">Internal Order No.</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o, idx) => {
                const row = rows[o.id]
                return (
                  <tr key={o.id} className={`border-t border-border align-top ${row?.saved ? 'bg-green/5' : ''}`}>
                    <td className="px-4 py-3 text-sm font-semibold tabular-nums">#{o.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{o.customer.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{o.jobs.map(j => j.garmentType).join(', ') || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {row?.saved ? (
                        <div className="flex items-center gap-2 py-1">
                          <OrderNoBadge no={row.saved} />
                          <Check className="w-4 h-4 text-green" aria-label="Saved" />
                        </div>
                      ) : (
                        <form onSubmit={e => { e.preventDefault(); save(o, idx) }} className="flex gap-2">
                          <input
                            ref={el => { inputs.current[o.id] = el }}
                            aria-label={`Internal order number for order ${o.orderNumber}`}
                            maxLength={30}
                            autoComplete="off"
                            placeholder="e.g. 2041"
                            value={row?.value ?? ''}
                            onChange={e => setRow(o.id, { value: e.target.value.toUpperCase(), error: undefined })}
                            className={`flex-1 min-w-0 px-3 py-1.5 text-sm font-semibold tracking-wide border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20 ${row?.error ? 'border-red' : 'border-border'}`}
                          />
                          <button
                            disabled={!row?.value.trim() || row?.saving}
                            className="px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium disabled:opacity-40"
                          >
                            {row?.saving ? 'Saving…' : 'Save'}
                          </button>
                        </form>
                      )}
                      {row?.error && <p className="text-xs text-red mt-1">{row.error}</p>}
                    </td>
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
