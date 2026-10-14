import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { cleanFollowUp } from '@/lib/followups'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = cleanFollowUp(await req.json(), false)
  if (error) return NextResponse.json({ error }, { status: 400 })
  const item = await prisma.followUp.update({ where: { id }, data })
  return NextResponse.json(item)
}
