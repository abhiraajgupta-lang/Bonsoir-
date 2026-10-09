'use client'

import { PIECE_SETS, getPieceSet } from '@/lib/constants'

export function PieceSetSelect({ value, onChange }: { value?: string; onChange: (key: string) => void }) {
  const set = getPieceSet(value)
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <label className="text-xs text-muted-foreground shrink-0">
        Pieces
        <select
          value={set.key}
          onChange={e => onChange(e.target.value)}
          className="block sm:inline-block sm:ml-2 mt-1 sm:mt-0 w-full sm:w-auto px-2 py-1.5 text-xs text-foreground border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          {[1, 2, 3].map(n => (
            <optgroup key={n} label={`${n} piece`}>
              {PIECE_SETS.filter(p => p.pieces === n).map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-1">
        {set.parts.map((part, i) => (
          <span key={part} className="inline-flex items-center gap-1 text-[11px] font-medium bg-card border border-border rounded px-1.5 py-0.5">
            <span className="text-muted-foreground">{String.fromCharCode(65 + i)}</span>{part}
          </span>
        ))}
        {set.pieces > 1 && <span className="text-[11px] text-muted-foreground">→ {set.pieces} separate production jobs</span>}
      </div>
    </div>
  )
}
