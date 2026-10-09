'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { send, useBusy } from '@/lib/api'
import { Plus, Pencil, Check, X, Download, Search } from 'lucide-react'
import { FOOTFALL_SOURCES, formatDate } from '@/lib/constants'
import { downloadCsv } from '@/lib/csv'
import { useAuth } from '@/lib/auth-context'

interface FootfallEntry {
  id: string
  customerName: string
  mobile: string | null
  visitSource: string
  referenceCustomer: string | null
  followUpStatus: string
  notes: string | null
  createdAt: string
}

const FOLLOW_UP_STATUSES = ['Pending', 'Interested', 'Follow Up', 'Converted', 'Not Interested']

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Interested: 'bg-blue-100 text-blue-700',
  'Follow Up': 'bg-purple-100 text-purple-700',
  Converted: 'bg-emerald-100 text-emerald-700',
  'Not Interested': 'bg-gray-100 text-gray-600',
}

export default function FootfallPage() {
  const { data: entries = [], mutate: load, isLoading } = useSWR<FootfallEntry[]>('/api/footfall')
  const { isOwner } = useAuth()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [saving, runSave] = useBusy()
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ customerName: '', mobile: '', visitSource: '', referenceCustomer: '', followUpStatus: '', notes: '' })
  const [form, setForm] = useState({
    customerName: '',
    mobile: '',
    visitSource: 'Walk-in',
    referenceCustomer: '',
    notes: '',
    createdAt: '',
  })

  const create = () => runSave(async () => {
    if (!form.customerName) return
    const res = await send('/api/footfall', 'POST', form)
    if (!res.ok) return alert(res.error)
    setShowNew(false)
    setForm({ customerName: '', mobile: '', visitSource: 'Walk-in', referenceCustomer: '', notes: '', createdAt: '' })
    load()
  })

  const startEdit = (e: FootfallEntry) => {
    setEditingId(e.id)
    setEditForm({
      customerName: e.customerName,
      mobile: e.mobile || '',
      visitSource: e.visitSource,
      referenceCustomer: e.referenceCustomer || '',
      followUpStatus: e.followUpStatus,
      notes: e.notes || '',
    })
  }

  const saveEdit = () => runSave(async () => {
    if (!editingId || !editForm.customerName) return
    const res = await send(`/api/footfall/${editingId}`, 'PUT', editForm)
    if (!res.ok) return alert(res.error)
    setEditingId(null)
    load()
  })

  const updateStatus = async (id: string, followUpStatus: string) => {
    load(entries.map(e => (e.id === id ? { ...e, followUpStatus } : e)), { revalidate: false })
    const res = await send(`/api/footfall/${id}`, 'PUT', { followUpStatus })
    if (!res.ok) alert(res.error)
    load()
  }

  const localDay = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const q = search.trim().toLowerCase()
  const filtered = entries.filter(e => {
    if (sourceFilter !== 'All' && e.visitSource !== sourceFilter) return false
    if (statusFilter !== 'All' && e.followUpStatus !== statusFilter) return false
    const day = localDay(e.createdAt)
    if (fromDate && day < fromDate) return false
    if (toDate && day > toDate) return false
    if (q && ![e.customerName, e.mobile, e.referenceCustomer, e.notes].some(v => v?.toLowerCase().includes(q))) return false
    return true
  })
  const hasFilters = !!(q || sourceFilter !== 'All' || statusFilter !== 'All' || fromDate || toDate)

  const sourceStats = FOOTFALL_SOURCES.map(s => ({
    source: s,
    count: entries.filter(e => e.visitSource === s).length,
  })).filter(s => s.count > 0)

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(
      `bonsoir-footfall-${stamp}.csv`,
      ['S.No', 'Visit Date', 'Visitor Name', 'Mobile', 'Visit Source', 'Reference Customer', 'Follow-up Status', 'Notes'],
      filtered.map((e, i) => [i + 1, localDay(e.createdAt), e.customerName, e.mobile, e.visitSource, e.referenceCustomer, e.followUpStatus, e.notes]),
    )
  }

  const inputCls = 'px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20'
  const th = 'text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap'
  const cellInput = 'w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background'

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Footfall Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {entries.length} visitor{entries.length !== 1 ? 's' : ''} recorded
            {hasFilters && ` · ${filtered.length} shown`}
          </p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              Export CSV{hasFilters ? ` (${filtered.length})` : ''}
            </button>
          )}
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" />
            New Visitor
          </button>
        </div>
      </div>

      {sourceStats.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {sourceStats.map(s => (
            <button
              key={s.source}
              onClick={() => setSourceFilter(sourceFilter === s.source ? 'All' : s.source)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium whitespace-nowrap ${sourceFilter === s.source ? 'bg-accent text-accent-foreground border-accent' : 'bg-card border-border hover:bg-muted'}`}
            >
              <span className={`min-w-5 h-5 px-1 flex items-center justify-center rounded-full text-xs font-bold ${sourceFilter === s.source ? 'bg-white/20' : 'bg-accent text-accent-foreground'}`}>{s.count}</span>
              {s.source}
            </button>
          ))}
        </div>
      )}

      {showNew && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold">New Visitor Entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Customer Name *" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} className={inputCls} />
            <input type="tel" placeholder="Mobile Number" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} className={inputCls} />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Visit Source</label>
              <select value={form.visitSource} onChange={e => setForm(p => ({ ...p, visitSource: e.target.value }))} className={`w-full ${inputCls}`}>
                {FOOTFALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {form.visitSource === 'Reference' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Referred by</label>
                <input type="text" placeholder="Reference Customer Name" value={form.referenceCustomer} onChange={e => setForm(p => ({ ...p, referenceCustomer: e.target.value }))} className={`w-full ${inputCls}`} />
              </div>
            )}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Visit Date (leave empty for today)</label>
              <input type="date" value={form.createdAt} onChange={e => setForm(p => ({ ...p, createdAt: e.target.value }))} className={`w-full ${inputCls}`} />
            </div>
          </div>
          <textarea placeholder="Notes (what are they looking for?)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className={`w-full resize-none ${inputCls}`} />
          <div className="flex gap-2">
            <button onClick={create} disabled={!form.customerName || saving} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-3 mb-4 grid grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 items-end">
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search name, mobile, reference, notes…" value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-9 ${inputCls}`} />
        </div>
        <select aria-label="Source" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className={inputCls}>
          <option value="All">All sources</option>
          {FOOTFALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
          <option value="All">All statuses</option>
          {FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="text-xs text-muted-foreground">
          From
          <input type="date" value={fromDate} max={toDate || undefined} onChange={e => setFromDate(e.target.value)} className={`block w-full mt-0.5 ${inputCls}`} />
        </label>
        <label className="text-xs text-muted-foreground">
          To
          <input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} className={`block w-full mt-0.5 ${inputCls}`} />
        </label>
        {hasFilters ? (
          <button
            onClick={() => { setSearch(''); setSourceFilter('All'); setStatusFilter('All'); setFromDate(''); setToDate('') }}
            className="col-span-2 lg:col-span-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        ) : <span className="hidden lg:block" />}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {isLoading ? 'Loading…' : hasFilters ? 'No visitors match these filters.' : 'No footfall entries yet. Start tracking visitors.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed">
            <colgroup>
              <col className="w-11" />
              <col className="w-[108px]" />
              <col className="w-[160px]" />
              <col className="w-[118px]" />
              <col className="w-[108px]" />
              <col className="w-[130px]" />
              <col className="w-[138px]" />
              <col />
              <col className="w-[64px]" />
            </colgroup>
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className={th}>#</th>
                <th className={th}>Visit Date</th>
                <th className={th}>Visitor</th>
                <th className={th}>Mobile</th>
                <th className={th}>Source</th>
                <th className={th}>Reference</th>
                <th className={th}>Follow-up</th>
                <th className={th}>Notes</th>
                <th className={`${th} text-right`}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                editingId === e.id ? (
                  <tr key={e.id} className="border-b border-border last:border-0 bg-muted/30 align-top">
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap tabular-nums">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-2"><input type="text" aria-label="Visitor name" value={editForm.customerName} onChange={ev => setEditForm(p => ({ ...p, customerName: ev.target.value }))} className={cellInput} /></td>
                    <td className="px-4 py-2"><input type="tel" aria-label="Mobile" value={editForm.mobile} onChange={ev => setEditForm(p => ({ ...p, mobile: ev.target.value }))} className={cellInput} /></td>
                    <td className="px-4 py-2">
                      <select aria-label="Source" value={editForm.visitSource} onChange={ev => setEditForm(p => ({ ...p, visitSource: ev.target.value }))} className={cellInput}>
                        {FOOTFALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2"><input type="text" aria-label="Reference" value={editForm.referenceCustomer} onChange={ev => setEditForm(p => ({ ...p, referenceCustomer: ev.target.value }))} className={cellInput} /></td>
                    <td className="px-4 py-2">
                      <select aria-label="Follow-up status" value={editForm.followUpStatus} onChange={ev => setEditForm(p => ({ ...p, followUpStatus: ev.target.value }))} className={cellInput}>
                        {FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2"><input type="text" aria-label="Notes" value={editForm.notes} onChange={ev => setEditForm(p => ({ ...p, notes: ev.target.value }))} className={cellInput} /></td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <button onClick={saveEdit} disabled={saving} aria-label="Save" className="p-1.5 text-green hover:bg-green/10 rounded-md disabled:opacity-40"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} aria-label="Cancel" className="p-1.5 text-red hover:bg-red/10 rounded-md"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40 even:bg-muted/15 align-top">
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap tabular-nums">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium break-words">{e.customerName}</td>
                    <td className="px-4 py-3 text-sm tabular-nums whitespace-nowrap">{e.mobile || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-xs font-medium bg-muted px-2 py-0.5 rounded whitespace-nowrap">{e.visitSource}</span>
                    </td>
                    <td className="px-4 py-3 text-sm break-words">{e.referenceCustomer || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3">
                      <select
                        aria-label="Follow-up status"
                        value={e.followUpStatus}
                        onChange={ev => updateStatus(e.id, ev.target.value)}
                        className={`w-full px-2 py-1 text-xs font-medium rounded-md border-0 ${statusColors[e.followUpStatus] || 'bg-gray-100'}`}
                      >
                        {FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <p className="line-clamp-2 break-words" title={e.notes || undefined}>{e.notes || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => startEdit(e)} aria-label={`Edit ${e.customerName}`} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
