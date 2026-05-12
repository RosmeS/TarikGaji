'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GroupSwitcher } from '@/components/GroupSwitcher'
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge'
import { Group, Member, Cycle, PaymentSummary } from '@/types'

export default function MembersPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string>('')
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editMemberName, setEditMemberName] = useState('')
  const [editMemberPhone, setEditMemberPhone] = useState('')
  const [editSelectedGroups, setEditSelectedGroups] = useState<string[]>([])
  const supabase = createClient()

  const currentMonth = new Date().getMonth() + 1

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
      loadPaymentSummary()
    }
  }, [activeCycle])

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
      .eq('group_id', activeGroupId)
      .eq('is_active', true)
      .single()
    setActiveCycle(data)
  }

  const loadMembers = async () => {
    if (!activeGroupId) return
    
    const { data } = await supabase
      .from('group_members')
      .select('members(*)')
      .eq('group_id', activeGroupId)
      .eq('members.is_active', true)
    if (data) {
      setMembers(data.map((gm: any) => gm.members))
    }
  }

  const loadPaymentSummary = async () => {
    if (!activeCycle) return
    const { data } = await supabase
      .from('payment_summary')
      .select('*')
      .eq('cycle_id', activeCycle.id)
      .eq('month_number', currentMonth)
    setPaymentSummary(data || [])
  }

  const handleAddMember = async () => {
    if (!newMemberName) return
    
    if (selectedGroups.length === 0) {
      alert('Please select at least one group for this member.')
      return
    }

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert({ 
        full_name: newMemberName, 
        phone_number: newMemberPhone || null 
      })
      .select()
      .single()

    if (memberError) {
      alert(memberError.message)
      return
    }

    // Add member to all selected groups
    const groupMemberInserts = selectedGroups.map(groupId => ({
      group_id: groupId,
      member_id: memberData.id,
    }))

    const { error: groupMemberError } = await supabase
      .from('group_members')
      .insert(groupMemberInserts)

    if (groupMemberError) {
      alert(groupMemberError.message)
      return
    }

    setNewMemberName('')
    setNewMemberPhone('')
    setSelectedGroups([])
    setShowAddModal(false)
    loadMembers()
  }

  
  const handleEditMember = (member: Member) => {
    setEditingMember(member)
    setEditMemberName(member.full_name)
    setEditMemberPhone(member.phone_number)
    
    // Load current group memberships for this member
    const loadMemberGroups = async () => {
      const { data } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('member_id', member.id)
      
      if (data) {
        setEditSelectedGroups(data.map(gm => gm.group_id))
      }
    }
    
    loadMemberGroups()
    setShowEditModal(true)
  }

  const handleDeleteMember = async (memberId: string) => {
    if (confirm('Are you sure you want to deactivate this member? They will be marked as inactive but their data will be preserved.')) {
      // Deactivate the member record
      const { error } = await supabase
        .from('members')
        .update({ is_active: false })
        .eq('id', memberId)
      
      if (!error) {
        loadMembers()
      } else {
        alert('Error deactivating member: ' + error.message)
      }
    }
  }

  const handleUpdateMember = async () => {
    if (!editingMember || !editMemberName) return
    
    if (editSelectedGroups.length === 0) {
      alert('Please select at least one group for this member.')
      return
    }

    // Update member details
    const { error: memberError } = await supabase
      .from('members')
      .update({ 
        full_name: editMemberName, 
        phone_number: editMemberPhone || null 
      })
      .eq('id', editingMember.id)

    if (memberError) {
      alert(memberError.message)
      return
    }

    // Update group memberships
    // Remove existing memberships
    await supabase
      .from('group_members')
      .delete()
      .eq('member_id', editingMember.id)

    // Add new memberships
    const groupMemberInserts = editSelectedGroups.map(groupId => ({
      group_id: groupId,
      member_id: editingMember.id,
    }))

    const { error: groupMemberError } = await supabase
      .from('group_members')
      .insert(groupMemberInserts)

    if (groupMemberError) {
      alert(groupMemberError.message)
      return
    }

    setShowEditModal(false)
    setEditingMember(null)
    setEditMemberName('')
    setEditMemberPhone('')
    setEditSelectedGroups([])
    loadMembers()
  }

  const getMemberSummary = (memberId: string) => {
    return paymentSummary.find(p => p.member_id === memberId)
  }

  
  return (
    <div className="bg-slate-50 text-slate-900 min-h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <GroupSwitcher groups={groups} />
      </div>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Members</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">
              Member Management
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium shadow-md"
            >
              + Add Member
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-slate-700">Name</th>
                <th className="text-left py-3 px-4 text-slate-700">Phone</th>
                <th className="text-left py-3 px-4 text-slate-700">Member Status</th>
                <th className="text-left py-3 px-4 text-slate-700">Status (This Month)</th>
                <th className="text-left py-3 px-4 text-slate-700">Total Paid</th>
                <th className="text-left py-3 px-4 text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const summary = getMemberSummary(member.id)
                const status = summary?.status || 'not_paid'

                return (
                  <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">
                      <a href={`/members/${member.id}`} className="text-indigo-600 hover:text-indigo-800">
                        {member.full_name}
                      </a>
                    </td>
                    <td className="py-3 px-4">{member.phone_number}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        member.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <PaymentStatusBadge status={status} />
                    </td>
                    <td className="py-3 px-4">${summary?.total_paid || 0}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleEditMember(member)}
                        className="text-indigo-600 hover:text-indigo-800 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Add New Member</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    placeholder="Enter phone number (optional)"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assign to Groups</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {groups.map((group) => (
                      <label key={group.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroups([...selectedGroups, group.id])
                            } else {
                              setSelectedGroups(selectedGroups.filter(id => id !== group.id))
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">{group.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleAddMember}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Add Member
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setSelectedGroups([])
                    }}
                    className="flex-1 bg-slate-200 text-slate-800 py-2 rounded-lg hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Member Modal */}
        {showEditModal && editingMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Edit Member</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={editMemberName}
                    onChange={(e) => setEditMemberName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={editMemberPhone}
                    onChange={(e) => setEditMemberPhone(e.target.value)}
                    placeholder="Enter phone number (optional)"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assign to Groups</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {groups.map((group) => (
                      <label key={group.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editSelectedGroups.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditSelectedGroups([...editSelectedGroups, group.id])
                            } else {
                              setEditSelectedGroups(editSelectedGroups.filter(id => id !== group.id))
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">{group.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleUpdateMember}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Update Member
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingMember(null)
                      setEditMemberName('')
                      setEditMemberPhone('')
                      setEditSelectedGroups([])
                    }}
                    className="flex-1 bg-slate-200 text-slate-800 py-2 rounded-lg hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
