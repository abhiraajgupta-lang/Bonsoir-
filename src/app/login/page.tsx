'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Lock } from 'lucide-react'

const inputClass = 'w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/20'

function goNext() {
  try {
    localStorage.removeItem('bonsoir_user')
    for (const k of Object.keys(localStorage)) if (k.startsWith('bonsoir_cache_')) localStorage.removeItem(k)
  } catch {}
  const next = new URLSearchParams(window.location.search).get('next')
  window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export default function LoginPage() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [setup, setSetup] = useState({ name: '', mobile: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/auth/setup')
      .then(r => r.json())
      .then(d => setNeedsSetup(!!d.needsSetup))
      .catch(() => setNeedsSetup(false))
  }, [])

  const submit = async (url: string, body: object) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) return goNext()
      setError((await res.json().catch(() => ({}))).error || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const login = (e: FormEvent) => {
    e.preventDefault()
    submit('/api/auth/login', { identifier, password })
  }

  const createOwner = (e: FormEvent) => {
    e.preventDefault()
    if (setup.password !== setup.confirm) return setError('Passwords do not match')
    submit('/api/auth/setup', { name: setup.name, mobile: setup.mobile, password: setup.password })
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-muted/40">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-[0.2em]">BONSOIR</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">by Akhil Gupta · Dashboard</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {needsSetup === null ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
          ) : needsSetup ? (
            <form onSubmit={createOwner} className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">Create owner account</h2>
                <p className="text-xs text-muted-foreground mt-0.5">First-time setup. This account can add employees and set their passwords.</p>
              </div>
              <input required placeholder="Your name" value={setup.name} onChange={e => setSetup(p => ({ ...p, name: e.target.value }))} className={inputClass} />
              <input placeholder="Mobile number (optional)" inputMode="tel" value={setup.mobile} onChange={e => setSetup(p => ({ ...p, mobile: e.target.value }))} className={inputClass} />
              <input required type="password" minLength={6} placeholder="Password (min 6 characters)" value={setup.password} onChange={e => setSetup(p => ({ ...p, password: e.target.value }))} className={inputClass} />
              <input required type="password" placeholder="Confirm password" value={setup.confirm} onChange={e => setSetup(p => ({ ...p, confirm: e.target.value }))} className={inputClass} />
              {error && <p className="text-xs text-red">{error}</p>}
              <button disabled={busy} className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                {busy ? 'Creating…' : 'Create account & sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={login} className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Sign in</h2>
              </div>
              <input required autoFocus autoComplete="username" placeholder="Name or mobile number" value={identifier} onChange={e => setIdentifier(e.target.value)} className={inputClass} />
              <input required type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
              {error && <p className="text-xs text-red">{error}</p>}
              <button disabled={busy} className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">Forgot your password? Ask the owner to reset it.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
