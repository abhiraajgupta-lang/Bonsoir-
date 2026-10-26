import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { istDayStart, istMonthStart } from '@/lib/constants'

export async function GET() {
  const today = istDayStart()
  const tomorrow = istDayStart(new Date(), 1)
  const in3Days = istDayStart(new Date(), 3)
  const monthStart = istMonthStart()
  const notDiscarded = { status: { not: 'Discarded' } }

  const [activeOrders, allJobs, pending, salesToday, salesMonth, collectedToday, collectedMonth, upcoming] = await Promise.all([
    prisma.order.count({ where: { status: 'Active' } }),
    prisma.job.findMany({
      where: { status: { not: 'Completed' }, order: { status: 'Active' } },
      select: {
        jobNumber: true, garmentType: true, currentStage: true, deliveryDate: true,
        order: { select: { orderNumber: true, internalOrderNo: true, deliveryDate: true, customer: { select: { name: true } } } },
      },
    }),
    prisma.order.aggregate({
      where: { ...notDiscarded, balanceDue: { gt: 0 } },
      _sum: { balanceDue: true },
      _count: true,
    }),
    prisma.order.aggregate({ where: { ...notDiscarded, createdAt: { gte: today, lt: tomorrow } }, _sum: { netPayable: true }, _count: true }),
    prisma.order.aggregate({ where: { ...notDiscarded, createdAt: { gte: monthStart } }, _sum: { netPayable: true }, _count: true }),
    prisma.payment.aggregate({ where: { createdAt: { gte: today, lt: tomorrow }, order: notDiscarded }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { createdAt: { gte: monthStart }, order: notDiscarded }, _sum: { amount: true } }),
    prisma.order.findMany({
      where: { status: 'Active', trialDate: { gte: today, lt: in3Days } },
      orderBy: { trialDate: 'asc' },
      select: {
        id: true, orderNumber: true, internalOrderNo: true, trialDate: true,
        customer: { select: { name: true } },
        jobs: { select: { garmentType: true, currentStage: true }, orderBy: { jobNumber: 'asc' } },
      },
    }),
  ])

  const trialsToday = upcoming.filter(o => o.trialDate! < tomorrow).length

  const deliveriesToday = allJobs.filter(j => {
    const dd = j.deliveryDate || j.order.deliveryDate
    const d = new Date(dd)
    return d >= today && d < tomorrow
  }).length

  const overdue = allJobs.filter(j => {
    const dd = j.deliveryDate || j.order.deliveryDate
    return new Date(dd) < today && j.currentStage !== 'Delivered'
  }).length

  const attentionItems = allJobs
    .map(j => {
      const dd = j.deliveryDate || j.order.deliveryDate
      const daysLeft = Math.ceil((new Date(dd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      let reason = ''
      let priority = 0

      if (daysLeft < 0 && j.currentStage !== 'Delivered') {
        reason = 'Delivery date passed'
        priority = 4
      } else if (daysLeft <= 2 && j.currentStage !== 'Delivered' && j.currentStage !== 'Ready for Delivery') {
        reason = `Delivery in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
        priority = 3
      } else if (j.currentStage === 'Trial Done') {
        reason = 'Trial completed — alteration pending'
        priority = 2
      } else if (j.currentStage === 'Alterations') {
        reason = 'Alteration in progress'
        priority = 1
      }

      if (!reason) return null
      return {
        jobNumber: j.jobNumber,
        orderNumber: j.order.orderNumber,
        internalOrderNo: j.order.internalOrderNo,
        customerName: j.order.customer.name,
        garmentType: j.garmentType,
        currentStage: j.currentStage,
        reason,
        priority,
        daysLeft,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b?.priority ?? 0) - (a?.priority ?? 0))
    .slice(0, 10)

  return NextResponse.json({
    activeOrders,
    trialsToday,
    deliveriesToday,
    overdue,
    paymentsPending: pending._sum.balanceDue || 0,
    paymentsPendingOrders: pending._count,
    sales: {
      today: { booked: salesToday._sum.netPayable || 0, orders: salesToday._count, collected: collectedToday._sum.amount || 0 },
      month: { booked: salesMonth._sum.netPayable || 0, orders: salesMonth._count, collected: collectedMonth._sum.amount || 0 },
    },
    upcomingTrials: upcoming.map(o => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      internalOrderNo: o.internalOrderNo,
      trialDate: o.trialDate,
      customerName: o.customer.name,
      garments: o.jobs.map(j => j.garmentType),
      readyForTrial: o.jobs.filter(j => j.currentStage === 'Ready for Trial').length,
      pieces: o.jobs.length,
    })),
    attentionItems,
  })
}
