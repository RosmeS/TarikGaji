'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GroupSwitcher } from '@/components/GroupSwitcher'
import { Group, Member, Cycle, Schedule, PaymentSummary } from '@/types'

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>
}) {
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string>('')
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null)
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [currentRecipient, setCurrentRecipient] = useState<string>('')
  const [showRecipientSelection, setShowRecipientSelection] = useState(false)
  const [params, setParams] = useState<{ group?: string }>({ group: '' })
  const supabase = createClient()

  useEffect(() => {
    const loadParams = async () => {
      const p = await searchParams
      setParams(p)
    }
    loadParams()
  }, [searchParams])

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (params.group) {
      setActiveGroupId(params.group)
    } else if (groups.length > 0) {
      setActiveGroupId(groups[0].id)
    }
  }, [params, groups])

  useEffect(() => {
    if (activeGroupId) {
      loadActiveCycle()
      loadAllMembers()
    }
  }, [activeGroupId])

  useEffect(() => {
    if (activeCycle) {
      loadSchedule()
      loadPaymentSummary()
    }
  }, [activeCycle])

  const loadGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('name')
    if (data) setGroups(data)
  }

  const loadActiveCycle = async () => {
    // First, get all cycles to debug
    const { data: allCycles } = await supabase
      .from('cycles')
      .select('*')
      .order('created_at', { ascending: false })
    
    console.log('All cycles:', allCycles)
    
    // Get the most recent active cycle
    const { data } = await supabase
      .from('cycles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    console.log('Active cycle:', data)
    setActiveCycle(data)
  }

  const loadAllMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('is_active', true)
    if (data) setAllMembers(data)
  }

  const loadSchedule = async () => {
    if (!activeCycle) return
    const { data } = await supabase
      .from('schedule')
      .select('*, members!schedule_member_id_fkey(full_name)')
      .eq('cycle_id', activeCycle.id)
      .order('month_number')
    if (data) setSchedule(data)
  }

  const loadPaymentSummary = async () => {
    if (!activeCycle) return
    const { data } = await supabase
      .from('payment_summary')
      .select('*')
      .eq('cycle_id', activeCycle.id)
      .order('month_number')
    if (data) setPaymentSummary(data)
  }

  // Real-time payment summary refresh
  const refreshPaymentSummary = async () => {
    if (activeCycle) {
      await loadPaymentSummary()
    }
  }

  // Listen for payment changes from other pages
  useEffect(() => {
    const handlePaymentUpdate = () => {
      refreshPaymentSummary()
    }

    // Listen for custom event when payments are updated
    window.addEventListener('payment-updated', handlePaymentUpdate)
    
    // Also listen for storage changes (fallback)
    const handleStorageChange = () => {
      refreshPaymentSummary()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('payment-updated', handlePaymentUpdate)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [activeCycle])

  // Refresh payment summary when active cycle changes
  useEffect(() => {
    if (activeCycle) {
      refreshPaymentSummary()
    }
  }, [activeCycle])

  const handleSelectRecipient = async (memberId: string) => {
    if (!activeCycle) return
    
    const currentMonth = new Date().getMonth() + 1
    
    // Update or create schedule entry for current month
    const { error } = await supabase
      .from('schedule')
      .upsert({
        cycle_id: activeCycle.id,
        member_id: memberId,
        month_number: currentMonth,
        payout_date: new Date().toISOString(),
        has_received_payout: false
      })
    
    if (error) {
      alert('Error selecting recipient: ' + error.message)
      return
    }
    
    setCurrentRecipient(memberId)
    setShowRecipientSelection(false)
    loadSchedule()
  }

  if (!activeGroupId) {
    return (
      <div className="bg-slate-50 text-slate-900 min-h-full">
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10" />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">No Groups Found</h2>
            <p className="text-slate-600">Please set up groups in the database first.</p>
          </div>
        </main>
      </div>
    )
  }
  
  if (!activeCycle) {
    return (
      <div className="bg-slate-50 text-slate-900 min-h-full">
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <GroupSwitcher groups={groups} />
        </div>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">No Active Cycle</h2>
            <p className="text-slate-600 mb-4">
              Set up a cycle for this group to start tracking payments.
            </p>
            <a
              href="/admin/setup"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Set Up Cycle
            </a>
          </div>
        </main>
      </div>
    )
  }

  const currentMonth = new Date().getMonth() + 1
  const currentMonthSchedule = schedule.find(s => s.month_number === currentMonth)
  const currentMonthPayments = paymentSummary.filter(p => p.month_number === currentMonth)

  const paidCount = currentMonthPayments.filter(p => p.status === 'paid').length
  const partialCount = currentMonthPayments.filter(p => p.status === 'partial').length
  const notPaidCount = currentMonthPayments.filter(p => p.status === 'not_paid').length
  const totalCollected = currentMonthPayments.reduce((sum, p) => sum + p.total_paid, 0)
  const outstanding = 1200 - totalCollected

  return (
    <div className="bg-slate-50 text-slate-900 min-h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <GroupSwitcher groups={groups} />
      </div>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <div className="text-sm text-slate-600">
            Overview
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">This Month's Recipient</h3>
              <button
                onClick={() => setShowRecipientSelection(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Select Recipient
              </button>
            </div>
            {currentMonthSchedule ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{currentMonthSchedule.members?.full_name}</p>
                  <p className="text-slate-600">Payout: BND1,200</p>
                </div>
                {!currentMonthSchedule.has_received_payout && (
                  <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                    Mark as Paid
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-600">No recipient selected for this month</p>
                <button
                  onClick={() => setShowRecipientSelection(true)}
                  className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Select Recipient
                </button>
              </div>
            )}
          </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Breakdown - Month {currentMonth}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-800 font-semibold">Fully Paid</p>
              <p className="text-2xl font-bold text-green-600">{paidCount}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-amber-800 font-semibold">Partial</p>
              <p className="text-2xl font-bold text-amber-600">{partialCount}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-800 font-semibold">Not Paid</p>
              <p className="text-2xl font-bold text-red-600">{notPaidCount}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 font-semibold">Collected</p>
              <p className="text-lg font-bold text-blue-600">${totalCollected} / $1,200</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-slate-600">
              Outstanding: <span className="font-bold text-red-600">${outstanding} BND</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">12-Month Schedule</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-700">Month</th>
                  <th className="text-left py-3 px-4 text-slate-700">Recipient</th>
                  <th className="text-left py-3 px-4 text-slate-700">Payout Date</th>
                  <th className="text-left py-3 px-4 text-slate-700">Collected</th>
                  <th className="text-left py-3 px-4 text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item) => {
                  const monthPayments = paymentSummary.filter(p => p.month_number === item.month_number)
                  const monthCollected = monthPayments.reduce((sum, p) => sum + p.total_paid, 0)
                  const isCurrentMonth = item.month_number === currentMonth
                  const isPast = item.month_number < currentMonth

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 ${isCurrentMonth ? 'bg-indigo-50' : ''} ${isPast ? 'opacity-60' : ''}`}
                    >
                      <td className="py-3 px-4 text-slate-900">Month {item.month_number}</td>
                      <td className="py-3 px-4 text-slate-900">{item.members?.full_name}</td>
                      <td className="py-3 px-4 text-slate-600">{new Date(item.payout_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-slate-900">${monthCollected} / $1,200</td>
                      <td className="py-3 px-4">
                        {item.has_received_payout ? (
                          <span className="text-green-600 font-medium">Paid</span>
                        ) : (
                          <span className="text-slate-500">Pending</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recipient Selection Modal */}
        {showRecipientSelection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full max-h-96 overflow-y-auto">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Select This Month's Recipient</h3>
              <div className="space-y-2">
                {allMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectRecipient(member.id)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{member.full_name}</p>
                      <p className="text-sm text-slate-600">{member.phone_number}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setShowRecipientSelection(false)}
                  className="w-full bg-slate-200 text-slate-800 py-2 rounded-lg hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
