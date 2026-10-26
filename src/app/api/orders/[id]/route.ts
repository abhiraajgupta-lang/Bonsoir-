import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { cleanOrderNo, orderNoProblem } from '@/lib/orderNo'
import { hideContactFor } from '@/lib/employees'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { include: { measurements: { orderBy: { version: 'desc' } } } },
      jobs: {
        include: {
          style: true,
          stageHistory: { orderBy: { createdAt: 'asc' } },
          trials: { include: { alterations: true }, orderBy: { trialDate: 'desc' } },
          measurementSet: true,
        },
      },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(hideContactFor(req.headers.get('x-user-role'), order))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  let internalOrderNo: string | undefined
  if (body.internalOrderNo !== undefined) {
    const current = await prisma.order.findUnique({ where: { id }, select: { estimateId: true } })
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const err = await orderNoProblem(body.internalOrderNo, { orderId: id, estimateId: current.estimateId })
    if (err) return NextResponse.json({ error: err }, { status: 400 })
    internalOrderNo = cleanOrderNo(body.internalOrderNo)
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      internalOrderNo,
      eventName: body.eventName,
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
      trialDate: body.trialDate === undefined ? undefined : body.trialDate ? new Date(body.trialDate) : null,
      salesperson: body.salesperson,
      totalAmount: body.totalAmount,
      notes: body.notes,
      status: body.status,
    },
  })

  if (body.trialDate !== undefined) {
    await prisma.estimate.updateMany({
      where: { OR: [{ convertedOrderId: id }, ...(order.estimateId ? [{ id: order.estimateId }] : [])] },
      data: { trialDate: order.trialDate },
    })
  }

  if (internalOrderNo) {
    await prisma.estimate.updateMany({
      where: { OR: [{ convertedOrderId: id }, ...(order.estimateId ? [{ id: order.estimateId }] : [])] },
      data: { internalOrderNo },
    })
  }

  return NextResponse.json(order)
}
