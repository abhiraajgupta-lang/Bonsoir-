import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.customerName !== undefined) data.customerName = body.customerName
  if (body.mobile !== undefined) data.mobile = body.mobile || null
  if (body.visitSource !== undefined) data.visitSource = body.visitSource
  if (body.referenceCustomer !== undefined) data.referenceCustomer = body.referenceCustomer || null
  if (body.followUpStatus !== undefined) data.followUpStatus = body.followUpStatus
  if (body.notes !== undefined) data.notes = body.notes || null

  const entry = await prisma.footfall.update({
    where: { id },
    data,
  })

  return NextResponse.json(entry)
}
