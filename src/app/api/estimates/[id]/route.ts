import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { cleanOrderNo, orderNoProblem } from '@/lib/orderNo'
import { parseItems, syncOrderWithEstimate, withNewKeys, withStoredKeys } from '@/lib/estimateItems'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { customer: true },
  })

  if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...estimate, items: JSON.stringify(withStoredKeys(parseItems(estimate.items))) })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const current = await prisma.estimate.findUnique({
    where: { id },
    select: { convertedOrderId: true, items: true, advanceAmount: true, status: true },
  })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (current.status === 'Discarded') return NextResponse.json({ error: 'This estimate has been discarded' }, { status: 400 })
  const converted = !!current.convertedOrderId
  const oldItems = parseItems(current.items)
  const newItems = Array.isArray(body.items) ? withNewKeys(body.items) : withStoredKeys(oldItems)
  if (body.internalOrderNo !== undefined) {
    const err = await orderNoProblem(body.internalOrderNo, { estimateId: id, orderId: current.convertedOrderId })
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }
  const internalOrderNo = body.internalOrderNo !== undefined ? cleanOrderNo(body.internalOrderNo) : undefined

  const totalAmount = Math.max(0, Number(body.totalAmount) || 0)
  const discountType = body.discountType || null
  const discountValue = body.discountValue ?? 0
  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = Math.round(totalAmount * discountValue / 100)
  } else if (discountType === 'fixed') {
    discountAmount = discountValue
  }
  const netPayable = totalAmount - discountAmount
  // After conversion the advance lives on the order as a payment, so it's not editable here.
  const advanceAmount = converted ? current.advanceAmount : body.advanceAmount ?? 0
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
      items: JSON.stringify(newItems),
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

  const sync = current.convertedOrderId
    ? await syncOrderWithEstimate({
        orderId: current.convertedOrderId,
        estimateCustomerId: estimate.customerId,
        oldItems,
        newItems,
        totals: { totalAmount, discountType, discountValue, discountAmount, netPayable },
        deliveryDate: estimate.deliveryDate,
        trialDate: estimate.trialDate,
      })
    : null

  return NextResponse.json({ ...estimate, sync })
}
