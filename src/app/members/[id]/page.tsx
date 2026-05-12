'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge'
import { Member, Cycle, PaymentSummary, PaymentEntry, Group } from '@/types'

export default function MemberDetailPage() {
  const params = useParams()
  const memberId = params.id as string
  const [member, setMember] = useState<Member | null>(null)
  const [groups, setGroups] = useState<(Group & { isMember: boolean })[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string>('')
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null)
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary[]>([])
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([])
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadMember()
    loadGroups()
  }, [memberId])

  useEffect(() => {
    if (activeGroupId) {
      loadActiveCycle()
    }
  }, [activeGroupId])

  useEffect(() => {
    if (activeCycle) {
      loadPaymentSummary()
      loadPaymentEntries()
    }
  }, [activeCycle])

  const loadMember = async () => {
    const { data } = await supabase.from('members').select('*').eq('id', memberId).single()
    if (data) {
      setMember(data)
      setEditName(data.full_name)
      setEditPhone(data.phone_number)
    }
  }

  const loadGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('name')
    if (data) {
      const memberGroups = await Promise.all(
        data.map(async (group) => {
          const { data: gm } = await supabase
            .from('group_members')
            .select('*')
            .eq('group_id', group.id)
            .eq('member_id', memberId)
            .single()
          return { ...group, isMember: !!gm } as (Group & { isMember: boolean })
        })
      )
      setGroups(memberGroups)
      const firstMemberGroup = memberGroups.find(g => g.isMember)
      if (firstMemberGroup) {
        setActiveGroupId(firstMemberGroup.id)
      }
    }
  }

  const loadActiveCycle = async () => {
    const { data } = await supabase
      .from('cycles')
      .select('*')
      .eq('group_id', activeGroupId)
      .eq('is_active', true)
      .single()
    setActiveCycle(data)
  }

  const loadPaymentSummary = async () => {
    if (!activeCycle) return
    const { data } = await supabase
      .from('payment_summary')
      .select('*')
      .eq('cycle_id', activeCycle.id)
      .eq('member_id', memberId)
    setPaymentSummary(data || [])
  }

  const loadPaymentEntries = async () => {
    if (!activeCycle) return
    const { data } = await supabase
      .from('payment_entries')
      .select('*')
      .eq('cycle_id', activeCycle.id)
      .eq('member_id', memberId)
      .order('month_number', { ascending: true })
      .order('recorded_at', { ascending: false })
    setPaymentEntries(data || [])
  }

  const handleSaveMember = async () => {
    const { error } = await supabase
      .from('members')
      .update({ full_name: editName, phone_number: editPhone })
      .eq('id', memberId)

    if (!error) {
      setIsEditing(false)
      loadMember()
    }
  }

  const getMonthSummary = (month: number) => {
    return paymentSummary.find(p => p.month_number === month)
  }

  const getMonthPayments = (month: number) => {
    return paymentEntries.filter(p => p.month_number === month)
  }

  const totalPaid = paymentSummary.reduce((sum, p) => sum + p.total_paid, 0)
  const totalOutstanding = paymentSummary.reduce((sum, p) => sum + p.balance_due, 0)

  if (!member) {
    return <div className="bg-slate-50 text-slate-900 min-h-full flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="bg-slate-50 text-slate-900 min-h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <a href="/members" className="text-indigo-600 hover:text-indigo-800">
            ← Back to Members
          </a>
          <div className="text-sm text-slate-600">
            Member Details
          </div>
        </div>
      </div>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleSaveMember}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-200 text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{member.full_name}</h2>
                <p className="text-slate-600">{member.phone_number}</p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            {groups.filter(g => g.isMember).map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeGroupId === group.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>

        {activeCycle ? (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">${totalPaid} BND</p>
                </div>
                <div>
                  <p className="text-slate-600">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">${totalOutstanding} BND</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-slate-700">Month</th>
                    <th className="text-left py-3 px-4 text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 text-slate-700">Total Paid</th>
                    <th className="text-left py-3 px-4 text-slate-700">Balance Due</th>
                    <th className="text-left py-3 px-4 text-slate-700">Transactions</th>
                    <th className="text-left py-3 px-4 text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const summary = getMonthSummary(month)
                    const payments = getMonthPayments(month)
                    const status = summary?.status || 'not_paid'

                    return (
                      <React.Fragment key={month}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-900">Month {month}</td>
                          <td className="py-3 px-4">
                            <PaymentStatusBadge status={status} />
                          </td>
                          <td className="py-3 px-4">${summary?.total_paid || 0}</td>
                          <td className="py-3 px-4">${summary?.balance_due || 100}</td>
                          <td className="py-3 px-4">{payments.length}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setExpandedMonth(expandedMonth === month ? null : month)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {expandedMonth === month ? 'Collapse' : 'Expand'}
                            </button>
                          </td>
                        </tr>

                        {expandedMonth === month && (
                          <tr className="bg-slate-50">
                            <td colSpan={6} className="py-3 px-4">
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
                                    </div>
                                  ))
                                )}
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
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">No Active Cycle</h2>
            <a href="/admin/setup" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              Set Up Cycle
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
