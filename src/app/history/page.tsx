'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GroupSwitcher } from '@/components/GroupSwitcher'
import { Group, Cycle, Schedule, PaymentSummary } from '@/types'

export default function HistoryPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string>('')
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null)
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    loadCycles()
  }, [])

  useEffect(() => {
    if (selectedCycle) {
      loadSchedule()
      loadPaymentSummary()
    }
  }, [selectedCycle])

  const loadGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('name')
    if (data) {
      setGroups(data)
      setActiveGroupId(data[0]?.id)
    }
  }

  const loadCycles = async () => {
    const { data } = await supabase
      .from('cycles')
      .select('*')
      .order('year', { ascending: false })
    setCycles(data || [])
    if (data && data.length > 0) {
      setSelectedCycle(data[0].id)
    }
  }

  const loadSchedule = async () => {
    if (!selectedCycle) return
    const { data } = await supabase
      .from('schedule')
      .select('*, members(full_name)')
      .eq('cycle_id', selectedCycle.id)
      .order('month_number')
    setSchedule(data || [])
  }

  const loadPaymentSummary = async () => {
    if (!selectedCycle) return
    const { data } = await supabase
      .from('payment_summary')
      .select('*')
      .eq('cycle_id', selectedCycle.id)
    setPaymentSummary(data || [])
  }

  const getMonthSummary = (month: number) => {
    return paymentSummary.filter(p => p.month_number === month)
  }

  return (
    <div className="bg-slate-50 text-slate-900 min-h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <GroupSwitcher groups={groups} />
      </div>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">History</h2>

        {cycles.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">No Cycles Found</h2>
            <p className="text-slate-600 mb-4">
              No cycles have been created for this group yet.
            </p>
            <a href="/admin/setup" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              Set Up Cycle
            </a>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Cycle</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cycles.map((cycle) => (
                  <button
                    key={cycle.id}
                    onClick={() => setSelectedCycle(cycle)}
                    className={`p-4 rounded-xl border-2 text-left ${
                      selectedCycle?.id === cycle.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{cycle.year}</p>
                    <p className="text-sm text-slate-600">
                      {cycle.is_active ? 'Active' : 'Completed'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedCycle && (
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Schedule - {selectedCycle.year}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-slate-700">Month</th>
                          <th className="text-left py-3 px-4 text-slate-700">Recipient</th>
                          <th className="text-left py-3 px-4 text-slate-700">Payout Date</th>
                          <th className="text-left py-3 px-4 text-slate-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((item) => (
                          <tr className="border-b border-slate-100">
                            <td className="py-3 px-4 text-slate-900">Month {item.month_number}</td>
                            <td className="py-3 px-4 text-slate-900">{(item as any).members?.full_name}</td>
                            <td className="py-3 px-4 text-slate-600">
                              {new Date(item.payout_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              {item.has_received_payout ? (
                                <span className="text-green-600 font-medium">Paid</span>
                              ) : (
                                <span className="text-slate-500">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Summary by Month</h3>
                  <div className="space-y-4">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                      const monthPayments = getMonthSummary(month)
                      const paidCount = monthPayments.filter(p => p.status === 'paid').length
                      const partialCount = monthPayments.filter(p => p.status === 'partial').length
                      const notPaidCount = monthPayments.filter(p => p.status === 'not_paid').length
                      const totalCollected = monthPayments.reduce((sum, p) => sum + p.total_paid, 0)

                      return (
                        <div key={month} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-900">Month {month}</span>
                            <span className="text-slate-600">${totalCollected} / $1,200</span>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-green-600">{paidCount} Paid</span>
                            <span className="text-amber-600">{partialCount} Partial</span>
                            <span className="text-red-600">{notPaidCount} Not Paid</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
