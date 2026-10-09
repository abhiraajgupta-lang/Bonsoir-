'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { send as request, useBusy } from '@/lib/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { Plus, Pencil, Check, X, Trash2 } from 'lucide-react'
import { ROLE_LABELS, Employee } from '@/lib/auth-context'
import { EMPLOYEE_ROLES as ROLES, Role } from '@/lib/roles'

const emptyForm = { name: '', role: 'store_manager', mobile: '', email: '', password: '' }

export default function EmployeesPage() {
  const { data: employees = [], mutate: load } = useSWR<Employee[]>('/api/employees')
  const confirm = useConfirm()
  const [saving, runSave] = useBusy()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)

  const send = async (url: string, method: string, body?: object) => {
    const res = await request(url, method, body)
    load()
    return res.ok ? null : res.error
  }

  const create = () => runSave(async () => {
    const err = await send('/api/employees', 'POST', form)
    if (err) return setFormError(err)
    setShowNew(false)
    setFormError('')
    setForm(emptyForm)
  })

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id)
    setEditForm({ name: emp.name, role: emp.role, mobile: emp.mobile || '', email: emp.email || '', password: '' })
  }

  const saveEdit = () => runSave(async () => {
    if (!editingId || !editForm.name) return
    const { password, ...rest } = editForm
    const err = await send(`/api/employees/${editingId}`, 'PUT', password ? editForm : rest)
    if (err) return alert(err)
    setEditingId(null)
  })

  const toggleActive = async (emp: Employee) => {
    const err = await send(`/api/employees/${emp.id}`, 'PUT', { active: !emp.active })
    if (err) alert(err)
  }

  const deleteEmployee = async (emp: Employee) => {
    const ok = await confirm({
      title: `Delete ${emp.name}?`,
      message: 'They will no longer be able to log in. Tasks assigned to them stay in the list. To pause access instead, mark them Inactive.',
      confirmLabel: 'Delete employee',
    })
    if (!ok) return
    const err = await send(`/api/employees/${emp.id}`, 'DELETE')
    if (err) alert(err)
  }

  const roleLabel = (r: string) => ROLE_LABELS[r as Role] || r

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{employees.length} employee{employees.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold">New Employee</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg bg-background">
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <input type="text" placeholder="Mobile (optional)" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <input type="email" placeholder="Email (optional)" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <input type="password" autoComplete="new-password" placeholder="Login password * (min 6 characters)" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 sm:col-span-2" />
          </div>
          <p className="text-xs text-muted-foreground">The employee signs in with their <strong>name</strong> or <strong>mobile number</strong> and this password.</p>
          {formError && <p className="text-xs text-red">{formError}</p>}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Store Manager:</strong> Access to everything except creating new todos</p>
            <p><strong>Production Manager:</strong> Only orders tab, no customer contact info</p>
            <p><strong>Designer / Merchandiser:</strong> Only styles tab</p>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={saving || !form.name || form.password.length < 6} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">Add</button>
            <button onClick={() => { setShowNew(false); setFormError('') }} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          No employees added yet. Add employees and assign them roles.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Mobile</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium">{editingId ? 'Password' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-border last:border-0">
                  {editingId === emp.id ? (
                    <>
                      <td className="px-4 py-2"><input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded" /></td>
                      <td className="px-4 py-2">
                        {emp.role === 'owner' ? (
                          <span className="text-xs">{roleLabel(emp.role)}</span>
                        ) : (
                          <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded bg-background">
                            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-2 hidden sm:table-cell"><input type="text" value={editForm.mobile} onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded" /></td>
                      <td className="px-4 py-2 hidden sm:table-cell"><input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="w-full px-2 py-1 text-sm border border-border rounded" /></td>
                      <td className="px-4 py-2">
                        <input type="password" autoComplete="new-password" placeholder="New password (optional)" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} className="w-full min-w-36 px-2 py-1 text-sm border border-border rounded" />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={saveEdit} disabled={saving} aria-label="Save" className="p-1 text-green hover:bg-muted rounded disabled:opacity-40"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium">{emp.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-muted">{roleLabel(emp.role)}</span>
                        {!emp.hasPassword && <span className="ml-1 text-[10px] text-red">no password</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{emp.mobile || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{emp.email || '—'}</td>
                      <td className="px-4 py-3">
                        <button disabled={emp.role === 'owner'} onClick={() => toggleActive(emp)} className={`px-2 py-0.5 text-xs rounded-full ${emp.active ? 'bg-green/10 text-green' : 'bg-muted text-muted-foreground'}`}>
                          {emp.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(emp)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"><Pencil className="w-3.5 h-3.5" /></button>
                          {emp.role !== 'owner' && (
                            <button onClick={() => deleteEmployee(emp)} className="p-1 text-muted-foreground hover:text-red hover:bg-muted rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
