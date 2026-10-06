import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { createJobsForItem, getStylePieces } from '@/lib/jobs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { customer: true },
  })

  if (!estimate) {
    return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
  }

  if (estimate.status === 'Converted') {
    return NextResponse.json({ error: 'Already converted' }, { status: 400 })
  }

  if (!estimate.customerId) {
    return NextResponse.json({ error: 'Estimate must have a linked customer' }, { status: 400 })
  }

  let items: Array<{ garment: string; amount: number; styleId?: string; pieces?: number; customerId?: string; customerName?: string }> = []
  try {
    items = estimate.items ? JSON.parse(estimate.items) : []
  } catch {
    items = []
  }

  const measurementFor = new Map<string, string | null>()
  for (const cid of new Set([estimate.customerId, ...items.map(i => i.customerId).filter((c): c is string => !!c)])) {
    const m = await prisma.measurementSet.findFirst({ where: { customerId: cid }, orderBy: { version: 'desc' } })
    measurementFor.set(cid, m?.id ?? null)
  }

  const counter = await prisma.counter.upsert({
    where: { id: 'order' },
    update: { value: { increment: 1 } },
    create: { id: 'order', value: 1000 },
  })

  const orderNumber = counter.value

  const order = await prisma.$transaction(async tx => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: estimate.customerId!,
        deliveryDate: estimate.deliveryDate || new Date(),
        channel: estimate.channel || 'In-Store',
        totalAmount: estimate.totalAmount,
        discountType: estimate.discountType,
        discountValue: estimate.discountValue,
        discountAmount: estimate.discountAmount,
        netPayable: estimate.netPayable,
        advancePaid: estimate.advanceAmount,
        balanceDue: estimate.balancePayment,
        estimateId: estimate.id,
        notes: estimate.notes,
      },
    })

    const livePieces = await getStylePieces(tx, items.map(i => i.styleId))
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const forOther = item.customerId && item.customerId !== estimate.customerId
      await createJobsForItem(tx, {
        orderId: order.id,
        baseJobNumber: `${orderNumber}-${String(i + 1).padStart(2, '0')}`,
        garmentType: item.garment,
        amount: item.amount || 0,
        styleId: item.styleId,
        pieces: (item.styleId && livePieces.get(item.styleId)) || item.pieces || 1,
        measurementSetId: measurementFor.get(item.customerId || estimate.customerId!) ?? null,
        deliveryDate: estimate.deliveryDate,
        jobNotes: forOther ? `For: ${item.customerName}` : null,
      })
    }
    return order
  }, { timeout: 20000 })

  if (estimate.advanceAmount > 0) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: estimate.advanceAmount,
        method: estimate.advancePaymentMode || 'Cash',
        notes: 'Advance payment (from estimate)',
      },
    })
  }

  await prisma.estimate.update({
    where: { id },
    data: {
      status: 'Converted',
      convertedOrderId: order.id,
    },
  })

  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { customer: true, jobs: true, payments: true },
  })

  return NextResponse.json(fullOrder, { status: 201 })
}
