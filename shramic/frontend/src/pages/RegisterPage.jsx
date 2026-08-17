import { Check, HardHat, Loader2, Sprout } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

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
    <div className="min-h-screen flex bg-[#F2EEDD]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#1B2A3D] flex-col justify-center p-14">
        <div className="w-11 h-11 rounded flex items-center justify-center border-2 border-[#D9A62E] mb-6">
          <Sprout size={22} strokeWidth={1.75} className="text-[#D9A62E]" />
        </div>
        <h2 className="font-display text-4xl font-bold text-white leading-snug mb-4">
          Join the largest agri<br />register in India
        </h2>
        <p className="text-[#B7C0CC] text-base leading-relaxed mb-10">
          Whether you're a farmer looking for skilled help, or a worker seeking opportunities —
          Shramic connects you with the right people.
        </p>
        <div className="space-y-0">
          {['AI-powered crop & soil advisory','Real-time worker availability','Equipment booking & marketplace','Government scheme access'].map(f => (
            <div key={f} className="ledger-row !border-white/10 !py-3">
              <Check size={16} strokeWidth={2.5} className="text-[#D9A62E]" />
              <span className="text-[#DDE3EA] text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          <div className="text-center mb-8">
            <div className="lg:hidden w-11 h-11 mx-auto rounded flex items-center justify-center border-2 border-[#D9A62E] mb-4">
              <Sprout size={22} strokeWidth={1.75} className="text-[#D9A62E]" />
            </div>
            <h1 className="font-display text-4xl font-bold text-[#1B2A3D]">Create your account</h1>
            <p className="text-[#5B6B7C] mt-2">Free forever. No credit card required.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="bg-[#C1440E]/10 border-l-2 border-[#C1440E] text-[#8F310A] px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Role selection */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {[['farmer',Sprout],['worker',HardHat]].map(([r,RoleIcon]) => (
                  <label key={r} className={`flex items-center gap-3 p-3.5 rounded border-2 cursor-pointer transition-all
                    ${form.role===r ? 'border-[#D9A62E] bg-[#D9A62E]/10' : 'border-[#DFD8BF] hover:border-[#1B2A3D]/30'}`}>
                    <input type="radio" name="role" value={r} checked={form.role===r} onChange={set('role')} className="hidden" />
                    <RoleIcon size={19} strokeWidth={1.75} className="text-[#1B2A3D]" />
                    <span className="font-medium capitalize text-sm text-[#1B2A3D]">{r}</span>
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
              {loading && <Loader2 size={16} strokeWidth={2} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-[#5B6B7C]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1B2A3D] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}