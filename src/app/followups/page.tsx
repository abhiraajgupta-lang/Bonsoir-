'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Pencil, Check, X, Search, MessageCircle, Phone } from 'lucide-react'
import { send, useBusy } from '@/lib/api'
import { FOLLOW_UP_CHANNELS, FOLLOW_UP_INTENTS, FOLLOW_UP_STATUSES, formatDate } from '@/lib/constants'

interface FollowUp {
  id: string
  name: string
  mobile: string
  channel: string
  intent: string
  followUpStatus: string
  notes: string | null
  createdBy: string | null
  createdAt: string
}

const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-yellow-100 text-yellow-700',
  Interested: 'bg-purple-100 text-purple-700',
  'Visit Scheduled': 'bg-amber-100 text-amber-800',
  Converted: 'bg-emerald-100 text-emerald-700',
  'Not Interested': 'bg-gray-100 text-gray-600',
}

const emptyForm = { name: '', mobile: '', channel: 'WhatsApp', intent: 'Store Visit', followUpStatus: 'New', notes: '' }

// Indian 10-digit numbers get the +91 prefix so WhatsApp links work.
const waNumber = (mobile: string) => {
  const digits = mobile.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

export default function FollowUpsPage() {
  const { data: items = [], mutate: load, isLoading } = useSWR<FollowUp[]>('/api/followups')
  const [saving, runSave] = useBusy()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [channelFilter, setChannelFilter] = useState('All')
  const [intentFilter, setIntentFilter] = useState('All')

  const create = () => runSave(async () => {
    const res = await send('/api/followups', 'POST', form)
    if (!res.ok) return setFormError(res.error || 'Could not save')
    setForm(emptyForm)
    setFormError('')
    setShowNew(false)
    load()
  })

  const startEdit = (f: FollowUp) => {
    setEditingId(f.id)
    setEditForm({ name: f.name, mobile: f.mobile, channel: f.channel, intent: f.intent, followUpStatus: f.followUpStatus, notes: f.notes || '' })
  }

  const saveEdit = () => runSave(async () => {
    if (!editingId) return
    const res = await send(`/api/followups/${editingId}`, 'PUT', editForm)
    if (!res.ok) return alert(res.error)
    setEditingId(null)
    load()
  })

  const updateStatus = async (id: string, followUpStatus: string) => {
    load(items.map(f => (f.id === id ? { ...f, followUpStatus } : f)), { revalidate: false })
    const res = await send(`/api/followups/${id}`, 'PUT', { followUpStatus })
    if (!res.ok) alert(res.error)
    load()
  }

  const q = search.trim().toLowerCase()
  const filtered = items.filter(f =>
    (statusFilter === 'All' || f.followUpStatus === statusFilter) &&
    (channelFilter === 'All' || f.channel === channelFilter) &&
    (intentFilter === 'All' || f.intent === intentFilter) &&
    (!q || [f.name, f.mobile, f.notes].some(v => v?.toLowerCase().includes(q))),
  )
  const hasFilters = !!(q || statusFilter !== 'All' || channelFilter !== 'All' || intentFilter !== 'All')
  const openCount = items.filter(f => f.followUpStatus !== 'Converted' && f.followUpStatus !== 'Not Interested').length

  const inputCls = 'px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20'
  const th = 'text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap'
  const cellInput = 'w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background'

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Follow-ups</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            WhatsApp &amp; phone enquiries who haven&apos;t visited yet · {openCount} open
            {hasFilters && ` · ${filtered.length} shown`}
          </p>
        </div>
        <button
          onClick={() => { setShowNew(!showNew); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90"
        >
          <Plus className="w-4 h-4" />
          New Follow-up
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FOLLOW_UP_STATUSES.map(s => {
          const count = items.filter(f => f.followUpStatus === s).length
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? 'All' : s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium whitespace-nowrap ${active ? 'bg-accent text-accent-foreground border-accent' : 'bg-card border-border hover:bg-muted'}`}
            >
              <span className={`min-w-5 h-5 px-1 flex items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-white/20' : statusColors[s]}`}>{count}</span>
              {s}
            </button>
          )
        })}
      </div>

      {showNew && (
        <form onSubmit={e => { e.preventDefault(); create() }} className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold">New Follow-up</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required autoFocus placeholder="Customer name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
            <input required type="tel" inputMode="tel" placeholder="Mobile number *" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} className={inputCls} />
            <div>
              <span className="block text-xs text-muted-foreground mb-1">Contacted via</span>
              <div className="flex gap-2">
                {FOLLOW_UP_CHANNELS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setForm(p => ({ ...p, channel: c }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${form.channel === c ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-muted'}`}
                  >
                    {c === 'WhatsApp' ? <MessageCircle className="w-4 h-4" /> : <Phone className="w-4 h-4" />}{c}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-xs text-muted-foreground">
              Plans to
              <select value={form.intent} onChange={e => setForm(p => ({ ...p, intent: e.target.value }))} className={`block w-full mt-1 ${inputCls}`}>
                {FOLLOW_UP_INTENTS.map(i => <option key={i} value={i}>{i === 'Store Visit' ? 'Visit the store' : i === 'Online Order' ? 'Order online' : 'Undecided'}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Follow-up status
              <select value={form.followUpStatus} onChange={e => setForm(p => ({ ...p, followUpStatus: e.target.value }))} className={`block w-full mt-1 ${inputCls}`}>
                {FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <textarea placeholder="Notes (what are they looking for, budget, event date, preferred visit time…)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className={`w-full resize-none ${inputCls}`} />
          {formError && <p className="text-xs text-red">{formError}</p>}
          <div className="flex gap-2">
            <button disabled={saving || !form.name.trim() || !form.mobile.trim()} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-card border border-border rounded-xl p-3 mb-4 grid grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto] gap-2">
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search name, mobile, notes…" value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-9 ${inputCls}`} />
        </div>
        <select aria-label="Channel" value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className={inputCls}>
          <option value="All">WhatsApp &amp; Call</option>
          {FOLLOW_UP_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Plans to" value={intentFilter} onChange={e => setIntentFilter(e.target.value)} className={inputCls}>
          <option value="All">Any plan</option>
          {FOLLOW_UP_INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select aria-label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
          <option value="All">All statuses</option>
          {FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasFilters ? (
          <button onClick={() => { setSearch(''); setStatusFilter('All'); setChannelFilter('All'); setIntentFilter('All') }} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            Clear
          </button>
        ) : <span className="hidden lg:block" />}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {isLoading ? 'Loading…' : hasFilters ? 'No follow-ups match these filters.' : 'No follow-ups yet. Add customers who contact you on WhatsApp or call.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[1040px] table-fixed">
            <colgroup>
              <col className="w-11" />
              <col className="w-[104px]" />
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[104px]" />
              <col className="w-[116px]" />
              <col className="w-[164px]" />
              <col />
              <col className="w-[64px]" />
            </colgroup>
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className={th}>#</th>
                <th className={th}>Added</th>
                <th className={th}>Name</th>
                <th className={th}>Mobile</th>
                <th className={th}>Via</th>
                <th className={th}>Plans to</th>
                <th className={th}>Follow-up</th>
                <th className={th}>Notes</th>
                <th className={`${th} text-right`}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => editingId === f.id ? (
                <tr key={f.id} className="border-b border-border last:border-0 bg-muted/30 align-top">
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(f.createdAt)}</td>
                  <td className="px-4 py-2"><input aria-label="Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={cellInput} /></td>
                  <td className="px-4 py-2"><input aria-label="Mobile" type="tel" value={editForm.mobile} onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))} className={cellInput} /></td>
                  <td className="px-4 py-2">
                    <select aria-label="Channel" value={editForm.channel} onChange={e => setEditForm(p => ({ ...p, channel: e.target.value }))} className={cellInput}>
                      {FOLLOW_UP_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select aria-label="Plans to" value={editForm.intent} onChange={e => setEditForm(p => ({ ...p, intent: e.target.value }))} className={cellInput}>
                      {FOLLOW_UP_INTENTS.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select aria-label="Status" value={editForm.followUpStatus} onChange={e => setEditForm(p => ({ ...p, followUpStatus: e.target.value }))} className={cellInput}>
                      {FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2"><textarea aria-label="Notes" rows={2} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className={`${cellInput} resize-none`} /></td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <button onClick={saveEdit} disabled={saving} aria-label="Save" className="p-1.5 text-green hover:bg-green/10 rounded-md disabled:opacity-40"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} aria-label="Cancel" className="p-1.5 text-red hover:bg-red/10 rounded-md"><X className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={f.id} className={`border-b border-border last:border-0 hover:bg-muted/40 even:bg-muted/15 align-top ${f.followUpStatus === 'Not Interested' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap tabular-nums" title={f.createdBy ? `Added by ${f.createdBy}` : undefined}>{formatDate(f.createdAt)}</td>
                  <td className="px-4 py-3 text-sm font-medium break-words">{f.name}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm tabular-nums whitespace-nowrap">{f.mobile}</div>
                    <div className="flex gap-2 mt-1">
                      <a href={`https://wa.me/${waNumber(f.mobile)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-green hover:underline">
                        <MessageCircle className="w-3 h-3" />WhatsApp
                      </a>
                      <a href={`tel:${f.mobile}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline">
                        <Phone className="w-3 h-3" />Call
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted px-2 py-0.5 rounded whitespace-nowrap">
                      {f.channel === 'WhatsApp' ? <MessageCircle className="w-3 h-3" /> : <Phone className="w-3 h-3" />}{f.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{f.intent}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label="Follow-up status"
                      value={f.followUpStatus}
                      onChange={e => updateStatus(f.id, e.target.value)}
                      className={`w-full px-2 py-1 text-xs font-medium rounded-md border-0 ${statusColors[f.followUpStatus] || 'bg-gray-100'}`}
                    >
                      {FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <p className="line-clamp-3 break-words whitespace-pre-line" title={f.notes || undefined}>{f.notes || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(f)} aria-label={`Edit ${f.name}`} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
