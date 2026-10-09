'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, IndianRupee, Ban, Printer } from 'lucide-react'
import { printTailorSheets, TailorSheet } from '@/lib/tailorSheet'
import useSWR from 'swr'
import { send, useBusy } from '@/lib/api'
import { useDiscard } from '@/components/useDiscard'
import { PRODUCTION_STAGES, PAYMENT_METHODS, TRIAL_OUTCOMES, formatCurrency, formatDate, formatDateTime, getDeliveryRisk } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'

type MeasurementSet = { id: string; customerId: string; version: number; date: string; notes: string | null } & Record<string, unknown>

interface OrderData {
  id: string
  orderNumber: number
  status: string
  discardedAt: string | null
  discardedBy: string | null
  eventName: string | null
  deliveryDate: string
  salesperson: string | null
  totalAmount: number
  advancePaid: number
  balanceDue: number
  notes: string | null
  createdAt: string
  customer: {
    id: string
    customerId: string
    name: string
    mobile: string
    measurements: MeasurementSet[]
  }
  jobs: Array<{
    id: string
    jobNumber: string
    garmentType: string
    currentStage: string
    fabricDetails: string | null
    designNotes: string | null
    jobNotes: string | null
    measurementSet: MeasurementSet | null
    amount: number
    deliveryDate: string | null
    style: { name: string; styleCode: string } | null
    stageHistory: Array<{ id: string; stage: string; notes: string | null; worker: string | null; createdAt: string }>
    trials: Array<{
      id: string
      trialDate: string
      notes: string | null
      outcome: string
      alterations: Array<{ id: string; details: string; status: string }>
    }>
  }>
  payments: Array<{
    id: string
    amount: number
    method: string
    receiptReference: string | null
    notes: string | null
    createdAt: string
  }>
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { canSeeCustomerContact, canDiscard } = useAuth()
  const { data: order, mutate: load } = useSWR<OrderData>(`/api/orders/${id}`)
  const discard = useDiscard()
  const [saving, runSave] = useBusy()
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentRef, setPaymentRef] = useState('')
  const [showTrial, setShowTrial] = useState<string | null>(null)
  const [trialDate, setTrialDate] = useState(new Date().toISOString().slice(0, 10))
  const [trialNotes, setTrialNotes] = useState('')
  const [trialOutcome, setTrialOutcome] = useState('Pending')
  const [alterationDetails, setAlterationDetails] = useState('')

  if (!order) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading...</div></div>
  }

  const isDiscarded = order.status === 'Discarded'

  const printForTailor = () => {
    const sheets = new Map<string, TailorSheet>()
    for (const job of order.jobs.filter(j => j.currentStage !== 'Delivered')) {
      const ownerId = job.measurementSet?.customerId ?? order.customer.id
      const isMain = ownerId === order.customer.id
      const forName = job.jobNotes?.startsWith('For: ') ? job.jobNotes.slice(5) : null
      if (!sheets.has(ownerId)) {
        sheets.set(ownerId, {
          customerName: isMain ? order.customer.name : forName || 'Family member',
          customerCode: isMain && canSeeCustomerContact ? order.customer.customerId : null,
          measurement: job.measurementSet ?? (isMain ? order.customer.measurements?.[0] ?? null : null),
          garments: [],
        })
      }
      sheets.get(ownerId)!.garments.push({
        jobNumber: job.jobNumber,
        orderNumber: order.orderNumber,
        garmentType: job.garmentType,
        style: job.style ? [job.style.name, job.style.styleCode].filter(Boolean).join(' — ') : null,
        fabric: job.fabricDetails,
        designNotes: job.designNotes,
        jobNotes: forName ? null : job.jobNotes,
        deliveryDate: job.deliveryDate || order.deliveryDate,
      })
    }
    if (sheets.size === 0) return alert('All garments in this order are already delivered.')
    printTailorSheets([...sheets.values()])
  }

  const changeStage = async (jobId: string, newStage: string) => {
    load({ ...order, jobs: order.jobs.map(j => (j.id === jobId ? { ...j, currentStage: newStage } : j)) }, { revalidate: false })
    const res = await send(`/api/jobs/${jobId}/stage`, 'POST', { stage: newStage })
    if (!res.ok) alert(res.error)
    load()
  }

  const recordPayment = () => runSave(async () => {
    if (paymentAmount <= 0) return
    const res = await send('/api/payments', 'POST', {
      orderId: order.id,
      amount: paymentAmount,
      method: paymentMethod,
      receiptReference: paymentRef,
    })
    if (!res.ok) return alert(res.error)
    setShowPayment(false)
    setPaymentAmount(0)
    setPaymentRef('')
    load()
  })

  const recordTrial = (jobId: string) => runSave(async () => {
    const res = await send('/api/trials', 'POST', {
      jobId,
      trialDate,
      notes: trialNotes,
      outcome: trialOutcome,
      alterationDetails: trialOutcome === 'Needs Alteration' ? alterationDetails : undefined,
    })
    if (!res.ok) return alert(res.error)
    setShowTrial(null)
    setTrialNotes('')
    setTrialOutcome('Pending')
    setAlterationDetails('')
    load()
  })

  const riskColors = { green: 'text-green', amber: 'text-amber', red: 'text-red' }
  const riskLabels = { green: 'On Track', amber: 'At Risk', red: 'Overdue / At Risk' }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/orders" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${isDiscarded ? 'line-through text-muted-foreground' : ''}`}>Order #{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {canSeeCustomerContact ? (
              <Link href={`/customers/${order.customer.id}`} className="hover:underline">{order.customer.name}</Link>
            ) : (
              <span>{order.customer.name}</span>
            )}
            {canSeeCustomerContact && <>{' · '}{order.customer.customerId}</>}
            {order.eventName && ` · ${order.eventName}`}
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex flex-wrap items-center gap-2">
          {!isDiscarded && (
            <button
              onClick={printForTailor}
              className="flex items-center gap-1 px-3 py-1 border border-border rounded-lg text-xs font-medium hover:bg-muted"
            >
              <Printer className="w-3.5 h-3.5" /> Tailor Sheet
            </button>
          )}
          {canDiscard && order.status === 'Active' && (
            <button
              onClick={() => discard('order', order.id, `Order #${order.orderNumber}`)}
              className="flex items-center gap-1 px-3 py-1 border border-border rounded-lg text-xs font-medium text-red hover:bg-red/10"
            >
              <Ban className="w-3.5 h-3.5" /> Discard
            </button>
          )}
          <span className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${
            order.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : isDiscarded ? 'bg-red/10 text-red' : 'bg-gray-100 text-gray-600'
          }`}>
            {order.status}
          </span>
        </div>
      </div>

      {isDiscarded && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm">
          <Ban className="w-4 h-4 text-red mt-0.5 shrink-0" />
          <p>
            This order was discarded{order.discardedBy ? ` by ${order.discardedBy}` : ''}
            {order.discardedAt ? ` on ${formatDate(order.discardedAt)}` : ''} and is no longer in making.
          </p>
        </div>
      )}

      <div className={isDiscarded ? 'opacity-60' : ''}>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Delivery</p>
          <p className="text-sm font-semibold mt-1">{formatDate(order.deliveryDate)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Total</p>
          <p className="text-sm font-semibold mt-1">{formatCurrency(order.totalAmount)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Paid</p>
          <p className="text-sm font-semibold mt-1 text-green">{formatCurrency(order.advancePaid)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Balance</p>
          <p className={`text-sm font-semibold mt-1 ${order.balanceDue > 0 ? 'text-red' : ''}`}>{formatCurrency(order.balanceDue)}</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Jobs ({order.jobs.length})</h2>

        <div className="space-y-4">
          {order.jobs.map(job => {
            const risk = getDeliveryRisk(job.deliveryDate || order.deliveryDate, job.currentStage)
            const currentIdx = PRODUCTION_STAGES.indexOf(job.currentStage as typeof PRODUCTION_STAGES[number])
            const progress = ((currentIdx + 1) / PRODUCTION_STAGES.length) * 100

            return (
              <div key={job.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">#{job.jobNumber}</h3>
                        <span className="text-sm text-muted-foreground">{job.garmentType}</span>
                        {job.style && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">{job.style.styleCode || job.style.name}</span>
                        )}
                      </div>
                      {job.fabricDetails && <p className="text-xs text-muted-foreground mt-1">Fabric: {job.fabricDetails}</p>}
                      {job.designNotes && <p className="text-xs text-muted-foreground">Notes: {job.designNotes}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold ${riskColors[risk]}`}>{riskLabels[risk]}</span>
                      <p className="text-sm font-medium mt-0.5">{formatCurrency(job.amount)}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{job.currentStage}</span>
                      <span className="text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          risk === 'red' ? 'bg-red' : risk === 'amber' ? 'bg-amber' : 'bg-green'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {job.currentStage !== 'Delivered' && !isDiscarded && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">Change Stage</label>
                        <select
                          value={job.currentStage}
                          onChange={e => changeStage(job.id, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
                        >
                          {PRODUCTION_STAGES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      {(job.currentStage === 'Ready for Trial' || job.currentStage === 'Alteration') && (
                        <button
                          onClick={() => setShowTrial(showTrial === job.id ? null : job.id)}
                          className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted whitespace-nowrap self-end"
                        >
                          Record Trial
                        </button>
                      )}
                    </div>
                  )}

                  {showTrial === job.id && (
                    <div className="mt-3 p-3 border border-border rounded-lg space-y-2 bg-muted/50">
                      <h4 className="text-xs font-semibold uppercase">Record Trial</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={trialDate}
                          onChange={e => setTrialDate(e.target.value)}
                          className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background"
                        />
                        <select
                          value={trialOutcome}
                          onChange={e => setTrialOutcome(e.target.value)}
                          className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background"
                        >
                          {TRIAL_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <textarea
                        placeholder="Trial notes..."
                        value={trialNotes}
                        onChange={e => setTrialNotes(e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1.5 text-xs border border-border rounded-lg resize-none bg-background"
                      />
                      {trialOutcome === 'Needs Alteration' && (
                        <textarea
                          placeholder="Alteration details..."
                          value={alterationDetails}
                          onChange={e => setAlterationDetails(e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1.5 text-xs border border-border rounded-lg resize-none bg-background"
                        />
                      )}
                      <button
                        onClick={() => recordTrial(job.id)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium disabled:opacity-40"
                      >
                        {saving ? 'Saving…' : 'Save Trial'}
                      </button>
                    </div>
                  )}

                  {job.stageHistory.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Stage History ({job.stageHistory.length})
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {job.stageHistory.map(sh => (
                          <div key={sh.id} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground w-36 shrink-0">{formatDateTime(sh.createdAt)}</span>
                            <span className="font-medium">{sh.stage}</span>
                            {sh.notes && <span className="text-muted-foreground">— {sh.notes}</span>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {job.trials.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Trials ({job.trials.length})
                      </summary>
                      <div className="mt-2 space-y-2">
                        {job.trials.map(t => (
                          <div key={t.id} className="p-2 bg-muted/50 rounded-lg text-xs">
                            <div className="flex justify-between">
                              <span>{formatDate(t.trialDate)}</span>
                              <span className={`font-medium ${t.outcome === 'Approved' ? 'text-green' : t.outcome === 'Needs Alteration' ? 'text-amber' : 'text-muted-foreground'}`}>
                                {t.outcome}
                              </span>
                            </div>
                            {t.notes && <p className="text-muted-foreground mt-1">{t.notes}</p>}
                            {t.alterations.map(a => (
                              <p key={a.id} className="text-muted-foreground mt-1">Alteration: {a.details} ({a.status})</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Payments</h2>
          {order.balanceDue > 0 && !isDiscarded && (
            <button
              onClick={() => setShowPayment(!showPayment)}
              className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          )}
        </div>

        {showPayment && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 bg-background"
                >
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reference</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
            <button
              onClick={recordPayment}
              disabled={saving}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        )}

        {order.payments.length > 0 ? (
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Method</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 hidden sm:table-cell">Reference</th>
                </tr>
              </thead>
              <tbody>
                {order.payments.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-sm">{p.method}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{p.receiptReference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            No payments recorded yet.
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
