import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const comment = await prisma.todoComment.create({
    data: {
      todoId: id,
      author: body.author || 'Owner',
      content: body.content,
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
