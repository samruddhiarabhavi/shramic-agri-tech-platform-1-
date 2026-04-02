import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api.js'

const JOB_TYPES = ['sowing','harvesting','irrigation','spraying','ploughing','other']
const STATES = ['Andhra Pradesh','Assam','Bihar','Gujarat','Haryana','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Uttar Pradesh','West Bengal']

function JobCard({ job, onApply, user }) {
  const [applying, setApplying] = useState(false)
  const apply = async () => {
    setApplying(true)
    try { await api.post(`/jobs/${job.id}/apply`, {}); onApply?.() }
    catch (e) { alert(e.response?.data?.error || 'Error applying') }
    finally { setApplying(false) }
  }
  return (
    <div className="card hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold text-gray-900">{job.title}</div>
          <div className="text-sm text-gray-500 mt-0.5">{job.farmer_name} • {job.location}</div>
        </div>
        <span className="badge bg-green-100 text-green-700 shrink-0">₹{job.wage_per_day}/day</span>
      </div>
      {job.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{job.description}</p>}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="badge bg-blue-100 text-blue-700 capitalize">{job.job_type}</span>
        <span className="badge bg-gray-100 text-gray-600">{job.state}</span>
        {job.workers_needed > 1 && <span className="badge bg-purple-100 text-purple-700">{job.workers_needed} workers needed</span>}
      </div>
      {job.start_date && (
        <div className="text-xs text-gray-400 mb-3">
          📅 {job.start_date?.slice(0,10)} — {job.end_date?.slice(0,10)}
        </div>
      )}
      {user?.role === 'worker' && (
        <button onClick={apply} disabled={applying} className="btn-primary text-sm py-2 w-full">
          {applying ? 'Applying…' : 'Apply Now'}
        </button>
      )}
    </div>
  )
}

function PostJobModal({ onClose, onPosted }) {
  const [form, setForm] = useState({ title:'', description:'', job_type:'harvesting', location:'', state:'', district:'', wage_per_day:'', workers_needed:1, start_date:'', end_date:'' })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/jobs', {...form, wage_per_day: +form.wage_per_day, workers_needed: +form.workers_needed })
      onPosted()
      onClose()
    } catch(err) { alert(err.response?.data?.error || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="font-display font-bold text-lg">Post a Job</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Job Title</label>
            <input className="input" placeholder="e.g. Wheat harvesting needed" required value={form.title} onChange={set('title')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Job Type</label>
              <select className="input" value={form.job_type} onChange={set('job_type')}>
                {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Workers Needed</label>
              <input className="input" type="number" min="1" value={form.workers_needed} onChange={set('workers_needed')} />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" placeholder="Village / District" value={form.location} onChange={set('location')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">State</label>
              <select className="input" value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {STATES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Wage per day (₹)</label>
              <input className="input" type="number" placeholder="500" required value={form.wage_per_day} onChange={set('wage_per_day')} />
            </div>
          </div>
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
            <textarea className="input h-20" placeholder="Job details…" value={form.description} onChange={set('description')} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Posting…' : 'Post Job'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function JobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showPost, setShowPost] = useState(false)
  const [filter, setFilter]   = useState({ type:'', state:'' })

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ status:'open', ...filter }).toString()
    api.get(`/jobs?${params}`).then(r=>setJobs(r.data)).finally(()=>setLoading(false))
  }

  useEffect(()=>{ load() }, [filter])

  return (
    <Layout title="💼 Agricultural Jobs">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select className="input w-40" value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))}>
          <option value="">All Types</option>
          {JOB_TYPES.map(t=><option key={t} className="capitalize">{t}</option>)}
        </select>
        <select className="input w-48" value={filter.state} onChange={e=>setFilter(f=>({...f,state:e.target.value}))}>
          <option value="">All States</option>
          {STATES.map(s=><option key={s}>{s}</option>)}
        </select>
        <div className="flex-1" />
        {user?.role === 'farmer' && (
          <button onClick={()=>setShowPost(true)} className="btn-primary">+ Post Job</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">💼</div>
          <div>No open jobs found.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} user={user} onApply={load} />
          ))}
        </div>
      )}

      {showPost && <PostJobModal onClose={()=>setShowPost(false)} onPosted={load} />}
    </Layout>
  )
}
