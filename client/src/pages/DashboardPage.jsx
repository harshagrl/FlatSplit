import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  TrendingUp, TrendingDown, CheckCircle2, Calendar, 
  ArrowRightLeft, Receipt, ExternalLink
} from 'lucide-react'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatINR, formatDate, getInitials } from '../utils/formatters.js'

const stringToColor = (str) => {
  if (!str) return 'hsl(0, 0%, 50%)';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
};

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [balanceData, setBalanceData] = useState({ memberBalances: [], simplifiedDebts: [] })
  
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [monthlyStats, setMonthlyStats] = useState({ total_expenses: 0, expense_count: 0, total_settlements: 0, settlement_count: 0 })
  
  const [recentExpenses, setRecentExpenses] = useState([])
  const [recentSettlements, setRecentSettlements] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const [balRes, monthRes, expRes, setRes] = await Promise.all([
          api.get('/balances/summary'),
          api.get(`/balances/monthly?month=${month}`),
          api.get('/expenses'),
          api.get('/settlements')
        ])
        
        setBalanceData(balRes.data)
        setMonthlyStats(monthRes.data)
        setRecentExpenses(expRes.data.expenses.slice(0, 5))
        setRecentSettlements(setRes.data.settlements.slice(0, 3))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [month])

  if (loading && balanceData.memberBalances.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Calculate Personal Balance
  const myBalanceRecord = balanceData.memberBalances.find(m => m.member_id === user?.member_id)
  const myNetBalance = myBalanceRecord ? parseFloat(myBalanceRecord.net_balance) : 0

  return (
    <div className="animate-fade-in pb-12 space-y-8">
      
      {/* 1. Personal Balance Card */}
      <section>
        <div className={`card overflow-hidden border-0 shadow-xl ${
          myNetBalance > 0 ? 'bg-gradient-to-br from-success-500 to-success-700 text-white shadow-success-900/20' :
          myNetBalance < 0 ? 'bg-gradient-to-br from-danger-500 to-danger-700 text-white shadow-danger-900/20' :
          'bg-gradient-to-br from-surface-500 to-surface-700 text-white shadow-surface-900/20'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <p className="font-bold opacity-80 uppercase tracking-wider text-sm mb-2">Your Net Balance</p>
              {myNetBalance > 0 ? (
                <div>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-10 h-10" />
                    <h2 className="text-4xl md:text-5xl font-black">{formatINR(Math.abs(myNetBalance))}</h2>
                  </div>
                  <p className="mt-2 text-lg font-medium opacity-90">You are owed money.</p>
                </div>
              ) : myNetBalance < 0 ? (
                <div>
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-10 h-10" />
                    <h2 className="text-4xl md:text-5xl font-black">{formatINR(Math.abs(myNetBalance))}</h2>
                  </div>
                  <p className="mt-2 text-lg font-medium opacity-90">You owe money.</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-10 h-10" />
                    <h2 className="text-4xl md:text-5xl font-black">{formatINR(0)}</h2>
                  </div>
                  <p className="mt-2 text-lg font-medium opacity-90">You are all settled up!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 2. Simplified Debts Panel */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-surface-900">Simplified Debts</h2>
          </div>
          <div className="card p-0 overflow-hidden shadow-sm">
            {balanceData.simplifiedDebts.length === 0 ? (
              <div className="p-8 text-center text-surface-500">
                <CheckCircle2 className="w-10 h-10 mx-auto text-success-500 mb-2" />
                <p className="font-medium">All debts are settled!</p>
              </div>
            ) : (
              <ul className="divide-y divide-surface-100">
                {balanceData.simplifiedDebts.map((debt, i) => {
                  const amIFrom = debt.from_member_id === user?.member_id
                  const amITo = debt.to_member_id === user?.member_id
                  const imInvolved = amIFrom || amITo
                  
                  return (
                    <li key={i} className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${imInvolved ? 'bg-brand-50/50' : 'hover:bg-surface-50'}`}>
                      <div className="flex items-center gap-4">
                        {/* From Avatar */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ backgroundColor: stringToColor(debt.from_member_name) }}>
                            {getInitials(debt.from_member_name)}
                          </div>
                          {amIFrom && <span className="absolute -bottom-1 -right-1 bg-brand-500 text-white text-[9px] font-bold px-1 rounded-full border border-white">YOU</span>}
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-sm text-surface-500 font-medium">owes</span>
                          <span className="font-bold text-surface-900 text-lg">
                            {formatINR(debt.amount)}
                          </span>
                        </div>

                        {/* To Avatar */}
                        <div className="relative ml-2">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ backgroundColor: stringToColor(debt.to_member_name) }}>
                            {getInitials(debt.to_member_name)}
                          </div>
                          {amITo && <span className="absolute -bottom-1 -right-1 bg-brand-500 text-white text-[9px] font-bold px-1 rounded-full border border-white">YOU</span>}
                        </div>
                      </div>

                      {amIFrom && (
                        <button 
                          onClick={() => navigate(`/settlements?from=${debt.from_member_id}&to=${debt.to_member_id}&amount=${debt.amount}`)}
                          className="btn btn-sm bg-brand-100 text-brand-700 hover:bg-brand-200 border-0 flex-shrink-0"
                        >
                          Settle Now
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* 3. Monthly Summary */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-surface-900">Monthly Summary</h2>
            <input 
              type="month" 
              className="input py-1.5 px-3 h-auto w-auto text-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card bg-surface-50 border border-surface-200">
              <p className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-2">Expenses</p>
              <h3 className="text-2xl font-black text-surface-900 mb-1">{formatINR(monthlyStats.total_expenses)}</h3>
              <p className="text-sm text-surface-600 font-medium">{monthlyStats.expense_count} records</p>
            </div>
            <div className="card bg-surface-50 border border-surface-200">
              <p className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-2">Settlements</p>
              <h3 className="text-2xl font-black text-success-600 mb-1">{formatINR(monthlyStats.total_settlements)}</h3>
              <p className="text-sm text-surface-600 font-medium">{monthlyStats.settlement_count} transactions</p>
            </div>
          </div>
        </section>
      </div>

      {/* 4. Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-surface-900">Recent Expenses</h2>
            <button onClick={() => navigate('/expenses')} className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View All <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          <div className="card p-0 shadow-sm border-surface-200 divide-y divide-surface-100">
            {recentExpenses.length === 0 ? (
              <p className="p-6 text-center text-surface-500">No expenses yet.</p>
            ) : (
              recentExpenses.map(exp => (
                <div 
                  key={exp.id} 
                  onClick={() => navigate(`/expenses/${exp.id}`)}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${exp.is_refund ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-surface-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center text-surface-500 flex-shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-surface-900">{exp.description}</p>
                      <p className="text-xs font-medium text-surface-500">{formatDate(exp.date)} · Paid by {exp.paid_by?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-surface-900">{formatINR(parseFloat(exp.converted_amount_inr))}</p>
                    {exp.is_refund && <span className="text-[10px] uppercase font-bold text-success-600">Refund</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-surface-900">Recent Settlements</h2>
            <button onClick={() => navigate('/settlements')} className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View All <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          <div className="card p-0 shadow-sm border-surface-200 divide-y divide-surface-100">
            {recentSettlements.length === 0 ? (
              <p className="p-6 text-center text-surface-500">No settlements yet.</p>
            ) : (
              recentSettlements.map(st => (
                <div key={st.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-success-50 flex items-center justify-center text-success-600 flex-shrink-0">
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-surface-900">
                        {st.from_member?.name} <span className="text-surface-400 font-medium px-1">→</span> {st.to_member?.name}
                      </p>
                      <p className="text-xs font-medium text-surface-500">{formatDate(st.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success-600">+{formatINR(parseFloat(st.amount_inr))}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

    </div>
  )
}
