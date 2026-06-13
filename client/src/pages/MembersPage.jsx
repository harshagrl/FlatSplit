import { useState, useEffect } from 'react'
import { Users, Calendar, Info } from 'lucide-react'
import api from '../services/api.js'
import { formatDate, getInitials } from '../utils/formatters.js'

// Generate consistent background colors for avatars based on names
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
};

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    api.get('/members')
      .then(res => setMembers(res.data.members))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-surface-900">Members</h1>
        </div>
        <div className="card">
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-surface-900">Members</h1>
      </div>

      <div className="card p-0 overflow-hidden mb-6">
        <div className="table-container border-0 rounded-none">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Left</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr 
                  key={member.id} 
                  className={`cursor-pointer transition-colors duration-200 ${
                    selectedMember?.id === member.id ? 'bg-brand-50' : 'hover:bg-surface-50'
                  }`}
                  onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                        style={{ backgroundColor: stringToColor(member.name) }}
                      >
                        {getInitials(member.name)}
                      </div>
                      <span className="font-semibold text-surface-900">{member.name}</span>
                    </div>
                  </td>
                  <td>
                    {member.is_active ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-neutral bg-surface-200 text-surface-600">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-surface-600">
                      <Calendar className="w-4 h-4" />
                      {formatDate(member.joined_at)}
                    </div>
                  </td>
                  <td>
                    {member.left_at ? (
                      <div className="flex items-center gap-1.5 text-surface-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(member.left_at)}
                      </div>
                    ) : (
                      <span className="text-surface-400 font-medium">—</span>
                    )}
                  </td>
                  <td>
                    {member.has_account ? (
                      <span className="text-success-600 font-bold text-xs uppercase tracking-wide">Registered</span>
                    ) : (
                      <span className="text-surface-400 text-xs font-semibold uppercase tracking-wide">No Account</span>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-surface-500">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember && (
        <div className="card animate-slide-up border-l-4 border-l-brand-500 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-sm"
              style={{ backgroundColor: stringToColor(selectedMember.name) }}
            >
              {getInitials(selectedMember.name)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-surface-900">{selectedMember.name}</h3>
                {selectedMember.is_active ? (
                  <span className="badge badge-success">Active Flatmate</span>
                ) : selectedMember.notes?.toLowerCase().includes('guest') ? (
                  <span className="badge badge-warning">Guest</span>
                ) : (
                  <span className="badge badge-neutral bg-surface-200">Departed Flatmate</span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-surface-600 mt-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-surface-800">Joined:</span> 
                  {formatDate(selectedMember.joined_at)}
                </div>
                {selectedMember.left_at && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-surface-800">Left:</span> 
                    {formatDate(selectedMember.left_at)}
                  </div>
                )}
              </div>
              
              {selectedMember.notes && (
                <div className="mt-4 p-4 bg-brand-50 text-brand-900 rounded-xl text-sm flex items-start gap-3 border border-brand-100">
                  <Info className="w-5 h-5 flex-shrink-0 text-brand-600 mt-0.5" />
                  <p className="font-medium leading-relaxed">{selectedMember.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
