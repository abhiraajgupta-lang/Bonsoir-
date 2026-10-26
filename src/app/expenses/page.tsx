'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Pencil, Trash2, Download, Search, Wallet, Check, X } from 'lucide-react'
import { send, useBusy } from '@/lib/api'
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_MODES, formatCurrency, formatDate } from '@/lib/constants'
import { downloadCsv } from '@/lib/csv'
import { useConfirm } from '@/components/ConfirmDialog'

interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  paymentMode: string
  paidTo: string | null
  notes: string | null
  createdBy: string | null
}

const istToday = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)
const currentMonth = () => istToday().slice(0, 7)
const istDay = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)

const emptyForm = () => ({
  date: istToday(),
  category: '',
  description: '',
  amount: '',
  paymentMode: 'Cash',
  paidTo: '',
  notes: '',
})

type Form = ReturnType<typeof emptyForm>

export default function ExpensesPage() {
  const [month, setMonth] = useState(currentMonth())
  const { data: expenses = [], mutate: load, isLoading } = useSWR<Expense[]>(`/api/expenses?month=${month}`)
  const confirm = useConfirm()
  const [saving, runSave] = useBusy()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState<Form>(emptyForm)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Form>(emptyForm)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  // Store the chosen day at noon IST so it never slips to a neighbouring date.
  const toPayload = (f: Form) => ({ ...f, date: `${f.date}T12:00:00+05:30`, amount: Number(f.amount) })

  const create = () => runSave(async () => {
    const res = await send('/api/expenses', 'POST', toPayload(form))
    if (!res.ok) return setFormError(res.error || 'Could not save')
    if (form.date.slice(0, 7) !== month) setMonth(form.date.slice(0, 7))
    setForm(f => ({ ...emptyForm(), date: f.date, paymentMode: f.paymentMode }))
    setFormError('')
    setShowNew(false)
    load()
  })

  const startEdit = (e: Expense) => {
    setEditingId(e.id)
    setEditForm({
      date: istDay(e.date),
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      paymentMode: e.paymentMode,
      paidTo: e.paidTo || '',
      notes: e.notes || '',
    })
  }

  const saveEdit = () => runSave(async () => {
    if (!editingId) return
    const res = await send(`/api/expenses/${editingId}`, 'PUT', toPayload(editForm))
    if (!res.ok) return alert(res.error)
    setEditingId(null)
    load()
  })

  const remove = async (e: Expense) => {
    const ok = await confirm({
      title: 'Delete this expense?',
      message: `${e.description} — ${formatCurrency(e.amount)} on ${formatDate(e.date)}. This can't be undone.`,
      confirmLabel: 'Delete expense',
    })
    if (!ok) return
    const res = await send(`/api/expenses/${e.id}`, 'DELETE')
    if (!res.ok) return alert(res.error)
    load()
  }

  const q = search.trim().toLowerCase()
  const filtered = expenses.filter(e =>
    (category === 'All' || e.category === category) &&
    (!q || [e.description, e.paidTo, e.notes, e.category].some(v => v?.toLowerCase().includes(q))),
  )
  const monthTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const shownTotal = filtered.reduce((s, e) => s + e.amount, 0)
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + e.amount }), {}),
  ).sort((a, b) => b[1] - a[1])
  const monthLabel = new Date(`${month}-15`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const exportCsv = () => downloadCsv(
    `bonsoir-expenses-${month}.csv`,
    ['Date', 'Category', 'Description', 'Paid To', 'Payment Mode', 'Amount (INR)', 'Notes', 'Added By'],
    filtered.map(e => [istDay(e.date), e.category, e.description, e.paidTo, e.paymentMode, e.amount, e.notes, e.createdBy]),
  )

  const inputCls = 'px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20'
  const cellInput = 'w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background'
  const th = 'text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap'

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Wallet className="w-6 h-6" /> Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Business expenses · visible to the owner only</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-40">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => { setShowNew(!showNew); setFormError('') }} className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {showNew && (
        <form onSubmit={e => { e.preventDefault(); create() }} className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold">New Expense</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-xs text-muted-foreground">Date *
              <input required type="date" max={istToday()} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={`block w-full mt-1 ${inputCls}`} />
            </label>
            <label className="text-xs text-muted-foreground">Category *
              <select required value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={`block w-full mt-1 ${inputCls}`}>
                <option value="" disabled>Choose…</option>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">Amount (₹) *
              <input required type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={`block w-full mt-1 font-semibold ${inputCls}`} />
            </label>
            <label className="text-xs text-muted-foreground sm:col-span-2">Description *
              <input required maxLength={200} placeholder="e.g. October shop rent, 20m navy linen" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={`block w-full mt-1 ${inputCls}`} />
            </label>
            <label className="text-xs text-muted-foreground">Payment mode
              <select value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))} className={`block w-full mt-1 ${inputCls}`}>
                {EXPENSE_PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">Paid to
              <input placeholder="Vendor / person (optional)" value={form.paidTo} onChange={e => setForm(p => ({ ...p, paidTo: e.target.value }))} className={`block w-full mt-1 ${inputCls}`} />
            </label>
            <label className="text-xs text-muted-foreground sm:col-span-2">Notes
              <input placeholder="Bill no., remarks (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={`block w-full mt-1 ${inputCls}`} />
            </label>
          </div>
          {formError && <p className="text-xs text-red">{formError}</p>}
          <div className="flex gap-2">
            <button disabled={saving} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">{saving ? 'Saving…' : 'Save Expense'}</button>
            <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <label htmlFor="exp-month" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Month</label>
          <input id="exp-month" type="month" value={month} max={currentMonth()} onChange={e => e.target.value && setMonth(e.target.value)} className={`block w-full mt-1 ${inputCls}`} />
          <p className="text-xs text-muted-foreground uppercase tracking-wide mt-4">Total spent · {monthLabel}</p>
          <p className="text-3xl font-semibold tabular-nums mt-1">{formatCurrency(monthTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">By category</p>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded for {monthLabel}.</p>
          ) : (
            <div className="space-y-2">
              {byCategory.map(([cat, amt]) => (
                <button key={cat} onClick={() => setCategory(category === cat ? 'All' : cat)} className={`w-full text-left rounded-md px-1 -mx-1 ${category === cat ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                  <div className="flex justify-between text-sm">
                    <span className={category === cat ? 'font-semibold' : ''}>{cat}</span>
                    <span className="tabular-nums font-medium">{formatCurrency(amt)} <span className="text-xs text-muted-foreground">({Math.round(amt / monthTotal * 100)}%)</span></span>
                  </div>
                  <div className="h-1.5 mt-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${(amt / byCategory[0][1]) * 100}%` }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search description, paid to, notes…" value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-9 ${inputCls}`} />
        </div>
        <select aria-label="Category filter" value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
          <option value="All">All categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {isLoading ? 'Loading…' : expenses.length ? 'No expenses match these filters.' : `No expenses recorded for ${monthLabel} yet.`}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed">
            <colgroup>
              <col className="w-[112px]" />
              <col className="w-[170px]" />
              <col />
              <col className="w-[130px]" />
              <col className="w-[130px]" />
              <col className="w-[84px]" />
            </colgroup>
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className={th}>Date</th>
                <th className={th}>Category</th>
                <th className={th}>Description</th>
                <th className={th}>Mode</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => editingId === e.id ? (
                <tr key={e.id} className="border-b border-border bg-muted/30 align-top">
                  <td className="px-3 py-2"><input type="date" aria-label="Date" max={istToday()} value={editForm.date} onChange={ev => setEditForm(p => ({ ...p, date: ev.target.value }))} className={cellInput} /></td>
                  <td className="px-3 py-2">
                    <select aria-label="Category" value={editForm.category} onChange={ev => setEditForm(p => ({ ...p, category: ev.target.value }))} className={cellInput}>
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 space-y-1.5">
                    <input aria-label="Description" value={editForm.description} onChange={ev => setEditForm(p => ({ ...p, description: ev.target.value }))} className={cellInput} />
                    <input aria-label="Paid to" placeholder="Paid to" value={editForm.paidTo} onChange={ev => setEditForm(p => ({ ...p, paidTo: ev.target.value }))} className={cellInput} />
                    <input aria-label="Notes" placeholder="Notes" value={editForm.notes} onChange={ev => setEditForm(p => ({ ...p, notes: ev.target.value }))} className={cellInput} />
                  </td>
                  <td className="px-3 py-2">
                    <select aria-label="Payment mode" value={editForm.paymentMode} onChange={ev => setEditForm(p => ({ ...p, paymentMode: ev.target.value }))} className={cellInput}>
                      {EXPENSE_PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input type="number" aria-label="Amount" min="0.01" step="0.01" value={editForm.amount} onChange={ev => setEditForm(p => ({ ...p, amount: ev.target.value }))} className={`${cellInput} text-right`} /></td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button onClick={saveEdit} disabled={saving} aria-label="Save" className="p-1.5 text-green hover:bg-green/10 rounded-md disabled:opacity-40"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} aria-label="Cancel" className="p-1.5 text-red hover:bg-red/10 rounded-md"><X className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40 even:bg-muted/15 align-top">
                  <td className="px-4 py-3 text-sm whitespace-nowrap tabular-nums">{formatDate(e.date)}</td>
                  <td className="px-4 py-3"><span className="inline-block text-xs font-medium bg-muted px-2 py-0.5 rounded">{e.category}</span></td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium break-words">{e.description}</p>
                    {(e.paidTo || e.notes) && (
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">{[e.paidTo && `Paid to ${e.paidTo}`, e.notes].filter(Boolean).join(' · ')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{e.paymentMode}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => startEdit(e)} aria-label={`Edit ${e.description}`} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(e)} aria-label={`Delete ${e.description}`} className="p-1.5 text-muted-foreground hover:text-red rounded-md hover:bg-red/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold">
                  {category !== 'All' || q ? `Shown (${filtered.length})` : `Total for ${monthLabel}`}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-right tabular-nums">{formatCurrency(shownTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
