export const employeeSelect = {
  id: true, name: true, role: true, mobile: true, email: true, active: true, createdAt: true,
  passwordHash: true,
} as const

export const toPublic = <T extends { passwordHash: string | null }>({ passwordHash, ...emp }: T) =>
  ({ ...emp, hasPassword: !!passwordHash })

const CONTACT_FIELDS = ['mobile', 'email', 'countryCode', 'address', 'city', 'dateOfBirth', 'anniversary'] as const

export function hideContactFor<T extends { customer: object }>(role: string | null, order: T): T {
  if (role !== 'production_manager') return order
  const customer = { ...order.customer } as Record<string, unknown>
  for (const f of CONTACT_FIELDS) customer[f] = f === 'mobile' ? '' : null
  return { ...order, customer }
}
