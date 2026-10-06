import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE, verifyPassword } from '@/lib/session'
import { isRole } from '@/lib/roles'

export async function POST(req: NextRequest) {
  const { identifier, password } = await req.json()
  const id = String(identifier || '').trim()
  if (!id || !password) {
    return NextResponse.json({ error: 'Enter your name or mobile number and password' }, { status: 400 })
  }

  const candidates = await prisma.employee.findMany({
    where: {
      active: true,
      passwordHash: { not: null },
      OR: [{ mobile: id }, { name: { equals: id, mode: 'insensitive' } }],
    },
  })

  for (const emp of candidates) {
    if (isRole(emp.role) && (await verifyPassword(String(password), emp.passwordHash!))) {
      const res = NextResponse.json({ id: emp.id, name: emp.name, role: emp.role })
      res.cookies.set(SESSION_COOKIE, createSessionToken({ id: emp.id, role: emp.role, sv: emp.sessionVersion }), sessionCookieOptions)
      return res
    }
  }

  return NextResponse.json({ error: 'Incorrect name/mobile or password' }, { status: 401 })
}
