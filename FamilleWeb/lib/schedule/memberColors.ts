const MEMBER_COLOR_CLASSES = [
  { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
  { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white' },
  { bg: 'bg-violet-500', border: 'border-violet-600', text: 'text-white' },
  { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white' },
  { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white' },
  { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white' },
  { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white' },
  { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-white' },
]

export function getMemberColorIndex(memberId: string, memberIds: string[]): number {
  const idx = memberIds.indexOf(memberId)
  return idx >= 0 ? idx % MEMBER_COLOR_CLASSES.length : 0
}

export function getMemberColorClasses(memberId: string, memberIds: string[]) {
  return MEMBER_COLOR_CLASSES[getMemberColorIndex(memberId, memberIds)]
}
