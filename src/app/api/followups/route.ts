import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { actorName } from '@/lib/discard'
import { cleanFollowUp } from '@/lib/followups'

export async function GET() {
  const items = await prisma.followUp.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const { data, error } = cleanFollowUp(await req.json(), true)
  if (error) return NextResponse.json({ error }, { status: 400 })
  const item = await prisma.followUp.create({
    data: { ...(data as { name: string; mobile: string }), createdBy: await actorName(req.headers.get('x-user-id')) },
  })
  return NextResponse.json(item, { status: 201 })
}
