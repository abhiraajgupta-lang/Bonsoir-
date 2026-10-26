import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { cleanExpense, monthRange } from '@/lib/expenses'
import { actorName } from '@/lib/discard'

export async function GET(req: NextRequest) {
  const range = monthRange(req.nextUrl.searchParams.get('month'))
  const expenses = await prisma.expense.findMany({
    where: range ? { date: range } : {},
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 2000,
  })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const { data, error } = cleanExpense(await req.json(), true)
  if (error) return NextResponse.json({ error }, { status: 400 })
  const expense = await prisma.expense.create({
    data: {
      ...(data as { date: Date; category: string; description: string; amount: number }),
      createdBy: await actorName(req.headers.get('x-user-id')),
    },
  })
  return NextResponse.json(expense, { status: 201 })
}
