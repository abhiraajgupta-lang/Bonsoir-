import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const estimates = await prisma.estimate.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(estimates)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const counter = await prisma.counter.upsert({
    where: { id: 'estimate' },
    update: { value: { increment: 1 } },
    create: { id: 'estimate', value: 1 },
  })

  const totalAmount = body.totalAmount ?? 0
  const discountType = body.discountType || null
  const discountValue = body.discountValue ?? 0
  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = Math.round(totalAmount * discountValue / 100)
  } else if (discountType === 'fixed') {
    discountAmount = discountValue
  }
  const netPayable = totalAmount - discountAmount
  const advanceAmount = body.advanceAmount ?? 0
  const balancePayment = netPayable - advanceAmount

  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber: counter.value,
      customerId: body.customerId || null,
      customerName: body.customerName,
      mobile: body.mobile || null,
      trialDate: body.trialDate ? new Date(body.trialDate) : null,
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      items: body.items ? JSON.stringify(body.items) : null,
      totalAmount,
      discountType,
      discountValue,
      discountAmount,
      netPayable,
      advanceAmount,
      advancePaymentMode: body.advancePaymentMode || null,
      balancePayment,
      channel: body.channel || 'In-Store',
      notes: body.notes || null,
      ...(body.createdAt ? { createdAt: new Date(body.createdAt) } : {}),
    },
  })

  return NextResponse.json(estimate, { status: 201 })
}
