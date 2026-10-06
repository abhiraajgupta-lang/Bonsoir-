import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { readSessionToken, SESSION_COOKIE } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  const emp = session && await prisma.employee.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, role: true, mobile: true, email: true, active: true, sessionVersion: true },
  })

  if (!session || !emp || !emp.active || emp.role !== session.role || emp.sessionVersion !== session.sv) {
    const res = NextResponse.json({ error: 'Session expired, please log in again' }, { status: 401 })
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  return NextResponse.json({ id: emp.id, name: emp.name, role: emp.role, mobile: emp.mobile, email: emp.email })
}
