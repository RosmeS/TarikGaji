'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GroupSwitcher } from '@/components/GroupSwitcher'
import { Group, Member, Cycle } from '@/types'

export default function SetupPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string>('')
  const [members, setMembers] = useState<Member[]>([])
  const [step, setStep] = useState(1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [startMonth, setStartMonth] = useState(1)
  const [memberOrder, setMemberOrder] = useState<string[]>([])
  const [previewSchedule, setPreviewSchedule] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (activeGroupId) {
      loadMembers()
    }
  }, [activeGroupId])

  const loadGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('name')
    if (data) {
      setGroups(data)
      setActiveGroupId(data[0]?.id)
    }
  }

  const loadMembers = async () => {
    // Load all active members across all groups for global cycle
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('is_active', true)
    if (data) {
      setMembers(data)
      setMemberOrder(data.map((m: Member) => m.id))
    }
  }

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    e.dataTransfer.setData('memberId', memberId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetMemberId: string) => {
    e.preventDefault()
    const draggedMemberId = e.dataTransfer.getData('memberId')
    const newOrder = [...memberOrder]
    const fromIndex = newOrder.indexOf(draggedMemberId)
    const toIndex = newOrder.indexOf(targetMemberId)
    newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, draggedMemberId)
    setMemberOrder(newOrder)
  }

  const generatePreview = () => {
    const schedule = memberOrder.map((memberId, index) => ({
      month: index + 1,
      member: members.find((m: Member) => m.id === memberId),
    }))
    setPreviewSchedule(schedule)
    setStep(3)
  }

  const handleCreateCycle = async () => {
    if (memberOrder.length !== 12) return

    // Create global cycle (no group_id)
    const cycleData = {
      year,
      start_month: startMonth,
      is_active: true,
    }

    const { data: cycle, error: cycleError } = await supabase
      .from('cycles')
      .insert(cycleData)
      .select()
      .single()

    if (cycleError || !cycle) {
      alert('Error creating cycle: ' + (cycleError?.message || 'Unknown error'))
      return
    }

    // Create schedule
    for (let i = 0; i < 12; i++) {
      const monthNumber = ((startMonth - 1 + i) % 12) + 1
      const payoutDate = new Date(year, monthNumber - 1, 1)
      const memberId = memberOrder[i]

      await supabase.from('schedule').insert({
        cycle_id: cycle.id,
        member_id: memberId,
        month_number: monthNumber,
        payout_date: payoutDate.toISOString().split('T')[0],
        has_received_payout: false,
      })
    }

    alert('Global cycle created successfully!')
    window.location.href = '/dashboard'
  }

  if (members.length !== 12) {
    return (
      <div className="bg-slate-50 text-slate-900 min-h-full">
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <GroupSwitcher groups={groups} />
        </div>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Need 12 Members</h2>
            <p className="text-slate-600 mb-4">
              You have {members.length} active members total. You need exactly 12 members to create a global cycle.
            </p>
            <a href="/members" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              Manage Members
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 text-slate-900 min-h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <GroupSwitcher groups={groups} />
      </div>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Global Cycle Setup</h2>

        {step === 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 1: Set Year and Start Month</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Month</label>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(year, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setStep(2)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 2: Set Payout Order</h3>
            <p className="text-slate-600 mb-4">Drag and drop members to set the payout order for months 1-12</p>
            <div className="space-y-2">
              {memberOrder.map((memberId, index) => {
                const member = members.find((m: Member) => m.id === memberId)
                return (
                  <div
                    key={memberId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, memberId)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, memberId)}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-move hover:bg-slate-100"
                  >
                    <span className="font-bold text-slate-500">#{index + 1}</span>
                    <span className="flex-1 font-medium text-slate-900">{member?.full_name}</span>
                    <span className="text-slate-500">Month {index + 1}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep(1)}
                className="bg-slate-200 text-slate-800 px-6 py-2 rounded-lg hover:bg-slate-300"
              >
                Back
              </button>
              <button
                onClick={generatePreview}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Preview
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 3: Preview Schedule</h3>
            <div className="space-y-2 mb-6">
              {previewSchedule.map((item) => (
                <div key={item.month} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-900">Month {item.month}</span>
                  <span className="text-slate-900">{item.member?.full_name}</span>
                  <span className="text-slate-500">
                    {new Date(year, startMonth - 1 + item.month - 1).toLocaleString('default', { month: 'long' })}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="bg-slate-200 text-slate-800 px-6 py-2 rounded-lg hover:bg-slate-300"
              >
                Back
              </button>
              <button
                onClick={handleCreateCycle}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Confirm & Create Cycle
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
