import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const entries = await prisma.footfall.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const entry = await prisma.footfall.create({
    data: {
      customerName: body.customerName,
      mobile: body.mobile || null,
      visitSource: body.visitSource,
      referenceCustomer: body.referenceCustomer || null,
      followUpStatus: body.followUpStatus || 'Pending',
      notes: body.notes || null,
      ...(body.createdAt ? { createdAt: new Date(body.createdAt) } : {}),
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
