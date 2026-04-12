import { useEffect, useState } from 'react'
import api from '../api.js'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const JOB_TYPES = ['sowing','harvesting','irrigation','spraying','ploughing','transplanting','weeding','other']
const STATES = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Gujarat','Haryana','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana',
  'Uttar Pradesh','Uttarakhand','West Bengal']
const SEASONS = ['Kharif','Rabi','Summer','Whole Year']

const TYPE_ICONS = {
  sowing:'🌱', harvesting:'🌾', irrigation:'💧', spraying:'💊',
  ploughing:'🚜', transplanting:'🌿', weeding:'✂️', other:'📋'
}

function WageSuggester({ jobType, state, workers }) {
  const [suggestion, setSuggestion] = useState(null)
  const [loading, setLoading] = useState(false)

  const getSuggestion = async () => {
    if (!jobType || !state) return
    setLoading(true)
    try {
      const { data } = await api.post('/ai/wage-suggest', { job_type: jobType, state, workers_needed: workers })
      setSuggestion(data)
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (jobType && state) getSuggestion()
  }, [jobType, state, workers])

  if (!state || !jobType) return null

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🤖</span>
        <span className="text-xs font-bold text-green-800">AI Fair Wage Suggestion</span>
        {loading && <span className="text-xs text-green-600 animate-pulse">Calculating…</span>}
      </div>
      {suggestion && !loading && (
        <>
          <div className="flex items-center gap-3 mb-1">
            <div className="text-2xl font-display font-bold text-green-700">₹{suggestion.suggested_wage}</div>
            <div className="text-xs text-green-600">/day</div>
            <div className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-green-200">
              Range: ₹{suggestion.range.low}–₹{suggestion.range.high}
            </div>
          </div>
          <p className="text-xs text-green-700 leading-relaxed">{suggestion.note}</p>
          {suggestion.breakdown.group_discount && (
            <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full mt-1 inline-block">
              ✓ {suggestion.breakdown.group_discount} applied
            </span>
          )}
        </>
      )}
    </div>
  )
}

function JobCard({ job, onApply, user }) {
  const [applying, setApplying] = useState(false)
  const [applied, setApplied]   = useState(false)

  const apply = async () => {
    setApplying(true)
    try {
      await api.post(`/jobs/${job.id}/apply`, {})
      setApplied(true)
      onApply?.()
    } catch(e) { alert(e.response?.data?.error || 'Already applied or error') }
    finally { setApplying(false) }
  }

  const daysLeft = job.end_date
    ? Math.max(0, Math.ceil((new Date(job.end_date)-new Date())/86400000))
    : null

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-primary/20 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
            {TYPE_ICONS[job.job_type] || '📋'}
          </div>
          <div>
            <div className="font-semibold text-gray-900 leading-tight">{job.title}</div>
            <div className="text-xs text-gray-400 mt-0.5">{job.farmer_name}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-display font-bold text-primary">₹{job.wage_per_day}</div>
          <div className="text-xs text-gray-400">/day</div>
        </div>
      </div>

      {job.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">{job.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="badge bg-blue-50 text-blue-700 capitalize">{TYPE_ICONS[job.job_type]} {job.job_type}</span>
        <span className="badge bg-gray-100 text-gray-600">📍 {job.location || job.state}</span>
        {job.workers_needed > 1 && (
          <span className="badge bg-purple-50 text-purple-700">👥 {job.workers_needed} workers</span>
        )}
        {daysLeft !== null && (
          <span className={`badge ${daysLeft <= 3 ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'}`}>
            ⏱ {daysLeft === 0 ? 'Last day' : `${daysLeft}d left`}
          </span>
        )}
      </div>

      {job.start_date && (
        <div className="text-xs text-gray-400 mb-3">
          📅 {job.start_date?.slice(0,10)} → {job.end_date?.slice(0,10)}
        </div>
      )}

      {user?.role === 'worker' && (
        <button onClick={apply} disabled={applying || applied}
          className={`w-full py-2 rounded-xl text-sm font-semibold transition-all
            ${applied ? 'bg-green-100 text-green-700 cursor-default' :
              'bg-primary text-white hover:bg-primary-dark'}`}>
          {applied ? '✓ Applied' : applying ? 'Applying…' : 'Apply Now'}
        </button>
      )}

      {user?.role === 'farmer' && (
        <div className="text-xs text-gray-400 text-right">Posted by you</div>
      )}
    </div>
  )
}

