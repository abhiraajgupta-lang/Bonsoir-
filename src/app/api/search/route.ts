import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  if (!q || q.length < 2) return NextResponse.json([])

  const [customers, orders, jobs, styles, estimates, footfall, todos] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { mobile: { contains: q, mode: 'insensitive' as const } },
          { customerId: { contains: q, mode: 'insensitive' as const } },
        ],
      },
      take: 5,
    }),
    prisma.order.findMany({
      where: {
        orderNumber: isNaN(Number(q)) ? undefined : Number(q),
      },
      include: { customer: true },
      take: 5,
    }),
    prisma.job.findMany({
      where: {
        OR: [
          { jobNumber: { contains: q, mode: 'insensitive' as const } },
        ],
      },
      include: { order: { include: { customer: true } } },
      take: 5,
    }),
    prisma.style.findMany({
      where: {
        OR: [
          { styleCode: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } },
        ],
      },
      take: 5,
    }),
    prisma.estimate.findMany({
      where: {
        OR: [
          { customerName: { contains: q, mode: 'insensitive' as const } },
          { mobile: { contains: q, mode: 'insensitive' as const } },
          ...(isNaN(Number(q)) ? [] : [{ estimateNumber: Number(q) }]),
        ],
      },
      take: 5,
    }),
    prisma.footfall.findMany({
      where: {
        OR: [
          { customerName: { contains: q, mode: 'insensitive' as const } },
          { mobile: { contains: q, mode: 'insensitive' as const } },
          { notes: { contains: q, mode: 'insensitive' as const } },
        ],
      },
      take: 5,
    }),
    prisma.todoItem.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
          { assignedTo: { contains: q, mode: 'insensitive' as const } },
        ],
      },
      take: 5,
    }),
  ])

  const results = [
    ...customers.map(c => ({
      type: 'customer' as const,
      id: c.id,
      title: c.name,
      subtitle: `${c.customerId} · ${c.mobile}`,
      href: `/customers/${c.id}`,
    })),
    ...orders.map(o => ({
      type: 'order' as const,
      id: o.id,
      title: `Order #${o.orderNumber}`,
      subtitle: o.customer.name,
      href: `/orders/${o.id}`,
    })),
    ...jobs.map(j => ({
      type: 'job' as const,
      id: j.id,
      title: `Job ${j.jobNumber}`,
      subtitle: `${j.garmentType} · ${j.order.customer.name}`,
      href: `/orders/${j.orderId}`,
    })),
    ...styles.map(s => ({
      type: 'style' as const,
      id: s.id,
      title: s.name,
      subtitle: `${s.styleCode} · ${s.category}`,
      href: `/styles`,
    })),
    ...estimates.map(e => ({
      type: 'estimate' as const,
      id: e.id,
      title: `EST-${String(e.estimateNumber).padStart(4, '0')}`,
      subtitle: `${e.customerName} · ${e.status}`,
      href: `/estimates/${e.id}`,
    })),
    ...footfall.map(f => ({
      type: 'footfall' as const,
      id: f.id,
      title: f.customerName,
      subtitle: `${f.visitSource} · ${f.followUpStatus}`,
      href: `/footfall`,
    })),
    ...todos.map(t => ({
      type: 'todo' as const,
      id: t.id,
      title: t.title,
      subtitle: `${t.todoId} · ${t.status}${t.assignedTo ? ` · ${t.assignedTo}` : ''}`,
      href: `/todos`,
    })),
  ]

  return NextResponse.json(results)
}
