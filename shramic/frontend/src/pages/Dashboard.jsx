import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/Langcontext.jsx'

// ── State coords for weather ───────────────────────────────────────────────────
const STATE_COORDS = {
  'Karnataka':[12.97,77.59],'Maharashtra':[19.07,72.87],'Punjab':[30.73,76.78],
  'Haryana':[30.73,76.78],'Uttar Pradesh':[26.85,80.95],'Gujarat':[23.03,72.58],
  'Tamil Nadu':[13.08,80.27],'Andhra Pradesh':[17.36,78.47],'Telangana':[17.38,78.49],
  'West Bengal':[22.57,88.36],'Madhya Pradesh':[23.25,77.41],'Rajasthan':[26.92,75.78],
  'Bihar':[25.59,85.14],'Odisha':[20.29,85.82],'Assam':[26.14,91.74],'Kerala':[8.52,76.94],
  default:[20.59,78.96],
}

function getWeatherMeta(code) {
  if (code===0) return { icon:'☀️', label:'Clear Sky', grad:'from-amber-400 to-orange-400' }
  if (code<=3)  return { icon:'⛅', label:'Partly Cloudy', grad:'from-sky-400 to-blue-500' }
  if (code<=49) return { icon:'🌫️', label:'Foggy', grad:'from-gray-300 to-slate-400' }
  if (code<=69) return { icon:'🌧️', label:'Rain', grad:'from-blue-500 to-indigo-600' }
  if (code<=79) return { icon:'❄️', label:'Snow', grad:'from-sky-200 to-blue-300' }
  if (code<=84) return { icon:'🌦️', label:'Showers', grad:'from-blue-400 to-cyan-500' }
  return              { icon:'⛈️', label:'Thunderstorm', grad:'from-gray-700 to-slate-800' }
}

function getFarmAdvisory(code, temp, humidity, t) {
  if (code>=95) return { icon:'⚠️', tip: t('weather_storm') || 'Heavy storm — do NOT spray pesticides. Secure equipment.' }
  if (code>=51&&code<=69) return { icon:'💧', tip: t('weather_rain') || 'Rain today — skip irrigation. Good day for transplanting.' }
  if (temp>38) return { icon:'🌡️', tip: t('weather_hot') || 'Extreme heat — irrigate early morning or after sunset.' }
  if (humidity>85) return { icon:'💨', tip: t('weather_humid') || 'High humidity — watch for fungal diseases.' }
  if (temp<12) return { icon:'❄️', tip: t('weather_cold') || 'Cold — protect seedlings. Delay fertilizer application.' }
  return { icon:'✅', tip: t('weather_good') || 'Good farming conditions — suitable for most field activities.' }
}

