import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, Plus } from 'lucide-react'
import api from '../services/api.js'
import { formatDate, formatINR, getInitials } from '../utils/formatters.js'
import AddExpenseModal from '../components/AddExpenseModal.jsx'

// Generate consistent background colors for avatars based on names
const stringToColor = (str) => {
  if (!str) return 'hsl(0, 0%, 50%)';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
};

export default function ExpensesPage() {
  const navigate = useNavigate();
  
  const [expenses, setExpenses] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [month, setMonth] = useState('')
  const [memberId, setMemberId] = useState('')
  const [splitType, setSplitType] = useState('')
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (month) params.append('month', month)
      if (memberId) params.append('member_id', memberId)
      if (splitType) params.append('split_type', splitType)
      
      const res = await api.get(`/expenses?${params.toString()}`)
      setExpenses(res.data.expenses)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get('/members').then(res => setMembers(res.data.members)).catch(console.error)
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [month, memberId, splitType])

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-surface-900">Expenses</h1>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="card p-4 mb-6 bg-surface-50 border border-surface-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-surface-700 mb-1">Month</label>
            <input 
              type="month" 
              className="input w-full"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-surface-700 mb-1">Involving Member</label>
            <select className="input w-full" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">All Members</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-surface-700 mb-1">Split Type</label>
            <select className="input w-full" value={splitType} onChange={(e) => setSplitType(e.target.value)}>
              <option value="">All Types</option>
              <option value="EQUAL">Equal</option>
              <option value="UNEQUAL">Unequal</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="SHARES">Shares</option>
            </select>
          </div>
          {(month || memberId || splitType) && (
            <button 
              onClick={() => { setMonth(''); setMemberId(''); setSplitType(''); }}
              className="btn btn-secondary py-2 h-[42px]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container border-0 rounded-none">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Paid By</th>
                  <th>Split Type</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr 
                    key={expense.id} 
                    className={`cursor-pointer transition-colors duration-200 hover:bg-surface-50 ${
                      expense.is_refund ? 'bg-green-50 hover:bg-green-100' : ''
                    }`}
                    onClick={() => navigate(`/expenses/${expense.id}`)}
                  >
                    <td className="whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td>
                      <div className="font-semibold text-surface-900">{expense.description}</div>
                      {expense.is_refund && (
                        <span className="badge bg-green-200 text-green-800 border-green-300 mt-1">Refund</span>
                      )}
                    </td>
                    <td>
                      <div className="font-bold text-surface-900">
                        {formatINR(expense.converted_amount_inr)}
                      </div>
                      {expense.currency === 'USD' && (
                        <div className="text-xs font-medium text-surface-500 mt-0.5">
                          ${expense.original_amount} USD
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: stringToColor(expense.paid_by?.name) }}
                        >
                          {getInitials(expense.paid_by?.name)}
                        </div>
                        <span className="font-medium text-surface-800">{expense.paid_by?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral capitalize">
                        {expense.split_type.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-surface-500">
                      No expenses found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddExpenseModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={() => {
          setIsAddModalOpen(false)
          fetchExpenses()
        }}
      />
    </div>
  )
}
