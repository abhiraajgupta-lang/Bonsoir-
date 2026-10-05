import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.styleCode !== undefined) data.styleCode = body.styleCode || null
  if (body.name !== undefined) data.name = body.name || null
  if (body.category !== undefined) data.category = body.category
  if (body.pieces !== undefined) data.pieces = body.pieces
  if (body.color !== undefined) data.color = body.color || null
  if (body.price !== undefined) data.price = body.price
  if (body.description !== undefined) data.description = body.description || null
  if (body.fabric !== undefined) data.fabric = body.fabric || null
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null
  if (body.status !== undefined) data.status = body.status

  const style = await prisma.style.update({ where: { id }, data })
  return NextResponse.json(style)
}
