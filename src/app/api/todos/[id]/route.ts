import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { assignedTo, requestUser } from '@/lib/todos'

const STATUSES = ['Pending', 'In Progress', 'Done']

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requestUser(req)
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const todo = await prisma.todoItem.findFirst({ where: user.isOwner ? { id } : { id, ...assignedTo(user) } })
  if (!todo) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    data.status = body.status
  }

  if (user.isOwner) {
    if (body.title !== undefined) data.title = body.title
    if (body.description !== undefined) data.description = body.description
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
    if (body.assignedToId !== undefined) {
      const assignee = body.assignedToId
        ? await prisma.employee.findUnique({ where: { id: body.assignedToId }, select: { id: true, name: true } })
        : null
      data.assignedToId = assignee?.id ?? null
      data.assignedTo = assignee?.name ?? null
    }
  } else if (Object.keys(body).some(k => k !== 'status')) {
    return NextResponse.json({ error: 'Only the owner can edit or reassign tasks' }, { status: 403 })
  }

  const updated = await prisma.todoItem.update({
    where: { id },
    data,
    include: { comments: { orderBy: { createdAt: 'desc' } } },
  })
  return NextResponse.json(updated)
}
