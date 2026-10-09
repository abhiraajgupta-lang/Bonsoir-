export type Role = 'owner' | 'store_manager' | 'production_manager' | 'designer'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  store_manager: 'Store Manager',
  production_manager: 'Production Manager',
  designer: 'Designer / Merchandiser',
}

export const EMPLOYEE_ROLES: Role[] = ['store_manager', 'production_manager', 'designer']

const ALL_PAGES = ['/', '/orders', '/customers', '/styles', '/estimates', '/production', '/trials', '/footfall', '/todos']

const PAGE_ACCESS: Record<Role, string[]> = {
  owner: [...ALL_PAGES, '/employees'],
  store_manager: ALL_PAGES,
  production_manager: ['/orders', '/todos'],
  designer: ['/styles', '/todos'],
}

const API_ACCESS: Record<Role, string[] | 'all'> = {
  owner: 'all',
  store_manager: 'all',
  production_manager: ['/api/orders', '/api/jobs', '/api/trials', '/api/payments', '/api/todos'],
  designer: ['/api/styles', '/api/upload', '/api/todos'],
}

const matches = (path: string, prefix: string) =>
  prefix === '/' ? path === '/' : path === prefix || path.startsWith(prefix + '/')

export function isRole(r: string): r is Role {
  return r in ROLE_LABELS
}

export function homeFor(role: Role) {
  return PAGE_ACCESS[role][0]
}

export function canAccessPage(role: Role, path: string) {
  return PAGE_ACCESS[role].some(p => matches(path, p))
}

export function canDiscard(role: Role) {
  return role === 'owner' || role === 'store_manager'
}

export function canAccessApi(role: Role, path: string, method: string) {
  if (role === 'owner') return true
  if (matches(path, '/api/employees') && method !== 'GET') return false
  if (path === '/api/todos' && method === 'POST') return false
  if (path === '/api/styles/categories' && method !== 'GET') return false
  if (/^\/api\/(orders|estimates)\/[^/]+\/discard$/.test(path) && !canDiscard(role)) return false
  if (role === 'production_manager' && matches(path, '/api/orders') && method !== 'GET') return false
  const allowed = API_ACCESS[role]
  return allowed === 'all' || allowed.some(p => matches(path, p))
}
