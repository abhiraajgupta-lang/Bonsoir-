import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(employees)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const employee = await prisma.employee.create({
    data: {
      name: body.name,
      role: body.role,
      mobile: body.mobile || null,
      email: body.email || null,
    },
  })
  return NextResponse.json(employee, { status: 201 })
}
