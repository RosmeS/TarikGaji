'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GroupSwitcher } from '@/components/GroupSwitcher'
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge'
import { Group, Member, Cycle, Schedule, PaymentEntry, PaymentSummary } from '@/types'

export default function PaymentsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string>('')
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary[]>([])
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([])
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [showAddPayment, setShowAddPayment] = useState<string | null>(null)
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0)
  const supabase = createClient()

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (activeGroupId) {
      loadActiveCycle()
      loadMembers()
    }
  }, [activeGroupId])

  useEffect(() => {
    if (activeCycle) {
      loadSchedule()
      loadPaymentSummary()
      loadPaymentEntries()
    }
  }, [activeCycle, selectedMonth])

  const loadGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('name')
    if (data) {
      setGroups(data)
      setActiveGroupId(data[0]?.id)
    }
  }

  const loadActiveCycle = async () => {
    const { data } = await supabase
      .from('cycles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setActiveCycle(data)
  }

  const loadMembers = async () => {
    // Load all active members with their group counts
    const { data: allMembers } = await supabase
      .from('members')
      .select('*')
      .eq('is_active', true)
    
    if (!allMembers) return

    // Count groups for each member
    const membersWithCounts = await Promise.all(
      allMembers.map(async (member: any) => {
        const { data: groupMemberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('member_id', member.id)
        
        return {
          ...member,
          group_count: groupMemberships?.length || 1
        }
      })
    )
    
    setMembers(membersWithCounts)
  }

  const loadSchedule = async () => {
    if (!activeCycle) return
    const { data } = await supabase
      .from('schedule')
      .select('*')
      .eq('cycle_id', activeCycle.id)
      .order('month_number')
    setSchedule(data || [])
  }

  const loadPaymentSummary = async () => {
    if (!activeCycle) return
    const { data } = await supabase
      .from('payment_summary')
      .select('*, members!inner(member_id)')
      .eq('cycle_id', activeCycle.id)
      .eq('month_number', selectedMonth)
    
    // Filter out deleted members
    const validSummary = data?.filter(summary => summary.members) || []
    setPaymentSummary(validSummary)
  }

  const loadPaymentEntries = async () => {
    if (!activeCycle) return
    const { data } = await supabase
      .from('payment_entries')
      .select('*, members!inner(member_id)')
      .eq('cycle_id', activeCycle.id)
      .eq('month_number', selectedMonth)
      .order('recorded_at', { ascending: false })
    
    // Filter out deleted members
    const validEntries = data?.filter(entry => entry.members) || []
    setPaymentEntries(validEntries)
  }

  const calculatePaymentAmount = async (memberId: string) => {
    // Count how many groups this member belongs to
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('member_id', memberId)
    
    const groupCount = data ? data.length : 1
    return 100 * groupCount // BND100 per group
  }

  const handleAddPayment = async (memberId: string) => {
    if (!activeCycle || newPaymentAmount <= 0) return

    const { error } = await supabase.from('payment_entries').insert({
      cycle_id: activeCycle.id,
      member_id: memberId,
      month_number: selectedMonth,
      amount: newPaymentAmount,
    })

    if (!error) {
      setNewPaymentAmount(0)
      setShowAddPayment(null)
      loadPaymentSummary()
      loadPaymentEntries()
    } else {
      alert('Error adding payment: ' + error.message)
    }
  }

  const handleDeletePayment = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      const { error } = await supabase.from('payment_entries').delete().eq('id', entryId)
      if (!error) {
        loadPaymentSummary()
        loadPaymentEntries()
      } else {
        alert('Error deleting payment: ' + error.message)
      }
    }
  }

  const handleMarkAllPaid = async () => {
    if (!activeCycle) return

    for (const member of members) {
      const paymentAmount = await calculatePaymentAmount(member.id)
      
      // Check if member already has payment for this month
      const existingPayment = paymentEntries.find(
        p => p.member_id === member.id && p.month_number === selectedMonth
      )
      
      if (!existingPayment) {
        await supabase.from('payment_entries').insert({
          cycle_id: activeCycle.id,
          member_id: member.id,
          month_number: selectedMonth,
          amount: paymentAmount,
        })
      }
    }

    loadPaymentSummary()
    loadPaymentEntries()
  }

  const getMemberPayments = (memberId: string) => {
    return paymentEntries.filter(p => p.member_id === memberId)
  }

  const getMemberSummary = (memberId: string) => {
    return paymentSummary.find(p => p.member_id === memberId)
  }

  const getActiveMemberIds = () => {
    return members
      .filter(member => member.is_active)
      .map(member => member.id)
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
            <a href="/admin/setup" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              Set Up Cycle
            </a>
          </div>
        </main>
      </div>
    )
  }

  const totalCollected = paymentSummary.reduce((sum, p) => sum + p.total_paid, 0)
  const totalOutstanding = members.length * 100 // Always show expected total outstanding

  return (
    <div className="bg-slate-50 text-slate-900 min-h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <GroupSwitcher groups={groups} />
      </div>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Month {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Collection Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Collected:</span>
                <span className="font-bold text-green-600">BND{totalCollected}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Outstanding:</span>
                <span className="font-bold text-red-600">BND{totalOutstanding}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Quick Actions</h3>
            <button
              onClick={handleMarkAllPaid}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Mark All as Fully Paid
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-slate-700">Name</th>
                <th className="text-left py-3 px-4 text-slate-700">Phone</th>
                <th className="text-left py-3 px-4 text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-slate-700">Paid</th>
                <th className="text-left py-3 px-4 text-slate-700">Balance Due</th>
                <th className="text-left py-3 px-4 text-slate-700">Transactions</th>
                <th className="text-left py-3 px-4 text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const summary = getMemberSummary(member.id)
                const payments = getMemberPayments(member.id)
                const status = summary?.status || 'not_paid'

                return (
                  <React.Fragment key={member.id}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{member.full_name}</td>
                      <td className="py-3 px-4">{member.phone_number}</td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={status} />
                      </td>
                      <td className="py-3 px-4">${summary?.total_paid || 0}</td>
                      <td className="py-3 px-4">${summary?.balance_due || 100}</td>
                      <td className="py-3 px-4">{payments.length}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {expandedMember === member.id ? 'Collapse' : 'Expand'}
                          </button>
                          {summary?.balance_due! > 0 && (
                            <button
                              onClick={() => setShowAddPayment(showAddPayment === member.id ? null : member.id)}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              + Add Payment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedMember === member.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="py-3 px-4">
                          <div className="space-y-2">
                            {payments.length === 0 ? (
                              <p className="text-slate-500">No transactions</p>
                            ) : (
                              payments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                                  <div>
                                    <p className="font-medium text-slate-900">${payment.amount}</p>
                                    <p className="text-sm text-slate-500">
                                      {new Date(payment.recorded_at).toLocaleString()}
                                    </p>
                                    {payment.notes && <p className="text-sm text-slate-600">{payment.notes}</p>}
                                  </div>
                                  <button
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {showAddPayment === member.id && (
                      <tr className="bg-indigo-50">
                        <td colSpan={7} className="py-3 px-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Payment Amount (BND)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={summary?.balance_due || (member.group_count || 1) * 100}
                                value={newPaymentAmount}
                                onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                                placeholder={`Max: BND${summary?.balance_due || (member.group_count || 1) * 100}`}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                Suggested: BND{(member.group_count || 1) * 100} ({member.group_count || 1} group(s))
                              </p>
                            </div>
                            <button
                              onClick={() => handleAddPayment(member.id)}
                              disabled={newPaymentAmount <= 0}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-400"
                            >
                              Add Payment
                            </button>
                            <button
                              onClick={() => {
                                setShowAddPayment(null)
                                setNewPaymentAmount(0)
                              }}
                              className="text-slate-600 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

              </main>
    </div>
  )
}
