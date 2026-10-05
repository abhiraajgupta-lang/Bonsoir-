import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.role !== undefined) data.role = body.role
  if (body.mobile !== undefined) data.mobile = body.mobile || null
  if (body.email !== undefined) data.email = body.email || null
  if (body.active !== undefined) data.active = body.active

  const employee = await prisma.employee.update({ where: { id }, data })
  return NextResponse.json(employee)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.employee.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
