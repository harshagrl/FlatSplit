import { LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
      </div>
      <div className="card">
        <p className="text-surface-500">Dashboard will be built in Phase 8.</p>
      </div>
    </div>
  )
}
