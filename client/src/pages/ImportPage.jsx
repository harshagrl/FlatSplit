import { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Info, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'

export default function ImportPage() {
  const navigate = useNavigate()

  // Steps: 1 = Upload, 2 = Review, 3 = Report
  const [step, setStep] = useState(1)
  
  // Step 1 State
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  
  // Step 2 State
  const [importRunId, setImportRunId] = useState(null)
  const [summary, setSummary] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [decisions, setDecisions] = useState({}) // { anomalyId: { resolution, user_action } }
  const [showAutoResolved, setShowAutoResolved] = useState(false)
  const [members, setMembers] = useState([])
  
  // Step 3 State
  const [report, setReport] = useState(null)
  const [confirming, setConfirming] = useState(false)

  // Fetch members for NAME_MISMATCH dropdown
  useEffect(() => {
    if (step === 2) {
      api.get('/members').then(res => setMembers(res.data.members)).catch(console.error)
    }
  }, [step])

  // Handlers for Step 1
  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected && (selected.type === 'text/csv' || selected.name.endsWith('.csv'))) {
      setFile(selected)
      setUploadError(null)
    } else {
      setFile(null)
      setUploadError('Please select a valid CSV file.')
    }
  }

  const handlePreview = async () => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Using native fetch completely bypasses any default JSON headers 
      // configured in Axios, allowing the browser to reliably set the
      // multipart/form-data content type and the correct boundary.
      const token = localStorage.getItem('token')
      const res = await fetch(`${api.defaults.baseURL}/import/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to preview import.')
      }

      setImportRunId(data.importRunId)
      setSummary(data.summary)
      setAnomalies(data.anomalies)
      
      // Pre-fill decisions for auto-resolved items
      const initialDecisions = {}
      data.anomalies.forEach(a => {
        if (a.resolution === 'AUTO_APPROVED') {
          initialDecisions[a.id] = { resolution: 'AUTO_APPROVED' }
        }
      })
      setDecisions(initialDecisions)
      setStep(2)
    } catch (err) {
      setUploadError(err.message || 'An unexpected error occurred.')
    } finally {
      setUploading(false)
    }
  }

  // Handlers for Step 2
  const handleDecision = (anomalyId, resolution, userAction = null) => {
    setDecisions(prev => ({
      ...prev,
      [anomalyId]: { resolution, user_action: userAction }
    }))
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const payload = {
        decisions: Object.entries(decisions).map(([anomalyId, dec]) => ({
          anomalyId,
          resolution: dec.resolution,
          user_action: dec.user_action
        }))
      }
      const res = await api.post(`/import/confirm/${importRunId}`, payload)
      setReport(res.data.report)
      setStep(3)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error?.message || 'Failed to confirm import')
    } finally {
      setConfirming(false)
    }
  }

  const getReviewCounts = () => {
    const autoResolved = anomalies.filter(a => a.resolution === 'AUTO_APPROVED')
    const needsReview = anomalies.filter(a => a.severity === 'WARNING' && a.resolution !== 'AUTO_APPROVED')
    const blocked = anomalies.filter(a => a.severity === 'ERROR' && a.resolution !== 'AUTO_APPROVED')
    
    let reviewedCount = 0
    needsReview.forEach(a => {
      if (decisions[a.id]) reviewedCount++
    })
    
    return { autoResolved, needsReview, blocked, reviewedCount, totalToReview: needsReview.length }
  }

  // Render Step 1
  if (step === 1) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-surface-900 mb-6 flex items-center gap-2">
          <Upload className="w-6 h-6 text-brand-600" />
          Import Expenses
        </h1>
        
        <div className="card p-8 text-center border-2 border-dashed border-surface-300 bg-surface-50">
          <FileText className="w-16 h-16 text-surface-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-surface-800 mb-2">Upload your CSV file</h2>
          <p className="text-surface-600 mb-6">Import expenses from your messy spreadsheet.</p>
          
          <input 
            type="file" 
            id="csvUpload" 
            accept=".csv" 
            className="hidden" 
            onChange={handleFileChange}
          />
          <label 
            htmlFor="csvUpload" 
            className="btn btn-secondary cursor-pointer inline-flex"
          >
            Select CSV File
          </label>
          
          {file && (
            <div className="mt-6 p-4 bg-white rounded-lg shadow-sm border border-surface-200 inline-block text-left">
              <p className="font-semibold text-surface-900">Selected file:</p>
              <p className="text-brand-600 font-mono text-sm">{file.name}</p>
            </div>
          )}
          
          {uploadError && (
            <div className="mt-4 text-error-600 bg-error-50 p-3 rounded-lg text-sm border border-error-200">
              {uploadError}
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            className="btn btn-primary"
            onClick={handlePreview}
            disabled={!file || uploading}
          >
            {uploading ? 'Processing...' : 'Preview Import'}
          </button>
        </div>
      </div>
    )
  }

  // Render Step 2
  if (step === 2) {
    const { autoResolved, needsReview, blocked, reviewedCount, totalToReview } = getReviewCounts()
    const canConfirm = reviewedCount === totalToReview

    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-surface-900 mb-6">Review Anomalies</h1>
        
        {/* Top Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="card p-4 text-center">
            <div className="text-sm text-surface-500 font-semibold uppercase tracking-wider mb-1">Total Rows</div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-success-500">
            <div className="text-sm text-surface-500 font-semibold uppercase tracking-wider mb-1">Auto-Fixed</div>
            <div className="text-2xl font-bold text-success-600">{summary.autoResolved}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-warning-500">
            <div className="text-sm text-surface-500 font-semibold uppercase tracking-wider mb-1">Review</div>
            <div className="text-2xl font-bold text-warning-600">{summary.needsReview}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-error-500">
            <div className="text-sm text-surface-500 font-semibold uppercase tracking-wider mb-1">Blocked</div>
            <div className="text-2xl font-bold text-error-600">{summary.blocked}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-surface-400">
            <div className="text-sm text-surface-500 font-semibold uppercase tracking-wider mb-1">Clean</div>
            <div className="text-2xl font-bold text-surface-600">{summary.clean}</div>
          </div>
        </div>

        {/* Auto-Resolved Section */}
        {autoResolved.length > 0 && (
          <div className="mb-8 card overflow-hidden border border-success-200 p-0">
            <button 
              className="w-full p-4 flex items-center justify-between bg-success-50 hover:bg-success-100 transition-colors"
              onClick={() => setShowAutoResolved(!showAutoResolved)}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success-600" />
                <span className="font-bold text-success-900">Auto-Resolved ({autoResolved.length})</span>
                <span className="text-sm text-success-700 ml-2">Pre-approved, no action needed</span>
              </div>
              {showAutoResolved ? <ChevronDown className="w-5 h-5 text-success-600" /> : <ChevronRight className="w-5 h-5 text-success-600" />}
            </button>
            
            {showAutoResolved && (
              <div className="p-0 border-t border-success-200 overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-success-50/50 text-success-800">
                    <tr>
                      <th className="px-4 py-3 border-b border-success-100">Row</th>
                      <th className="px-4 py-3 border-b border-success-100">Anomaly</th>
                      <th className="px-4 py-3 border-b border-success-100 w-full">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoResolved.map(a => (
                      <tr key={a.id} className="border-b border-success-50">
                        <td className="px-4 py-3 font-mono text-success-700">{a.row_number}</td>
                        <td className="px-4 py-3 font-semibold text-success-800">{a.anomaly_type}</td>
                        <td className="px-4 py-3 text-success-700 whitespace-normal">{a.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Needs Review Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-surface-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-500" />
            Needs Your Review
          </h2>
          
          {needsReview.map(a => {
            const decision = decisions[a.id]
            let originalData = a.original_value
            try { originalData = JSON.parse(a.original_value) } catch (e) { /* ignore */ }
            
            return (
              <div key={a.id} className={`card mb-4 border-l-4 ${decision ? 'border-l-success-500 opacity-75' : 'border-l-warning-500'}`}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge badge-warning whitespace-nowrap">Row {a.row_number}</span>
                      <span className="font-mono text-sm font-bold text-surface-700 bg-surface-100 px-2 py-0.5 rounded break-all">
                        {a.anomaly_type}
                      </span>
                    </div>
                    <p className="text-surface-800 mb-4">{a.description}</p>
                    
                    {/* Render specific inputs based on anomaly type */}
                    {a.anomaly_type === 'AMBIGUOUS_DATE' && !decision && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-surface-700 mb-1">Confirm correct date (YYYY-MM-DD):</label>
                        <input 
                          type="text" 
                          id={`date-${a.id}`} 
                          defaultValue={a.suggested_fix} 
                          className="input max-w-xs font-mono"
                        />
                      </div>
                    )}

                    {a.anomaly_type === 'NAME_MISMATCH' && !decision && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-surface-700 mb-1">Select known member:</label>
                        <select id={`member-${a.id}`} className="input max-w-xs" defaultValue={a.suggested_fix || ''}>
                          {members.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!decision ? (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {a.anomaly_type === 'CONFLICTING_DUPLICATE' ? (
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleDecision(a.id, 'USER_APPROVED')}
                      >
                        Keep This One
                      </button>
                    ) : (
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          let action = a.suggested_fix
                          if (a.anomaly_type === 'AMBIGUOUS_DATE') {
                            action = document.getElementById(`date-${a.id}`).value
                          } else if (a.anomaly_type === 'NAME_MISMATCH') {
                            action = document.getElementById(`member-${a.id}`).value
                          }
                          handleDecision(a.id, 'USER_EDITED', action)
                        }}
                      >
                        Approve Fix
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary text-error-600 hover:bg-error-50"
                      onClick={() => handleDecision(a.id, 'USER_REJECTED')}
                    >
                      Reject (Skip Row)
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 text-sm font-semibold text-success-600 flex items-center gap-1.5 break-words">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Decision saved: {decision.resolution} {decision.user_action ? `(${decision.user_action})` : ''}</span>
                    <button 
                      className="ml-4 text-surface-500 hover:text-brand-600 underline font-normal flex-shrink-0"
                      onClick={() => {
                        const newDec = {...decisions}
                        delete newDec[a.id]
                        setDecisions(newDec)
                      }}
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          
          {needsReview.length === 0 && (
            <div className="text-surface-500 italic p-4 bg-surface-50 rounded-lg border border-surface-200">
              No anomalies require your review.
            </div>
          )}
        </div>

        {/* Blocked Section */}
        {blocked.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-surface-900 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-error-500" />
              Blocked Rows (Will be skipped)
            </h2>
            {blocked.map(a => (
              <div key={a.id} className="card mb-4 border-l-4 border-l-error-500 bg-error-50/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-error whitespace-nowrap">Row {a.row_number}</span>
                  <span className="font-mono text-sm font-bold text-error-700 bg-error-100 px-2 py-0.5 rounded break-all">
                    {a.anomaly_type}
                  </span>
                </div>
                <p className="text-surface-800">{a.description}</p>
                <div className="mt-3 text-sm font-semibold text-error-600">
                  Auto-skipped due to error.
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-surface-200 pt-6">
          <div className="font-semibold text-surface-700">
            Progress: {reviewedCount} of {totalToReview} reviewed
          </div>
          <button 
            className="btn btn-primary w-full sm:w-auto"
            disabled={!canConfirm || confirming}
            onClick={handleConfirm}
          >
            {confirming ? 'Confirming...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    )
  }

  // Render Step 3
  if (step === 3) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-success-100 text-success-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-surface-900 mb-2">Import Complete</h1>
        <p className="text-surface-600 mb-8">Your expenses have been successfully imported.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-left">
          <div className="card p-4 text-center border-b-4 border-b-brand-500">
            <div className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Imported</div>
            <div className="text-2xl font-bold text-brand-600">{report.imported}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-error-500">
            <div className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Skipped</div>
            <div className="text-2xl font-bold text-error-600">{report.skipped}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-warning-500">
            <div className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Anomalies</div>
            <div className="text-2xl font-bold text-warning-600">{report.anomalies}</div>
          </div>
          <div className="card p-4 text-center border-b-4 border-b-surface-400">
            <div className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Total</div>
            <div className="text-2xl font-bold text-surface-600">{report.total}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            className="btn btn-secondary w-full sm:w-auto"
            onClick={() => {
              setStep(1)
              setFile(null)
              setUploadError(null)
            }}
          >
            Import Another File
          </button>
          <Link to="/expenses" className="btn btn-primary w-full sm:w-auto">
            View All Expenses
          </Link>
          <Link to={`/import/${importRunId}/report`} className="btn btn-secondary w-full sm:w-auto flex items-center justify-center gap-1">
            View Full Log <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return null
}
