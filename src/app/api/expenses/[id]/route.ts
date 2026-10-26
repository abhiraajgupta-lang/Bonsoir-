import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { cleanExpense } from '@/lib/expenses'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = cleanExpense(await req.json(), false)
  if (error) return NextResponse.json({ error }, { status: 400 })
  const expense = await prisma.expense.update({ where: { id }, data })
  return NextResponse.json(expense)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
