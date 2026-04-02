import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api.js'

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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-dark relative overflow-hidden flex-col justify-between p-14">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <span className="text-4xl">🌾</span>
            <div>
              <div className="font-display font-bold text-white text-2xl">Shramic</div>
              <div className="text-green-300 text-xs tracking-widest uppercase">Agri Tech Platform</div>
            </div>
          </div>
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-6">
            Empowering farmers &amp;<br />workers across India
          </h2>
          <p className="text-green-200 text-lg leading-relaxed">
            Connect with skilled agricultural workers, book equipment, get AI crop advice,
            and access government schemes — all in one place.
          </p>
        </div>
        <div className="relative flex gap-8">
          {[['50K+','Farmers'],['30K+','Workers'],['15K+','Jobs Posted']].map(([n,l])=>(
            <div key={l}>
              <div className="text-white font-display font-bold text-2xl">{n}</div>
              <div className="text-green-300 text-sm">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="lg:hidden text-4xl mb-3">🌾</div>
            <h1 className="font-display text-3xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-2">Sign in to your Shramic account</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
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
              {loading ? <span className="animate-spin">⏳</span> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Create one
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <div className="font-semibold mb-1">Demo credentials</div>
            <div>Admin: admin@shramic.in / Admin@123</div>
          </div>
        </div>
      </div>
    </div>
  )
}
