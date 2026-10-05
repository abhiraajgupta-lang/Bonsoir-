import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [activeOrders, allJobs, payments, trialsToday] = await Promise.all([
    prisma.order.count({ where: { status: { not: 'Completed' } } }),
    prisma.job.findMany({
      where: { status: { not: 'Completed' } },
      include: { order: { include: { customer: true } } },
    }),
    prisma.order.aggregate({
      where: { status: { not: 'Completed' } },
      _sum: { balanceDue: true },
    }),
    prisma.trial.count({
      where: {
        trialDate: { gte: today, lt: tomorrow },
      },
    }),
  ])

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
    paymentsPending: payments._sum.balanceDue || 0,
    attentionItems,
  })
}
