import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FileText, Calendar, CheckCircle, AlertTriangle, XCircle, ArrowLeft, Database, Clock, Info } from 'lucide-react'
import api from '../services/api.js'
import { formatDate } from '../utils/formatters.js'

export default function ImportReportPage() {
  const { id } = useParams()
  
  const [runs, setRuns] = useState([])
  const [runDetail, setRunDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    if (id) {
      api.get(`/import/runs/${id}`)
        .then(res => setRunDetail(res.data.run))
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      api.get('/import/runs')
        .then(res => setRuns(res.data.runs))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-900 mb-6 flex items-center gap-2">
          <Database className="w-6 h-6 text-brand-600" />
          Import History
        </h1>
        <div className="card h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Render Run Detail View
  if (id && runDetail) {
    const { anomalies } = runDetail
    
    return (
      <div className="animate-fade-in max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/import/history" className="btn btn-secondary p-2">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">Import Report</h1>
              <p className="text-surface-600 flex items-center gap-2 text-sm mt-1">
                <FileText className="w-4 h-4" /> {runDetail.filename}
                <span className="text-surface-300">•</span>
                <Clock className="w-4 h-4" /> {new Date(runDetail.started_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div>
            {runDetail.status === 'COMPLETED' ? (
              <span className="badge badge-success px-3 py-1.5 text-sm">Completed</span>
            ) : (
              <span className="badge badge-warning px-3 py-1.5 text-sm">Review Pending</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center border-b-4 border-b-brand-500">
            <div className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Total Rows</div>
            <div className="text-2xl font-bold">{runDetail.total_rows}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-success-500">
            <div className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Imported</div>
            <div className="text-2xl font-bold text-success-600">{runDetail.imported_count}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-error-500">
            <div className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Skipped</div>
            <div className="text-2xl font-bold text-error-600">{runDetail.skipped_count}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-warning-500">
            <div className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Flagged</div>
            <div className="text-2xl font-bold text-warning-600">{runDetail.flagged_count}</div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-surface-900 mb-4">Anomaly Log</h2>
        
        {anomalies.length === 0 ? (
          <div className="card text-center p-8 text-surface-500">
            No anomalies found in this import. Perfect run!
          </div>
        ) : (
          <div className="card p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-surface-50 text-surface-600 font-semibold border-b border-surface-200">
                <tr>
                  <th className="px-4 py-3">Row</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Anomaly Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Resolution</th>
                  <th className="px-4 py-3">Action Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {anomalies.map(a => (
                  <tr key={a.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-surface-500">{a.row_number}</td>
                    <td className="px-4 py-3">
                      {a.severity === 'ERROR' && <span className="text-error-600 font-bold text-xs uppercase tracking-wide flex items-center gap-1"><XCircle className="w-3 h-3"/> ERROR</span>}
                      {a.severity === 'WARNING' && <span className="text-warning-600 font-bold text-xs uppercase tracking-wide flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> WARNING</span>}
                      {a.severity === 'INFO' && <span className="text-info-600 font-bold text-xs uppercase tracking-wide flex items-center gap-1"><Info className="w-3 h-3"/> INFO</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-surface-800">{a.anomaly_type}</td>
                    <td className="px-4 py-3 text-surface-600 whitespace-normal min-w-[300px]">{a.description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        a.resolution === 'AUTO_APPROVED' ? 'bg-success-100 text-success-800' :
                        a.resolution === 'USER_APPROVED' ? 'bg-success-100 text-success-800' :
                        a.resolution === 'USER_EDITED' ? 'bg-success-100 text-success-800' :
                        a.resolution === 'USER_REJECTED' ? 'bg-error-100 text-error-800' :
                        'bg-surface-100 text-surface-600'
                      }`}>
                        {a.resolution}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-500 font-mono text-xs truncate max-w-[200px]" title={a.user_action}>
                      {a.user_action || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Render List View
  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-brand-600" />
          Import History
        </h1>
        <Link to="/import" className="btn btn-primary">
          New Import
        </Link>
      </div>

      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-50 text-surface-600 font-semibold border-b border-surface-200">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Filename</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rows</th>
              <th className="px-4 py-3">Imported</th>
              <th className="px-4 py-3">Skipped</th>
              <th className="px-4 py-3">Anomalies</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {runs.map(run => (
              <tr key={run.id} className="hover:bg-surface-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-surface-700">
                    <Calendar className="w-4 h-4 text-surface-400" />
                    {new Date(run.started_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-surface-900">{run.filename}</td>
                <td className="px-4 py-3">
                  {run.status === 'COMPLETED' ? (
                    <span className="badge badge-success">Completed</span>
                  ) : (
                    <span className="badge badge-warning">Reviewing</span>
                  )}
                </td>
                <td className="px-4 py-3 text-surface-600">{run.total_rows}</td>
                <td className="px-4 py-3 font-semibold text-success-600">{run.imported_count}</td>
                <td className="px-4 py-3 font-semibold text-error-600">{run.skipped_count}</td>
                <td className="px-4 py-3 font-semibold text-warning-600">{run._count?.anomalies || 0}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/import/${run.id}/report`} className="text-brand-600 font-semibold hover:text-brand-700 hover:underline">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-8 text-surface-500">
                  No import history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
