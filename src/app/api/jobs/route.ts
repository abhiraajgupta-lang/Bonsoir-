import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const stage = req.nextUrl.searchParams.get('stage')
  const status = req.nextUrl.searchParams.get('status')

  const where: Record<string, unknown> = { order: { status: { not: 'Discarded' } } }
  if (stage && stage !== 'All') where.currentStage = stage
  if (status && status !== 'All') {
    where.status = status
  } else {
    where.status = { not: 'Completed' }
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      order: { include: { customer: { select: { id: true, name: true, customerId: true } } } },
      style: { select: { id: true, name: true, styleCode: true, imageUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return NextResponse.json(jobs)
}
