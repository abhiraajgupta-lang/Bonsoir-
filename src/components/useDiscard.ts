'use client'

import { useSWRConfig } from 'swr'
import { useConfirm } from '@/components/ConfirmDialog'
import { send } from '@/lib/api'

const AFFECTED = ['/api/orders', '/api/estimates', '/api/dashboard', '/api/jobs', '/api/trials', '/api/customers']

export function useDiscard() {
  const confirm = useConfirm()
  const { mutate } = useSWRConfig()

  return async (kind: 'order' | 'estimate', id: string, label: string) => {
    const linked = kind === 'order' ? 'its estimate' : 'the order made from it (if any)'
    const ok = await confirm({
      title: `Discard ${label}?`,
      message: `It will stay visible but be marked as discarded / no longer in making. ${linked[0].toUpperCase() + linked.slice(1)} will be marked discarded too.`,
      confirmLabel: 'Yes, discard',
      secondStep: {
        title: 'Are you absolutely sure?',
        message: `${label} cannot be un-discarded from the app, and no production, payments or trials can be added to it afterwards.`,
        confirmLabel: `Discard ${label}`,
      },
    })
    if (!ok) return false

    const res = await send(`/api/${kind}s/${id}/discard`, 'POST')
    if (!res.ok) {
      alert(res.error)
      return false
    }
    await mutate(key => typeof key === 'string' && AFFECTED.some(p => key.startsWith(p)))
    return true
  }
}
