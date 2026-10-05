import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const todos = await prisma.todoItem.findMany({
    orderBy: { createdAt: 'desc' },
    include: { comments: { orderBy: { createdAt: 'desc' } } },
  })
  return NextResponse.json(todos)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const counter = await prisma.counter.upsert({
    where: { id: 'todo' },
    update: { value: { increment: 1 } },
    create: { id: 'todo', value: 1 },
  })

  const todo = await prisma.todoItem.create({
    data: {
      todoId: `TODO-${String(counter.value).padStart(4, '0')}`,
      title: body.title,
      description: body.description || null,
      assignedTo: body.assignedTo || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      status: 'Pending',
    },
    include: { comments: true },
  })

  return NextResponse.json(todo, { status: 201 })
}
