export const PRODUCTION_STAGES = [
  'Order Placed',
  'Fabric Issued',
  'Cutting',
  'Embroidery',
  'Stitching',
  'Finishing',
  'Quality Check',
  'Ready for Trial',
  'Alteration',
  'Ready for Delivery',
  'Delivered',
] as const

export const STAGE_INDEX: Record<string, number> = {}
PRODUCTION_STAGES.forEach((s, i) => { STAGE_INDEX[s] = i })

export const STYLE_CATEGORIES = [
  'All',
  'Suits',
  'Bandhgala',
  'Sherwani',
  'Kurta',
  'Jacket',
  'Trouser',
  'Waistcoat',
  'Indo-Western',
  'Other',
] as const

export const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Razorpay', 'Other'] as const

export const TRIAL_OUTCOMES = ['Pending', 'Approved', 'Needs Alteration'] as const

export const ORDER_CHANNELS = ['In-Store', 'WhatsApp Online', 'Shopify/Website'] as const

export const FOOTFALL_SOURCES = ['Instagram', 'Google', 'Reference', 'Walk-in', 'Facebook', 'Other'] as const

export function getDeliveryRisk(deliveryDate: Date | string, currentStage: string): 'green' | 'amber' | 'red' {
  const delivery = new Date(deliveryDate)
  const now = new Date()
  const daysLeft = Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const stageIdx = STAGE_INDEX[currentStage] ?? 0
  const totalStages = PRODUCTION_STAGES.length - 1

  if (currentStage === 'Delivered') return 'green'
  if (daysLeft < 0) return 'red'
  if (daysLeft <= 2 && stageIdx < 7) return 'red'
  if (daysLeft <= 5 && stageIdx < 5) return 'amber'
  if (daysLeft <= 3 && stageIdx < 8) return 'amber'

  const progress = stageIdx / totalStages
  const timeProgress = 1 - (daysLeft / 30)
  if (timeProgress > 0.8 && progress < 0.6) return 'red'
  if (timeProgress > 0.6 && progress < 0.4) return 'amber'

  return 'green'
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const MEASUREMENT_FIELDS: Array<{ group: string; fields: Array<{ key: string; label: string }> }> = [
  { group: 'Upper Body', fields: [
    { key: 'chest', label: 'Chest' },
    { key: 'stomach', label: 'Stomach' },
    { key: 'hips', label: 'Hips' },
    { key: 'shoulder', label: 'Shoulder' },
    { key: 'sleeveLength', label: 'Sleeve Length' },
    { key: 'bicep', label: 'Bicep' },
    { key: 'neck', label: 'Neck' },
  ]},
  { group: 'Lower Body', fields: [
    { key: 'waist', label: 'Waist' },
    { key: 'trouserLength', label: 'Trouser Length' },
    { key: 'thigh', label: 'Thigh' },
    { key: 'knee', label: 'Knee' },
    { key: 'bottom', label: 'Bottom' },
    { key: 'fork', label: 'Fork' },
    { key: 'allRound', label: 'All Round' },
    { key: 'calf', label: 'Calf' },
    { key: 'inSeam', label: 'In-Seam' },
  ]},
  { group: 'Garment Lengths', fields: [
    { key: 'sherwaniLength', label: 'Sherwani Length' },
    { key: 'jacketLength', label: 'Jacket Length' },
    { key: 'kurtalength', label: 'Kurta Length' },
    { key: 'indoWesternLength', label: 'Indo-Western Length' },
    { key: 'suitLength', label: 'Suit Length' },
  ]},
]

export const PIECE_SETS = [
  { key: 'upper', pieces: 1, label: '1 piece — Upper only', parts: ['Upper'] },
  { key: 'coat', pieces: 1, label: '1 piece — Coat only', parts: ['Coat'] },
  { key: 'trouser', pieces: 1, label: '1 piece — Trouser only', parts: ['Trouser'] },
  { key: 'upper_bottom', pieces: 2, label: '2 piece — Upper + Bottom', parts: ['Upper', 'Bottom'] },
  { key: 'upper_vest', pieces: 2, label: '2 piece — Upper + Vest', parts: ['Upper', 'Vest'] },
  { key: 'jacket_trouser_vest', pieces: 3, label: '3 piece — Jacket + Trouser + Vest', parts: ['Jacket', 'Trouser', 'Vest'] },
] as const

export type PieceSetKey = typeof PIECE_SETS[number]['key']

export function getPieceSet(key?: string | null) {
  return PIECE_SETS.find(p => p.key === key) ?? PIECE_SETS[0]
}

export function pieceSetSummary(key?: string | null) {
  const set = getPieceSet(key)
  return set.key === 'upper' ? '' : `${set.pieces} pc: ${set.parts.join(' + ')}`
}
