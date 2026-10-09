import { prisma } from '@/lib/prisma'

// Discarding an order or its estimate marks both as Discarded; nothing is deleted.
export async function discardLinked({ orderId, estimateId, by }: { orderId?: string | null; estimateId?: string | null; by: string }) {
  const data = { status: 'Discarded', discardedAt: new Date(), discardedBy: by }
  const orderIds = new Set<string>(orderId ? [orderId] : [])
  const estimateIds = new Set<string>(estimateId ? [estimateId] : [])

  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { estimateId: true } })
    if (order?.estimateId) estimateIds.add(order.estimateId)
    const linked = await prisma.estimate.findMany({ where: { convertedOrderId: orderId }, select: { id: true } })
    linked.forEach(e => estimateIds.add(e.id))
  }
  if (estimateId) {
    const est = await prisma.estimate.findUnique({ where: { id: estimateId }, select: { convertedOrderId: true } })
    if (est?.convertedOrderId) orderIds.add(est.convertedOrderId)
  }

  await prisma.$transaction([
    prisma.order.updateMany({ where: { id: { in: [...orderIds] }, status: { not: 'Discarded' } }, data }),
    prisma.estimate.updateMany({ where: { id: { in: [...estimateIds] }, status: { not: 'Discarded' } }, data }),
  ])
  return { orders: orderIds.size, estimates: estimateIds.size }
}

export async function actorName(userId: string | null) {
  if (!userId) return 'Unknown'
  const emp = await prisma.employee.findUnique({ where: { id: userId }, select: { name: true } })
  return emp?.name ?? 'Unknown'
}
