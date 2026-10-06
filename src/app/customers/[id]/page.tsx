'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Ruler, Edit2, Check, X, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/constants'

interface CustomerData {
  id: string
  customerId: string
  name: string
  countryCode: string
  mobile: string
  email: string | null
  dateOfBirth: string | null
  address: string | null
  city: string | null
  anniversary: string | null
  notes: string | null
  customNotes: string | null
  measurements: Array<{
    id: string
    version: number
    date: string
    chest: number | null
    stomach: number | null
    hips: number | null
    shoulder: number | null
    sleeveLength: number | null
    bicep: number | null
    neck: number | null
    waist: number | null
    trouserLength: number | null
    thigh: number | null
    knee: number | null
    bottom: number | null
    fork: number | null
    allRound: number | null
    calf: number | null
    inSeam: number | null
    sherwaniLength: number | null
    jacketLength: number | null
    kurtalength: number | null
    indoWesternLength: number | null
    suitLength: number | null
    notes: string | null
  }>
  orders: Array<{
    id: string
    orderNumber: number
    status: string
    totalAmount: number
    createdAt: string
    deliveryDate: string
    jobs: Array<{ garmentType: string }>
  }>
}

const MEASUREMENT_FIELDS = [
  { group: 'Upper Body', fields: [
    { key: 'chest', label: 'Chest' },
    { key: 'stomach', label: 'Stomach' },
    { key: 'hips', label: 'Hips' },
    { key: 'shoulder', label: 'Shoulder' },
    { key: 'sleeveLength', label: 'Sleeve Length' },
    { key: 'bicep', label: 'Bicep' },
    { key: 'neck', label: 'Neck' },
  ]},
  { group: 'Lower Body', fields: [
    { key: 'waist', label: 'Waist' },
    { key: 'trouserLength', label: 'Trouser Length' },
    { key: 'thigh', label: 'Thigh' },
    { key: 'knee', label: 'Knee' },
    { key: 'bottom', label: 'Bottom' },
    { key: 'fork', label: 'Fork' },
    { key: 'allRound', label: 'All Round' },
    { key: 'calf', label: 'Calf' },
    { key: 'inSeam', label: 'In-Seam' },
  ]},
  { group: 'Garment Lengths', fields: [
    { key: 'sherwaniLength', label: 'Sherwani Length' },
    { key: 'jacketLength', label: 'Jacket Length' },
    { key: 'kurtalength', label: 'Kurta Length' },
    { key: 'indoWesternLength', label: 'Indo-Western Length' },
    { key: 'suitLength', label: 'Suit Length' },
  ]},
]

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canDelete } = useAuth()
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<CustomerData>>({})
  const [showMeasurement, setShowMeasurement] = useState(false)
  const [mForm, setMForm] = useState<Record<string, number | string>>({})
  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null)
  const [mEditForm, setMEditForm] = useState<Record<string, number | string>>({})

  const load = () => {
    fetch(`/api/customers/${id}`).then(r => r.json()).then(d => {
      setCustomer(d)
      setEditForm(d)
    })
  }

  useEffect(() => { load() }, [id])

  if (!customer) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading...</div></div>
  }

  const totalSpend = customer.orders.reduce((sum, o) => sum + o.totalAmount, 0)
  const lastOrder = customer.orders[0]

  const saveEdit = async () => {
    await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setEditing(false)
    load()
  }

  const saveMeasurement = async () => {
    await fetch('/api/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: id, ...mForm }),
    })
    setShowMeasurement(false)
    setMForm({})
    load()
  }

  const startEditMeasurement = (m: CustomerData['measurements'][0]) => {
    setEditingMeasurement(m.id)
    const formData: Record<string, number | string> = {}
    MEASUREMENT_FIELDS.forEach(g => {
      g.fields.forEach(f => {
        const val = (m as Record<string, unknown>)[f.key]
        if (val != null) formData[f.key] = Number(val)
      })
    })
    if (m.notes) formData.notes = m.notes
    setMEditForm(formData)
  }

  const saveEditMeasurement = async () => {
    if (!editingMeasurement) return
    await fetch(`/api/measurements/${editingMeasurement}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mEditForm),
    })
    setEditingMeasurement(null)
    setMEditForm({})
    load()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/customers" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">{customer.customerId} · {customer.countryCode} {customer.mobile}</p>
        </div>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <Link href="/estimates" className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium">
            New Estimate
          </Link>
          <button onClick={() => setEditing(!editing)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          {canDelete && (
            <button
              onClick={async () => {
                if (!confirm(`Delete ${customer.name}? This also deletes all their orders, estimates and measurements. This cannot be undone.`)) return
                const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
                if (res.ok) router.push('/customers')
                else alert('Failed to delete customer')
              }}
              className="flex items-center gap-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-red hover:bg-muted"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Orders</p>
          <p className="text-xl font-semibold mt-1">{customer.orders.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Spend</p>
          <p className="text-xl font-semibold mt-1">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Last Order</p>
          <p className="text-sm font-semibold mt-1">{lastOrder ? formatDate(lastOrder.createdAt) : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Basic Information</h2>
          {editing ? (
            <div className="space-y-2">
              {[
                { key: 'name', label: 'Name', type: 'text' },
                { key: 'mobile', label: 'Mobile', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                { key: 'address', label: 'Address', type: 'text' },
                { key: 'city', label: 'City', type: 'text' },
                { key: 'anniversary', label: 'Anniversary', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-muted-foreground mb-0.5">{f.label}</label>
                  <input
                    type={f.type}
                    value={(editForm as Record<string, string>)[f.key] || ''}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-lg"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-muted-foreground mb-0.5">Notes</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded-lg resize-none"
                />
              </div>
              <button onClick={saveEdit} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium">Save</button>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Mobile</span><span>{customer.countryCode} {customer.mobile}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{customer.email || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{customer.city || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-right max-w-[200px]">{customer.address || '—'}</span></div>
              {customer.notes && <div className="pt-2 border-t border-border text-muted-foreground">{customer.notes}</div>}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Customisation Notes</h2>
          {editing ? (
            <div>
              <textarea
                placeholder="Special instructions, fabric preferences, design references, recurring requests..."
                value={editForm.customNotes || ''}
                onChange={e => setEditForm(p => ({ ...p, customNotes: e.target.value }))}
                rows={6}
                className="w-full px-2 py-1.5 text-sm border border-border rounded-lg resize-none"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {customer.customNotes || 'No customisation notes yet. Click Edit to add.'}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Measurements</h2>
          </div>
          <button
            onClick={() => setShowMeasurement(!showMeasurement)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" />
            New Measurement
          </button>
        </div>

        {showMeasurement && (
          <div className="bg-card border border-border rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold mb-4">New Measurement Set</h3>
            {MEASUREMENT_FIELDS.map(g => (
              <div key={g.group} className="mb-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3 pb-1 border-b border-border">{g.group}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {g.fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-muted-foreground mb-1">{f.label}</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.25"
                          value={mForm[f.key] || ''}
                          onChange={e => setMForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                          className="w-full px-2 py-1.5 text-sm border border-border rounded-lg pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-3">
              <label className="block text-xs text-muted-foreground mb-1">Measurement Notes</label>
              <textarea
                placeholder="Posture notes, fitting preferences, special considerations..."
                value={mForm.notes || ''}
                onChange={e => setMForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full px-2 py-1.5 text-sm border border-border rounded-lg resize-none"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={saveMeasurement} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium">Save Measurements</button>
              <button onClick={() => { setShowMeasurement(false); setMForm({}) }} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        {customer.measurements.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            No measurements recorded yet. Click &ldquo;New Measurement&rdquo; to add.
          </div>
        ) : (
          <div className="space-y-4">
            {customer.measurements.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Version {m.version}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
                    {editingMeasurement === m.id ? (
                      <div className="flex gap-1">
                        <button onClick={saveEditMeasurement} className="p-1 text-green hover:bg-muted rounded"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setEditingMeasurement(null); setMEditForm({}) }} className="p-1 text-red hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEditMeasurement(m)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
                {editingMeasurement === m.id ? (
                  <>
                    {MEASUREMENT_FIELDS.map(g => (
                      <div key={g.group} className="mb-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 pb-1 border-b border-border">{g.group}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                          {g.fields.map(f => (
                            <div key={f.key}>
                              <label className="block text-xs text-muted-foreground mb-1">{f.label}</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.25"
                                  value={mEditForm[f.key] ?? ''}
                                  onChange={e => setMEditForm(p => ({ ...p, [f.key]: e.target.value ? Number(e.target.value) : '' }))}
                                  className="w-full px-2 py-1.5 text-sm border border-border rounded-lg pr-6"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="mt-2">
                      <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                      <textarea
                        value={mEditForm.notes || ''}
                        onChange={e => setMEditForm(p => ({ ...p, notes: e.target.value }))}
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm border border-border rounded-lg resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {MEASUREMENT_FIELDS.map(g => {
                      const hasValues = g.fields.some(f => (m as Record<string, unknown>)[f.key] != null)
                      if (!hasValues) return null
                      return (
                        <div key={g.group} className="mb-3">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">{g.group}</h4>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-4 gap-y-1">
                            {g.fields.map(f => {
                              const val = (m as Record<string, unknown>)[f.key]
                              if (val == null) return null
                              return (
                                <div key={f.key} className="text-sm">
                                  <span className="text-muted-foreground">{f.label}:</span>{' '}
                                  <span className="font-medium">{Number(val).toFixed(1)}&quot;</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    {m.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">{m.notes}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Order History</h2>
        {customer.orders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            No orders yet.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Order</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 hidden sm:table-cell">Items</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map(o => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/orders/${o.id}`} className="text-sm font-semibold hover:underline">#{o.orderNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell">{o.jobs.map(j => j.garmentType).join(', ')}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        o.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
