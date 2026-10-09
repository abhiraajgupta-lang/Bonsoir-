import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTION_STAGES, STAGE_INDEX } from '@/lib/constants'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const job = await prisma.job.findUnique({ where: { id }, include: { order: true } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.order.status === 'Discarded') return NextResponse.json({ error: 'This order has been discarded' }, { status: 400 })

  const newStage = body.stage || PRODUCTION_STAGES[Math.min(
    (STAGE_INDEX[job.currentStage] ?? 0) + 1,
    PRODUCTION_STAGES.length - 1
  )]

  await prisma.stageHistory.create({
    data: {
      jobId: id,
      stage: newStage,
      notes: body.notes || null,
      worker: body.worker || null,
    },
  })

  const updatedJob = await prisma.job.update({
    where: { id },
    data: {
      currentStage: newStage,
      assignedWorker: body.worker || undefined,
      status: newStage === 'Delivered' ? 'Completed' : undefined,
    },
  })

  if (newStage === 'Delivered') {
    const allJobs = await prisma.job.findMany({ where: { orderId: job.orderId } })
    const allDelivered = allJobs.every(j => j.currentStage === 'Delivered')
    if (allDelivered) {
      await prisma.order.update({
        where: { id: job.orderId },
        data: { status: 'Completed' },
      })
    }
  }

  return NextResponse.json(updatedJob)
}
