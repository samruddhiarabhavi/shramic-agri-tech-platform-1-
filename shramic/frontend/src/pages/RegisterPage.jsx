import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api.js'

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal']

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]   = useState({ name:'', email:'', password:'', role:'farmer', phone:'', state:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.user, data.token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-primary-dark to-primary flex-col justify-center p-14">
        <span className="text-5xl mb-6">🌱</span>
        <h2 className="font-display text-4xl font-bold text-white leading-snug mb-4">
          Join the largest agri<br />community in India
        </h2>
        <p className="text-green-200 text-base leading-relaxed mb-10">
          Whether you're a farmer looking for skilled help, or a worker seeking opportunities —
          Shramic connects you with the right people.
        </p>
        <div className="space-y-4">
          {['AI-powered crop & soil advisory','Real-time worker availability','Equipment booking & marketplace','Government scheme access'].map(f => (
            <div key={f} className="flex items-center gap-3 text-green-100 text-sm">
              <span className="text-green-400 font-bold">✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto bg-gray-50">
        <div className="w-full max-w-lg py-8">
          <div className="text-center mb-8">
            <div className="lg:hidden text-4xl mb-3">🌾</div>
            <h1 className="font-display text-3xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-500 mt-2">Free forever. No credit card required.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Role selection */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {['farmer','worker'].map(r => (
                  <label key={r} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all
                    ${form.role===r ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="role" value={r} checked={form.role===r} onChange={set('role')} className="hidden" />
                    <span className="text-xl">{r==='farmer'?'🧑‍🌾':'👷'}</span>
                    <span className="font-medium capitalize text-sm">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full name</label>
                <input className="input" placeholder="Ramesh Kumar" required value={form.name} onChange={set('name')} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="9876543210" type="tel" value={form.phone} onChange={set('phone')} />
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@example.com" required value={form.email} onChange={set('email')} />
            </div>

            <div>
              <label className="label">State</label>
              <select className="input" value={form.state} onChange={set('state')}>
                <option value="">Select your state</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Minimum 6 characters" required value={form.password} onChange={set('password')} />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2">
              {loading && <span className="animate-spin">⏳</span>}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
