import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getPieceSet, isPieceSetKey } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || ''
  const category = req.nextUrl.searchParams.get('category') || ''

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { styleCode: { contains: search, mode: 'insensitive' as const } },
      { color: { contains: search, mode: 'insensitive' as const } },
    ]
  }
  if (category && category !== 'All') {
    where.category = category
  }

  const styles = await prisma.style.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json(styles)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const pieceSet = isPieceSetKey(body.pieceSet) ? body.pieceSet : 'upper'

  const style = await prisma.style.create({
    data: {
      styleCode: body.styleCode || null,
      name: body.name || null,
      category: body.category,
      pieceSet,
      pieces: getPieceSet(pieceSet).pieces,
      color: body.color || null,
      price: body.price || 0,
      description: body.description || null,
      fabric: body.fabric || null,
      imageUrl: body.imageUrl || null,
      status: body.status || 'Active',
    },
  })

  return NextResponse.json(style, { status: 201 })
}
