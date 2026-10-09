import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { assignedTo, OPEN_STATUSES, requestUser } from '@/lib/todos'

export async function GET(req: NextRequest) {
  const user = await requestUser(req)
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  const count = await prisma.todoItem.count({ where: { status: { in: OPEN_STATUSES }, ...assignedTo(user) } })
  return NextResponse.json({ count })
}
