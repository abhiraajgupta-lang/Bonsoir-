import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getPieceSet } from '@/lib/constants'
import { createJobsForItem, getStylePieces } from '@/lib/jobs'

export interface EstimateItem {
  uid?: string
  garment: string
  amount: number
  styleId?: string
  pieces?: number
  pieceSet?: string
  customerId?: string
  customerName?: string
}

export function parseItems(raw: string | null): EstimateItem[] {
  try {
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Items saved before keys existed are identified by their original position;
// their jobs were numbered from that position, which lets us find them later.
export const itemKey = (item: EstimateItem, index: number) => item.uid ?? `legacy-${index}`

export const withStoredKeys = (items: EstimateItem[]) => items.map((it, i) => ({ ...it, uid: itemKey(it, i) }))

export const withNewKeys = (items: EstimateItem[]) => items.map(it => ({ ...it, uid: it.uid || randomUUID() }))

const pad = (n: number) => String(n).padStart(2, '0')

function jobsForKey(
  jobs: Array<{ id: string; jobNumber: string; estimateItemKey: string | null }>,
  key: string,
  orderNumber: number,
) {
  const legacy = /^legacy-(\d+)$/.exec(key)
  const base = legacy ? `${orderNumber}-${pad(Number(legacy[1]) + 1)}` : null
  return jobs.filter(j =>
    j.estimateItemKey === key ||
    (!j.estimateItemKey && base !== null && (j.jobNumber === base || new RegExp(`^${base}[A-Z]$`).test(j.jobNumber))),
  )
}

export function diffItems(oldItems: EstimateItem[], newItems: EstimateItem[]) {
  const oldKeys = oldItems.map(itemKey)
  const newKeys = new Set(newItems.map(it => it.uid))
  return {
    removed: oldKeys.filter(k => !newKeys.has(k)),
    added: newItems.filter(it => !oldKeys.includes(it.uid!)),
  }
}

// Mirror estimate edits onto the order it was converted into.
export async function syncOrderWithEstimate(opts: {
  orderId: string
  estimateCustomerId: string | null
  oldItems: EstimateItem[]
  newItems: EstimateItem[]
  totals: { totalAmount: number; discountType: string | null; discountValue: number; discountAmount: number; netPayable: number }
  deliveryDate: Date | null
}) {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: { jobs: { select: { id: true, jobNumber: true, estimateItemKey: true } }, payments: { select: { amount: true } } },
  })
  if (!order || order.status === 'Discarded') return { removedJobs: 0, addedJobs: 0 }

  const { removed, added } = diffItems(opts.oldItems, opts.newItems)
  const removeIds = removed.flatMap(k => jobsForKey(order.jobs, k, order.orderNumber).map(j => j.id))
  const paid = order.payments.reduce((s, p) => s + p.amount, 0)

  let nextIndex = Math.max(
    0,
    ...order.jobs.map(j => Number(new RegExp(`^${order.orderNumber}-(\\d+)`).exec(j.jobNumber)?.[1] ?? 0)),
  ) + 1

  const measurementFor = new Map<string, string | null>()
  for (const cid of new Set([opts.estimateCustomerId, ...added.map(a => a.customerId)].filter((c): c is string => !!c))) {
    const m = await prisma.measurementSet.findFirst({ where: { customerId: cid }, orderBy: { version: 'desc' } })
    measurementFor.set(cid, m?.id ?? null)
  }

  let addedJobs = 0
  await prisma.$transaction(async tx => {
    if (removeIds.length) await tx.job.deleteMany({ where: { id: { in: removeIds } } })

    const livePieces = await getStylePieces(tx, added.map(a => a.styleId))
    for (const item of added) {
      const forOther = item.customerId && item.customerId !== opts.estimateCustomerId
      const before = await tx.job.count({ where: { orderId: order.id } })
      await createJobsForItem(tx, {
        orderId: order.id,
        baseJobNumber: `${order.orderNumber}-${pad(nextIndex++)}`,
        garmentType: item.garment,
        amount: item.amount || 0,
        styleId: item.styleId,
        pieces: (item.styleId && livePieces.get(item.styleId)) || item.pieces || 1,
        pieceNames: !item.styleId && item.pieceSet ? getPieceSet(item.pieceSet).parts : undefined,
        measurementSetId: measurementFor.get(item.customerId || opts.estimateCustomerId || '') ?? null,
        deliveryDate: opts.deliveryDate,
        jobNotes: forOther ? `For: ${item.customerName}` : null,
        itemKey: item.uid,
      })
      addedJobs += (await tx.job.count({ where: { orderId: order.id } })) - before
    }

    const deliveryChanged = opts.deliveryDate && opts.deliveryDate.getTime() !== order.deliveryDate.getTime()
    if (deliveryChanged) {
      await tx.job.updateMany({ where: { orderId: order.id, status: { not: 'Completed' } }, data: { deliveryDate: opts.deliveryDate } })
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        ...opts.totals,
        advancePaid: paid,
        balanceDue: opts.totals.netPayable - paid,
        ...(deliveryChanged ? { deliveryDate: opts.deliveryDate! } : {}),
      },
    })
  }, { timeout: 30000 })

  const remaining = await prisma.job.findMany({ where: { orderId: order.id }, select: { currentStage: true } })
  if (remaining.length && remaining.every(j => j.currentStage === 'Delivered') && order.status === 'Active') {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'Completed', deliveredAt: new Date() } })
  }

  return { removedJobs: removeIds.length, addedJobs }
}
