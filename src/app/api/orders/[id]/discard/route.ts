import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { actorName, discardLinked } from '@/lib/discard'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, select: { status: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status === 'Discarded') return NextResponse.json({ error: 'Already discarded' }, { status: 400 })
  const result = await discardLinked({ orderId: id, by: await actorName(req.headers.get('x-user-id')) })
  return NextResponse.json(result)
}
