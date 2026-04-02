import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function Spark({ data, color = '#2d6a4f' }) {
  if (!data?.length) return null
  const max = Math.max(...data), min = Math.min(...data)
  const w = 80, h = 28
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatCard({ icon, label, value, sub, color, spark, trend }) {
  const light = {
    green:  'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-500',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  const sparkColor = { green:'#10b981', orange:'#f97316', blue:'#3b82f6', purple:'#a855f7' }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${light[color]}`}>{icon}</div>
        {spark && <Spark data={spark} color={sparkColor[color]} />}
      </div>
      <div className="text-2xl font-display font-bold text-gray-900 tabular-nums">{value ?? '—'}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub   && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      {trend && <div className="text-xs font-semibold text-green-600 mt-1">{trend}</div>}
    </div>
  )
}

function WeatherBadge() {
  const [w, setW] = useState(null)
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current=temperature_2m,relative_humidity_2m,weathercode&timezone=Asia%2FKolkata')
      .then(r => r.json()).then(d => setW(d.current)).catch(() => {})
  }, [])
  const icon = c => c === 0 ? '☀️' : c <= 3 ? '⛅' : c <= 67 ? '🌧️' : '⛈️'
  if (!w) return null
  return (
    <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-xl px-3 py-1.5 text-white text-sm">
      <span>{icon(w.weathercode)}</span>
      <span className="font-semibold">{Math.round(w.temperature_2m)}°C</span>
      <span className="opacity-60">· {w.relative_humidity_2m}% RH</span>
    </div>
  )
}

function PriceTicker({ prices }) {
  return (
    <div className="overflow-hidden flex-1 min-w-0">
      <div className="flex gap-6 whitespace-nowrap"
        style={{ animation: 'ticker 35s linear infinite' }}>
        {[...prices, ...prices].map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 shrink-0 text-sm">
            <span className="font-semibold text-white/90">{p.crop}</span>
            <span className="text-white/70">₹{p.price}</span>
            <span className={`text-xs font-bold ${p.change?.startsWith('-') ? 'text-red-300' : 'text-green-300'}`}>
              {p.change?.startsWith('-') ? '▼' : '▲'}{p.change}
            </span>
            <span className="text-white/20 mx-1">|</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats]   = useState({})
  const [prices, setPrices] = useState([])
  const [jobs, setJobs]     = useState([])
  const [events, setEvents] = useState([])
  const [posts, setPosts]   = useState([])
  const [clock, setClock]   = useState(new Date())
  const isFarmer = user?.role === 'farmer'

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {})
    api.get('/market-prices').then(r => setPrices(r.data.prices || [])).catch(() => {})
    api.get('/jobs?status=open').then(r => setJobs(r.data?.slice(0, 4) || [])).catch(() => {})
    api.get('/calendar').then(r => setEvents(r.data?.slice(0, 5) || [])).catch(() => {})
    api.get('/community').then(r => setPosts(r.data?.slice(0, 3) || [])).catch(() => {})
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const h = clock.getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const greetIcon = h < 12 ? '🌅' : h < 17 ? '☀️' : '🌙'

  const sp = {
    a: [2,3,2,4,3,5,4,6,5, isFarmer ? (stats.jobs_posted||6) : (stats.jobs_applied||4)],
    b: [1,2,3,2,4,3,5,4,6, isFarmer ? (stats.applications_received||6) : (stats.jobs_accepted||3)],
    c: [0,1,0,1,2,1,2,1,2, stats.equipment_booked||1],
    d: [100,200,150,300,250,400,350,500,400,500],
  }

  const evColor = {
    sowing:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    irrigation: 'bg-blue-50 text-blue-700 border-blue-200',
    fertilizer: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    harvest:    'bg-orange-50 text-orange-700 border-orange-200',
    spraying:   'bg-purple-50 text-purple-700 border-purple-200',
    other:      'bg-gray-50 text-gray-600 border-gray-200',
  }

  return (
    <Layout>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden mb-8"
        style={{ background: 'linear-gradient(135deg,#1b4332 0%,#2d6a4f 55%,#52b788 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute top-6 left-1/2 w-20 h-20 rounded-full bg-white/5" />
        </div>
        <div className="relative px-8 pt-8 pb-4 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-green-300 text-xs font-medium mb-1">
              {clock.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
              {' · '}
              <span className="font-mono">
                {clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              {greeting}, {user?.name?.split(' ')[0]} {greetIcon}
            </h1>
            <p className="text-green-200 text-sm">
              {isFarmer ? 'Manage your farm, workers, and AI-powered crop advisory.' : 'Track jobs, applications and your availability.'}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="badge bg-white/15 text-white border border-white/20 capitalize text-xs">{user?.role}</span>
              {user?.state && <span className="badge bg-white/10 text-green-200 border border-white/10 text-xs">📍 {user.state}</span>}
              <WeatherBadge />
            </div>
          </div>
          <div className="flex items-center gap-8 text-center">
            <div>
              <div className="text-3xl font-display font-bold text-white">{stats.platform_open_jobs ?? '—'}</div>
              <div className="text-green-300 text-xs">Open Jobs</div>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div>
              <div className="text-3xl font-display font-bold text-white">{stats.platform_available_workers ?? '—'}</div>
              <div className="text-green-300 text-xs">Available Workers</div>
            </div>
          </div>
        </div>
        {prices.length > 0 && (
          <div className="relative border-t border-white/10 px-8 py-2.5 bg-black/15 flex items-center gap-4">
            <span className="text-green-300 text-xs font-bold uppercase tracking-widest shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
            <PriceTicker prices={prices} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
      `}</style>

      {/* ── Stats ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isFarmer ? <>
          <StatCard icon="💼" label="Jobs Posted"        value={stats.jobs_posted}           color="green"  spark={sp.a} trend={`Total posted`} />
          <StatCard icon="📋" label="Applications"       value={stats.applications_received} color="blue"   spark={sp.b} />
          <StatCard icon="🚜" label="Equipment Booked"   value={stats.equipment_booked}      color="orange" spark={sp.c} />
          <StatCard icon="💰" label="Total Spent"        value={`₹${Number(stats.total_spent||0).toLocaleString('en-IN')}`} color="purple" spark={sp.d} />
        </> : <>
          <StatCard icon="📋" label="Applied"     value={stats.jobs_applied}  color="green"  spark={sp.a} />
          <StatCard icon="✅" label="Accepted"    value={stats.jobs_accepted} color="blue"   spark={sp.b} />
          <StatCard icon="💰" label="Earned"      value={`₹${Number(stats.total_earned||0).toLocaleString('en-IN')}`} color="orange" spark={sp.d} />
          <StatCard icon="⭐" label="Rating"      value={stats.rating||'New'} color="purple" />
        </>}
      </div>

      {/* ── 3-col grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick actions */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Access</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to:'/ai',          icon:'🤖', label:'AI Advisor',  bg:'bg-emerald-50',  tc:'text-emerald-700', bc:'border-emerald-100' },
              { to:'/jobs',        icon:'💼', label:'Jobs',        bg:'bg-blue-50',     tc:'text-blue-700',    bc:'border-blue-100' },
              { to:'/workers',     icon:'👷', label:'Workers',     bg:'bg-amber-50',    tc:'text-amber-700',   bc:'border-amber-100' },
              { to:'/equipment',   icon:'🚜', label:'Equipment',   bg:'bg-orange-50',   tc:'text-orange-700',  bc:'border-orange-100' },
              { to:'/marketplace', icon:'🛒', label:'Marketplace', bg:'bg-teal-50',     tc:'text-teal-700',    bc:'border-teal-100' },
              { to:'/schemes',     icon:'🏛️', label:'Schemes',     bg:'bg-violet-50',   tc:'text-violet-700',  bc:'border-violet-100' },
              { to:'/calendar',    icon:'📅', label:'Calendar',    bg:'bg-rose-50',     tc:'text-rose-700',    bc:'border-rose-100' },
              { to:'/community',   icon:'🌱', label:'Community',   bg:'bg-lime-50',     tc:'text-lime-700',    bc:'border-lime-100' },
            ].map(({ to, icon, label, bg, tc, bc }) => (
              <Link key={to} to={to}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border ${bg} ${bc} hover:shadow-md transition-all group`}>
                <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
                <span className={`text-xs font-semibold ${tc}`}>{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Open Jobs</p>
            <Link to="/jobs" className="text-primary text-xs font-semibold hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {jobs.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <div className="text-4xl mb-2">💼</div>
                <div className="text-sm">No open jobs</div>
              </div>
            )}
            {jobs.map(job => (
              <div key={job.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-semibold text-sm text-gray-900 leading-tight">{job.title}</div>
                  <span className="badge bg-green-100 text-green-700 shrink-0 text-xs">₹{job.wage_per_day}/d</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400">📍 {job.location || job.state || '—'}</span>
                  <span className="badge bg-blue-50 text-blue-600 text-xs capitalize">{job.job_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Farm Schedule</p>
            <Link to="/calendar" className="text-primary text-xs font-semibold hover:underline">+ Add →</Link>
          </div>
          <div className="space-y-2">
            {events.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <div className="text-4xl mb-2">📅</div>
                <div className="text-sm">No events yet</div>
                <Link to="/calendar" className="text-primary text-xs mt-1 inline-block hover:underline">Schedule now</Link>
              </div>
            )}
            {events.map(ev => (
              <div key={ev.id}
                className={`border rounded-xl px-4 py-3 flex items-center justify-between ${evColor[ev.event_type]||evColor.other}`}>
                <div>
                  <div className="font-semibold text-sm leading-tight">{ev.title}</div>
                  <div className="text-xs opacity-70 capitalize mt-0.5">{ev.event_type}</div>
                </div>
                <div className="text-xs font-mono opacity-60 shrink-0">{ev.event_date?.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: prices + community ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prices table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Market Prices</p>
              <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
              </span>
            </div>
            <Link to="/prices" className="text-primary text-xs font-semibold hover:underline">Full table →</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold">Crop</th>
                  <th className="text-right px-5 py-3 font-semibold">Modal (₹/q)</th>
                  <th className="text-right px-5 py-3 font-semibold">Change</th>
                  <th className="text-right px-5 py-3 font-semibold">Market</th>
                </tr>
              </thead>
              <tbody>
                {prices.slice(0, 8).map((p, i) => (
                  <tr key={p.crop}
                    className={`border-t border-gray-50 hover:bg-gray-50 transition-colors ${i%2===1?'bg-gray-50/30':''}`}>
                    <td className="px-5 py-2.5 font-medium text-gray-800">{p.crop}</td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{p.price?.toLocaleString('en-IN')}</td>
                    <td className={`px-5 py-2.5 text-right text-xs font-bold ${p.change?.startsWith('-')?'text-red-500':'text-green-600'}`}>
                      {p.change?.startsWith('-') ? '▼' : '▲'} {p.change}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-400 text-xs truncate max-w-24">{p.market?.replace('APMC ','')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Community */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Community</p>
            <Link to="/community" className="text-primary text-xs font-semibold hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {posts.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <div className="text-4xl mb-2">🌱</div>
                <div className="text-sm">No posts yet</div>
                <Link to="/community" className="text-primary text-xs mt-1 inline-block hover:underline">Share a tip</Link>
              </div>
            )}
            {posts.map(p => (
              <div key={p.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-primary/20 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {p.author?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900">{p.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.author} · {new Date(p.created_at).toLocaleDateString('en-IN')}</div>
                    {p.content && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{p.content}</p>}
                  </div>
                  <span className={`badge shrink-0 text-xs capitalize
                    ${p.category==='tip'?'bg-green-100 text-green-700':
                      p.category==='disease'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-500'}`}>
                    {p.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}