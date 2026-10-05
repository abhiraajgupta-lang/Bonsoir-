'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, IndianRupee } from 'lucide-react'
import { PRODUCTION_STAGES, PAYMENT_METHODS, TRIAL_OUTCOMES, formatCurrency, formatDate, formatDateTime, getDeliveryRisk } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'

interface OrderData {
  id: string
  orderNumber: number
  status: string
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
  }
  jobs: Array<{
    id: string
    jobNumber: string
    garmentType: string
    currentStage: string
    fabricDetails: string | null
    designNotes: string | null
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
  const { canSeeCustomerContact } = useAuth()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentRef, setPaymentRef] = useState('')
  const [showTrial, setShowTrial] = useState<string | null>(null)
  const [trialDate, setTrialDate] = useState(new Date().toISOString().slice(0, 10))
  const [trialNotes, setTrialNotes] = useState('')
  const [trialOutcome, setTrialOutcome] = useState('Pending')
  const [alterationDetails, setAlterationDetails] = useState('')

  const load = () => {
    fetch(`/api/orders/${id}`).then(r => r.json()).then(setOrder)
  }

  useEffect(() => { load() }, [id])

  if (!order) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading...</div></div>
  }

  const changeStage = async (jobId: string, newStage: string) => {
    await fetch(`/api/jobs/${jobId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    load()
  }

  const recordPayment = async () => {
    if (paymentAmount <= 0) return
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        amount: paymentAmount,
        method: paymentMethod,
        receiptReference: paymentRef,
      }),
    })
    setShowPayment(false)
    setPaymentAmount(0)
    setPaymentRef('')
    load()
  }

  const recordTrial = async (jobId: string) => {
    await fetch('/api/trials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        trialDate,
        notes: trialNotes,
        outcome: trialOutcome,
        alterationDetails: trialOutcome === 'Needs Alteration' ? alterationDetails : undefined,
      }),
    })
    setShowTrial(null)
    setTrialNotes('')
    setTrialOutcome('Pending')
    setAlterationDetails('')
    load()
  }

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
          <h1 className="text-2xl font-semibold">Order #{order.orderNumber}</h1>
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
        <div className="mt-2 sm:mt-0 flex items-center gap-2">
          <span className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${
            order.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {order.status}
          </span>
        </div>
      </div>

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

                  {job.currentStage !== 'Delivered' && (
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
                        className="px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium"
                      >
                        Save Trial
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
          {order.balanceDue > 0 && (
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
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90"
            >
              Save Payment
            </button>
          </div>
        )}

        {order.payments.length > 0 ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
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
  )
}
