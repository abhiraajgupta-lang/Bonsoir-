import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { assignedTo, requestUser } from '@/lib/todos'

export async function GET(req: NextRequest) {
  const user = await requestUser(req)
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const todos = await prisma.todoItem.findMany({
    where: user.isOwner ? {} : assignedTo(user),
    orderBy: { createdAt: 'desc' },
    include: { comments: { orderBy: { createdAt: 'desc' } } },
  })
  return NextResponse.json(todos)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const assignee = body.assignedToId
    ? await prisma.employee.findUnique({ where: { id: body.assignedToId }, select: { id: true, name: true } })
    : null

  const counter = await prisma.counter.upsert({
    where: { id: 'todo' },
    update: { value: { increment: 1 } },
    create: { id: 'todo', value: 1 },
  })

  const todo = await prisma.todoItem.create({
    data: {
      todoId: `TODO-${String(counter.value).padStart(4, '0')}`,
      title: body.title.trim(),
      description: body.description || null,
      assignedTo: assignee?.name ?? null,
      assignedToId: assignee?.id ?? null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      status: 'Pending',
    },
    include: { comments: true },
  })

  return NextResponse.json(todo, { status: 201 })
}
