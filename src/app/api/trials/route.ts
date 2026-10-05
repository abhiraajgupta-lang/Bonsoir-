import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const trials = await prisma.trial.findMany({
    include: {
      job: {
        include: {
          order: { include: { customer: true } },
        },
      },
      alterations: true,
    },
    orderBy: { trialDate: 'desc' },
    take: 100,
  })

  return NextResponse.json(trials)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const trial = await prisma.trial.create({
    data: {
      jobId: body.jobId,
      trialDate: new Date(body.trialDate),
      notes: body.notes || null,
      outcome: body.outcome || 'Pending',
    },
  })

  if (body.outcome === 'Needs Alteration' && body.alterationDetails) {
    await prisma.alteration.create({
      data: {
        trialId: trial.id,
        details: body.alterationDetails,
      },
    })
  }

  return NextResponse.json(trial, { status: 201 })
}
