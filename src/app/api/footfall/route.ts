import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { cleanFootfall, footfallInclude } from '@/lib/footfall'

export async function GET() {
  const entries = await prisma.footfall.findMany({
    orderBy: { createdAt: 'desc' },
    include: footfallInclude,
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await cleanFootfall(body, true)
  if (error) return NextResponse.json({ error }, { status: 400 })

  const entry = await prisma.footfall.create({
    data: {
      ...(data as { customerName: string; visitSource: string }),
      ...(body.createdAt ? { createdAt: new Date(body.createdAt) } : {}),
    },
    include: footfallInclude,
  })
  return NextResponse.json(entry, { status: 201 })
}
