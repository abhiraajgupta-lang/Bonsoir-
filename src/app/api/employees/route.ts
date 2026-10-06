import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/session'
import { EMPLOYEE_ROLES, Role } from '@/lib/roles'
import { employeeSelect, toPublic } from '@/lib/employees'

export async function GET() {
  const employees = await prisma.employee.findMany({ select: employeeSelect, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(employees.map(toPublic))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name?.trim() || !EMPLOYEE_ROLES.includes(body.role as Role)) {
    return NextResponse.json({ error: 'Name and a valid role are required' }, { status: 400 })
  }
  if (!body.password || String(body.password).length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  const employee = await prisma.employee.create({
    data: {
      name: body.name.trim(),
      role: body.role,
      mobile: body.mobile?.trim() || null,
      email: body.email?.trim() || null,
      passwordHash: await hashPassword(String(body.password)),
    },
    select: employeeSelect,
  })
  return NextResponse.json(toPublic(employee), { status: 201 })
}
