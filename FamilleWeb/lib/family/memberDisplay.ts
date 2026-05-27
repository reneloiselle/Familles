import { getMemberColorHex, MEMBER_COLOR_HEX } from '@/lib/schedule/memberColors'

export interface FamilyMemberLike {
  id: string
  user_id?: string | null
  name?: string | null
  email?: string | null
  avatar_url?: string | null
  color?: string | null
  role?: 'parent' | 'child'
}

export function getMemberDisplayName(
  member: FamilyMemberLike,
  currentUserId?: string | null
): string {
  if (currentUserId && member.user_id === currentUserId) {
    return 'Vous'
  }
  if (member.name) return member.name
  if (member.email) return member.email
  return `Membre ${member.id.slice(0, 8)}`
}

export function getMemberAvatar(member: FamilyMemberLike): string {
  return member.avatar_url || '👤'
}

export function getMemberColor(
  member: FamilyMemberLike,
  memberIds?: string[]
): string {
  if (member.color) return member.color
  if (memberIds && memberIds.length > 0) {
    return getMemberColorHex(member.id, memberIds)
  }
  return MEMBER_COLOR_HEX[0]
}

export function canEditMember(
  member: FamilyMemberLike,
  currentUserId: string,
  isParent: boolean
): boolean {
  if (isParent) return true
  return member.user_id === currentUserId
}

export const EMOJI_OPTIONS = [
  '👤', '👨', '👩', '👦', '👧', '👶', '👴', '👵',
  '🧑', '🧒', '🧔', '👱', '👨‍🦰', '👩‍🦰',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🦁', '🐯', '🦄',
  '⚽', '🎮', '🎨', '📚', '🎵', '🎸', '🚲', '⭐', '🌟', '🌈', '🍕',
]
