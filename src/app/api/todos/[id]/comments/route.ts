import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { assignedTo, requestUser } from '@/lib/todos'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requestUser(req)
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const todo = await prisma.todoItem.findFirst({ where: user.isOwner ? { id } : { id, ...assignedTo(user) }, select: { id: true } })
  if (!todo) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const body = await req.json()
  if (!body.content?.trim()) return NextResponse.json({ error: 'Comment is empty' }, { status: 400 })

  const comment = await prisma.todoComment.create({
    data: { todoId: id, author: user.name, content: body.content.trim() },
  })
  return NextResponse.json(comment, { status: 201 })
}
