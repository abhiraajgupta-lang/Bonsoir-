'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

export interface PickerCustomer {
  id: string
  customerId: string
  name: string
  mobile: string
}

interface Props {
  onSelect: (customer: PickerCustomer) => void
  placeholder?: string
  compact?: boolean
}

export default function CustomerPicker({ onSelect, placeholder = 'Search customer by name or mobile...', compact }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PickerCustomer[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/customers?search=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(data => setResults(Array.isArray(data) ? data.slice(0, 30) : []))
        .catch(() => {})
    }, 200)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [query, open])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const pick = (c: PickerCustomer) => {
    onSelect(c)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      {!compact && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        className={compact
          ? 'w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20'
          : 'w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20'}
      />
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-2.5 text-xs text-muted-foreground">No customers found</p>
          ) : results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className={`w-full text-left hover:bg-muted border-b border-border last:border-0 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}`}
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground ml-2">{c.mobile}</span>
              <span className="text-muted-foreground ml-2 text-xs">{c.customerId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
