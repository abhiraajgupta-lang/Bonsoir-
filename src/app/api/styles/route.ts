import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || ''
  const category = req.nextUrl.searchParams.get('category') || ''

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { styleCode: { contains: search } },
      { color: { contains: search } },
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

  const style = await prisma.style.create({
    data: {
      styleCode: body.styleCode || null,
      name: body.name || null,
      category: body.category,
      pieces: body.pieces || 1,
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
