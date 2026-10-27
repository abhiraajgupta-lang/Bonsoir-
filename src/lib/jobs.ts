import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PIECE_SETS, getPieceSet } from '@/lib/constants'

type Tx = Prisma.TransactionClient

const PART_NAMES = [...new Set(['Blazer/Top', 'Trouser/Bottom', 'Waistcoat', ...PIECE_SETS.flatMap(p => p.parts)])]
const PIECE_SUFFIX_RE = new RegExp(` - (${PART_NAMES.map(n => n.replace('/', '\\/')).join('|')}|Piece \\d+)$`)

export function pieceName(p: number) {
  return ['Blazer/Top', 'Trouser/Bottom', 'Waistcoat'][p] ?? `Piece ${p + 1}`
}

function splitAmount(total: number, parts: number) {
  const each = Math.floor(total / parts)
  return Array.from({ length: parts }, (_, p) => (p === parts - 1 ? total - each * (parts - 1) : each))
}

interface JobItem {
  orderId: string
  baseJobNumber: string
  garmentType: string
  amount: number
  styleId?: string | null
  pieces: number
  // Named parts for custom garments, e.g. ['Jacket', 'Trouser', 'Vest']; overrides `pieces`.
  pieceNames?: readonly string[]
  measurementSetId?: string | null
  deliveryDate?: Date | null
  fabricDetails?: string | null
  designNotes?: string | null
  jobNotes?: string | null
  jobMeasurements?: string | null
  itemKey?: string | null
}

export async function createJobsForItem(tx: Tx, item: JobItem) {
  const names = item.pieceNames?.length ? item.pieceNames : null
  const pieces = names ? names.length : Math.max(1, item.pieces || 1)
  const amounts = splitAmount(item.amount || 0, pieces)
  const label = (p: number) => {
    if (names) return pieces === 1 && names[0] === 'Upper' ? item.garmentType : `${item.garmentType} - ${names[p]}`
    return pieces > 1 ? `${item.garmentType} - ${pieceName(p)}` : item.garmentType
  }
  for (let p = 0; p < pieces; p++) {
    const job = await tx.job.create({
      data: {
        jobNumber: pieces > 1 ? `${item.baseJobNumber}${String.fromCharCode(65 + p)}` : item.baseJobNumber,
        orderId: item.orderId,
        styleId: item.styleId || null,
        garmentType: label(p),
        amount: amounts[p],
        measurementSetId: item.measurementSetId || null,
        deliveryDate: item.deliveryDate ?? null,
        fabricDetails: item.fabricDetails || null,
        designNotes: item.designNotes || null,
        jobNotes: item.jobNotes || null,
        jobMeasurements: item.jobMeasurements || null,
        estimateItemKey: item.itemKey || null,
        currentStage: 'Order Placed',
      },
    })
    await tx.stageHistory.create({ data: { jobId: job.id, stage: 'Order Placed' } })
  }
}

export type StylePieces = { pieces: number; parts: readonly string[] | null }

export async function getStylePieces(tx: Tx, styleIds: (string | null | undefined)[]) {
  const ids = [...new Set(styleIds.filter((s): s is string => !!s))]
  if (ids.length === 0) return new Map<string, StylePieces>()
  const styles = await tx.style.findMany({ where: { id: { in: ids } }, select: { id: true, pieces: true, pieceSet: true } })
  return new Map<string, StylePieces>(styles.map(s => [s.id, {
    pieces: s.pieceSet ? getPieceSet(s.pieceSet).pieces : s.pieces,
    parts: s.pieceSet ? getPieceSet(s.pieceSet).parts : null,
  }]))
}

// Piece count and names for an estimate/order item: style garments follow the style, custom ones their chosen set.
export function piecesFor(item: { styleId?: string | null; pieces?: number; pieceSet?: string }, live: Map<string, StylePieces>) {
  const style = item.styleId ? live.get(item.styleId) : undefined
  if (style) return { pieces: style.pieces, pieceNames: style.parts ?? undefined }
  if (!item.styleId && item.pieceSet) return { pieces: getPieceSet(item.pieceSet).pieces, pieceNames: getPieceSet(item.pieceSet).parts }
  return { pieces: item.pieces || 1, pieceNames: undefined }
}

// Re-split / rename jobs of a style across active orders after its pieces change.
// Groups where extra pieces have already progressed past "Order Placed" are left untouched.
export async function syncStylePieces(styleId: string, newPieces: number, parts: readonly string[] | null) {
  const target = parts ? parts.length : Math.max(1, newPieces)
  const nameFor = (base: string, p: number) => {
    if (parts) return target === 1 && parts[0] === 'Upper' ? base : `${base} - ${parts[p]}`
    return target > 1 ? `${base} - ${pieceName(p)}` : base
  }
  const jobs = await prisma.job.findMany({
    where: { styleId, order: { status: 'Active' } },
    include: { trials: { select: { id: true } } },
    orderBy: { jobNumber: 'asc' },
  })

  const groups = new Map<string, typeof jobs>()
  for (const job of jobs) {
    const base = job.jobNumber.replace(/[A-Z]$/, '')
    groups.set(base, [...(groups.get(base) ?? []), job])
  }

  let updated = 0
  for (const [base, group] of groups) {
    const first = group[0]
    const baseGarment = first.garmentType.replace(PIECE_SUFFIX_RE, '')
    if (group.length === target && group.every((j, p) => j.garmentType === nameFor(baseGarment, p))) continue
    const removable = group.slice(target)
    if (removable.some(j => j.currentStage !== 'Order Placed' || j.trials.length > 0)) continue

    const amounts = splitAmount(group.reduce((s, j) => s + j.amount, 0), target)

    await prisma.$transaction(async tx => {
      if (removable.length) await tx.job.deleteMany({ where: { id: { in: removable.map(j => j.id) } } })
      for (let p = 0; p < target; p++) {
        const data = {
          jobNumber: target > 1 ? `${base}${String.fromCharCode(65 + p)}` : base,
          garmentType: nameFor(baseGarment, p),
          amount: group.length === target ? group[p].amount : amounts[p],
        }
        if (p < group.length) {
          await tx.job.update({ where: { id: group[p].id }, data })
        } else {
          const job = await tx.job.create({
            data: {
              ...data,
              orderId: first.orderId,
              styleId,
              measurementSetId: first.measurementSetId,
              deliveryDate: first.deliveryDate,
              fabricDetails: first.fabricDetails,
              designNotes: first.designNotes,
              jobNotes: first.jobNotes,
              jobMeasurements: first.jobMeasurements,
              currentStage: first.currentStage,
            },
          })
          await tx.stageHistory.create({
            data: { jobId: job.id, stage: first.currentStage, notes: 'Piece added after style update' },
          })
        }
      }
    })
    updated++
  }
  return updated
}
