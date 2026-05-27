export interface ProductFields {
  name: string
  brand?: string | null
  format?: string | null
}

export function formatProductLabel(product: ProductFields): string {
  const name = product.name.trim()
  let label = name
  if (product.brand?.trim()) {
    label += ` — ${product.brand.trim()}`
  }
  if (product.format?.trim()) {
    label += ` (${product.format.trim()})`
  }
  return label
}

export function normalizeUpc(upc: string | null | undefined): string | null {
  if (!upc) return null
  const digits = upc.trim().replace(/\D/g, '')
  return digits.length > 0 ? digits : null
}

export function formatPriceCad(price: number | null | undefined): string {
  if (price == null || Number.isNaN(price)) return '—'
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(price)
}

export function parsePriceInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(',', '.')
  const num = Number.parseFloat(normalized)
  return Number.isFinite(num) ? num : null
}
