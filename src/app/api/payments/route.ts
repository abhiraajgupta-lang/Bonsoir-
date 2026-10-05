import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const payment = await prisma.payment.create({
    data: {
      orderId: body.orderId,
      amount: body.amount,
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
        balanceDue: order.totalAmount - totalPaid,
      },
    })
  }

  return NextResponse.json(payment, { status: 201 })
}
