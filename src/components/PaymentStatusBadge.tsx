interface PaymentStatusBadgeProps {
  status: 'not_paid' | 'partial' | 'paid'
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const styles = {
    not_paid: 'bg-red-100 text-red-800 border-red-200',
    partial: 'bg-amber-100 text-amber-800 border-amber-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
  }

  const labels = {
    not_paid: 'Not Paid',
    partial: 'Partial',
    paid: 'Fully Paid',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
