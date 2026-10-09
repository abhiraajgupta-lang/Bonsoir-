import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function requestUser(req: NextRequest) {
  const id = req.headers.get('x-user-id')
  const role = req.headers.get('x-user-role')
  if (!id || !role) return null
  const emp = await prisma.employee.findUnique({ where: { id }, select: { name: true } })
  return emp ? { id, role, name: emp.name, isOwner: role === 'owner' } : null
}

// Older tasks stored only the assignee's name, so fall back to a name match when no id is set.
export function assignedTo(user: { id: string; name: string }): Prisma.TodoItemWhereInput {
  return { OR: [{ assignedToId: user.id }, { assignedToId: null, assignedTo: user.name }] }
}

export const OPEN_STATUSES = ['Pending', 'In Progress']
