import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || ''
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { mobile: { contains: search, mode: 'insensitive' as const } },
          { customerId: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const customers = await prisma.customer.findMany({
    where,
    include: {
      orders: { select: { id: true, totalAmount: true, status: true, createdAt: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const counter = await prisma.counter.upsert({
    where: { id: 'customer' },
    update: { value: { increment: 1 } },
    create: { id: 'customer', value: 1 },
  })

  const customerId = `C-${String(counter.value).padStart(5, '0')}`

  const customer = await prisma.customer.create({
    data: {
      customerId,
      name: body.name,
      countryCode: body.countryCode || '+91',
      mobile: body.mobile,
      email: body.email || null,
      dateOfBirth: body.dateOfBirth || null,
      address: body.address || null,
      city: body.city || null,
      anniversary: body.anniversary || null,
      notes: body.notes || null,
    },
  })

  return NextResponse.json(customer, { status: 201 })
}
