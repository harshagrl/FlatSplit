import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRightLeft, Plus } from 'lucide-react'
import api from '../services/api.js'
import { formatDate, formatINR, getInitials } from '../utils/formatters.js'
import RecordSettlementModal from '../components/RecordSettlementModal.jsx'

const stringToColor = (str) => {
  if (!str) return 'hsl(0, 0%, 50%)';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
};

export default function SettlementsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [initialModalData, setInitialModalData] = useState(null)

  const fetchSettlements = async () => {
    setLoading(true)
    try {
      const res = await api.get('/settlements')
      setSettlements(res.data.settlements)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettlements()

    // Handle query param pre-fill for Settle buttons on Dashboard
    const fromId = searchParams.get('from')
    const toId = searchParams.get('to')
    const amount = searchParams.get('amount')

    if (fromId || toId || amount) {
      setInitialModalData({
        from: fromId,
        to: toId,
        amount: amount
      })
      setIsModalOpen(true)
      
      // Clean up URL so refresh doesn't reopen modal
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-surface-900">Settlements</h1>
        </div>
        <button 
          onClick={() => {
            setInitialModalData(null)
            setIsModalOpen(true)
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Record Settlement
        </button>
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
                  <th>From</th>
                  <th className="w-10"></th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map(settlement => (
                  <tr key={settlement.id}>
                    <td className="whitespace-nowrap font-medium text-surface-700">
                      {formatDate(settlement.date)}
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{ backgroundColor: stringToColor(settlement.from_member?.name) }}
                        >
                          {getInitials(settlement.from_member?.name)}
                        </div>
                        <span className="font-semibold text-surface-900">{settlement.from_member?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="text-center text-surface-300">
                      <ArrowRightLeft className="w-5 h-5 inline-block" />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{ backgroundColor: stringToColor(settlement.to_member?.name) }}
                        >
                          {getInitials(settlement.to_member?.name)}
                        </div>
                        <span className="font-semibold text-surface-900">{settlement.to_member?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="font-bold text-success-600 bg-success-50 inline-flex px-3 py-1 rounded-lg">
                        {formatINR(parseFloat(settlement.amount_inr))}
                      </div>
                      {settlement.currency === 'USD' && (
                        <div className="text-xs font-medium text-surface-500 mt-0.5 ml-2">
                          ${parseFloat(settlement.original_amount).toLocaleString('en-US')} USD
                        </div>
                      )}
                    </td>
                    <td className="text-surface-600 text-sm max-w-xs truncate">
                      {settlement.notes || <span className="text-surface-300 italic">No notes</span>}
                    </td>
                  </tr>
                ))}
                {settlements.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-surface-500">
                        <ArrowRightLeft className="w-12 h-12 text-surface-300 mb-3" />
                        <p className="text-lg font-medium text-surface-900">No settlements recorded yet</p>
                        <p className="mt-1 text-sm">Record one when someone pays back their share.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <RecordSettlementModal 
        isOpen={isModalOpen}
        initialData={initialModalData}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
          fetchSettlements()
        }}
      />
    </div>
  )
}
