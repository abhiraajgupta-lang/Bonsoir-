import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { STYLE_CATEGORIES } from '@/lib/constants'
import { actorName } from '@/lib/discard'

const BUILT_IN: string[] = STYLE_CATEGORIES.filter(c => c !== 'All')

export async function GET() {
  const custom = await prisma.styleCategory.findMany({ orderBy: { name: 'asc' }, select: { name: true } })
  return NextResponse.json([...BUILT_IN, ...custom.map(c => c.name).filter(n => !BUILT_IN.includes(n))])
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (clean.length < 2 || clean.length > 40) {
    return NextResponse.json({ error: 'Category name must be 2–40 characters' }, { status: 400 })
  }
  const all = [...BUILT_IN, ...(await prisma.styleCategory.findMany({ select: { name: true } })).map(c => c.name)]
  if (clean.toLowerCase() === 'all' || all.some(c => c.toLowerCase() === clean.toLowerCase())) {
    return NextResponse.json({ error: `"${clean}" already exists` }, { status: 409 })
  }
  const created = await prisma.styleCategory.create({
    data: { name: clean, createdBy: await actorName(req.headers.get('x-user-id')) },
  })
  return NextResponse.json({ name: created.name }, { status: 201 })
}
