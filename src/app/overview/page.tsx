import { createClient } from '@/lib/supabase/server'
import { GroupSwitcher } from '@/components/GroupSwitcher'
import { redirect } from 'next/navigation'

async function getGroups() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('groups').select('*').order('name')

  if (error) throw error
  return data
}

export default async function OverviewPage() {
  const groups = await getGroups()

  return (
    <div className="bg-slate-50 text-slate-900 min-h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <GroupSwitcher groups={groups} />
      </div>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-xl border border-slate-200 p-6 border-l-4 cursor-pointer hover:border-slate-300 transition-all"
              style={{ borderLeftColor: group.color }}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-4" style={{ color: group.color }}>
                {group.name}
              </h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>No active cycle set up</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
