import { create } from 'zustand'

export interface Group {
  id: string
  name: string
  color: string
}

interface GroupStore {
  activeGroup: Group | null
  setActiveGroup: (group: Group) => void
}

export const useGroupStore = create<GroupStore>((set) => ({
  activeGroup: null,
  setActiveGroup: (group) => set({ activeGroup: group }),
}))
