import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/session'
import { EMPLOYEE_ROLES, Role } from '@/lib/roles'
import { employeeSelect, toPublic } from '@/lib/employees'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const existing = await prisma.employee.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = existing.role === 'owner'
  if (isOwner && ((body.role !== undefined && body.role !== 'owner') || body.active === false)) {
    return NextResponse.json({ error: 'The owner account cannot be deactivated or change role' }, { status: 400 })
  }
  if (!isOwner && body.role !== undefined && !EMPLOYEE_ROLES.includes(body.role as Role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  if (body.password !== undefined && String(body.password).length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.mobile !== undefined) data.mobile = body.mobile?.trim() || null
  if (body.email !== undefined) data.email = body.email?.trim() || null
  if (body.role !== undefined && !isOwner) data.role = body.role
  if (body.active !== undefined) data.active = !!body.active
  if (body.password) data.passwordHash = await hashPassword(String(body.password))

  const forceRelogin =
    !!body.password ||
    (data.role !== undefined && data.role !== existing.role) ||
    (data.active !== undefined && data.active !== existing.active)
  if (forceRelogin) data.sessionVersion = { increment: 1 }

  const employee = await prisma.employee.update({ where: { id }, data, select: employeeSelect })
  return NextResponse.json(toPublic(employee))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.employee.findUnique({ where: { id }, select: { role: true } })
  if (existing?.role === 'owner') {
    return NextResponse.json({ error: 'The owner account cannot be deleted' }, { status: 400 })
  }
  await prisma.employee.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
