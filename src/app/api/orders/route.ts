import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { createJobsForItem, getStylePieces } from '@/lib/jobs'
import { hideContactFor } from '@/lib/employees'

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

  const role = req.headers.get('x-user-role')
  return NextResponse.json(orders.map(o => hideContactFor(role, o)))
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
    await prisma.$transaction(async tx => {
      const livePieces = await getStylePieces(tx, body.jobs.map((j: { styleId?: string }) => j.styleId))
      for (let i = 0; i < body.jobs.length; i++) {
        const job = body.jobs[i]
        await createJobsForItem(tx, {
          orderId: order.id,
          baseJobNumber: `${orderNumber}-${String(i + 1).padStart(2, '0')}`,
          garmentType: job.garmentType,
          amount: job.amount || 0,
          styleId: job.styleId,
          pieces: (job.styleId && livePieces.get(job.styleId)) || 1,
          measurementSetId: job.measurementSetId,
          deliveryDate: job.deliveryDate ? new Date(job.deliveryDate) : null,
          fabricDetails: job.fabricDetails,
          designNotes: job.designNotes,
          jobNotes: job.jobNotes,
          jobMeasurements: job.jobMeasurements ? JSON.stringify(job.jobMeasurements) : null,
        })
      }
    }, { timeout: 20000 })
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
