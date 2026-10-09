'use client'

import { useEffect, useState, useRef } from 'react'
import useSWR from 'swr'
import { send, useBusy } from '@/lib/api'
import { Search, Plus, Palette, Pencil, X, Upload, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/constants'
import { useStyleCategories } from '@/lib/useStyleCategories'
import { useAuth } from '@/lib/auth-context'

interface Style {
  id: string
  styleCode: string | null
  name: string | null
  category: string
  pieces: number
  color: string | null
  price: number
  description: string | null
  fabric: string | null
  imageUrl: string | null
  status: string
}

const emptyForm = {
  styleCode: '', name: '', category: 'Suits', price: 0, pieces: 1, color: '',
  description: '', fabric: '', imageUrl: '', status: 'Active',
}

export default function StylesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('All')
  const { categories, refresh: refreshCategories } = useStyleCategories()
  const { isOwner } = useAuth()
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [addingCategory, runAddCategory] = useBusy()

  const addCategory = () => runAddCategory(async () => {
    const res = await send<{ name: string }>('/api/styles/categories', 'POST', { name: newCategory })
    if (!res.ok || !res.data) return setCategoryError(res.error || 'Could not add category')
    await refreshCategories()
    setCategory(res.data.name)
    setNewCategory('')
    setCategoryError('')
    setShowNewCategory(false)
  })
  const [saving, runSave] = useBusy()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [editingStyle, setEditingStyle] = useState<Style | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyForm })
  const [uploading, setUploading] = useState(false)
  const newFileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [category, categories.length])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const params = new URLSearchParams()
  if (debouncedSearch) params.set('search', debouncedSearch)
  if (category !== 'All') params.set('category', category)
  const { data: styles = [], mutate: load, isLoading } = useSWR<Style[]>(`/api/styles?${params}`)

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        return data.url
      }
    } catch {}
    setUploading(false)
    return null
  }

  const handleNewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    if (url) setForm(p => ({ ...p, imageUrl: url }))
    setUploading(false)
  }

  const handleEditImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    if (url) setEditForm(p => ({ ...p, imageUrl: url }))
    setUploading(false)
  }

  const createStyle = () => runSave(async () => {
    if (!form.category) return
    const res = await send('/api/styles', 'POST', form)
    if (!res.ok) return alert(res.error)
    setShowNew(false)
    setForm({ ...emptyForm })
    load()
  })

  const startEdit = (style: Style) => {
    setEditingStyle(style)
    setEditForm({
      styleCode: style.styleCode || '',
      name: style.name || '',
      category: style.category,
      price: style.price,
      pieces: style.pieces,
      color: style.color || '',
      description: style.description || '',
      fabric: style.fabric || '',
      imageUrl: style.imageUrl || '',
      status: style.status,
    })
  }

  const saveEdit = () => runSave(async () => {
    if (!editingStyle) return
    const res = await send<{ ordersUpdated: number }>(`/api/styles/${editingStyle.id}`, 'PUT', editForm)
    if (!res.ok) return alert(res.error)
    if (res.data && res.data.ordersUpdated > 0) alert(`Piece count updated on ${res.data.ordersUpdated} active order item(s).`)
    setEditingStyle(null)
    load()
  })

  const inputClass = "px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Style Bank</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90"
        >
          <Plus className="w-4 h-4" />
          New Style
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold">New Style</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" placeholder="Style Code (optional)" value={form.styleCode} onChange={e => setForm(p => ({ ...p, styleCode: e.target.value }))} className={inputClass} />
            <input type="text" placeholder="Style Name (optional)" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg bg-background">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Price" value={form.price || ''} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} className={inputClass} />
            <input type="text" placeholder="Fabric" value={form.fabric} onChange={e => setForm(p => ({ ...p, fabric: e.target.value }))} className={inputClass} />
            <input type="text" placeholder="Color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className={inputClass} />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Production Pieces</label>
              <select value={form.pieces} onChange={e => setForm(p => ({ ...p, pieces: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                <option value={1}>1 piece (single garment)</option>
                <option value={2}>2 pieces (e.g. blazer + trouser)</option>
                <option value={3}>3 pieces (e.g. blazer + trouser + waistcoat)</option>
                <option value={4}>4 pieces</option>
              </select>
            </div>
            <input type="text" placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass} />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Style Image</label>
              <div className="flex items-center gap-2">
                {form.imageUrl ? (
                  <div className="relative w-10 h-10 rounded border border-border overflow-hidden">
                    <img loading="lazy" decoding="async" src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="absolute -top-1 -right-1 bg-red text-white rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                  </div>
                ) : null}
                <button
                  onClick={() => newFileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-40"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <input ref={newFileRef} type="file" accept="image/*" onChange={handleNewImage} className="hidden" />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Style code and name are optional — leave blank for custom garments. Pieces count determines how many production units this style breaks into.</p>
          <div className="flex gap-2">
            <button onClick={createStyle} disabled={saving || uploading} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">{saving ? 'Creating…' : 'Create'}</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search styles by name, code, or color..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto min-w-0 sm:max-w-[60%]">
          {['All', ...categories].map(c => (
            <button
              key={c}
              data-active={category === c || undefined}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                category === c ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {isOwner && (
          <button
            onClick={() => { setShowNewCategory(!showNewCategory); setCategoryError('') }}
            className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Plus className="w-4 h-4" /> Category
          </button>
        )}
      </div>

      {isOwner && showNewCategory && (
        <form
          onSubmit={e => { e.preventDefault(); addCategory() }}
          className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-2"
        >
          <label htmlFor="new-category" className="text-sm font-medium shrink-0">New category</label>
          <input
            id="new-category"
            autoFocus
            maxLength={40}
            placeholder="e.g. Jodhpuri, Achkan, Nehru Jacket"
            value={newCategory}
            onChange={e => { setNewCategory(e.target.value); setCategoryError('') }}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <div className="flex gap-2">
            <button disabled={addingCategory || newCategory.trim().length < 2} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">
              {addingCategory ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowNewCategory(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
          </div>
          {categoryError && <p className="text-xs text-red sm:basis-full">{categoryError}</p>}
        </form>
      )}

      {styles.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          {isLoading ? 'Loading…' : search || category !== 'All' ? 'No styles match your search.' : 'No styles yet. Add your first style to build the style bank.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {styles.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-sm transition-shadow group relative">
              <button
                onClick={() => startEdit(s)}
                className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <div className="aspect-square bg-muted flex items-center justify-center">
                {s.imageUrl ? (
                  <img loading="lazy" decoding="async" src={s.imageUrl} alt={s.name || 'Style'} className="w-full h-full object-cover" />
                ) : (
                  <Palette className="w-8 h-8 text-muted-foreground/30" />
                )}
              </div>
              <div className="p-3">
                {s.styleCode && <p className="text-xs font-semibold text-muted-foreground">{s.styleCode}</p>}
                <p className="text-sm font-medium truncate">{s.name || 'Custom Style'}</p>
                <p className="text-sm font-semibold mt-1">{formatCurrency(s.price)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">{s.category}</p>
                  {s.pieces > 1 && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{s.pieces}-pc</span>
                  )}
                </div>
                {s.color && <p className="text-xs text-muted-foreground mt-0.5">{s.color}</p>}
                {s.fabric && <p className="text-xs text-muted-foreground">{s.fabric}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingStyle && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEditingStyle(null)} />
          <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Edit Style</h2>
              <button onClick={() => setEditingStyle(null)} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  {editForm.imageUrl ? (
                    <img loading="lazy" decoding="async" src={editForm.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Palette className="w-6 h-6 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => editFileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-40"
                  >
                    <Upload className="w-3 h-3" />
                    {uploading ? 'Uploading...' : editForm.imageUrl ? 'Change Image' : 'Upload Image'}
                  </button>
                  {editForm.imageUrl && (
                    <button onClick={() => setEditForm(p => ({ ...p, imageUrl: '' }))} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red border border-border rounded-lg hover:bg-muted">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                  <input ref={editFileRef} type="file" accept="image/*" onChange={handleEditImage} className="hidden" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Style Code" value={editForm.styleCode} onChange={e => setEditForm(p => ({ ...p, styleCode: e.target.value }))} className={inputClass} />
                <input type="text" placeholder="Style Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
                <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} className="px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" placeholder="Price" value={editForm.price || ''} onChange={e => setEditForm(p => ({ ...p, price: Number(e.target.value) }))} className={inputClass} />
                <input type="text" placeholder="Fabric" value={editForm.fabric} onChange={e => setEditForm(p => ({ ...p, fabric: e.target.value }))} className={inputClass} />
                <input type="text" placeholder="Color" value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} className={inputClass} />
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Pieces</label>
                  <select value={editForm.pieces} onChange={e => setEditForm(p => ({ ...p, pieces: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                    <option value={1}>1 piece</option>
                    <option value={2}>2 pieces</option>
                    <option value={3}>3 pieces</option>
                    <option value={4}>4 pieces</option>
                  </select>
                </div>
                <input type="text" placeholder="Description" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button onClick={saveEdit} disabled={saving || uploading} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40">{saving ? 'Saving…' : 'Save Changes'}</button>
              <button onClick={() => setEditingStyle(null)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
