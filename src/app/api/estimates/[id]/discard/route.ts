import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { actorName, discardLinked } from '@/lib/discard'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const estimate = await prisma.estimate.findUnique({ where: { id }, select: { status: true } })
  if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
  if (estimate.status === 'Discarded') return NextResponse.json({ error: 'Already discarded' }, { status: 400 })
  const result = await discardLinked({ estimateId: id, by: await actorName(req.headers.get('x-user-id')) })
  return NextResponse.json(result)
}
