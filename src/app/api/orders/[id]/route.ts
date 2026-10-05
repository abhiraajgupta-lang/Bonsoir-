import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  return NextResponse.json(order)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const order = await prisma.order.update({
    where: { id },
    data: {
      eventName: body.eventName,
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
      salesperson: body.salesperson,
      totalAmount: body.totalAmount,
      notes: body.notes,
      status: body.status,
    },
  })

  return NextResponse.json(order)
}
