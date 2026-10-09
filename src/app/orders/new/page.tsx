'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { send, useBusy } from '@/lib/api'
import { Plus, Trash2, Search, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { PAYMENT_METHODS, formatCurrency } from '@/lib/constants'
import { useStyleCategories } from '@/lib/useStyleCategories'

interface Customer {
  id: string
  customerId: string
  name: string
  mobile: string
  email: string | null
  measurements?: MeasurementSet[]
}

interface MeasurementSet {
  id: string
  version: number
  date: string
  chest: number | null
  stomach: number | null
  hips: number | null
  shoulder: number | null
  sleeveLength: number | null
  neck: number | null
  waist: number | null
  trouserLength: number | null
  thigh: number | null
}

interface Style {
  id: string
  styleCode: string | null
  name: string | null
  category: string
  pieces: number
  price: number
}

interface JobInput {
  garmentType: string
  styleId: string | null
  styleName: string
  fabricDetails: string
  designNotes: string
  jobNotes: string
  deliveryDate: string
  measurementSetId: string
  amount: number
}

const STEPS = ['Customer', 'Order Details', 'Garments', 'Payment', 'Review']

export default function NewOrderPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Customer
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', email: '' })

  // Order details
  const [eventName, setEventName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [salesperson, setSalesperson] = useState('')

  // Jobs
  const [jobs, setJobs] = useState<JobInput[]>([
    { garmentType: '', styleId: null, styleName: '', fabricDetails: '', designNotes: '', jobNotes: '', deliveryDate: '', measurementSetId: '', amount: 0 },
  ])
  const { data: styles = [] } = useSWR<Style[]>('/api/styles')
  const { categories } = useStyleCategories()
  const [addingCustomer, runAddCustomer] = useBusy()
  const [styleSearch, setStyleSearch] = useState('')

  // Payment
  const [advancePaid, setAdvancePaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [receiptReference, setReceiptReference] = useState('')

  useEffect(() => {
    if (customerSearch.length >= 2) {
      fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then(r => r.json())
        .then(setCustomerResults)
    } else {
      setCustomerResults([])
    }
  }, [customerSearch])

  const selectCustomer = async (c: Customer) => {
    const res = await fetch(`/api/customers/${c.id}`)
    const full = await res.json()
    setSelectedCustomer(full)
    setCustomerSearch('')
    setCustomerResults([])
  }

  const createCustomer = () => runAddCustomer(async () => {
    if (!newCustomer.name || !newCustomer.mobile) return
    const res = await send<Customer>('/api/customers', 'POST', newCustomer)
    if (!res.ok || !res.data) return alert(res.error)
    await selectCustomer(res.data)
    setShowNewCustomer(false)
    setNewCustomer({ name: '', mobile: '', email: '' })
  })

  const totalAmount = jobs.reduce((sum, j) => sum + (j.amount || 0), 0)
  const balanceDue = totalAmount - advancePaid

  const updateJob = (idx: number, field: string, value: string | number | null) => {
    setJobs(prev => prev.map((j, i) => i === idx ? { ...j, [field]: value } : j))
  }

  const addJob = () => {
    setJobs(prev => [...prev, {
      garmentType: '', styleId: null, styleName: '', fabricDetails: '', designNotes: '',
      jobNotes: '', deliveryDate: '', measurementSetId: '', amount: 0,
    }])
  }

  const removeJob = (idx: number) => {
    if (jobs.length > 1) setJobs(prev => prev.filter((_, i) => i !== idx))
  }

  const selectStyle = (idx: number, style: Style) => {
    updateJob(idx, 'styleId', style.id)
    updateJob(idx, 'styleName', [style.styleCode, style.name].filter(Boolean).join(' - ') || style.category)
    updateJob(idx, 'garmentType', style.category)
    updateJob(idx, 'amount', style.price)
    setStyleSearch('')
  }

  const canNext = () => {
    if (step === 0) return !!selectedCustomer
    if (step === 1) return !!deliveryDate
    if (step === 2) return jobs.every(j => j.garmentType)
    return true
  }

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer!.id,
          eventName,
          deliveryDate,
          salesperson,
          totalAmount,
          advancePaid,
          paymentMethod,
          receiptReference,
          jobs: jobs.map(j => ({
            garmentType: j.garmentType,
            styleId: j.styleId,
            fabricDetails: j.fabricDetails,
            designNotes: j.designNotes,
            jobNotes: j.jobNotes,
            deliveryDate: j.deliveryDate || null,
            measurementSetId: j.measurementSetId || null,
            amount: j.amount,
          })),
        }),
      })
      if (res.ok) {
        const order = await res.json()
        router.push(`/orders/${order.id}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredStyles = styleSearch
    ? styles.filter(s =>
        (s.name ?? '').toLowerCase().includes(styleSearch.toLowerCase()) ||
        (s.styleCode ?? '').toLowerCase().includes(styleSearch.toLowerCase())
      ).slice(0, 8)
    : []

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">New Order</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                i === step
                  ? 'bg-accent text-accent-foreground'
                  : i < step
                  ? 'bg-green/10 text-green'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              {s}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {/* STEP 0: Customer */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select or Create Customer</h2>

            {selectedCustomer ? (
              <div className="bg-muted rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.customerId} · {selectedCustomer.mobile}</p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-sm text-red hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or mobile number..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                {customerResults.length > 0 && (
                  <div className="border border-border rounded-lg mb-4 overflow-hidden">
                    {customerResults.map(c => (
                      <button
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-3 hover:bg-muted border-b border-border last:border-0 transition-colors"
                      >
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.customerId} · {c.mobile}</p>
                      </button>
                    ))}
                  </div>
                )}

                {!showNewCustomer ? (
                  <button
                    onClick={() => setShowNewCustomer(true)}
                    className="flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Customer
                  </button>
                ) : (
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-semibold">New Customer</h3>
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={newCustomer.name}
                      onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                    <input
                      type="text"
                      placeholder="Mobile Number *"
                      value={newCustomer.mobile}
                      onChange={e => setNewCustomer(p => ({ ...p, mobile: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={newCustomer.email}
                      onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={createCustomer}
                        disabled={addingCustomer}
                        className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40"
                      >
                        {addingCustomer ? 'Creating…' : 'Create Customer'}
                      </button>
                      <button
                        onClick={() => setShowNewCustomer(false)}
                        className="px-4 py-2 border border-border rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Order Details */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Order Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Event Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wedding, Engagement..."
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Delivery Date *</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Salesperson</label>
                <input
                  type="text"
                  placeholder="Salesperson name"
                  value={salesperson}
                  onChange={e => setSalesperson(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Garments */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Garments</h2>
              <button
                onClick={addJob}
                className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add Garment
              </button>
            </div>

            <div className="space-y-6">
              {jobs.map((job, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Garment {idx + 1}</h3>
                    {jobs.length > 1 && (
                      <button onClick={() => removeJob(idx)} className="text-muted-foreground hover:text-red">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Garment Type *</label>
                      <select
                        value={job.garmentType}
                        onChange={e => updateJob(idx, 'garmentType', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 bg-background"
                      >
                        <option value="">Select type</option>
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Style (optional)</label>
                      <input
                        type="text"
                        placeholder="Search styles..."
                        value={job.styleName || styleSearch}
                        onChange={e => {
                          if (job.styleName) updateJob(idx, 'styleName', '')
                          setStyleSearch(e.target.value)
                        }}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                      {filteredStyles.length > 0 && !job.styleName && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                          {filteredStyles.map(s => (
                            <button
                              key={s.id}
                              onClick={() => selectStyle(idx, s)}
                              className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border last:border-0"
                            >
                              <span className="font-medium">{s.styleCode || s.category}</span>{s.name && ` — ${s.name}`}
                              {s.pieces > 1 && <span className="text-xs text-muted-foreground ml-1">({s.pieces}-pc)</span>}
                              <span className="text-muted-foreground ml-2">{formatCurrency(s.price)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Fabric Details</label>
                      <input
                        type="text"
                        value={job.fabricDetails}
                        onChange={e => updateJob(idx, 'fabricDetails', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={job.amount || ''}
                        onChange={e => updateJob(idx, 'amount', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                    </div>
                    {selectedCustomer?.measurements && selectedCustomer.measurements.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Measurement Set</label>
                        <select
                          value={job.measurementSetId}
                          onChange={e => updateJob(idx, 'measurementSetId', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 bg-background"
                        >
                          <option value="">Select measurements</option>
                          {selectedCustomer.measurements.map(m => (
                            <option key={m.id} value={m.id}>Version {m.version} — {new Date(m.date).toLocaleDateString()}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Design Notes</label>
                      <textarea
                        value={job.designNotes}
                        onChange={e => updateJob(idx, 'designNotes', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-right">
              <p className="text-lg font-semibold">Total: {formatCurrency(totalAmount)}</p>
            </div>
          </div>
        )}

        {/* STEP 3: Payment */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Payment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Total Amount</label>
                <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Advance Payment (₹)</label>
                <input
                  type="number"
                  value={advancePaid || ''}
                  onChange={e => setAdvancePaid(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 bg-background"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Receipt Reference</label>
                <input
                  type="text"
                  value={receiptReference}
                  onChange={e => setReceiptReference(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="sm:col-span-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Total Amount</span>
                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Advance Paid</span>
                  <span className="font-medium text-green">{formatCurrency(advancePaid)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1 pt-1 border-t border-border">
                  <span className="font-semibold">Balance Due</span>
                  <span className="font-semibold text-red">{formatCurrency(balanceDue)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Review Order</h2>

            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Customer</h3>
                <p className="font-semibold">{selectedCustomer?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCustomer?.customerId} · {selectedCustomer?.mobile}</p>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Order Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Event:</span> {eventName || '—'}</div>
                  <div><span className="text-muted-foreground">Delivery:</span> {deliveryDate}</div>
                  <div><span className="text-muted-foreground">Salesperson:</span> {salesperson || '—'}</div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Garments ({jobs.length})</h3>
                {jobs.map((j, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span>{j.garmentType} {j.styleName ? `(${j.styleName})` : ''}</span>
                    <span className="font-medium">{formatCurrency(j.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Payment</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Total</span><span className="font-medium">{formatCurrency(totalAmount)}</span></div>
                  <div className="flex justify-between"><span>Advance</span><span className="font-medium text-green">{formatCurrency(advancePaid)}</span></div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-border/50"><span>Balance Due</span><span className="text-red">{formatCurrency(balanceDue)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-border transition-colors ${
              step === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-accent text-accent-foreground font-medium transition-colors ${
                !canNext() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent/90'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-6 py-2 text-sm rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
