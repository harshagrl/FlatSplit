import { ArrowLeftRight } from 'lucide-react'

export default function SettlementsPage() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <ArrowLeftRight className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-surface-900">Settlements</h1>
      </div>
      <div className="card">
        <p className="text-surface-500">Settlements will be built in Phase 7.</p>
      </div>
    </div>
  )
}
