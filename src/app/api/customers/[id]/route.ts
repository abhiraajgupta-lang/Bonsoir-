import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      measurements: { orderBy: { version: 'desc' } },
      orders: {
        include: {
          jobs: { include: { style: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(customer)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: body.name,
      countryCode: body.countryCode || '+91',
      mobile: body.mobile,
      email: body.email || null,
      dateOfBirth: body.dateOfBirth || null,
      address: body.address || null,
      city: body.city || null,
      anniversary: body.anniversary || null,
      notes: body.notes || null,
      customNotes: body.customNotes || null,
    },
  })

  return NextResponse.json(customer)
}
