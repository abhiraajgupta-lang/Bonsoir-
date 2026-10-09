'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer, ArrowRight, Plus, Trash2, Percent, IndianRupee, Ban } from 'lucide-react'
import useSWR from 'swr'
import { send } from '@/lib/api'
import { useDiscard } from '@/components/useDiscard'
import { formatCurrency, formatDate, PAYMENT_METHODS, ORDER_CHANNELS, pieceSetSummary } from '@/lib/constants'
import { PieceSetSelect } from '@/components/PieceSetSelect'
import { useRouter } from 'next/navigation'
import { BRAND_LOGO_SVG } from '@/lib/brand'
import CustomerPicker from '@/components/CustomerPicker'
import { useAuth } from '@/lib/auth-context'

interface Customer {
  id: string
  customerId: string
  name: string
  mobile: string
}

interface StyleOption {
  id: string
  styleCode: string | null
  name: string | null
  category: string
  pieces: number
  color: string | null
  price: number
  fabric: string | null
}

interface GarmentItem {
  garment: string
  amount: number
  styleId?: string
  pieces?: number
  pieceSet?: string
  customerId?: string
  customerName?: string
}

interface EstimateData {
  id: string
  estimateNumber: number
  customerId: string | null
  customerName: string
  mobile: string | null
  channel: string | null
  trialDate: string | null
  deliveryDate: string | null
  totalAmount: number
  discountType: string | null
  discountValue: number
  discountAmount: number
  netPayable: number
  advanceAmount: number
  advancePaymentMode: string | null
  balancePayment: number
  items: string | null
  notes: string | null
  status: string
  discardedAt: string | null
  discardedBy: string | null
  convertedOrderId: string | null
  createdAt: string
  customer: Customer | null
}

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canDiscard } = useAuth()
  const { data: estimate, mutate: load } = useSWR<EstimateData>(`/api/estimates/${id}`)
  const discard = useDiscard()
  const [editing, setEditing] = useState(false)
  const [converting, setConverting] = useState(false)
  const [saving, setSaving] = useState(false)

  const [garments, setGarments] = useState<GarmentItem[]>([])
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [trialDate, setTrialDate] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState(0)
  const [advanceAmount, setAdvanceAmount] = useState(0)
  const [advancePaymentMode, setAdvancePaymentMode] = useState('Cash')
  const [channel, setChannel] = useState('In-Store')

  const [styleSearch, setStyleSearch] = useState('')
  const [styleResults, setStyleResults] = useState<StyleOption[]>([])
  const [activeGarmentIdx, setActiveGarmentIdx] = useState<number | null>(null)
  const [advanceError, setAdvanceError] = useState('')

  const totalAmount = garments.reduce((sum, g) => sum + (g.amount || 0), 0)
  const discountAmount = discountType === 'percentage'
    ? Math.round(totalAmount * discountValue / 100)
    : discountType === 'fixed' ? discountValue : 0
  const netPayable = totalAmount - discountAmount
  const balancePayment = netPayable - advanceAmount

  const populateForm = (data: EstimateData) => {
    let items: GarmentItem[] = []
    try { items = data.items ? JSON.parse(data.items) : [] } catch { /* empty */ }
    setGarments(items.length > 0 ? items : [{ garment: '', amount: 0 }])
    setEditCustomer(data.customer)
    setTrialDate(data.trialDate ? data.trialDate.slice(0, 10) : '')
    setDeliveryDate(data.deliveryDate ? data.deliveryDate.slice(0, 10) : '')
    setNotes(data.notes || '')
    setDiscountType(data.discountType === 'percentage' ? 'percentage' : data.discountType === 'fixed' ? 'fixed' : 'none')
    setDiscountValue(data.discountValue || 0)
    setAdvanceAmount(data.advanceAmount ?? 0)
    setAdvancePaymentMode(data.advancePaymentMode || 'Cash')
    setChannel(data.channel || 'In-Store')
  }

  useEffect(() => {
    if (advanceAmount > netPayable) {
      setAdvanceError('Advance cannot exceed net payable amount')
    } else {
      setAdvanceError('')
    }
  }, [advanceAmount, netPayable])

  useEffect(() => {
    if (styleSearch.length >= 1) {
      fetch(`/api/styles?search=${encodeURIComponent(styleSearch)}`)
        .then(r => r.json())
        .then(setStyleResults)
    } else {
      setStyleResults([])
    }
  }, [styleSearch])

  if (!estimate) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading...</div></div>
  }

  const items: GarmentItem[] = (() => {
    try { return estimate.items ? JSON.parse(estimate.items) : [] } catch { return [] }
  })()

  const selectStyle = (style: StyleOption, idx: number) => {
    const label = [style.name, style.styleCode].filter(Boolean).join(' — ') || style.category
    setGarments(prev => prev.map((item, i) =>
      i === idx ? { ...item, garment: label, amount: style.price, styleId: style.id, pieces: style.pieces, pieceSet: undefined } : item
    ))
    setStyleSearch('')
    setStyleResults([])
    setActiveGarmentIdx(null)
  }

  const saveEstimate = async () => {
    if (advanceAmount > netPayable || saving) return
    setSaving(true)
    try {
      const res = await send(`/api/estimates/${id}`, 'PUT', {
        customerId: editCustomer?.id ?? estimate.customerId,
        customerName: editCustomer?.name ?? estimate.customerName,
        mobile: editCustomer?.mobile ?? estimate.mobile,
        trialDate: trialDate || null,
        deliveryDate: deliveryDate || null,
        items: garments.filter(g => g.garment),
        totalAmount,
        discountType: discountType === 'none' ? null : discountType,
        discountValue: discountType === 'none' ? 0 : discountValue,
        advanceAmount,
        advancePaymentMode,
        channel,
        notes: notes || null,
      })
      if (!res.ok) return alert(res.error)
      setEditing(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const convertToOrder = async () => {
    if (converting) return
    setConverting(true)
    try {
      const res = await send<{ id: string }>(`/api/estimates/${id}/convert`, 'POST')
      if (res.ok && res.data) router.push(`/orders/${res.data.id}`)
      else alert(res.error || 'Failed to convert')
      load()
    } finally {
      setConverting(false)
    }
  }

  const printEstimate = () => {
    const dateStr = new Date(estimate.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const html = `<!DOCTYPE html><html><head><title>Estimate EST-${String(estimate.estimateNumber).padStart(4, '0')}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
      .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px; border-bottom: 3px solid #c8102e; margin-bottom: 30px; }
      .header-left { display: flex; flex-direction: column; align-items: center; }
      .header-left svg { width: 220px; height: auto; }
      .header-divider { width: 1px; height: 80px; background: #999; margin: 0 28px; }
      .header-right { text-align: right; }
      .company-name { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
      .company-detail { font-size: 12px; color: #555; line-height: 1.8; }
      .title { text-align: center; margin-bottom: 28px; }
      .title h2 { font-size: 20px; font-weight: 700; letter-spacing: 6px; border-bottom: 2px solid #1a1a1a; display: inline-block; padding-bottom: 4px; }
      .meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; }
      .meta div { line-height: 1.8; }
      .meta strong { font-weight: 600; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th { background: #f0f0f0; text-align: left; padding: 10px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-top: 2px solid #333; border-bottom: 2px solid #333; }
      th.amount { text-align: right; }
      td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #e5e5e5; }
      td.amount { text-align: right; }
      .totals { border-top: 2px solid #333; margin-top: 0; }
      .totals .row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 13px; border-bottom: 1px solid #e5e5e5; }
      .totals .row.bold { font-weight: 700; font-size: 15px; }
      .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #999; font-style: italic; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <div class="header">
        <div class="header-left">
          ${BRAND_LOGO_SVG}
        </div>
        <div class="header-divider"></div>
        <div class="header-right">
          <div class="company-name">RKG CREATION PVT. LTD.</div>
          <div class="company-detail">A-28, Sector 83, Noida - 201305</div>
          <div class="company-detail">&#x260E; 8920351102 &nbsp;|&nbsp; 9711303034</div>
        </div>
      </div>
      <div class="title"><h2>ESTIMATE</h2></div>
      <div class="meta">
        <div>
          <strong>Estimate #:</strong> EST-${String(estimate.estimateNumber).padStart(4, '0')}<br>
          <strong>Date:</strong> ${dateStr}
          ${estimate.trialDate ? `<br><strong>Trial Date:</strong> ${new Date(estimate.trialDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
          ${estimate.deliveryDate ? `<br><strong>Delivery Date:</strong> ${new Date(estimate.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
        </div>
        <div style="text-align:right">
          <strong>Customer:</strong> ${estimate.customerName}<br>
          ${estimate.mobile ? `<strong>Mobile:</strong> ${estimate.mobile}` : ''}
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Garment</th><th class="amount">Amount</th></tr></thead>
        <tbody>${items.map((item, i) => `<tr><td>${i + 1}</td><td>${item.garment}${!item.styleId && pieceSetSummary(item.pieceSet) ? `<div style="font-size:11px;color:#666">${pieceSetSummary(item.pieceSet)}</div>` : ''}</td><td class="amount">₹${(item.amount || 0).toLocaleString('en-IN')}</td></tr>`).join('')}</tbody>
      </table>
      <div class="totals">
        <div class="row"><span>Total Amount</span><span>₹${estimate.totalAmount.toLocaleString('en-IN')}</span></div>
        ${estimate.discountAmount > 0 ? `<div class="row"><span>Discount${estimate.discountType === 'percentage' ? ` (${estimate.discountValue}%)` : ''}</span><span>- ₹${estimate.discountAmount.toLocaleString('en-IN')}</span></div>` : ''}
        <div class="row bold"><span>Net Payable</span><span>₹${estimate.netPayable.toLocaleString('en-IN')}</span></div>
        ${estimate.advanceAmount > 0 ? `<div class="row"><span>Advance Paid (${estimate.advancePaymentMode || 'Cash'})</span><span>₹${estimate.advanceAmount.toLocaleString('en-IN')}</span></div>` : ''}
        <div class="row bold"><span>Balance Payment</span><span>₹${estimate.balancePayment.toLocaleString('en-IN')}</span></div>
      </div>
      ${estimate.notes ? `<div style="margin-top:24px;font-size:12px;color:#666"><strong>Notes:</strong> ${estimate.notes}</div>` : ''}
      <div class="footer">This is a computer-generated estimate. Thank you for choosing Bonsoir.</div>
    </body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.print() }
  }

  const statusColors: Record<string, string> = {
    Created: 'bg-blue-100 text-blue-700',
    Converted: 'bg-emerald-100 text-emerald-700',
    Expired: 'bg-gray-100 text-gray-600',
    Discarded: 'bg-red/10 text-red',
  }
  const isDiscarded = estimate.status === 'Discarded'

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/estimates" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Estimates
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-semibold ${isDiscarded ? 'line-through text-muted-foreground' : ''}`}>EST-{String(estimate.estimateNumber).padStart(4, '0')}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[estimate.status] || 'bg-gray-100 text-gray-600'}`}>
              {estimate.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {estimate.customerName}
            {estimate.mobile && ` · ${estimate.mobile}`}
            {' · '}Created {formatDate(estimate.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
          <button onClick={printEstimate} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          {!isDiscarded && (
            <button onClick={() => { setEditing(!editing); if (!editing) populateForm(estimate) }} className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted">
              {editing ? 'Cancel' : 'Edit'}
            </button>
          )}
          {estimate.status === 'Created' && (
            <button onClick={convertToOrder} disabled={converting} className="flex items-center gap-1 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium disabled:opacity-50">
              {converting ? 'Converting...' : <>Convert to Order <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          )}
          {estimate.convertedOrderId && (estimate.status === 'Converted' || isDiscarded) && (
            <Link href={`/orders/${estimate.convertedOrderId}`} className="flex items-center gap-1 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium">
              View Order <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {canDiscard && !isDiscarded && (
            <button
              onClick={() => discard('estimate', estimate.id, `Estimate EST-${String(estimate.estimateNumber).padStart(4, '0')}`)}
              className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-red hover:bg-red/10"
            >
              <Ban className="w-3.5 h-3.5" /> Discard
            </button>
          )}
        </div>
      </div>

      {isDiscarded && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm">
          <Ban className="w-4 h-4 text-red mt-0.5 shrink-0" />
          <p>
            This estimate was discarded{estimate.discardedBy ? ` by ${estimate.discardedBy}` : ''}
            {estimate.discardedAt ? ` on ${formatDate(estimate.discardedAt)}` : ''}
            {estimate.convertedOrderId ? ', along with the order made from it' : ''}.
          </p>
        </div>
      )}

      {editing ? (
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">Customer</label>
            {editCustomer ? (
              <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{editCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">{editCustomer.customerId} · {editCustomer.mobile}</p>
                </div>
                <button onClick={() => setEditCustomer(null)} className="text-xs text-red hover:underline">Change</button>
              </div>
            ) : (
              <CustomerPicker onSelect={setEditCustomer} />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Garments</label>
              <button onClick={() => setGarments(prev => [...prev, { garment: '', amount: 0 }])} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                <Plus className="w-3 h-3" /> Add Garment
              </button>
            </div>
            <div className="space-y-3">
              {garments.map((g, i) => (
                <div key={i} className="space-y-2 bg-muted/30 rounded-lg p-3">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Search style or type custom..."
                        value={g.garment}
                        onFocus={() => setActiveGarmentIdx(i)}
                        onChange={e => {
                          setGarments(prev => prev.map((item, idx) => idx === i ? { ...item, garment: e.target.value, styleId: undefined, pieces: undefined } : item))
                          setStyleSearch(e.target.value)
                          setActiveGarmentIdx(i)
                        }}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                      {activeGarmentIdx === i && styleResults.length > 0 && styleSearch.length >= 1 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {styleResults.map(s => (
                            <button key={s.id} onClick={() => selectStyle(s, i)} className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-b border-border last:border-0">
                              <div className="flex justify-between">
                                <span className="font-medium">{s.name || 'Custom'}{s.styleCode && ` (${s.styleCode})`}</span>
                                <span className="font-medium">{formatCurrency(s.price)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">{s.category}{s.pieces > 1 && ` · ${s.pieces}-piece`}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative w-28 sm:w-36 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                      <input type="number" value={g.amount || ''} onChange={e => setGarments(prev => prev.map((item, idx) => idx === i ? { ...item, amount: Number(e.target.value) } : item))} className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-lg" />
                    </div>
                    {garments.length > 1 && (
                      <button onClick={() => setGarments(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red p-1"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  {g.styleId ? (
                    g.pieces && g.pieces > 1 ? (
                      <p className="text-xs text-muted-foreground">This style produces {g.pieces} separate production units when converted to an order</p>
                    ) : null
                  ) : (
                    <PieceSetSelect
                      value={g.pieceSet}
                      onChange={key => setGarments(prev => prev.map((item, idx) => idx === i ? { ...item, pieceSet: key } : item))}
                    />
                  )}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Customer for this garment</label>
                    {g.customerName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-card border border-border rounded px-2 py-1">{g.customerName}</span>
                        <button onClick={() => setGarments(prev => prev.map((item, idx) => idx === i ? { ...item, customerId: undefined, customerName: undefined } : item))} className="text-xs text-muted-foreground hover:text-red">Reset to main</button>
                      </div>
                    ) : (
                      <CustomerPicker
                        compact
                        placeholder={editCustomer ? `Default: ${editCustomer.name} — search to change` : 'Search customer for this garment...'}
                        onSelect={c => setGarments(prev => prev.map((item, idx) => idx === i ? { ...item, customerId: c.id, customerName: c.name } : item))}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-semibold">Total: {formatCurrency(totalAmount)}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Trial Date</label>
              <input type="date" value={trialDate} onChange={e => setTrialDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Delivery Date</label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase mb-2 block">Discount</label>
            <div className="flex gap-2 mb-2">
              <button onClick={() => { setDiscountType('none'); setDiscountValue(0) }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${discountType === 'none' ? 'bg-accent text-accent-foreground border-accent' : 'border-border'}`}>None</button>
              <button onClick={() => setDiscountType('percentage')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${discountType === 'percentage' ? 'bg-accent text-accent-foreground border-accent' : 'border-border'}`}><Percent className="w-3 h-3" /> %</button>
              <button onClick={() => setDiscountType('fixed')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${discountType === 'fixed' ? 'bg-accent text-accent-foreground border-accent' : 'border-border'}`}><IndianRupee className="w-3 h-3" /> Fixed</button>
            </div>
            {discountType !== 'none' && (
              <input type="number" value={discountValue || ''} onChange={e => setDiscountValue(Number(e.target.value))} className="w-40 px-3 py-2 text-sm border border-border rounded-lg" placeholder={discountType === 'percentage' ? '%' : '₹'} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Advance (₹)</label>
              <input type="number" value={advanceAmount || ''} onChange={e => setAdvanceAmount(Number(e.target.value))} className={`w-full px-3 py-2 text-sm border rounded-lg ${advanceError ? 'border-red' : 'border-border'}`} />
              {advanceError && <p className="text-xs text-red mt-1">{advanceError}</p>}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Payment Mode</label>
              <select value={advancePaymentMode} onChange={e => setAdvancePaymentMode(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase mb-2 block">Order Channel</label>
            <div className="flex gap-2">
              {ORDER_CHANNELS.map(ch => (
                <button key={ch} onClick={() => setChannel(ch)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${channel === ch ? 'bg-accent text-accent-foreground border-accent' : 'border-border'}`}>{ch}</button>
              ))}
            </div>
          </div>

          <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-none" />

          <div className="bg-muted rounded-lg p-4 space-y-1">
            <div className="flex justify-between text-sm"><span>Total</span><span className="font-medium">{formatCurrency(totalAmount)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-sm text-green"><span>Discount</span><span>- {formatCurrency(discountAmount)}</span></div>}
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-1"><span>Net Payable</span><span>{formatCurrency(netPayable)}</span></div>
            <div className="flex justify-between text-sm"><span>Advance</span><span className="text-green">{formatCurrency(advanceAmount)}</span></div>
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-1"><span>Balance</span><span className={balancePayment > 0 ? 'text-red' : ''}>{formatCurrency(balancePayment)}</span></div>
          </div>

          <div className="flex gap-2">
            <button onClick={saveEstimate} disabled={saving || !!advanceError || !editCustomer} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button onClick={() => { setEditing(false); populateForm(estimate) }} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className={`space-y-6 ${isDiscarded ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {estimate.trialDate && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase">Trial Date</p>
                <p className="text-sm font-semibold mt-1">{formatDate(estimate.trialDate)}</p>
              </div>
            )}
            {estimate.deliveryDate && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase">Delivery Date</p>
                <p className="text-sm font-semibold mt-1">{formatDate(estimate.deliveryDate)}</p>
              </div>
            )}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase">Net Payable</p>
              <p className="text-sm font-semibold mt-1">{formatCurrency(estimate.netPayable)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase">Balance</p>
              <p className={`text-sm font-semibold mt-1 ${estimate.balancePayment > 0 ? 'text-red' : ''}`}>{formatCurrency(estimate.balancePayment)}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Garments</h2>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span>
                    {item.garment}
                    {!item.styleId && pieceSetSummary(item.pieceSet) && <span className="text-xs text-muted-foreground ml-2">{pieceSetSummary(item.pieceSet)}</span>}
                    {item.customerName && <span className="text-xs text-muted-foreground ml-2">for {item.customerName}</span>}
                  </span>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-semibold mt-3 pt-2 border-t border-border">
              <span>Total Amount</span>
              <span>{formatCurrency(estimate.totalAmount)}</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Payment Summary</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Total Amount</span><span>{formatCurrency(estimate.totalAmount)}</span></div>
              {estimate.discountAmount > 0 && (
                <div className="flex justify-between text-green">
                  <span>Discount {estimate.discountType === 'percentage' ? `(${estimate.discountValue}%)` : ''}</span>
                  <span>- {formatCurrency(estimate.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-1">
                <span>Net Payable</span><span>{formatCurrency(estimate.netPayable)}</span>
              </div>
              {estimate.advanceAmount > 0 && (
                <div className="flex justify-between text-green">
                  <span>Advance ({estimate.advancePaymentMode || 'Cash'})</span>
                  <span>{formatCurrency(estimate.advanceAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-1">
                <span>Balance Payment</span>
                <span className={estimate.balancePayment > 0 ? 'text-red' : ''}>{formatCurrency(estimate.balancePayment)}</span>
              </div>
            </div>
          </div>

          {estimate.notes && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Notes</h2>
              <p className="text-sm">{estimate.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
