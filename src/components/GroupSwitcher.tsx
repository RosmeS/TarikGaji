'use client'

import { useGroupStore } from '@/lib/store'
import { Group } from '@/types'

interface GroupSwitcherProps {
  groups: Group[]
}

export function GroupSwitcher({ groups }: GroupSwitcherProps) {
  const { activeGroup, setActiveGroup } = useGroupStore()

  return (
    <div className="flex gap-2">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => setActiveGroup(group)}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${activeGroup?.id === group.id
              ? 'text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          style={activeGroup?.id === group.id ? { backgroundColor: group.color } : {}}
        >
          {group.name}
        </button>
      ))}
    </div>
  )
}
