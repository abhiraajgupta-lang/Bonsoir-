import { prisma } from '@/lib/prisma'
import { FOOTFALL_SOURCES, FOOTFALL_STATUSES } from '@/lib/constants'

export const footfallInclude = { customer: { select: { id: true, customerId: true, name: true } } } as const

const has = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v)

export async function cleanFootfall(body: Record<string, unknown>, creating: boolean) {
  const data: Record<string, string | null> = {}
  if (body.customerName !== undefined || creating) {
    const name = String(body.customerName ?? '').trim()
    if (!name) return { data, error: 'Visitor name is required' }
    data.customerName = name
  }
  if (body.mobile !== undefined) data.mobile = String(body.mobile ?? '').trim() || null
  if (body.visitSource !== undefined || creating) {
    if (!has(FOOTFALL_SOURCES, body.visitSource)) return { data, error: 'Choose a visit source' }
    data.visitSource = body.visitSource as string
  }
  if (body.referenceCustomer !== undefined) data.referenceCustomer = String(body.referenceCustomer ?? '').trim() || null
  if (body.followUpStatus !== undefined) {
    if (!has(FOOTFALL_STATUSES, body.followUpStatus)) return { data, error: 'Invalid status' }
    data.followUpStatus = body.followUpStatus as string
  }
  if (body.notes !== undefined) data.notes = String(body.notes ?? '').trim() || null
  if (body.customerId === undefined && data.mobile) {
    // Auto-link when the number belongs to an existing customer.
    const digits = data.mobile.replace(/\D/g, '').slice(-10)
    const match = digits.length === 10
      ? await prisma.customer.findFirst({ where: { mobile: { endsWith: digits } }, select: { id: true } })
      : null
    if (match) data.customerId = match.id
  }
  if (body.customerId !== undefined) {
    if (body.customerId) {
      const exists = await prisma.customer.findUnique({ where: { id: String(body.customerId) }, select: { id: true } })
      if (!exists) return { data, error: 'Selected customer no longer exists' }
      data.customerId = exists.id
    } else {
      data.customerId = null
    }
  }
  return { data, error: null }
}
