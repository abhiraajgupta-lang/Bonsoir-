'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string
  href: string
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data)
      setOpen(true)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  const typeColors: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-700',
    order: 'bg-emerald-100 text-emerald-700',
    job: 'bg-purple-100 text-purple-700',
    style: 'bg-orange-100 text-orange-700',
    estimate: 'bg-indigo-100 text-indigo-700',
    footfall: 'bg-pink-100 text-pink-700',
    todo: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div ref={ref} className="relative max-w-xl w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search across all tabs..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {results.map(r => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => {
                router.push(r.href)
                setOpen(false)
                setQuery('')
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
            >
              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${typeColors[r.type] || 'bg-gray-100 text-gray-700'}`}>
                {r.type}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground z-50">
          No results found
        </div>
      )}
    </div>
  )
}
