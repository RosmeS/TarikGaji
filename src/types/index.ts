export interface Group {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Member {
  id: string
  full_name: string
  phone_number: string
  is_active: boolean
  created_at: string
  group_count?: number
}

export interface GroupMember {
  id: string
  group_id: string
  member_id: string
}

export interface Cycle {
  id: string
  group_id: string
  year: number
  start_month: number
  is_active: boolean
  created_at: string
}

export interface Schedule {
  id: string
  cycle_id: string
  member_id: string
  month_number: number
  payout_date: string
  has_received_payout: boolean
  members?: {
    full_name: string
  }
}

export interface PaymentEntry {
  id: string
  cycle_id: string
  member_id: string
  month_number: number
  amount: number
  receipt_url: string | null
  notes: string | null
  recorded_at: string
}

export interface PaymentSummary {
  cycle_id: string
  member_id: string
  month_number: number
  total_paid: number
  balance_due: number
  status: 'not_paid' | 'partial' | 'paid'
}
