import { FileText } from 'lucide-react'

export default function ImportReportPage() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-surface-900">Import Report</h1>
      </div>
      <div className="card">
        <p className="text-surface-500">Import report will be built in Phase 5.</p>
      </div>
    </div>
  )
}
