import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { cleanOrderNo, orderNoProblem } from '@/lib/orderNo'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { customer: true },
  })

  if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(estimate)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const current = await prisma.estimate.findUnique({ where: { id }, select: { convertedOrderId: true } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (body.internalOrderNo !== undefined) {
    const err = await orderNoProblem(body.internalOrderNo, { estimateId: id, orderId: current.convertedOrderId })
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }
  const internalOrderNo = body.internalOrderNo !== undefined ? cleanOrderNo(body.internalOrderNo) : undefined

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

  const estimate = await prisma.estimate.update({
    where: { id },
    data: {
      internalOrderNo,
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
      channel: body.channel || undefined,
      notes: body.notes || null,
    },
  })

  if (internalOrderNo && current.convertedOrderId) {
    await prisma.order.update({ where: { id: current.convertedOrderId }, data: { internalOrderNo } })
  }

  return NextResponse.json(estimate)
}
