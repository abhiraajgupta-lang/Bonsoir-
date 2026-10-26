import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_MODES } from '@/lib/constants'

const has = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v)

export function cleanExpense(body: Record<string, unknown>, creating: boolean) {
  const data: Record<string, string | number | Date | null> = {}
  if (body.date !== undefined || creating) {
    const d = new Date(String(body.date ?? ''))
    if (isNaN(d.getTime())) return { data, error: 'Enter a valid date' }
    data.date = d
  }
  if (body.category !== undefined || creating) {
    if (!has(EXPENSE_CATEGORIES, body.category)) return { data, error: 'Choose a category' }
    data.category = body.category as string
  }
  if (body.description !== undefined || creating) {
    const desc = String(body.description ?? '').trim()
    if (!desc) return { data, error: 'Description is required' }
    data.description = desc.slice(0, 200)
  }
  if (body.amount !== undefined || creating) {
    const amt = Math.round(Number(body.amount) * 100) / 100
    if (!(amt > 0)) return { data, error: 'Amount must be more than 0' }
    data.amount = amt
  }
  if (body.paymentMode !== undefined) {
    if (!has(EXPENSE_PAYMENT_MODES, body.paymentMode)) return { data, error: 'Invalid payment mode' }
    data.paymentMode = body.paymentMode as string
  }
  if (body.paidTo !== undefined) data.paidTo = String(body.paidTo ?? '').trim() || null
  if (body.notes !== undefined) data.notes = String(body.notes ?? '').trim() || null
  return { data, error: null }
}

// "2026-10" → IST month bounds
export function monthRange(month: string | null) {
  const m = /^(\d{4})-(\d{2})$/.exec(month ?? '')
  if (!m) return null
  const ist = 5.5 * 60 * 60 * 1000
  const y = Number(m[1]), mo = Number(m[2]) - 1
  return { gte: new Date(Date.UTC(y, mo, 1) - ist), lt: new Date(Date.UTC(y, mo + 1, 1) - ist) }
}
