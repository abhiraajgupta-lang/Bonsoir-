import { NextRequest, NextResponse } from 'next/server'
import { readSessionToken, SESSION_COOKIE } from '@/lib/session'
import { canAccessApi, canAccessPage, homeFor, isRole } from '@/lib/roles'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/setup', '/api/auth/logout']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isApi = pathname.startsWith('/api/')

  const headers = new Headers(req.headers)
  headers.delete('x-user-id')
  headers.delete('x-user-role')

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next({ request: { headers } })
  }

  const session = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  if (!session || !isRole(session.role)) {
    if (isApi) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    const url = new URL('/login', req.url)
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isApi) {
    if (pathname !== '/api/auth/me' && !canAccessApi(session.role, pathname, req.method)) {
      return NextResponse.json({ error: 'You do not have access to this' }, { status: 403 })
    }
  } else if (!canAccessPage(session.role, pathname)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url))
  }

  headers.set('x-user-id', session.id)
  headers.set('x-user-role', session.role)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'],
}
