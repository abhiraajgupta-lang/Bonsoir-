import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

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

  const latestMeasurement = await prisma.measurementSet.findFirst({
    where: { customerId: estimate.customerId },
    orderBy: { version: 'desc' },
  })

  let items: Array<{ garment: string; amount: number; styleId?: string; pieces?: number }> = []
  try {
    items = estimate.items ? JSON.parse(estimate.items) : []
  } catch {
    items = []
  }

  const counter = await prisma.counter.upsert({
    where: { id: 'order' },
    update: { value: { increment: 1 } },
    create: { id: 'order', value: 1000 },
  })

  const orderNumber = counter.value

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: estimate.customerId,
      deliveryDate: estimate.deliveryDate || new Date(),
      channel: (estimate as Record<string, unknown>).channel as string || 'In-Store',
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

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const piecesCount = item.pieces || 1

    if (piecesCount > 1) {
      const perPieceAmount = Math.round((item.amount || 0) / piecesCount)
      for (let p = 0; p < piecesCount; p++) {
        const pieceJobNumber = `${orderNumber}-${String(i + 1).padStart(2, '0')}${String.fromCharCode(65 + p)}`
        const pieceName = p === 0 ? 'Blazer/Top' : p === 1 ? 'Trouser/Bottom' : `Piece ${p + 1}`
        const job = await prisma.job.create({
          data: {
            jobNumber: pieceJobNumber,
            orderId: order.id,
            styleId: item.styleId || null,
            garmentType: `${item.garment} - ${pieceName}`,
            amount: perPieceAmount,
            measurementSetId: latestMeasurement?.id || null,
            deliveryDate: estimate.deliveryDate,
            currentStage: 'Order Placed',
          },
        })
        await prisma.stageHistory.create({
          data: { jobId: job.id, stage: 'Order Placed' },
        })
      }
    } else {
      const jobNumber = `${orderNumber}-${String(i + 1).padStart(2, '0')}`
      const job = await prisma.job.create({
        data: {
          jobNumber,
          orderId: order.id,
          styleId: item.styleId || null,
          garmentType: item.garment,
          amount: item.amount || 0,
          measurementSetId: latestMeasurement?.id || null,
          deliveryDate: estimate.deliveryDate,
          currentStage: 'Order Placed',
        },
      })
      await prisma.stageHistory.create({
        data: { jobId: job.id, stage: 'Order Placed' },
      })
    }
  }

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
