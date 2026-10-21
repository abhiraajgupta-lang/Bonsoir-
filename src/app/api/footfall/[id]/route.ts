import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { cleanFootfall, footfallInclude } from '@/lib/footfall'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await cleanFootfall(await req.json(), false)
  if (error) return NextResponse.json({ error }, { status: 400 })
  const entry = await prisma.footfall.update({ where: { id }, data, include: footfallInclude })
  return NextResponse.json(entry)
}
