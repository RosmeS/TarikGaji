'use client'

import { useGroupStore } from '@/lib/store'
import { Group } from '@/types'

interface GroupSwitcherProps {
  groups: Group[]
  activeGroupId?: string
  onGroupChange?: (groupId: string) => void
}

export function GroupSwitcher({ groups, activeGroupId, onGroupChange }: GroupSwitcherProps) {
  const { activeGroup, setActiveGroup } = useGroupStore()

  return (
    <div className="flex gap-2">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => {
            setActiveGroup(group)
            onGroupChange?.(group.id)
          }}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${activeGroupId === group.id
              ? 'text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          style={activeGroupId === group.id ? { backgroundColor: group.color } : {}}
        >
          {group.name}
        </button>
      ))}
    </div>
  )
}
