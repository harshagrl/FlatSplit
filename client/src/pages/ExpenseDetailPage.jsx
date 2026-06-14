import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, FileText, AlertCircle, Calendar, Receipt } from 'lucide-react'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatDate, formatINR, getInitials } from '../utils/formatters.js'
import toast from 'react-hot-toast'

const stringToColor = (str) => {
  if (!str) return 'hsl(0, 0%, 50%)';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
};

export default function ExpenseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [expense, setExpense] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/expenses/${id}`)
      .then(res => {
        setExpense(res.data.expense)
      })
      .catch(err => {
        setError(err.response?.data?.error?.message || 'Failed to load expense')
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await api.delete(`/expenses/${id}`)
      toast.success('Expense deleted')
      navigate('/expenses', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete expense')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto pb-12">
        <button onClick={() => navigate('/expenses')} className="flex items-center gap-2 text-surface-500 hover:text-surface-900 mb-6 transition-colors font-medium">
          <ArrowLeft className="w-5 h-5" /> Back to expenses
        </button>
        <div className="card h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto pb-12">
        <button onClick={() => navigate('/expenses')} className="flex items-center gap-2 text-surface-500 hover:text-surface-900 mb-6 transition-colors font-medium">
          <ArrowLeft className="w-5 h-5" /> Back to expenses
        </button>
        <div className="card flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-danger-500 mb-4" />
          <h2 className="text-xl font-bold text-surface-900 mb-2">Expense Not Found</h2>
          <p className="text-surface-600">{error || 'This expense may have been deleted.'}</p>
        </div>
      </div>
    )
  }

  const isPayer = user?.member_id === expense.paid_by_id;

  console.log('expense data:', expense);
  console.log('amount:', expense?.converted_amount_inr);
  console.log('currency:', expense?.currency);
  console.log('formatINR test:', formatINR(1000));

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-12">
      <button onClick={() => navigate('/expenses')} className="flex items-center gap-2 text-surface-500 hover:text-surface-900 mb-6 transition-colors font-medium">
        <ArrowLeft className="w-5 h-5" /> Back to expenses
      </button>

      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-surface-900 mb-2">{expense.description}</h1>
        <div className="flex flex-wrap items-center gap-4 text-surface-600 font-medium">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-5 h-5" />
            {formatDate(expense.date)}
          </div>
          {expense.csv_row_number != null && (
            <span className="badge bg-purple-100 text-purple-800 border-purple-200">
              Imported from CSV · Row {expense.csv_row_number}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Amount Card */}
        <div className="col-span-1 md:col-span-2 rounded-2xl p-8 bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-xl shadow-brand-900/10 flex flex-col justify-center min-h-[160px]">
          <p className="text-brand-100 font-medium mb-1">Total Amount</p>
          {expense.currency === 'INR' ? (
            <h2 className="text-4xl md:text-5xl font-black mb-3">
              {formatINR(parseFloat(expense.converted_amount_inr))}
            </h2>
          ) : (
            <>
              <h2 className="text-4xl md:text-5xl font-black mb-3">
                {parseFloat(expense.original_amount).toLocaleString('en-US')} USD
              </h2>
              <div className="inline-flex items-center text-brand-50 font-medium bg-black/20 w-max px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-sm text-sm">
                × {parseFloat(expense.exchange_rate)} = {formatINR(parseFloat(expense.converted_amount_inr))}
              </div>
            </>
          )}
        </div>

        {/* Paid By Card */}
        <div className="card p-6 col-span-1 flex flex-col justify-center border-surface-200 min-h-[160px]">
          <p className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-4">Paid By</p>
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md"
              style={{ backgroundColor: stringToColor(expense.paid_by.name) }}
            >
              {getInitials(expense.paid_by.name)}
            </div>
            <div>
              <div className="font-bold text-lg text-surface-900">
                {expense.paid_by.name} {isPayer && <span className="text-sm font-normal text-surface-500 ml-1">(You)</span>}
              </div>
              <span className={`badge mt-1 capitalize ${
                expense.split_type === 'EQUAL' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                expense.split_type === 'UNEQUAL' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                expense.split_type === 'PERCENTAGE' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {expense.split_type.toLowerCase()} Split
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Split Breakdown Table */}
      <div className="card p-0 overflow-hidden mb-8 shadow-sm">
        <div className="px-6 py-4 bg-surface-50 border-b border-surface-100 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-surface-600" />
          <h3 className="font-bold text-surface-900">Split Breakdown</h3>
        </div>
        <div className="table-container border-0 rounded-none">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th className="text-right">Amount Owed</th>
              </tr>
            </thead>
            <tbody>
              {expense.splits.map(split => {
                const isMe = user?.member_id === split.member_id;
                return (
                  <tr key={split.id} className={isMe ? 'bg-brand-50' : ''}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{ backgroundColor: stringToColor(split.member.name) }}
                        >
                          {getInitials(split.member.name)}
                        </div>
                        <span className="font-semibold text-surface-900 flex items-center gap-2">
                          {split.member.name}
                          {isMe && <span className="badge badge-neutral bg-brand-100 text-brand-700 border-0 text-[10px] py-0 px-1.5">You</span>}
                        </span>
                      </div>
                    </td>
                    <td className="text-right font-bold text-surface-900">
                      {formatINR(parseFloat(split.owed_amount_inr))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {expense.notes && (
        <div className="card bg-amber-50 border-amber-200 mb-8">
          <div className="flex items-center gap-2 mb-2 text-amber-800">
            <FileText className="w-5 h-5" />
            <h3 className="font-bold">Notes</h3>
          </div>
          <p className="text-amber-900 leading-relaxed whitespace-pre-wrap">{expense.notes}</p>
        </div>
      )}

      {/* Delete Action */}
      {isPayer && (
        <div className="mt-12 flex justify-center">
          {!showDeleteConfirm ? (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-danger-600 hover:text-danger-800 hover:bg-danger-50 font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete Expense
            </button>
          ) : (
            <div className="card bg-danger-50 border-danger-200 p-6 flex flex-col items-center animate-slide-up">
              <h3 className="text-danger-900 font-bold mb-2 text-lg">Are you sure you want to delete this expense?</h3>
              <p className="text-danger-700 mb-6 text-center max-w-md">This will permanently remove the expense and all associated splits. This action cannot be undone.</p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn bg-white border border-surface-300 text-surface-700 hover:bg-surface-50"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="btn bg-danger-600 hover:bg-danger-700 text-white border-transparent"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Expense'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
