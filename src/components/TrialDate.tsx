import { formatDate, istDayStart } from '@/lib/constants'

export function daysFromToday(date: string | Date) {
  return Math.round((istDayStart(new Date(date)).getTime() - istDayStart().getTime()) / 86400000)
}

export function relativeDay(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

export function TrialDate({ date, done = false }: { date: string | null; done?: boolean }) {
  if (!date) return <span className="text-sm text-muted-foreground">—</span>
  const days = daysFromToday(date)
  const tone = done ? 'text-muted-foreground' : days < 0 ? 'text-red' : days <= 2 ? 'text-amber' : 'text-muted-foreground'
  return (
    <div className="whitespace-nowrap">
      <p className="text-sm">{formatDate(date)}</p>
      <p className={`text-xs font-medium ${tone}`}>{relativeDay(days)}</p>
    </div>
  )
}