function WeatherWidget({ userState, t }) {
  const [w, setW] = useState(null)
  const [fc, setFc] = useState([])
  const [city, setCity] = useState(userState||'Karnataka')
  const [loading, setLoading] = useState(true)
  const STATES = ['Karnataka','Maharashtra','Punjab','Haryana','Uttar Pradesh','Gujarat',
    'Tamil Nadu','Andhra Pradesh','Telangana','West Bengal','Madhya Pradesh','Rajasthan',
    'Bihar','Odisha','Assam','Kerala','Chhattisgarh','Uttarakhand']
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  useEffect(() => {
    const [lat,lng] = STATE_COORDS[city]||STATE_COORDS.default
    setLoading(true)
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,windspeed_10m,precipitation&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FKolkata&forecast_days=5`)
      .then(r=>r.json()).then(d=>{
        setW(d.current)
        setFc((d.daily?.time||[]).map((date,i)=>({
          date, code:d.daily.weathercode?.[i], max:d.daily.temperature_2m_max?.[i],
          min:d.daily.temperature_2m_min?.[i], rain:d.daily.precipitation_sum?.[i]
        })))
      }).catch(()=>{}).finally(()=>setLoading(false))
  },[city])

  if (loading) return <div className="rounded-3xl bg-gradient-to-br from-sky-400 to-blue-500 p-6 h-52 animate-pulse flex items-center justify-center"><span className="text-4xl animate-spin">🌀</span></div>
  if (!w) return null

  const meta    = getWeatherMeta(w.weathercode)
  const advice  = getFarmAdvisory(w.weathercode, w.temperature_2m, w.relative_humidity_2m, t)

  return (
    <div className="rounded-2xl overflow-hidden" style={{boxShadow:'0 8px 32px rgba(0,0,0,0.12)'}}>
      <div className={`bg-gradient-to-br ${meta.grad} p-6 relative overflow-hidden`}>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10"/>
        <div className="absolute -bottom-6 left-1/4 w-24 h-24 rounded-full bg-white/10"/>
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <select value={city} onChange={e=>setCity(e.target.value)}
                className="bg-white/25 text-white font-semibold text-sm rounded-xl px-3 py-1.5 border border-white/30 cursor-pointer outline-none mb-1">
                {STATES.map(s=><option key={s} value={s} style={{color:'#1a1a1a'}}>{s}</option>)}
              </select>
              <div className="text-white/60 text-xs">India</div>
            </div>
            <span className="text-6xl">{meta.icon}</span>
          </div>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-6xl font-display font-bold text-white leading-none">{Math.round(w.temperature_2m)}°</span>
            <span className="text-white/70 text-2xl mb-1">C</span>
          </div>
          <div className="text-white font-semibold text-lg">{meta.label}</div>
          <div className="text-white/60 text-sm">{t('feels_like')} {Math.round(w.apparent_temperature)}°C</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5 relative">
          {[[`💧`,t('humidity'),`${w.relative_humidity_2m}%`],[`💨`,t('wind'),`${Math.round(w.windspeed_10m)} km/h`],[`🌧️`,t('rain'),`${w.precipitation||0}mm`]].map(([ic,lb,vl])=>(
            <div key={lb} className="bg-white/20 rounded-xl p-2 text-center">
              <div className="text-lg">{ic}</div>
              <div className="text-white font-bold text-sm">{vl}</div>
              <div className="text-white/60 text-xs">{lb}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border-x border-b border-gray-100 px-4 py-2.5 flex items-start gap-2">
        <span className="text-base shrink-0">{advice.icon}</span>
        <p className="text-xs text-gray-600 leading-relaxed"><span className="font-bold text-gray-700">{t('todays_farm_advisory')} — </span>{advice.tip}</p>
      </div>

      <div className="bg-white border-x border-b border-gray-100 rounded-b-2xl px-4 pt-3 pb-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t('day_forecast')}</div>
        <div className="grid grid-cols-5 gap-1">
          {fc.map((d,i)=>{
            const dm = getWeatherMeta(d.code||0)
            const dow = new Date(d.date).getDay()
            return (
              <div key={d.date} className={`text-center p-2 rounded-xl ${i===0?'bg-green-50 border border-green-100':''}`}>
                <div className="text-xs text-gray-400 font-medium">{i===0?t('today'):DAYS[dow]}</div>
                <div className="text-xl my-1">{dm.icon}</div>
                <div className="text-xs font-bold text-gray-700">{Math.round(d.max)}°</div>
                <div className="text-xs text-gray-400">{Math.round(d.min)}°</div>
                {d.rain>0&&<div className="text-xs text-blue-500 mt-0.5">💧{d.rain}mm</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const SEED_PRICES = [
  {name:'Paddy',    msp:2300, market:2350, world:310,  cat:'grain',   trend:'+1.2%'},
  {name:'Wheat',    msp:2275, market:2352, world:195,  cat:'grain',   trend:'+2.1%'},
  {name:'Maize',    msp:2090, market:1800, world:160,  cat:'grain',   trend:'-1.8%'},
  {name:'Arhar',    msp:7550, market:8200, world:900,  cat:'pulse',   trend:'+3.5%'},
  {name:'Moong',    msp:8682, market:9100, world:1050, cat:'pulse',   trend:'+1.8%'},
  {name:'Groundnut',msp:6783, market:5800, world:1250, cat:'oilseed', trend:'-0.8%'},
  {name:'Soybean',  msp:4892, market:4300, world:370,  cat:'oilseed', trend:'+0.5%'},
  {name:'Mustard',  msp:5650, market:5900, world:720,  cat:'oilseed', trend:'+1.5%'},
  {name:'Cotton',   msp:7121, market:6500, world:850,  cat:'cash',    trend:'+2.8%'},
  {name:'Sugarcane',msp:340,  market:370,  world:42,   cat:'cash',    trend:'+1.0%'},
]

function vary(base, seed) {
  let h=0; const s=new Date().toISOString().slice(0,10)+seed
  for(let i=0;i<s.length;i++) h=((h<<5)-h+s.charCodeAt(i))|0
  return Math.round(base*(1+(h%200)/10000))
}

function Spark({ data, color='#2d6a4f' }) {
  if(!data?.length) return null
  const max=Math.max(...data),min=Math.min(...data),w=80,h=28
  const pts=data.map((v,i)=>{ const x=(i/(data.length-1))*w; const y=h-((v-min)/(max-min||1))*h; return `${x},${y}` }).join(' ')
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-60"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function StatCard({ icon, label, value, color, spark }) {
  const bg = {green:'bg-emerald-50 text-emerald-600',orange:'bg-orange-50 text-orange-500',blue:'bg-blue-50 text-blue-600',purple:'bg-purple-50 text-purple-600'}
  const sc = {green:'#10b981',orange:'#f97316',blue:'#3b82f6',purple:'#a855f7'}
  return (
    <div className="bg-white rounded-2xl p-5" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:'1px solid rgba(0,0,0,0.05)'}}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${bg[color]}`}>{icon}</div>
        {spark&&<Spark data={spark} color={sc[color]}/>}
      </div>
      <div className="text-2xl font-display font-bold text-gray-900 tabular-nums">{value??'—'}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

function Ticker({ prices }) {
  return (
    <div className="overflow-hidden flex-1 min-w-0">
      <div className="flex gap-6 whitespace-nowrap" style={{animation:'ticker 40s linear infinite'}}>
        {[...prices,...prices].map((p,i)=>(
          <span key={i} className="inline-flex items-center gap-1.5 shrink-0 text-sm">
            <span className="font-semibold text-white/90">{p.crop}</span>
            <span className="text-white/60">₹{p.price}</span>
            <span className={`text-xs font-bold ${p.change?.startsWith('-')?'text-red-300':'text-green-300'}`}>{p.change?.startsWith('-')?'▼':'▲'}{p.change}</span>
            <span className="text-white/20 mx-2">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useLang()
  const [stats, setStats]   = useState({})
  const [prices, setPrices] = useState([])
  const [jobs, setJobs]     = useState([])
  const [events, setEvents] = useState([])
  const [posts, setPosts]   = useState([])
  const [clock, setClock]   = useState(new Date())
  const [seedFilter, setSeedFilter] = useState('all')
  const isFarmer = user?.role==='farmer'

  useEffect(()=>{
    api.get('/dashboard/stats').then(r=>setStats(r.data)).catch(()=>{})
    api.get('/market-prices').then(r=>setPrices(r.data.prices||[])).catch(()=>{})
    api.get('/jobs?status=open').then(r=>setJobs(r.data?.slice(0,4)||[])).catch(()=>{})
    api.get('/calendar').then(r=>setEvents(r.data?.slice(0,5)||[])).catch(()=>{})
    api.get('/community').then(r=>setPosts(r.data?.slice(0,3)||[])).catch(()=>{})
    const ti=setInterval(()=>setClock(new Date()),1000); return()=>clearInterval(ti)
  },[])

  const h = clock.getHours()
  const greeting = h<12?t('good_morning'):h<17?t('good_afternoon'):t('good_evening')
  const greetIcon = h<12?'🌅':h<17?'☀️':'🌙'
  const sp = {
    a:[2,3,2,4,3,5,4,6,5,isFarmer?(stats.jobs_posted||6):(stats.jobs_applied||4)],
    b:[1,2,3,2,4,3,5,4,6,isFarmer?(stats.applications_received||6):(stats.jobs_accepted||3)],
    c:[0,1,0,1,2,1,2,1,2,stats.equipment_booked||1],
    d:[100,200,150,300,250,400,350,500,400,500],
  }
  const evColor = {
    sowing:'bg-emerald-50 text-emerald-700 border-emerald-200',
    irrigation:'bg-blue-50 text-blue-700 border-blue-200',
    fertilizer:'bg-yellow-50 text-yellow-700 border-yellow-200',
    harvest:'bg-orange-50 text-orange-700 border-orange-200',
    spraying:'bg-purple-50 text-purple-700 border-purple-200',
    other:'bg-gray-50 text-gray-600 border-gray-200',
  }
  const seedRows = SEED_PRICES.filter(p=>seedFilter==='all'||p.cat===seedFilter)

  const QUICK = [
    {to:'/ai',icon:'🤖',key:'ai_advisory',bg:'#f0fdf4',tc:'#15803d'},
    {to:'/jobs',icon:'💼',key:'jobs',bg:'#eff6ff',tc:'#1d4ed8'},
    {to:'/workers',icon:'👷',key:'workers',bg:'#fffbeb',tc:'#b45309'},
    {to:'/equipment',icon:'🚜',key:'equipment',bg:'#fff7ed',tc:'#c2410c'},
    {to:'/marketplace',icon:'🛒',key:'marketplace',bg:'#f0fdfa',tc:'#0f766e'},
    {to:'/schemes',icon:'🏛️',key:'schemes',bg:'#faf5ff',tc:'#7e22ce'},
    {to:'/calendar',icon:'📅',key:'calendar',bg:'#fff1f2',tc:'#be123c'},
    {to:'/community',icon:'🌱',key:'community',bg:'#f7fee7',tc:'#4d7c0f'},
  ]

  return (
    <Layout>
      <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl overflow-hidden mb-8" style={{background:'linear-gradient(135deg,#1b4332 0%,#2d6a4f 55%,#52b788 100%)',boxShadow:'0 8px 32px rgba(45,106,79,0.3)'}}>
        <div className="px-8 pt-8 pb-5 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5"/>
          <div className="absolute -bottom-8 left-1/3 w-40 h-40 rounded-full bg-white/5"/>
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-green-300/80 text-xs font-medium mb-1 font-mono">
                {clock.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})} · {clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </div>
              <h1 className="font-display text-3xl font-bold text-white mb-2">
                {greeting}, {user?.name?.split(' ')[0]} {greetIcon}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-white/15 text-white px-3 py-1 rounded-full border border-white/20 capitalize">{t(user?.role)||user?.role}</span>
                {user?.state&&<span className="text-xs bg-white/10 text-green-200 px-3 py-1 rounded-full">📍 {user.state}</span>}
              </div>
            </div>
            <div className="flex items-center gap-10 text-center">
              <div><div className="text-3xl font-display font-bold text-white">{stats.platform_open_jobs??'—'}</div><div className="text-green-300 text-xs mt-0.5">{t('open_jobs')}</div></div>
              <div className="w-px h-10 bg-white/20"/>
              <div><div className="text-3xl font-display font-bold text-white">{stats.platform_available_workers??'—'}</div><div className="text-green-300 text-xs mt-0.5">{t('available_workers')}</div></div>
            </div>
          </div>
        </div>
        {prices.length>0&&(
          <div className="border-t border-white/10 px-8 py-2.5 bg-black/15 flex items-center gap-4">
            <span className="text-xs font-bold text-green-300 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>Live
            </span>
            <Ticker prices={prices}/>
          </div>
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isFarmer?<>
          <StatCard icon="💼" label={t('jobs_posted')}      value={stats.jobs_posted}           color="green"  spark={sp.a}/>
          <StatCard icon="📋" label={t('applications')}     value={stats.applications_received} color="blue"   spark={sp.b}/>
          <StatCard icon="🚜" label={t('equipment_booked')} value={stats.equipment_booked}      color="orange" spark={sp.c}/>
          <StatCard icon="💰" label={t('total_spent')}      value={`₹${Number(stats.total_spent||0).toLocaleString('en-IN')}`} color="purple" spark={sp.d}/>
        </>:<>
          <StatCard icon="📋" label={t('jobs_applied')}  value={stats.jobs_applied}  color="green"  spark={sp.a}/>
          <StatCard icon="✅" label={t('accepted')}      value={stats.jobs_accepted} color="blue"   spark={sp.b}/>
          <StatCard icon="💰" label={t('earned')}        value={`₹${Number(stats.total_earned||0).toLocaleString('en-IN')}`} color="orange" spark={sp.d}/>
          <StatCard icon="⭐" label={t('rating')}        value={stats.rating||'New'} color="purple"/>
        </>}
      </div>

      {/* ── Weather + Quick access ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div>
          <div className="section-title">{t('live_weather')}</div>
          <WeatherWidget userState={user?.state} t={t}/>
        </div>
        <div className="lg:col-span-2">
          <div className="section-title">{t('quick_access')}</div>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {QUICK.map(({to,icon,key,bg,tc})=>(
              <Link key={to} to={to}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl hover:shadow-md transition-all group"
                style={{background:bg,border:`1px solid ${tc}22`}}>
                <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
                <span className="text-xs font-semibold text-center leading-tight" style={{color:tc}}>{t(key)}</span>
              </Link>
            ))}
          </div>

          {/* Recent jobs */}
          <div className="flex items-center justify-between mb-3">
            <div className="section-title mb-0">{t('recent_jobs')}</div>
            <Link to="/jobs" className="text-green-700 text-xs font-semibold hover:underline">{t('view_all')} →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobs.length===0&&<div className="col-span-2 text-center py-8 text-gray-400 text-sm">{t('no_jobs')}</div>}
            {jobs.map(job=>(
              <div key={job.id} className="bg-white rounded-xl p-4 hover:shadow-sm transition-all" style={{border:'1px solid rgba(0,0,0,0.05)'}}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-sm text-gray-900 leading-tight">{job.title}</div>
                  <span className="badge bg-green-100 text-green-700 shrink-0 text-xs">₹{job.wage_per_day}/d</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">📍 {job.location||job.state||'—'}</span>
                  <span className="badge bg-blue-50 text-blue-600 text-xs capitalize">{job.job_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Seed prices + Calendar + Community ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seed prices */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="section-title mb-0">{t('seed_prices')}</div>
            <div className="flex gap-1">
              {['all','grain','pulse','oilseed','cash'].map(c=>(
                <button key={c} onClick={()=>setSeedFilter(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${seedFilter===c?'bg-green-700 text-white':'bg-white text-gray-500 hover:bg-gray-50'}`}
                  style={seedFilter===c?{}:{border:'1px solid rgba(0,0,0,0.08)'}}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:'1px solid rgba(0,0,0,0.05)'}}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Crop</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">MSP ₹/q</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Market</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Global $/t</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">7d</th>
                </tr>
              </thead>
              <tbody>
                {seedRows.map((p,i)=>{
                  const live=vary(p.market,p.name)
                  const up=live>=p.msp
                  return (
                    <tr key={p.name} className={`border-t border-gray-50 hover:bg-gray-50/60 ${i%2===1?'bg-gray-50/30':''}`}>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-800">{p.name}</div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${p.cat==='grain'?'text-green-600 bg-green-50':p.cat==='pulse'?'text-orange-600 bg-orange-50':'text-yellow-700 bg-yellow-50'}`}>{p.cat}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{p.msp.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-bold tabular-nums ${up?'text-green-600':'text-red-500'}`}>{live.toLocaleString('en-IN')}</span>
                        <span className={`ml-1 text-xs ${up?'text-green-500':'text-red-400'}`}>{up?'▲':'▼'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs tabular-nums">${p.world}</td>
                      <td className={`px-4 py-2.5 text-right text-xs font-bold ${p.trend.startsWith('-')?'text-red-500':'text-green-600'}`}>{p.trend}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
              <span className="text-green-600 font-semibold">▲</span> Market above MSP · <span className="text-red-500 font-semibold">▼</span> Market below MSP · Source: CACP / Agmarknet
            </div>
          </div>
        </div>

        {/* Right: Calendar + Community */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl overflow-hidden" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:'1px solid rgba(0,0,0,0.05)'}}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div className="section-title mb-0">📅 {t('farm_schedule')}</div>
              <Link to="/calendar" className="text-green-700 text-xs font-semibold hover:underline">{t('add_event')}</Link>
            </div>
            <div className="p-3 space-y-2">
              {events.length===0?(
                <div className="text-center py-6 text-gray-400 text-xs">
                  <div className="text-3xl mb-1">📅</div>
                  <div>{t('no_events')}</div>
                  <Link to="/calendar" className="text-green-700 text-xs mt-1 inline-block">{t('schedule_now')}</Link>
                </div>
              ):events.map(ev=>(
                <div key={ev.id} className={`border rounded-xl px-3 py-2.5 flex items-center justify-between ${evColor[ev.event_type]||evColor.other}`}>
                  <div>
                    <div className="font-semibold text-xs leading-tight">{ev.title}</div>
                    <div className="text-xs opacity-70 capitalize mt-0.5">{ev.event_type}</div>
                  </div>
                  <div className="text-xs font-mono opacity-60 shrink-0">{ev.event_date?.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:'1px solid rgba(0,0,0,0.05)'}}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div className="section-title mb-0">🌱 {t('community_posts')}</div>
              <Link to="/community" className="text-green-700 text-xs font-semibold hover:underline">{t('view_all')} →</Link>
            </div>
            <div className="p-3 space-y-2">
              {posts.length===0?(
                <div className="text-center py-6 text-gray-400 text-xs">
                  <div className="text-3xl mb-1">🌱</div>
                  <div>{t('no_posts')}</div>
                  <Link to="/community" className="text-green-700 text-xs mt-1 inline-block">{t('share_tip')}</Link>
                </div>
              ):posts.map(p=>(
                <div key={p.id} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">{p.author?.[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-gray-900 leading-tight truncate">{p.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.author}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}