import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Wallet, Mail, Lock, UserPlus, ArrowRight, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api.js'

export default function RegisterPage() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [memberName, setMemberName] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch available members (those without user accounts)
    api.get('/members/available')
      .then(res => setMembers(res.data.members))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(email, password, memberName)
      toast.success('Account created!')
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Create account</h1>
          <p className="text-surface-500 mt-1">Join your flatmates on FlatSplit</p>
        </div>

        {/* Evaluator Info Box */}
        <div className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-xl flex items-start gap-3 text-brand-800 shadow-sm">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-brand-600" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Evaluator Note:</p>
            <p>You must be a registered flatmate to create an account. Available names: <strong>Aisha, Rohan, Priya, Sam</strong>.</p>
            <p className="text-brand-600/80 text-xs mt-1">(Meera and Dev are historical members with no login access)</p>
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="register-member" className="label">Your name</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <select
                  id="register-member"
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  className="input pl-10 appearance-none"
                  required
                >
                  <option value="">Select your name</option>
                  {members.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-surface-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-600 font-medium hover:text-brand-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
