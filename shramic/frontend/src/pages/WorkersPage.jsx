import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api.js'

const SKILLS = ['sowing','harvesting','irrigation','spraying','ploughing','pruning','transplanting','packaging']
const STATES  = ['Andhra Pradesh','Assam','Bihar','Gujarat','Haryana','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Uttar Pradesh','West Bengal']

function WorkerCard({ w }) {
  const skills = Array.isArray(w.skills) ? w.skills : (typeof w.skills === 'string' ? JSON.parse(w.skills||'[]') : [])
  return (
    <div className="card hover:shadow-md transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
          {w.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{w.name}</div>
          <div className="text-xs text-gray-400">{w.state} • {w.experience_years} yrs exp</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs text-gray-600">{w.rating || 'New'}</span>
          </div>
        </div>
        <span className={`badge shrink-0 ${w.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {w.is_available ? '● Available' : '○ Busy'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {skills.slice(0,4).map(s=>(
          <span key={s} className="badge bg-blue-50 text-blue-600 capitalize">{s}</span>
        ))}
      </div>
      {w.daily_wage && (
        <div className="text-sm font-semibold text-primary">₹{w.daily_wage}/day</div>
      )}
      {w.phone && (
        <a href={`tel:${w.phone}`} className="btn-outline text-sm py-2 w-full mt-3 text-center block">
          📞 Contact
        </a>
      )}
    </div>
  )
}

function ProfileEditor({ profile, onSaved }) {
  const [form, setForm] = useState({
    skills: profile?.skills ? (typeof profile.skills === 'string' ? JSON.parse(profile.skills) : profile.skills) : [],
    experience_years: profile?.experience_years || 0,
    preferred_state: profile?.preferred_state || '',
    daily_wage: profile?.daily_wage || '',
    bio: profile?.bio || '',
  })
  const [loading, setLoading] = useState(false)

  const toggleSkill = s => setForm(f => ({
    ...f,
    skills: f.skills.includes(s) ? f.skills.filter(x=>x!==s) : [...f.skills, s]
  }))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('/workers/me', form)
      onSaved()
    } catch(err) { alert(err.response?.data?.error || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="card space-y-5">
      <h3 className="font-display font-bold text-lg">My Worker Profile</h3>
      <div>
        <label className="label">Skills</label>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map(s=>(
            <button type="button" key={s} onClick={()=>toggleSkill(s)}
              className={`px-3 py-1 rounded-full text-sm border transition-all capitalize
                ${form.skills.includes(s) ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Experience (years)</label>
          <input className="input" type="number" min="0" value={form.experience_years}
            onChange={e=>setForm(f=>({...f,experience_years:+e.target.value}))} />
        </div>
        <div>
          <label className="label">Daily Wage (₹)</label>
          <input className="input" type="number" value={form.daily_wage}
            onChange={e=>setForm(f=>({...f,daily_wage:+e.target.value}))} />
        </div>
      </div>
      <div>
        <label className="label">Preferred State</label>
        <select className="input" value={form.preferred_state} onChange={e=>setForm(f=>({...f,preferred_state:e.target.value}))}>
          <option value="">Any state</option>
          {STATES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Bio</label>
        <textarea className="input h-20" placeholder="Brief about yourself…"
          value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Profile'}</button>
    </form>
  )
}

export default function WorkersPage() {
  const { user } = useAuth()
  const [workers, setWorkers]   = useState([])
  const [myProfile, setMyProfile] = useState(null)
  const [filter, setFilter]     = useState({ available:'', state:'', skill:'' })
  const [loading, setLoading]   = useState(true)
  const [availability, setAvail] = useState(null)

  const loadWorkers = () => {
    setLoading(true)
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filter).filter(([,v])=>v))).toString()
    api.get(`/workers?${p}`).then(r=>setWorkers(r.data)).finally(()=>setLoading(false))
  }

  const loadProfile = () => {
    if (user?.role === 'worker') {
      api.get('/workers/me').then(r=>{ setMyProfile(r.data); setAvail(r.data.is_available) })
    }
  }

  useEffect(()=>{ loadWorkers(); loadProfile() }, [filter])

  const toggleAvailability = async () => {
    const newVal = !availability
    await api.patch('/workers/availability', { is_available: newVal })
    setAvail(newVal)
  }

  return (
    <Layout title="👷 Workers">
      {user?.role === 'worker' && (
        <div className="mb-6 space-y-4">
          <div className="card flex items-center justify-between">
            <div>
              <div className="font-semibold">Your Availability Status</div>
              <div className="text-sm text-gray-500">Farmers can see and contact you when you're available</div>
            </div>
            <button onClick={toggleAvailability}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${availability ? 'bg-primary' : 'bg-gray-300'}`}>
              <span className={`inline-block h-5 w-5 bg-white rounded-full shadow transition-transform ${availability ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
          <ProfileEditor profile={myProfile} onSaved={()=>{ loadProfile(); loadWorkers() }} />
        </div>
      )}

      {user?.role === 'farmer' && (
        <>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <select className="input w-40" value={filter.available} onChange={e=>setFilter(f=>({...f,available:e.target.value}))}>
              <option value="">All workers</option>
              <option value="true">Available only</option>
            </select>
            <select className="input w-48" value={filter.state} onChange={e=>setFilter(f=>({...f,state:e.target.value}))}>
              <option value="">All states</option>
              {STATES.map(s=><option key={s}>{s}</option>)}
            </select>
            <select className="input w-40" value={filter.skill} onChange={e=>setFilter(f=>({...f,skill:e.target.value}))}>
              <option value="">All skills</option>
              {SKILLS.map(s=><option key={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="text-center py-20 text-gray-400">Loading workers…</div>
          ) : workers.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">👷</div><div>No workers found.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {workers.map(w=><WorkerCard key={w.id} w={w} />)}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
