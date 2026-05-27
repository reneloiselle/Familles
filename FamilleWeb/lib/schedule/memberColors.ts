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

export const MEMBER_COLOR_HEX = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#f43f5e',
  '#06b6d4',
  '#f97316',
  '#6366f1',
]

export function getMemberColorIndex(memberId: string, memberIds: string[]): number {
  const idx = memberIds.indexOf(memberId)
  return idx >= 0 ? idx % MEMBER_COLOR_CLASSES.length : 0
}

export function getMemberColorClasses(memberId: string, memberIds: string[]) {
  return MEMBER_COLOR_CLASSES[getMemberColorIndex(memberId, memberIds)]
}

export function getMemberColorHex(memberId: string, memberIds: string[]): string {
  return MEMBER_COLOR_HEX[getMemberColorIndex(memberId, memberIds)]
}

export function getDefaultColorForNewMember(memberCount: number): string {
  return MEMBER_COLOR_HEX[memberCount % MEMBER_COLOR_HEX.length]
}
