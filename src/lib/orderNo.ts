import { prisma } from '@/lib/prisma'

export const ORDER_NO_MAX = 30

export function cleanOrderNo(v: unknown) {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
}

// An internal order number belongs to one estimate and the order made from it.
// Discarded ones free the number for reuse.
export async function orderNoProblem(
  raw: unknown,
  { estimateId, orderId }: { estimateId?: string | null; orderId?: string | null } = {},
) {
  const no = cleanOrderNo(raw)
  if (!no) return 'Internal order number is required'
  if (no.length > ORDER_NO_MAX) return `Internal order number must be ${ORDER_NO_MAX} characters or fewer`

  const match = { internalOrderNo: { equals: no, mode: 'insensitive' as const }, status: { not: 'Discarded' } }
  const [est, ord] = await Promise.all([
    prisma.estimate.findFirst({
      where: {
        ...match,
        ...(estimateId ? { id: { not: estimateId } } : {}),
        ...(orderId ? { OR: [{ convertedOrderId: null }, { convertedOrderId: { not: orderId } }] } : {}),
      },
      select: { estimateNumber: true, customerName: true },
    }),
    prisma.order.findFirst({
      where: {
        ...match,
        ...(orderId ? { id: { not: orderId } } : {}),
        ...(estimateId ? { OR: [{ estimateId: null }, { estimateId: { not: estimateId } }] } : {}),
      },
      select: { orderNumber: true, customer: { select: { name: true } } },
    }),
  ])
  if (est) return `Order no. ${no} is already used on EST-${String(est.estimateNumber).padStart(4, '0')} (${est.customerName})`
  if (ord) return `Order no. ${no} is already used on Order #${ord.orderNumber} (${ord.customer.name})`
  return null
}
