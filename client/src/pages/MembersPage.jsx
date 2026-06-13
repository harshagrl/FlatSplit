import { Users } from 'lucide-react'

export default function MembersPage() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-surface-900">Members</h1>
      </div>
      <div className="card">
        <p className="text-surface-500">Members page will be built in Phase 4.</p>
      </div>
    </div>
  )
}
