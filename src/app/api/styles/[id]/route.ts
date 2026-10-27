import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { syncStylePieces } from '@/lib/jobs'
import { getPieceSet, isPieceSetKey } from '@/lib/constants'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.styleCode !== undefined) data.styleCode = body.styleCode || null
  if (body.name !== undefined) data.name = body.name || null
  if (body.category !== undefined) data.category = body.category
  if (body.pieceSet !== undefined) {
    if (!isPieceSetKey(body.pieceSet)) return NextResponse.json({ error: 'Choose the production pieces' }, { status: 400 })
    data.pieceSet = body.pieceSet
    data.pieces = getPieceSet(body.pieceSet).pieces
  } else if (body.pieces !== undefined) {
    data.pieces = Math.max(1, Number(body.pieces) || 1)
  }
  if (body.color !== undefined) data.color = body.color || null
  if (body.price !== undefined) data.price = body.price
  if (body.description !== undefined) data.description = body.description || null
  if (body.fabric !== undefined) data.fabric = body.fabric || null
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null
  if (body.status !== undefined) data.status = body.status

  const before = await prisma.style.findUnique({ where: { id }, select: { pieces: true, pieceSet: true } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const style = await prisma.style.update({ where: { id }, data })
  const changed = style.pieces !== before.pieces || style.pieceSet !== before.pieceSet
  const ordersUpdated = changed
    ? await syncStylePieces(id, style.pieces, style.pieceSet ? getPieceSet(style.pieceSet).parts : null)
    : 0
  return NextResponse.json({ ...style, ordersUpdated })
}
