import { FOLLOW_UP_CHANNELS, FOLLOW_UP_INTENTS, FOLLOW_UP_STATUSES } from '@/lib/constants'

const oneOf = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v)

export function cleanFollowUp(body: Record<string, unknown>, creating: boolean) {
  const data: Record<string, string | null> = {}
  if (body.name !== undefined || creating) {
    const name = String(body.name ?? '').trim()
    if (!name) return { data, error: 'Name is required' }
    data.name = name
  }
  if (body.mobile !== undefined || creating) {
    const mobile = String(body.mobile ?? '').replace(/[^\d+]/g, '')
    if (mobile.replace(/\D/g, '').length < 7) return { data, error: 'Enter a valid mobile number' }
    data.mobile = mobile
  }
  if (body.channel !== undefined) {
    if (!oneOf(FOLLOW_UP_CHANNELS, body.channel)) return { data, error: 'Invalid channel' }
    data.channel = body.channel as string
  }
  if (body.intent !== undefined) {
    if (!oneOf(FOLLOW_UP_INTENTS, body.intent)) return { data, error: 'Invalid intent' }
    data.intent = body.intent as string
  }
  if (body.followUpStatus !== undefined) {
    if (!oneOf(FOLLOW_UP_STATUSES, body.followUpStatus)) return { data, error: 'Invalid status' }
    data.followUpStatus = body.followUpStatus as string
  }
  if (body.notes !== undefined) data.notes = String(body.notes ?? '').trim() || null
  return { data, error: null }
}
