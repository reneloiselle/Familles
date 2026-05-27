import type { SupabaseClient } from '@supabase/supabase-js'
import { formatProductLabel } from '@/lib/products'

export interface CatalogProductRow {
  id: string
  name: string
  brand: string | null
  format: string | null
  price: number | null
  upc: string | null
}

export interface LineCatalogMatch {
  line: string
  product: CatalogProductRow | null
}

export async function matchLinesToCatalog(
  supabase: SupabaseClient,
  familyId: string,
  lines: string[]
): Promise<{ matched: LineCatalogMatch[]; missing: string[] }> {
  const matched: LineCatalogMatch[] = []
  const missing: string[] = []

  for (const line of lines) {
    const { data: productId, error } = await supabase.rpc('find_product', {
      p_family_id: familyId,
      p_name: line,
      p_upc: null,
    })

    if (error) {
      throw error
    }

    if (!productId) {
      missing.push(line)
      matched.push({ line, product: null })
      continue
    }

    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id, name, brand, format, price, upc')
      .eq('id', productId)
      .single()

    if (fetchErr || !product) {
      missing.push(line)
      matched.push({ line, product: null })
      continue
    }

    matched.push({ line, product: product as CatalogProductRow })
  }

  return { matched, missing }
}

export function isProductAlreadyOnList(
  items: { product_id: string | null }[],
  productId: string
): boolean {
  return items.some((item) => item.product_id === productId)
}

export function isListTextAlreadyPresent(
  items: { text: string }[],
  line: string
): boolean {
  const key = line.trim().toLowerCase()
  if (!key) return true
  return items.some((item) => item.text.trim().toLowerCase() === key)
}

export function filterNewTextLines(
  items: { text: string }[],
  lines: string[]
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const line of lines) {
    const key = line.trim().toLowerCase()
    if (!key || isListTextAlreadyPresent(items, line) || seen.has(key)) continue
    seen.add(key)
    result.push(line.trim())
  }
  return result
}

export function formatListItemText(product: CatalogProductRow): string {
  return formatProductLabel(product)
}
