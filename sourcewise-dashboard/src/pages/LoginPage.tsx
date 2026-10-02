import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app'

export default function LoginPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      login(data.user, data.accessToken || data.token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #FFF8DC 0%, #F5E6C8 50%, #FAEBD7 100%)' }}
    >
      <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-[#EDE7E1] shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-[#1E1B16] text-white flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-[#1E1B16]">Creator Dashboard</h1>
        <p className="text-sm text-[#5B544E] mt-1 mb-6">Sign in with an admin account to manage SourceWise.</p>
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-[#1E1B16]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sourcewise.com"
              className="mt-1 w-full h-11 px-3.5 rounded-xl border border-[#EDE7E1] text-sm outline-none focus:border-[#E8845F]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#1E1B16]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full h-11 px-3.5 rounded-xl border border-[#EDE7E1] text-sm outline-none focus:border-[#E8845F]"
            />
          </div>
          <button
            disabled={busy}
            className="w-full h-11 rounded-full bg-[#1E1B16] hover:bg-black text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-[11px] text-[#8A817B] mt-4">Admin access only — your account needs `users.is_admin = true`.</p>
      </div>
    </div>
  )
}
