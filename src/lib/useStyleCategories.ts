'use client'

import useSWR from 'swr'
import { STYLE_CATEGORIES } from '@/lib/constants'

const FALLBACK: string[] = STYLE_CATEGORIES.filter(c => c !== 'All')

export function useStyleCategories() {
  const { data, mutate } = useSWR<string[]>('/api/styles/categories')
  return { categories: data ?? FALLBACK, refresh: mutate }
}
