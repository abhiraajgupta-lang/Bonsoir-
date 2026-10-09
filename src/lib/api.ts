'use client'

import { useCallback, useRef, useState } from 'react'
import type { Cache, State } from 'swr'

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url)
  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Request failed (${res.status})`)
  return res.json()
}

export interface SendResult<T> {
  ok: boolean
  data: T | null
  error: string | null
}

const inflight = new Map<string, Promise<SendResult<unknown>>>()

// Identical requests already in flight share one network call, so double taps can't create duplicates.
export function send<T = unknown>(url: string, method: string, body?: unknown): Promise<SendResult<T>> {
  const payload = body === undefined ? undefined : JSON.stringify(body)
  const key = `${method} ${url} ${payload ?? ''}`
  const existing = inflight.get(key)
  if (existing) return existing as Promise<SendResult<T>>

  const p = (async (): Promise<SendResult<T>> => {
    try {
      const res = await fetch(url, {
        method,
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) return { ok: false, data: null, error: data?.error || `Request failed (${res.status})` }
      return { ok: true, data, error: null }
    } catch {
      return { ok: false, data: null, error: 'Network error — check your connection' }
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

export function useBusy() {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      return await fn()
    } finally {
      lock.current = false
      setBusy(false)
    }
  }, [])
  return [busy, run] as const
}

const STORAGE_PREFIX = 'bonsoir_cache_v1:'

export function clearDeviceCache() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k)
  } catch {}
}

// SWR cache that survives reloads by persisting to localStorage, scoped per logged-in user.
export function createPersistentCache(userId: string): Cache {
  const storageKey = STORAGE_PREFIX + userId
  let map = new Map<string, State>()
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) map = new Map(JSON.parse(raw))
  } catch {}

  const persist = () => {
    try {
      const entries = [...map.entries()]
        .filter(([k, v]) => !k.startsWith('$') && v && v.data !== undefined)
        .map(([k, v]) => [k, { data: v.data }])
      localStorage.setItem(storageKey, JSON.stringify(entries))
    } catch {}
  }

  window.addEventListener('pagehide', persist)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist()
  })
  setInterval(persist, 30000)

  return map as unknown as Cache
}
