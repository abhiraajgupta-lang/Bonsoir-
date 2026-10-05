import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = body.status
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null

  const todo = await prisma.todoItem.update({
    where: { id },
    data,
    include: { comments: { orderBy: { createdAt: 'desc' } } },
  })

  return NextResponse.json(todo)
}