function PostJobModal({ onClose, onPosted }) {
  const [form, setForm] = useState({
    title:'', description:'', job_type:'harvesting', location:'',
    state:'', district:'', wage_per_day:'', workers_needed:1,
    start_date:'', end_date:'', season:'Kharif'
  })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/jobs', {...form, wage_per_day:+form.wage_per_day, workers_needed:+form.workers_needed})
      onPosted(); onClose()
    } catch(err) { alert(err.response?.data?.error || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-display font-bold text-lg">Post a Job</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Job type icons */}
          <div>
            <label className="label">Job Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {JOB_TYPES.map(t => (
                <button type="button" key={t}
                  onClick={() => setForm(f=>({...f,job_type:t}))}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all capitalize
                    ${form.job_type===t ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <span className="text-xl">{TYPE_ICONS[t]}</span>
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Job Title *</label>
            <input className="input" required placeholder="e.g. Paddy harvesting needed — 5 acres"
              value={form.title} onChange={set('title')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">State *</label>
              <select className="input" value={form.state} onChange={set('state')} required>
                <option value="">Select state</option>
                {STATES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Season</label>
              <select className="input" value={form.season} onChange={set('season')}>
                {SEASONS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Location / Village</label>
            <input className="input" placeholder="Village name, district"
              value={form.location} onChange={set('location')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Workers Needed</label>
              <input className="input" type="number" min="1" max="100"
                value={form.workers_needed} onChange={set('workers_needed')} />
            </div>
            <div>
              <label className="label">Wage per day (₹) *</label>
              <input className="input" type="number" required placeholder="e.g. 500"
                value={form.wage_per_day} onChange={set('wage_per_day')} />
            </div>
          </div>

          {/* AI Wage Suggester */}
          <WageSuggester jobType={form.job_type} state={form.state} workers={+form.workers_needed} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={form.start_date} onChange={set('start_date')} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input className="input" type="date" value={form.end_date} onChange={set('end_date')} />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input h-20 resize-none"
              placeholder="Describe the work — field size, tools provided, food/accommodation, etc."
              value={form.description} onChange={set('description')} />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? '⏳ Posting…' : '💼 Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function JobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [showPost, setShowPost] = useState(false)
  const [filter, setFilter]     = useState({ type:'', state:'', status:'open' })
  const [search, setSearch]     = useState('')

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filter).filter(([,v])=>v))).toString()
    api.get(`/jobs?${p}`).then(r=>setJobs(r.data||[])).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() }, [filter])

  const filtered = jobs.filter(j =>
    !search || j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="💼 Agricultural Jobs">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input className="input pl-9" placeholder="Search jobs…"
            value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))}>
          <option value="">All Types</option>
          {JOB_TYPES.map(t=><option key={t} className="capitalize">{t}</option>)}
        </select>
        <select className="input w-44" value={filter.state} onChange={e=>setFilter(f=>({...f,state:e.target.value}))}>
          <option value="">All States</option>
          {STATES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select className="input w-36" value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
          <option value="open">Open Jobs</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <div className="flex-1"/>
        {user?.role === 'farmer' && (
          <button onClick={()=>setShowPost(true)} className="btn-primary shrink-0">+ Post Job</button>
        )}
      </div>

      {/* Job type quick filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={()=>setFilter(f=>({...f,type:''}))}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
            ${!filter.type ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-primary/40'}`}>
          All Jobs ({jobs.length})
        </button>
        {JOB_TYPES.map(t => (
          <button key={t} onClick={()=>setFilter(f=>({...f,type:t}))}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all capitalize
              ${filter.type===t ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-primary/40'}`}>
            {TYPE_ICONS[t]} {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i=>(
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">💼</div>
          <div className="font-display font-bold text-xl text-gray-700 mb-2">No jobs found</div>
          <p className="text-gray-400 text-sm mb-6">
            {search ? 'Try different search terms.' : 'No jobs match your filters.'}
          </p>
          {user?.role === 'farmer' && (
            <button onClick={()=>setShowPost(true)} className="btn-primary">+ Post the first job</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} user={user} onApply={load} />
          ))}
        </div>
      )}

      {showPost && <PostJobModal onClose={()=>setShowPost(false)} onPosted={load} />}
    </Layout>
  )
}