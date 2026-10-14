import { Hash } from 'lucide-react'

export function OrderNoBadge({ no, size = 'sm', className = '' }: { no?: string | null; size?: 'xs' | 'sm' | 'lg'; className?: string }) {
  if (!no) return null
  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1',
  }
  return (
    <span
      title="Internal production order number"
      className={`inline-flex items-center rounded-md bg-accent text-accent-foreground font-semibold tracking-wide whitespace-nowrap tabular-nums ${sizes[size]} ${className}`}
    >
      <Hash className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      {no}
    </span>
  )
}
