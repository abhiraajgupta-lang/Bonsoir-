import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, hashPassword, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session'

const ownerExists = () => prisma.employee.count({ where: { role: 'owner', passwordHash: { not: null } } })

export async function GET() {
  return NextResponse.json({ needsSetup: (await ownerExists()) === 0 })
}

export async function POST(req: NextRequest) {
  if ((await ownerExists()) > 0) {
    return NextResponse.json({ error: 'Owner account already exists' }, { status: 403 })
  }
  const { name, mobile, password } = await req.json()
  if (!name?.trim() || !password || String(password).length < 6) {
    return NextResponse.json({ error: 'Name and a password of at least 6 characters are required' }, { status: 400 })
  }

  const owner = await prisma.employee.create({
    data: {
      name: name.trim(),
      role: 'owner',
      mobile: mobile?.trim() || null,
      passwordHash: await hashPassword(String(password)),
    },
  })

  const res = NextResponse.json({ id: owner.id, name: owner.name, role: owner.role }, { status: 201 })
  res.cookies.set(SESSION_COOKIE, createSessionToken({ id: owner.id, role: 'owner', sv: owner.sessionVersion }), sessionCookieOptions)
  return res
}
