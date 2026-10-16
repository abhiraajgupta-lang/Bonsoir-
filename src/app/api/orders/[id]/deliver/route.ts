import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { actorName } from '@/lib/discard'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, include: { jobs: { select: { id: true, currentStage: true } } } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status === 'Discarded') return NextResponse.json({ error: 'This order has been discarded' }, { status: 400 })
  if (order.status === 'Completed') return NextResponse.json({ error: 'Already delivered' }, { status: 400 })

  const by = await actorName(req.headers.get('x-user-id'))
  const pending = order.jobs.filter(j => j.currentStage !== 'Delivered')
  await prisma.$transaction([
    ...pending.map(j => prisma.stageHistory.create({ data: { jobId: j.id, stage: 'Delivered', notes: `Order marked delivered by ${by}` } })),
    prisma.job.updateMany({ where: { orderId: id }, data: { currentStage: 'Delivered', status: 'Completed' } }),
    prisma.order.update({ where: { id }, data: { status: 'Completed', deliveredAt: new Date() } }),
  ])
  return NextResponse.json({ ok: true })
}
