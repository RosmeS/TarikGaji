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
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>('')
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [manualPaymentAmount, setManualPaymentAmount] = useState<number>(0)
  const [manualPaymentNotes, setManualPaymentNotes] = useState<string>('')
  const [showManualPayment, setShowManualPayment] = useState<boolean>(false)
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
    
    console.log('Loading payments for cycle:', activeCycle.id, 'month:', selectedMonth)
    
    const { data, error } = await supabase
      .from('payment_entries')
      .select('*')
      .eq('cycle_id', activeCycle.id)
      .eq('month_number', selectedMonth)
      .order('recorded_at', { ascending: false })
    
    if (error) {
      console.error('Error loading payment entries:', error)
      setPaymentEntries([])
      return
    }
    
    console.log('Raw payment entries from DB:', data)
    
    // Filter out payments for deleted members by checking member is_active status
    const validEntries = data?.filter(entry => {
      const member = members.find(m => m.id === entry.member_id)
      return member && member.is_active
    }) || []
    
    console.log('Filtered payment entries:', validEntries)
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
    const amount = Number(newPaymentAmount)
    console.log('Adding payment:', { memberId, amount, activeCycle, selectedMonth, notes: manualPaymentAmount })
    
    if (!activeCycle) {
      alert('Error: No active cycle found')
      return
    }
    if (!newPaymentAmount) {
      alert('Error: Please enter an amount')
      return
    }
    if (amount <= 0) {
      alert('Error: Amount must be greater than 0')
      return
    }

    const { error } = await supabase.from('payment_entries').insert({
      cycle_id: activeCycle.id,
      member_id: memberId,
      month_number: selectedMonth,
      amount: amount,
      notes: manualPaymentNotes,
    })

    if (!error) {
      alert('Payment added successfully!')
      setNewPaymentAmount('')
      setManualPaymentNotes('')
      setShowAddPayment(null)
      loadPaymentSummary()
      loadPaymentEntries()
      
      // Trigger dashboard update
      window.dispatchEvent(new CustomEvent('payment-updated', { detail: { timestamp: Date.now() } }))
    } else {
      alert('Error adding payment: ' + error.message)
      console.error('Payment insertion error:', error)
    }
  }

  const handleDeletePayment = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      const { error } = await supabase.from('payment_entries').delete().eq('id', entryId)
      if (!error) {
        loadPaymentSummary()
        loadPaymentEntries()
        
        // Trigger dashboard update
        window.dispatchEvent(new CustomEvent('payment-updated', { detail: { timestamp: Date.now() } }))
      } else {
        alert('Error deleting payment: ' + error.message)
      }
    }
  }

  const handleManualPayment = async () => {
    if (!activeCycle || !selectedMember || manualPaymentAmount <= 0) return

    const { error } = await supabase.from('payment_entries').insert({
      cycle_id: activeCycle.id,
      member_id: selectedMember,
      month_number: selectedMonth,
      amount: manualPaymentAmount,
      notes: manualPaymentNotes,
    })

    if (!error) {
      setSelectedMember('')
      setManualPaymentAmount(0)
      setManualPaymentNotes('')
      setShowManualPayment(false)
      loadPaymentSummary()
      loadPaymentEntries()
      alert('Payment added successfully!')
    } else {
      alert('Error adding payment: ' + error.message)
    }
  }

  const handleMarkAllPaid = async () => {
    if (!activeCycle) return

    // Show loading state
    const originalButton = document.querySelector('[data-testid="mark-all-paid-button"]') as HTMLButtonElement
    if (originalButton) {
      originalButton.textContent = 'Processing...'
      originalButton.disabled = true
    }

    let processedCount = 0
    let errorCount = 0

    for (const member of members) {
      const paymentAmount = await calculatePaymentAmount(member.id)
      
      // Check if member already has payment for this month
      const existingPayment = paymentEntries.find(
        p => p.member_id === member.id && p.month_number === selectedMonth
      )
      
      if (!existingPayment) {
        try {
          await supabase.from('payment_entries').insert({
            cycle_id: activeCycle.id,
            member_id: member.id,
            month_number: selectedMonth,
            amount: paymentAmount,
          })
          processedCount++
        } catch (error) {
          errorCount++
          console.error('Payment insertion error:', error)
        }
      } else {
        processedCount++ // Already had payment
      }
    }

    // Restore button state
    if (originalButton) {
      if (errorCount === 0) {
        originalButton.textContent = `Marked ${processedCount} members as paid!`
        originalButton.className = 'bg-green-600 text-white px-6 py-2 rounded-lg'
      } else {
        originalButton.textContent = `Error: ${errorCount} failed`
        originalButton.className = 'bg-red-600 text-white px-6 py-2 rounded-lg'
      }
      originalButton.disabled = false
    }

    loadPaymentSummary()
    loadPaymentEntries()
  }

  const getMemberPayments = (memberId: string) => {
    const payments = paymentEntries.filter(p => p.member_id === memberId)
    console.log(`Payments for member ${memberId}:`, payments)
    return payments
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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-sm text-slate-600">
              Payment Management
            </div>
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
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Collection Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">BND{totalCollected}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Expected Amount</p>
              <p className="text-2xl font-bold text-red-600">BND{totalOutstanding}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Active Members</p>
              <p className="text-2xl font-bold text-blue-600">{members.length}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Mark All as Fully Paid</h4>
              <p className="text-sm text-slate-600">Add payments for all unpaid members this month</p>
            </div>
            <button
              onClick={handleMarkAllPaid}
              data-testid="mark-all-paid-button"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
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
                          {expandedMember === member.id ? (
                            <button
                              onClick={() => setExpandedMember(null)}
                              className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
                            >
                              Collapse
                            </button>
                          ) : (
                            <button
                              onClick={() => setExpandedMember(member.id)}
                              className="bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded text-sm"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedMember === member.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="py-3 px-4 pl-2">
                          <div className="space-y-4 border-l-4 border-green-200 pl-4">
                            {/* Payment Entry Form */}
                            {showAddPayment === member.id ? (
                              <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h4 className="text-sm font-medium text-slate-700 mb-3">Add New Payment</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                      Amount (BND)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={newPaymentAmount}
                                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                                      placeholder="0.00"
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                      Suggested: BND{(member.group_count || 1) * 100}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                      Notes (Optional)
                                    </label>
                                    <textarea
                                      value={manualPaymentNotes}
                                      onChange={(e) => setManualPaymentNotes(e.target.value)}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                      rows={2}
                                      placeholder="Add notes..."
                                    />
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <button
                                      onClick={() => handleAddPayment(member.id)}
                                      disabled={!newPaymentAmount || Number(newPaymentAmount) <= 0}
                                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-400 text-sm"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowAddPayment(null)
                                        setNewPaymentAmount('')
                                        setManualPaymentNotes('')
                                      }}
                                      className="text-slate-600 hover:text-slate-800 px-3 py-2 text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-medium text-slate-700">Payment History</h4>
                                  <p className="text-xs text-slate-500">Total: {payments.length} payment(s)</p>
                                </div>
                                <button
                                  onClick={() => setShowAddPayment(member.id)}
                                  className="bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded text-sm"
                                >
                                  + Add Payment
                                </button>
                              </div>
                            )}
                            
                            {/* Payment List */}
                            <div className="space-y-2">
                              {payments.length === 0 ? (
                                <div className="text-center py-4 bg-white rounded-lg border border-slate-200">
                                  <p className="text-slate-500 text-sm">No payments recorded</p>
                                  <p className="text-xs text-slate-400 mt-1">Click "+ Add Payment" above to add a payment</p>
                                </div>
                              ) : (
                                payments.map((payment) => (
                                  <div key={payment.id} className="bg-white rounded-lg border border-slate-200 p-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                          <span className="font-semibold text-slate-900">BND{payment.amount}</span>
                                          <span className="text-xs text-slate-500">
                                            {new Date(payment.recorded_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                        {payment.notes && (
                                          <p className="text-sm text-slate-600 mt-1">{payment.notes}</p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleDeletePayment(payment.id)}
                                        className="text-red-600 hover:text-red-800 px-2 py-1 rounded text-sm hover:bg-red-50"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
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
