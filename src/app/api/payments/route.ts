import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const target = await prisma.order.findUnique({ where: { id: body.orderId }, select: { status: true } })
  if (!target) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (target.status === 'Discarded') return NextResponse.json({ error: 'This order has been discarded' }, { status: 400 })

  const amount = Number(body.amount)
  if (!(amount > 0)) return NextResponse.json({ error: 'Amount must be more than 0' }, { status: 400 })
  const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date()
  if (isNaN(paymentDate.getTime())) return NextResponse.json({ error: 'Enter a valid payment date' }, { status: 400 })
  if (paymentDate.getTime() > Date.now() + 36 * 3600 * 1000) {
    return NextResponse.json({ error: 'Payment date cannot be in the future' }, { status: 400 })
  }

  const payment = await prisma.payment.create({
    data: {
      paymentDate,
      orderId: body.orderId,
      amount,
      method: body.method,
      receiptReference: body.receiptReference || null,
      notes: body.notes || null,
    },
  })

  const order = await prisma.order.findUnique({
    where: { id: body.orderId },
    include: { payments: true },
  })

  if (order) {
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0)
    await prisma.order.update({
      where: { id: body.orderId },
      data: {
        advancePaid: totalPaid,
        balanceDue: order.netPayable - totalPaid,
      },
    })
  }

  return NextResponse.json(payment, { status: 201 })
}
