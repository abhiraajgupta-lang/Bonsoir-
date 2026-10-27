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
  'Tuxedo',
  'Kurta Jacket Set',
  'Shorts',
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
  { key: 'jacket_kurta_bottom', pieces: 3, label: '3 piece — Jacket + Kurta + Bottom', parts: ['Jacket', 'Kurta', 'Bottom'] },
  { key: 'jacket_vest_bottom', pieces: 3, label: '3 piece — Jacket + Vest + Bottom', parts: ['Jacket', 'Vest', 'Bottom'] },
  { key: 'jacket_shirt_bottom', pieces: 3, label: '3 piece — Jacket + Shirt + Bottom', parts: ['Jacket', 'Shirt', 'Bottom'] },
  { key: 'upper_bottom_stole', pieces: 3, label: '3 piece — Upper + Bottom + Stole', parts: ['Upper', 'Bottom', 'Stole'] },
  { key: 'sherwani_kurta_bottom_stole', pieces: 4, label: '4 piece — Sherwani + Kurta + Bottom + Stole', parts: ['Sherwani', 'Kurta', 'Bottom', 'Stole'] },
] as const

export function isPieceSetKey(key: unknown): key is PieceSetKey {
  return typeof key === 'string' && PIECE_SETS.some(p => p.key === key)
}

export type PieceSetKey = typeof PIECE_SETS[number]['key']

export function getPieceSet(key?: string | null) {
  return PIECE_SETS.find(p => p.key === key) ?? PIECE_SETS[0]
}

export function pieceSetSummary(key?: string | null) {
  const set = getPieceSet(key)
  return set.key === 'upper' ? '' : `${set.pieces} pc: ${set.parts.join(' + ')}`
}

export const FOLLOW_UP_CHANNELS = ['WhatsApp', 'Call'] as const
export const FOLLOW_UP_INTENTS = ['Store Visit', 'Online Order', 'Undecided'] as const
export const FOLLOW_UP_STATUSES = ['New', 'Contacted', 'Interested', 'Visit Scheduled', 'Converted', 'Not Interested'] as const

export const FOOTFALL_STATUSES = [
  'Sales exploration',
  'Sales conversion',
  'Sales not converted',
  'Follow-up',
  'Trial',
  'Delivery pickup',
] as const

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salaries & Wages',
  'Fabric & Materials',
  'Tailoring / Job Work',
  'Embroidery',
  'Utilities',
  'Marketing',
  'Transport & Courier',
  'Packaging',
  'Repairs & Maintenance',
  'Staff Welfare',
  'Miscellaneous',
] as const

// Business days run on India time regardless of where the server is.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function istDayStart(d: Date = new Date(), addDays = 0) {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + addDays) - IST_OFFSET_MS)
}

export function istMonthStart(d: Date = new Date(), addMonths = 0) {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + addMonths, 1) - IST_OFFSET_MS)
}

export const EXPENSE_PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'] as const
