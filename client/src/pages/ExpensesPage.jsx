import { Receipt } from 'lucide-react'

export default function ExpensesPage() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Receipt className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-surface-900">Expenses</h1>
      </div>
      <div className="card">
        <p className="text-surface-500">Expenses list will be built in Phase 6.</p>
      </div>
    </div>
  )
}
