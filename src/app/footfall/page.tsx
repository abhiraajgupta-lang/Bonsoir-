'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { FOOTFALL_SOURCES, formatDate } from '@/lib/constants'

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
  const [entries, setEntries] = useState<FootfallEntry[]>([])
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

  const load = () => {
    fetch('/api/footfall').then(r => r.json()).then(setEntries)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.customerName) return
    await fetch('/api/footfall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowNew(false)
    setForm({ customerName: '', mobile: '', visitSource: 'Walk-in', referenceCustomer: '', notes: '', createdAt: '' })
    load()
  }

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

  const saveEdit = async () => {
    if (!editingId || !editForm.customerName) return
    await fetch(`/api/footfall/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setEditingId(null)
    load()
  }

  const updateStatus = async (id: string, followUpStatus: string) => {
    await fetch(`/api/footfall/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followUpStatus }),
    })
    load()
  }

  const sourceStats = FOOTFALL_SOURCES.map(s => ({
    source: s,
    count: entries.filter(e => e.visitSource === s).length,
  })).filter(s => s.count > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Footfall Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{entries.length} visitor{entries.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90"
        >
          <Plus className="w-4 h-4" />
          New Visitor
        </button>
      </div>

      {sourceStats.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {sourceStats.map(s => (
            <div key={s.source} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium whitespace-nowrap">
              <span className="w-5 h-5 flex items-center justify-center bg-accent text-accent-foreground rounded-full text-xs font-bold">{s.count}</span>
              {s.source}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold">New Visitor Entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Customer Name *" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <input type="text" placeholder="Mobile Number" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Visit Source</label>
              <select value={form.visitSource} onChange={e => setForm(p => ({ ...p, visitSource: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                {FOOTFALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {form.visitSource === 'Reference' && (
              <input type="text" placeholder="Reference Customer Name" value={form.referenceCustomer} onChange={e => setForm(p => ({ ...p, referenceCustomer: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            )}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Visit Date (leave empty for today)</label>
              <input type="date" value={form.createdAt} onChange={e => setForm(p => ({ ...p, createdAt: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>
          <textarea placeholder="Notes (what are they looking for?)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring/20" />
          <div className="flex gap-2">
            <button onClick={create} disabled={!form.customerName} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">Save</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          No footfall entries yet. Start tracking visitors.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Visitor</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Mobile</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Source</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden md:table-cell">Reference</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Notes</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                editingId === e.id ? (
                  <tr key={e.id} className="border-b border-border last:border-0 bg-muted/30">
                    <td className="px-4 py-2">
                      <input type="text" value={editForm.customerName} onChange={ev => setEditForm(p => ({ ...p, customerName: ev.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded-lg" />
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell">
                      <input type="text" value={editForm.mobile} onChange={ev => setEditForm(p => ({ ...p, mobile: ev.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded-lg" />
                    </td>
                    <td className="px-4 py-2">
                      <select value={editForm.visitSource} onChange={ev => setEditForm(p => ({ ...p, visitSource: ev.target.value }))} className="px-2 py-1 text-xs border border-border rounded-lg bg-background">
                        {FOOTFALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell">
                      <input type="text" value={editForm.referenceCustomer} onChange={ev => setEditForm(p => ({ ...p, referenceCustomer: ev.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded-lg" />
                    </td>
                    <td className="px-4 py-2">
                      <select value={editForm.followUpStatus} onChange={ev => setEditForm(p => ({ ...p, followUpStatus: ev.target.value }))} className={`px-2 py-1 text-xs font-medium rounded-lg border-0 ${statusColors[editForm.followUpStatus] || 'bg-gray-100'}`}>
                        {FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2 hidden lg:table-cell">
                      <input type="text" value={editForm.notes} onChange={ev => setEditForm(p => ({ ...p, notes: ev.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded-lg" />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground hidden lg:table-cell">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="p-1 text-green hover:bg-green/10 rounded"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-red hover:bg-red/10 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{e.customerName}</span>
                    </td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell">{e.mobile || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">{e.visitSource}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{e.referenceCustomer || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={e.followUpStatus}
                        onChange={ev => updateStatus(e.id, ev.target.value)}
                        className={`px-2 py-1 text-xs font-medium rounded-lg border-0 ${statusColors[e.followUpStatus] || 'bg-gray-100'}`}
                      >
                        {FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{e.notes || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => startEdit(e)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted">
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
