import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  const where = status && status !== 'All' ? { status } : {}

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: true,
      jobs: { include: { style: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const counter = await prisma.counter.upsert({
    where: { id: 'order' },
    update: { value: { increment: 1 } },
    create: { id: 'order', value: 1000 },
  })

  const orderNumber = counter.value
  const totalAmount = body.totalAmount || 0
  const discountType = body.discountType || null
  const discountValue = body.discountValue || 0
  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = Math.round(totalAmount * discountValue / 100)
  } else if (discountType === 'fixed') {
    discountAmount = discountValue
  }
  const netPayable = body.netPayable ?? (totalAmount - discountAmount)
  const advancePaid = body.advancePaid || 0
  const balanceDue = netPayable - advancePaid

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: body.customerId,
      eventName: body.eventName || null,
      deliveryDate: new Date(body.deliveryDate),
      salesperson: body.salesperson || null,
      totalAmount,
      discountType,
      discountValue,
      discountAmount,
      netPayable,
      advancePaid,
      balanceDue,
      estimateId: body.estimateId || null,
      notes: body.notes || null,
      ...(body.createdAt ? { createdAt: new Date(body.createdAt) } : {}),
    },
  })

  if (body.jobs && Array.isArray(body.jobs)) {
    for (let i = 0; i < body.jobs.length; i++) {
      const job = body.jobs[i]
      const jobNumber = `${orderNumber}-${String(i + 1).padStart(2, '0')}`
      const created = await prisma.job.create({
        data: {
          jobNumber,
          orderId: order.id,
          styleId: job.styleId || null,
          garmentType: job.garmentType,
          fabricDetails: job.fabricDetails || null,
          designNotes: job.designNotes || null,
          jobNotes: job.jobNotes || null,
          deliveryDate: job.deliveryDate ? new Date(job.deliveryDate) : null,
          measurementSetId: job.measurementSetId || null,
          jobMeasurements: job.jobMeasurements ? JSON.stringify(job.jobMeasurements) : null,
          amount: job.amount || 0,
          currentStage: 'Order Placed',
        },
      })
      await prisma.stageHistory.create({
        data: {
          jobId: created.id,
          stage: 'Order Placed',
        },
      })
    }
  }

  if (advancePaid > 0) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: advancePaid,
        method: body.paymentMethod || 'Cash',
        receiptReference: body.receiptReference || null,
        notes: 'Advance payment',
      },
    })
  }

  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      customer: true,
      jobs: true,
      payments: true,
    },
  })

  return NextResponse.json(fullOrder, { status: 201 })
}
