import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { Role } from '@/lib/roles'

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>

export const SESSION_COOKIE = 'bonsoir_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export interface Session {
  id: string
  role: Role
  sv: number
  exp: number
}

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET env var must be set (at least 32 characters)')
  return s
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scryptAsync(password, salt, 64)
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(':')
  if (!salt || !hex) return false
  const expected = Buffer.from(hex, 'hex')
  const actual = await scryptAsync(password, salt, expected.length)
  return timingSafeEqual(expected, actual)
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createSessionToken(data: Omit<Session, 'exp'>) {
  const session: Session = { ...data, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function readSessionToken(token: string | undefined): Session | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session
    return session.exp > Date.now() / 1000 ? session : null
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE,
}
