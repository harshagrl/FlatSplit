import { useState, useEffect } from 'react'
import { X, AlertCircle, IndianRupee, DollarSign } from 'lucide-react'
import api from '../services/api.js'
import toast from 'react-hot-toast'

export default function RecordSettlementModal({ isOpen, onClose, onSuccess, initialData }) {
  const [members, setMembers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [date, setDate] = useState('')
  const [fromMemberId, setFromMemberId] = useState('')
  const [toMemberId, setToMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      api.get('/members')
        .then(res => setMembers(res.data.members))
        .catch(err => console.error(err))

      setDate(new Date().toISOString().split('T')[0])
      setFromMemberId(initialData?.from || '')
      setToMemberId(initialData?.to || '')
      setAmount(initialData?.amount || '')
      setCurrency('INR')
      setNotes('')
      setError('')
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  // Validation
  let inlineError = ''
  if (fromMemberId && toMemberId && fromMemberId === toMemberId) {
    inlineError = 'Sender and recipient cannot be the same person.'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.')
      return
    }

    if (inlineError) {
      setError(inlineError)
      return
    }

    setSubmitting(true)
    try {
      await api.post('/settlements', {
        from_member_id: fromMemberId,
        to_member_id: toMemberId,
        amount: numAmount,
        currency,
        date,
        notes
      })
      toast.success('Settlement recorded')
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to record settlement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
          <h2 className="text-xl font-bold text-surface-900">Record Settlement</h2>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3 text-danger-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="font-medium text-sm">{error}</p>
            </div>
          )}

          <form id="settlement-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1">From (Who paid)</label>
                <select 
                  className={`input w-full ${fromMemberId && fromMemberId === toMemberId ? 'input-error' : ''}`}
                  value={fromMemberId}
                  onChange={e => setFromMemberId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select sender...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1">To (Who received)</label>
                <select 
                  className={`input w-full ${fromMemberId && fromMemberId === toMemberId ? 'input-error' : ''}`}
                  value={toMemberId}
                  onChange={e => setToMemberId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select recipient...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {inlineError && <p className="text-danger-600 text-sm font-medium mt-[-1rem]">{inlineError}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1">Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-500">
                    {currency === 'INR' ? <IndianRupee className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  </div>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    className="input w-full pl-10"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1">Currency</label>
                <div className="flex bg-surface-100 p-1 rounded-lg">
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${currency === 'INR' ? 'bg-white text-brand-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}
                    onClick={() => setCurrency('INR')}
                  >
                    INR (₹)
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${currency === 'USD' ? 'bg-white text-brand-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}
                    onClick={() => setCurrency('USD')}
                  >
                    USD ($)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Date</label>
              <input 
                type="date" 
                className="input w-full"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Notes <span className="font-normal text-surface-400">(Optional)</span></label>
              <textarea 
                className="input w-full h-20 resize-none"
                placeholder="Bank transfer reference, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-100 bg-surface-50 flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onClose} 
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="settlement-form"
            disabled={submitting || !!inlineError}
            className="btn btn-primary"
          >
            {submitting ? 'Recording...' : 'Record Settlement'}
          </button>
        </div>
      </div>
    </div>
  )
}
