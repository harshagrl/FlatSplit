import { useState, useEffect, useMemo } from 'react'
import { X, AlertCircle, IndianRupee, DollarSign } from 'lucide-react'
import api from '../services/api.js'
import toast from 'react-hot-toast'

export default function AddExpenseModal({ isOpen, onClose, onSuccess }) {
  const [members, setMembers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [paidById, setPaidById] = useState('')
  const [splitType, setSplitType] = useState('EQUAL')
  const [notes, setNotes] = useState('')

  // Splits state: { [memberId]: { selected: boolean, value: string } }
  const [splits, setSplits] = useState({})

  useEffect(() => {
    if (isOpen) {
      api.get('/members')
        .then(res => setMembers(res.data.members))
        .catch(err => console.error(err))
      
      setDate(new Date().toISOString().split('T')[0])
      setDescription('')
      setAmount('')
      setCurrency('INR')
      setPaidById('')
      setSplitType('EQUAL')
      setNotes('')
      setError('')
      setSplits({})
    }
  }, [isOpen])

  // Active members on selected date
  const activeMembers = useMemo(() => {
    if (!date) return []
    const expDate = new Date(date).toISOString().split('T')[0]
    
    return members.filter(m => {
      const joinDate = new Date(m.joined_at).toISOString().split('T')[0]
      if (joinDate > expDate) return false
      if (m.left_at) {
        const leftDate = new Date(m.left_at).toISOString().split('T')[0]
        if (leftDate < expDate) return false
      }
      return true
    })
  }, [members, date])

  // Sync splits with active members
  useEffect(() => {
    if (!isOpen) return
    setSplits(prev => {
      const newSplits = {}
      activeMembers.forEach(m => {
        const existing = prev[m.id]
        newSplits[m.id] = {
          selected: splitType === 'EQUAL' ? true : (existing?.selected || false),
          value: existing?.value || ''
        }
      })
      return newSplits
    })

    if (!paidById && activeMembers.length > 0) {
      setPaidById(activeMembers[0].id)
    } else if (paidById && !activeMembers.find(m => m.id === paidById)) {
      setPaidById(activeMembers.length > 0 ? activeMembers[0].id : '')
    }
  }, [activeMembers, splitType, isOpen])

  if (!isOpen) return null

  // Live Math Validation
  const numAmount = parseFloat(amount) || 0
  const USD_RATE = 84
  const amountINR = currency === 'USD' ? numAmount * USD_RATE : numAmount

  let isValidMath = true
  let validationMessage = null

  if (splitType === 'UNEQUAL') {
    const liveSum = activeMembers.reduce((sum, m) => sum + (parseFloat(splits[m.id]?.value) || 0), 0)
    const diff = Math.abs(liveSum - amountINR)
    if (diff > 0.05) {
      isValidMath = false
      validationMessage = <span className="text-danger-600 font-medium">Total entered: ₹{liveSum.toFixed(2)} / ₹{amountINR.toFixed(2)}</span>
    } else {
      validationMessage = <span className="text-success-600 font-medium">Total entered: ₹{liveSum.toFixed(2)} / ₹{amountINR.toFixed(2)}</span>
    }
  } else if (splitType === 'PERCENTAGE') {
    const liveSum = activeMembers.reduce((sum, m) => sum + (parseFloat(splits[m.id]?.value) || 0), 0)
    if (Math.abs(liveSum - 100) > 0.01) {
      isValidMath = false
      validationMessage = <span className="text-danger-600 font-medium">Total: {liveSum}% / 100%</span>
    } else {
      validationMessage = <span className="text-success-600 font-medium">Total: {liveSum}% / 100%</span>
    }
  } else if (splitType === 'EQUAL') {
    const selectedCount = activeMembers.filter(m => splits[m.id]?.selected).length
    if (selectedCount === 0) isValidMath = false
  } else if (splitType === 'SHARES') {
    const totalShares = activeMembers.reduce((sum, m) => sum + (parseInt(splits[m.id]?.value) || 0), 0)
    if (totalShares <= 0) isValidMath = false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!description.trim() || numAmount <= 0) {
      setError('Description and valid amount are required.')
      return
    }

    if (!isValidMath) {
      setError('Please fix the split amounts before submitting.')
      return
    }

    // Build splits array
    const splitsPayload = []
    activeMembers.forEach(m => {
      const s = splits[m.id]
      if (splitType === 'EQUAL' && s.selected) {
        splitsPayload.push({ member_id: m.id, value: null })
      } else if (splitType !== 'EQUAL') {
        const val = parseFloat(s.value)
        if (val > 0) {
          splitsPayload.push({ member_id: m.id, value: val })
        }
      }
    })

    if (splitsPayload.length === 0) {
      setError('At least one participant must be included.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/expenses', {
        description,
        date,
        amount: numAmount,
        currency,
        paid_by_id: paidById,
        split_type: splitType,
        notes,
        splits: splitsPayload
      })
      
      toast.success('Expense added successfully')
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSplitChange = (id, field, val) => {
    setSplits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: val }
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
          <h2 className="text-xl font-bold text-surface-900">Add Expense</h2>
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

          <form id="expense-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <label className="block text-sm font-semibold text-surface-700 mb-1">Paid By</label>
                <select 
                  className="input w-full"
                  value={paidById}
                  onChange={e => setPaidById(e.target.value)}
                  required
                >
                  <option value="" disabled>Select payer...</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Description</label>
              <input 
                type="text" 
                className="input w-full"
                placeholder="Dinner at the local restaurant"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>

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

            <hr className="border-surface-200" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-semibold text-surface-700">Split Type</label>
                {validationMessage && <div className="text-sm">{validationMessage}</div>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all capitalize border ${
                      splitType === type 
                        ? 'bg-brand-50 text-brand-700 border-brand-300 shadow-sm' 
                        : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
                    }`}
                  >
                    {type.toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Dynamic Split Inputs */}
              <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 space-y-3">
                {activeMembers.length === 0 ? (
                  <p className="text-sm text-surface-500 text-center py-4">No active members found for this date.</p>
                ) : activeMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-4">
                    <span className="font-medium text-surface-800 flex-1">{m.name}</span>
                    
                    {splitType === 'EQUAL' && (
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500"
                        checked={splits[m.id]?.selected || false}
                        onChange={e => handleSplitChange(m.id, 'selected', e.target.checked)}
                      />
                    )}

                    {splitType === 'UNEQUAL' && (
                      <div className="relative w-32">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-surface-500 text-sm">₹</span>
                        <input 
                          type="number" min="0" step="0.01"
                          placeholder="0.00"
                          className="input w-full pl-7 py-1 text-sm text-right"
                          value={splits[m.id]?.value || ''}
                          onChange={e => handleSplitChange(m.id, 'value', e.target.value)}
                        />
                      </div>
                    )}

                    {splitType === 'PERCENTAGE' && (
                      <div className="relative w-24">
                        <input 
                          type="number" min="0" max="100" step="0.1"
                          placeholder="0"
                          className="input w-full pr-7 py-1 text-sm text-right"
                          value={splits[m.id]?.value || ''}
                          onChange={e => handleSplitChange(m.id, 'value', e.target.value)}
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-500 text-sm">%</span>
                      </div>
                    )}

                    {splitType === 'SHARES' && (
                      <div className="w-24">
                        <input 
                          type="number" min="0" step="1"
                          placeholder="0"
                          className="input w-full py-1 text-sm text-center"
                          value={splits[m.id]?.value || ''}
                          onChange={e => handleSplitChange(m.id, 'value', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Notes <span className="font-normal text-surface-400">(Optional)</span></label>
              <textarea 
                className="input w-full h-20 resize-none"
                placeholder="Any additional context..."
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
            form="expense-form"
            disabled={submitting || activeMembers.length === 0}
            className="btn btn-primary"
          >
            {submitting ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}
