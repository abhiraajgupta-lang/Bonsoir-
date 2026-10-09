'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  // Second step shown after the first confirm, to guard against misclicks on irreversible actions.
  secondStep?: { title: string; message: string; confirmLabel: string }
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>(o => {
    resolver.current?.(false)
    setOpts(o)
    setStep(1)
    return new Promise(resolve => { resolver.current = resolve })
  }, [])

  const close = (result: boolean) => {
    resolver.current?.(result)
    resolver.current = null
    setOpts(null)
  }

  useEffect(() => {
    if (!opts) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [opts, step])

  const view = opts && (step === 2 && opts.secondStep ? opts.secondStep : opts)

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && view && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => close(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-sm bg-card text-foreground rounded-xl border border-border shadow-xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-red/10 text-red flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                {opts.secondStep && <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Step {step} of 2</p>}
                <h2 id="confirm-title" className="text-base font-semibold">{view.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{view.message}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
              <button ref={cancelRef} onClick={() => close(false)} className="px-4 py-2.5 sm:py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={() => (step === 1 && opts.secondStep ? setStep(2) : close(true))}
                className="px-4 py-2.5 sm:py-2 bg-red text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                {view.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider')
  return ctx
}
