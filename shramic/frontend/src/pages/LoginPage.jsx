import { Loader2, Sprout } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.user, data.token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-[#F2EEDD]">
      {/* Left panel — the ledger cover */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1B2A3D] relative overflow-hidden flex-col justify-between p-14">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 32px)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded flex items-center justify-center border-2 border-[#D9A62E]">
              <Sprout size={22} strokeWidth={1.75} className="text-[#D9A62E]" />
            </div>
            <div>
              <div className="font-display font-bold text-white text-2xl tracking-wide">SHRAMIC</div>
              <div className="text-[#8A97A6] text-xs tracking-[0.25em] uppercase">Agri Tech Khata</div>
            </div>
          </div>
          <h2 className="font-display text-5xl font-bold text-white leading-[1.05] mb-6">
            Every wage,<br />every job,<br />on the record.
          </h2>
          <p className="text-[#B7C0CC] text-base leading-relaxed max-w-sm">
            Connect with skilled agricultural workers, book equipment, get AI crop advice,
            and access government schemes — all in one register.
          </p>
        </div>
        <div className="relative flex gap-3">
          {[['50K+','Farmers'],['30K+','Workers'],['15K+','Jobs posted']].map(([n,l])=>(
            <div key={l} className="plaque">
              <span className="plaque-value">{n}</span>
              <span className="plaque-label">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="lg:hidden w-11 h-11 mx-auto rounded flex items-center justify-center border-2 border-[#D9A62E] mb-4">
              <Sprout size={22} strokeWidth={1.75} className="text-[#D9A62E]" />
            </div>
            <h1 className="font-display text-4xl font-bold text-[#1B2A3D]">Welcome back</h1>
            <p className="text-[#5B6B7C] mt-2">Sign in to your Shramic account</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div className="bg-[#C1440E]/10 border-l-2 border-[#C1440E] text-[#8F310A] px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@example.com" required
                value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" required
                value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center flex items-center gap-2 py-3">
              {loading ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-[#5B6B7C]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#1B2A3D] font-semibold hover:underline">
              Create one
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-[#FBF9F1] border border-[#DFD8BF] border-l-2 border-l-[#D9A62E] rounded text-xs text-[#5B6B7C] font-mono">
            <div className="font-semibold mb-1 text-[#1B2A3D]">Demo credentials</div>
            <div>admin@shramic.in / Admin@123</div>
          </div>
        </div>
      </div>
    </div>
  )
}