'use client'

import { useEffect, useState, useRef } from 'react'
import useSWR from 'swr'
import { send, useBusy } from '@/lib/api'
import { useDiscard } from '@/components/useDiscard'
import { Plus, FileText, ArrowRight, Trash2, Printer, Percent, IndianRupee, Ban } from 'lucide-react'
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

interface Estimate {
  id: string
  estimateNumber: number
  customerName: string
  mobile: string | null
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
  convertedOrderId: string | null
  createdAt: string
  customer: Customer | null
}

export default function EstimatesPage() {
  const router = useRouter()
  const { data: estimates = [], mutate: load, isLoading } = useSWR<Estimate[]>('/api/estimates', { refreshInterval: 180000 })
  const [showNew, setShowNew] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)
  const [creating, runCreate] = useBusy()
  const discard = useDiscard()

  const { canDiscard } = useAuth()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [garments, setGarments] = useState<GarmentItem[]>([{ garment: '', amount: 0 }])
  const [trialDate, setTrialDate] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [createdAt, setCreatedAt] = useState('')

  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState(0)

  const [advanceAmount, setAdvanceAmount] = useState(0)
  const [advancePaymentMode, setAdvancePaymentMode] = useState('Cash')
  const [channel, setChannel] = useState('In-Store')
  const [advanceError, setAdvanceError] = useState('')

  const [styleSearch, setStyleSearch] = useState('')
  const [styleResults, setStyleResults] = useState<StyleOption[]>([])
  const [activeGarmentIdx, setActiveGarmentIdx] = useState<number | null>(null)

  const totalAmount = garments.reduce((sum, g) => sum + (g.amount || 0), 0)
  const discountAmount = discountType === 'percentage'
    ? Math.round(totalAmount * discountValue / 100)
    : discountType === 'fixed'
    ? discountValue
    : 0
  const netPayable = totalAmount - discountAmount
  const balancePayment = netPayable - advanceAmount

  useEffect(() => {
    if (styleSearch.length >= 1) {
      fetch(`/api/styles?search=${encodeURIComponent(styleSearch)}`)
        .then(r => r.json())
        .then(setStyleResults)
    } else {
      setStyleResults([])
    }
  }, [styleSearch])

  useEffect(() => {
    if (advanceAmount > netPayable) {
      setAdvanceError('Advance cannot exceed net payable amount')
    } else {
      setAdvanceError('')
    }
  }, [advanceAmount, netPayable])

  const resetForm = () => {
    setSelectedCustomer(null)
    setGarments([{ garment: '', amount: 0 }])
    setTrialDate('')
    setDeliveryDate('')
    setNotes('')
    setCreatedAt('')
    setDiscountType('none')
    setDiscountValue(0)
    setAdvanceAmount(0)
    setAdvancePaymentMode('Cash')
    setChannel('In-Store')
    setStyleSearch('')
    setStyleResults([])
    setActiveGarmentIdx(null)
    setAdvanceError('')
  }

  const selectStyle = (style: StyleOption, idx: number) => {
    const label = [style.name, style.styleCode].filter(Boolean).join(' — ') || style.category
    setGarments(prev => prev.map((item, i) =>
      i === idx ? { ...item, garment: label, amount: style.price, styleId: style.id, pieces: style.pieces, pieceSet: undefined } : item
    ))
    setStyleSearch('')
    setStyleResults([])
    setActiveGarmentIdx(null)
  }

  const selectGarmentCustomer = (customer: Customer, idx: number) => {
    setGarments(prev => prev.map((item, i) =>
      i === idx ? { ...item, customerId: customer.id, customerName: customer.name } : item
    ))
  }

  const createEstimate = () => runCreate(async () => {
    if (!selectedCustomer) return
    if (garments.every(g => !g.garment)) return
    if (advanceAmount > netPayable) return

    const res = await send('/api/estimates', 'POST', {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      mobile: selectedCustomer.mobile,
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
      createdAt: createdAt || null,
    })
    if (!res.ok) return alert(res.error)
    setShowNew(false)
    resetForm()
    load()
  })

  const convertToOrder = async (estimateId: string) => {
    if (converting) return
    setConverting(estimateId)
    try {
      const res = await send<{ id: string }>(`/api/estimates/${estimateId}/convert`, 'POST')
      if (res.ok && res.data) router.push(`/orders/${res.data.id}`)
      else alert(res.error || 'Failed to convert')
      load()
    } finally {
      setConverting(null)
    }
  }

  const printEstimate = (estimate: Estimate) => {
    let items: GarmentItem[] = []
    try { items = estimate.items ? JSON.parse(estimate.items) : [] } catch { /* empty */ }

    const dateStr = new Date(estimate.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

    const html = `<!DOCTYPE html><html><head><title>Estimate EST-${String(estimate.estimateNumber).padStart(4, '0')}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
      .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px; border-bottom: 3px solid #c8102e; margin-bottom: 30px; }
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
        <tbody>
          ${items.map((item, i) => `<tr><td>${i + 1}</td><td>${item.garment}${!item.styleId && pieceSetSummary(item.pieceSet) ? `<div style="font-size:11px;color:#666">${pieceSetSummary(item.pieceSet)}</div>` : ''}</td><td class="amount">₹${(item.amount || 0).toLocaleString('en-IN')}</td></tr>`).join('')}
        </tbody>
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
    if (win) {
      win.document.write(html)
      win.document.close()
      win.print()
    }
  }

  const statusColors: Record<string, string> = {
    Created: 'bg-blue-100 text-blue-700',
    Shared: 'bg-purple-100 text-purple-700',
    Converted: 'bg-emerald-100 text-emerald-700',
    Expired: 'bg-gray-100 text-gray-600',
    Discarded: 'bg-red/10 text-red',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Estimates</h1>
        <button
          onClick={() => { setShowNew(!showNew); if (showNew) resetForm() }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90"
        >
          <Plus className="w-4 h-4" />
          New Estimate
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-5">
          <h2 className="text-lg font-semibold">New Estimate</h2>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">Customer *</label>
            {selectedCustomer ? (
              <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedCustomer.customerId} · {selectedCustomer.mobile}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-xs text-red hover:underline">Change</button>
              </div>
            ) : (
              <CustomerPicker onSelect={setSelectedCustomer} />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Garments</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGarments(prev => [...prev, { garment: '', amount: 0 }])}
                  className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  Custom Garment
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {garments.map((g, i) => (
                <div key={i} className="space-y-1 bg-muted/30 rounded-lg p-3">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Search style bank or type custom garment..."
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
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                          {styleResults.map(s => (
                            <button
                              key={s.id}
                              onClick={() => selectStyle(s, i)}
                              className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-b border-border last:border-0"
                            >
                              <div className="flex justify-between">
                                <span>
                                  <span className="font-medium">{s.name || 'Custom'}</span>
                                  {s.styleCode && <span className="text-muted-foreground ml-1">({s.styleCode})</span>}
                                </span>
                                <span className="font-medium">{formatCurrency(s.price)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {s.category}
                                {s.pieces > 1 && ` · ${s.pieces}-piece`}
                                {s.color && ` · ${s.color}`}
                                {s.fabric && ` · ${s.fabric}`}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative w-28 sm:w-36 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={g.amount || ''}
                        onChange={e => setGarments(prev => prev.map((item, idx) => idx === i ? { ...item, amount: Number(e.target.value) } : item))}
                        className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                    </div>
                    {garments.length > 1 && (
                      <button
                        onClick={() => setGarments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-red p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs text-muted-foreground mb-1">Customer for this garment</label>
                    {g.customerName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-card border border-border rounded px-2 py-1">{g.customerName}</span>
                        <button onClick={() => setGarments(prev => prev.map((item, idx) => idx === i ? { ...item, customerId: undefined, customerName: undefined } : item))} className="text-xs text-muted-foreground hover:text-red">Reset to main</button>
                      </div>
                    ) : (
                      <CustomerPicker
                        compact
                        placeholder={selectedCustomer ? `Default: ${selectedCustomer.name} — search to change` : 'Search customer for this garment...'}
                        onSelect={c => selectGarmentCustomer(c, i)}
                      />
                    )}
                  </div>
                  {g.styleId ? (
                    g.pieces && g.pieces > 1 ? (
                      <p className="text-xs text-muted-foreground ml-1">This style produces {g.pieces} separate production units when converted to an order</p>
                    ) : null
                  ) : (
                    <PieceSetSelect
                      value={g.pieceSet}
                      onChange={key => setGarments(prev => prev.map((item, idx) => idx === i ? { ...item, pieceSet: key } : item))}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-semibold">
              Total: {formatCurrency(totalAmount)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Trial Date</label>
              <input type="date" value={trialDate} onChange={e => setTrialDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Delivery Date</label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Estimate Date (leave empty for today)</label>
              <input type="date" value={createdAt} onChange={e => setCreatedAt(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">Discount</label>
            <div className="flex gap-2 mb-2">
              <button onClick={() => { setDiscountType('none'); setDiscountValue(0) }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${discountType === 'none' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-muted'}`}>No Discount</button>
              <button onClick={() => setDiscountType('percentage')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${discountType === 'percentage' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-muted'}`}><Percent className="w-3 h-3" /> Percentage</button>
              <button onClick={() => setDiscountType('fixed')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${discountType === 'fixed' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-muted'}`}><IndianRupee className="w-3 h-3" /> Fixed Value</button>
            </div>
            {discountType !== 'none' && (
              <div className="flex items-center gap-3">
                <input type="number" placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 5000'} value={discountValue || ''} onChange={e => setDiscountValue(Number(e.target.value))} className="w-40 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
                <span className="text-sm text-muted-foreground">{discountType === 'percentage' ? '%' : '₹'} off</span>
                {discountAmount > 0 && <span className="text-sm font-medium text-green">Saving {formatCurrency(discountAmount)}</span>}
              </div>
            )}
          </div>

          <div className="bg-muted rounded-lg p-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span>Total Amount</span><span className="font-medium">{formatCurrency(totalAmount)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-sm text-green"><span>Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}</span><span>- {formatCurrency(discountAmount)}</span></div>}
              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border"><span>Net Payable</span><span>{formatCurrency(netPayable)}</span></div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">Advance Payment</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Advance Amount (₹)</label>
                <input type="number" value={advanceAmount || ''} onChange={e => setAdvanceAmount(Number(e.target.value))} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 ${advanceError ? 'border-red' : 'border-border'}`} />
                {advanceError && <p className="text-xs text-red mt-1">{advanceError}</p>}
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Payment Mode</label>
                <select value={advancePaymentMode} onChange={e => setAdvancePaymentMode(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3 bg-muted rounded-lg p-3">
              <div className="flex justify-between text-sm"><span>Net Payable</span><span className="font-medium">{formatCurrency(netPayable)}</span></div>
              <div className="flex justify-between text-sm mt-1"><span>Advance</span><span className="font-medium text-green">{formatCurrency(advanceAmount)}</span></div>
              <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-border"><span>Balance Payment</span><span className={balancePayment > 0 ? 'text-red' : ''}>{formatCurrency(balancePayment)}</span></div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">Order Channel</label>
            <div className="flex gap-2">
              {ORDER_CHANNELS.map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${channel === ch ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-muted'}`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring/20" />

          <div className="flex gap-2">
            <button onClick={createEstimate} disabled={creating || !selectedCustomer || garments.every(g => !g.garment) || !!advanceError} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">{creating ? 'Creating…' : 'Create Estimate'}</button>
            <button onClick={() => { setShowNew(false); resetForm() }} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {estimates.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {isLoading ? 'Loading…' : 'No estimates yet. Create your first estimate for a prospective customer.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {estimates.map(e => {
            let items: GarmentItem[] = []
            try { items = e.items ? JSON.parse(e.items) : [] } catch { /* empty */ }

            return (
              <div
                key={e.id}
                onClick={() => router.push(`/estimates/${e.id}`)}
                className={`block bg-card border border-border rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer ${e.status === 'Discarded' ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-sm font-semibold ${e.status === 'Discarded' ? 'line-through' : ''}`}>EST-{String(e.estimateNumber).padStart(4, '0')}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[e.status] || 'bg-gray-100 text-gray-600'}`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{e.customerName}</p>
                    {items.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-muted-foreground max-w-xs">
                            <span>
                              {item.garment}
                              {!item.styleId && pieceSetSummary(item.pieceSet) && <span className="ml-1.5 text-[11px]">({pieceSetSummary(item.pieceSet)})</span>}
                            </span>
                            <span>{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {e.trialDate && <p className="text-xs text-muted-foreground mt-1">Trial: {formatDate(e.trialDate)}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatCurrency(e.netPayable)}</p>
                    {e.discountAmount > 0 && <p className="text-xs text-green">Discount: {formatCurrency(e.discountAmount)}</p>}
                    {e.advanceAmount > 0 && <p className="text-xs text-muted-foreground">Advance: {formatCurrency(e.advanceAmount)}</p>}
                    {e.balancePayment > 0 && <p className="text-xs text-red">Balance: {formatCurrency(e.balancePayment)}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(e.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-x-4 gap-y-2 flex-wrap" onClick={ev => ev.stopPropagation()}>
                  <button
                    onClick={() => printEstimate(e)}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Printer className="w-3 h-3" /> Print
                  </button>
                  {e.status === 'Created' && (
                    <button
                      onClick={() => convertToOrder(e.id)}
                      disabled={converting === e.id}
                      className="flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      {converting === e.id ? 'Converting...' : <>Convert to Order <ArrowRight className="w-3 h-3" /></>}
                    </button>
                  )}
                  {e.convertedOrderId && (e.status === 'Converted' || e.status === 'Discarded') && (
                    <button
                      onClick={() => router.push(`/orders/${e.convertedOrderId}`)}
                      className="text-xs font-medium text-green hover:underline"
                    >
                      View Order →
                    </button>
                  )}
                  {canDiscard && e.status !== 'Discarded' && (
                    <button
                      onClick={() => discard('estimate', e.id, `Estimate EST-${String(e.estimateNumber).padStart(4, '0')}`)}
                      className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-red"
                    >
                      <Ban className="w-3 h-3" /> Discard
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
