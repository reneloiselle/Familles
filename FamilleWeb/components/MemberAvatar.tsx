'use client'

import {
  FamilyMemberLike,
  getMemberAvatar,
  getMemberColor,
  getMemberDisplayName,
} from '@/lib/family/memberDisplay'

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-10 h-10 text-xl',
  lg: 'w-12 h-12 text-2xl',
}

interface MemberAvatarProps {
  member: FamilyMemberLike
  currentUserId?: string | null
  memberIds?: string[]
  size?: 'sm' | 'md' | 'lg'
  showColorRing?: boolean
  className?: string
}

export function MemberAvatar({
  member,
  currentUserId,
  memberIds,
  size = 'md',
  showColorRing = true,
  className = '',
}: MemberAvatarProps) {
  const color = getMemberColor(member, memberIds)
  const avatar = getMemberAvatar(member)
  const displayName = getMemberDisplayName(member, currentUserId)

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      style={{
        backgroundColor: showColorRing ? color : undefined,
      }}
      aria-label={displayName}
      title={displayName}
    >
      <span className="leading-none select-none">{avatar}</span>
    </div>
  )
}

interface MemberColorDotProps {
  member: FamilyMemberLike
  memberIds?: string[]
  className?: string
}

export function MemberColorDot({ member, memberIds, className = '' }: MemberColorDotProps) {
  const color = getMemberColor(member, memberIds)
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full shrink-0 ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}
