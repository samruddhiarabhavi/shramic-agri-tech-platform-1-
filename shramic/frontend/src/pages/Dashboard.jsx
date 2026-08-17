import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Cpu,
  Droplets,
  HardHat,
  Landmark,
  MapPin,
  ShoppingCart,
  Snowflake,
  Sprout,
  Star,
  Sun,
  Tractor,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wind
} from 'lucide-react'
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
  if (code===0) return { Icon:Sun, label:'Clear sky' }
  if (code<=3)  return { Icon:CloudSun, label:'Partly cloudy' }
  if (code<=49) return { Icon:CloudFog, label:'Foggy' }
  if (code<=69) return { Icon:CloudRain, label:'Rain' }
  if (code<=79) return { Icon:Snowflake, label:'Snow' }
  if (code<=84) return { Icon:CloudDrizzle, label:'Showers' }
  return              { Icon:CloudLightning, label:'Thunderstorm' }
}

function getFarmAdvisory(code, temp, humidity, t) {
  if (code>=95) return { tip: t('weather_storm') || 'Heavy storm — do not spray pesticides. Secure equipment.' }
  if (code>=51&&code<=69) return { tip: t('weather_rain') || 'Rain today — skip irrigation. Good day for transplanting.' }
  if (temp>38) return { tip: t('weather_hot') || 'Extreme heat — irrigate early morning or after sunset.' }
  if (humidity>85) return { tip: t('weather_humid') || 'High humidity — watch for fungal diseases.' }
  if (temp<12) return { tip: t('weather_cold') || 'Cold — protect seedlings. Delay fertilizer application.' }
  return { tip: t('weather_good') || 'Good farming conditions — suitable for most field activities.' }
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

  if (loading) return <div className="rounded-md bg-[#1B2A3D] p-6 h-52 animate-pulse flex items-center justify-center"><Wind size={32} strokeWidth={1.5} className="text-[#D9A62E] animate-spin" /></div>
  if (!w) return null

  const meta   = getWeatherMeta(w.weathercode)
  const advice = getFarmAdvisory(w.weathercode, w.temperature_2m, w.relative_humidity_2m, t)
  const MetaIcon = meta.Icon

  return (
    <div className="rounded-md overflow-hidden border border-[#DFD8BF]">
      <div className="bg-[#1B2A3D] p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <select value={city} onChange={e=>setCity(e.target.value)}
              className="bg-white/10 text-white font-semibold text-sm rounded px-3 py-1.5 border border-white/20 cursor-pointer outline-none mb-1">
              {STATES.map(s=><option key={s} value={s} style={{color:'#1a1a1a'}}>{s}</option>)}
            </select>
            <div className="text-[#8A97A6] text-xs">India</div>
          </div>
          <MetaIcon size={44} strokeWidth={1.25} className="text-[#D9A62E]" />
        </div>
        <div className="flex items-end gap-1 mb-1">
          <span className="text-6xl font-display font-bold text-white leading-none">{Math.round(w.temperature_2m)}°</span>
          <span className="text-[#8A97A6] text-2xl mb-1">C</span>
        </div>
        <div className="text-white font-semibold text-lg">{meta.label}</div>
        <div className="text-[#8A97A6] text-sm">{t('feels_like')} {Math.round(w.apparent_temperature)}°C</div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          {[[Droplets,t('humidity'),`${w.relative_humidity_2m}%`],[Wind,t('wind'),`${Math.round(w.windspeed_10m)} km/h`],[CloudRain,t('rain'),`${w.precipitation||0}mm`]].map(([Ic,lb,vl])=>(
            <div key={lb} className="bg-white/[0.06] rounded p-2 text-center">
              <Ic size={16} strokeWidth={1.75} className="text-[#D9A62E] mx-auto mb-1" />
              <div className="text-white font-bold text-sm font-mono">{vl}</div>
              <div className="text-[#8A97A6] text-xs">{lb}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#FBF9F1] px-4 py-2.5 flex items-start gap-2 border-t border-[#DFD8BF]">
        <p className="text-xs text-[#5B6B7C] leading-relaxed"><span className="font-bold text-[#1B2A3D]">{t('todays_farm_advisory')} — </span>{advice.tip}</p>
      </div>

      <div className="bg-[#FBF9F1] px-4 pt-3 pb-4 border-t border-[#DFD8BF]">
        <div className="text-xs font-bold text-[#5B6B7C] uppercase tracking-widest mb-2">{t('day_forecast')}</div>
        <div className="grid grid-cols-5 gap-1">
          {fc.map((d,i)=>{
            const dm = getWeatherMeta(d.code||0)
            const DIcon = dm.Icon
            const dow = new Date(d.date).getDay()
            return (
              <div key={d.date} className={`text-center p-2 rounded ${i===0?'bg-[#D9A62E]/10 border border-[#D9A62E]/30':''}`}>
                <div className="text-xs text-[#5B6B7C] font-medium">{i===0?t('today'):DAYS[dow]}</div>
                <DIcon size={20} strokeWidth={1.5} className="text-[#1B2A3D] mx-auto my-1" />
                <div className="text-xs font-bold text-[#1B2A3D] font-mono">{Math.round(d.max)}°</div>
                <div className="text-xs text-[#5B6B7C] font-mono">{Math.round(d.min)}°</div>
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

const CAT_COLOR = { grain:'#5B6E44', pulse:'#C1440E', oilseed:'#D9A62E', cash:'#1B2A3D' }

function vary(base, seed) {
  let h=0; const s=new Date().toISOString().slice(0,10)+seed
  for(let i=0;i<s.length;i++) h=((h<<5)-h+s.charCodeAt(i))|0
  return Math.round(base*(1+(h%200)/10000))
}

function Spark({ data, color='#1B2A3D' }) {
  if(!data?.length) return null
  const max=Math.max(...data),min=Math.min(...data),w=72,h=26
  const pts=data.map((v,i)=>{ const x=(i/(data.length-1))*w; const y=h-((v-min)/(max-min||1))*h; return `${x},${y}` }).join(' ')
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function Plaque({ Icon, label, value, accent, spark }) {
  return (
    <div className="bg-[#FBF9F1] rounded-md border border-[#DFD8BF] p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded flex items-center justify-center shrink-0" style={{ background:'#1B2A3D' }}>
        <Icon size={22} strokeWidth={1.5} style={{ color:accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-2xl text-[#1B2A3D] tabular-nums leading-none">{value??'—'}</div>
        <div className="text-xs text-[#5B6B7C] mt-1">{label}</div>
      </div>
      {spark && <Spark data={spark} color={accent} />}
    </div>
  )
}

function Ticker({ prices }) {
  return (
    <div className="overflow-hidden flex-1 min-w-0">
      <div className="flex gap-6 whitespace-nowrap font-mono" style={{animation:'ticker 40s linear infinite'}}>
        {[...prices,...prices].map((p,i)=>{
          const down = p.change?.startsWith('-')
          return (
            <span key={i} className="inline-flex items-center gap-1.5 shrink-0 text-sm">
              <span className="font-semibold text-white/90">{p.crop}</span>
              <span className="text-white/50">₹{p.price}</span>
              <span className={`text-xs font-bold flex items-center gap-0.5 ${down?'text-[#E06B32]':'text-[#D9A62E]'}`}>
                {down ? <TrendingDown size={12} /> : <TrendingUp size={12} />}{p.change}
              </span>
              <span className="text-white/15 mx-2">·</span>
            </span>
          )
        })}
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
    api.get('/jobs?status=open').then(r=>setJobs(r.data?.slice(0,5)||[])).catch(()=>{})
    api.get('/calendar').then(r=>setEvents(r.data?.slice(0,5)||[])).catch(()=>{})
    api.get('/community').then(r=>setPosts(r.data?.slice(0,3)||[])).catch(()=>{})
    const ti=setInterval(()=>setClock(new Date()),1000); return()=>clearInterval(ti)
  },[])

  const h = clock.getHours()
  const greeting = h<12?t('good_morning'):h<17?t('good_afternoon'):t('good_evening')
  const sp = {
    a:[2,3,2,4,3,5,4,6,5,isFarmer?(stats.jobs_posted||6):(stats.jobs_applied||4)],
    b:[1,2,3,2,4,3,5,4,6,isFarmer?(stats.applications_received||6):(stats.jobs_accepted||3)],
    c:[0,1,0,1,2,1,2,1,2,stats.equipment_booked||1],
    d:[100,200,150,300,250,400,350,500,400,500],
  }
  const evColor = {
    sowing:      { bg:'#5B6E44' },
    irrigation:  { bg:'#1B2A3D' },
    fertilizer:  { bg:'#D9A62E' },
    harvest:     { bg:'#C1440E' },
    spraying:    { bg:'#5B6E44' },
    other:       { bg:'#5B6B7C' },
  }
  const seedRows = SEED_PRICES.filter(p=>seedFilter==='all'||p.cat===seedFilter)

  const QUICK = [
    {to:'/ai',icon:Cpu,key:'ai_advisory'},
    {to:'/jobs',icon:Briefcase,key:'jobs'},
    {to:'/workers',icon:HardHat,key:'workers'},
    {to:'/equipment',icon:Tractor,key:'equipment'},
    {to:'/marketplace',icon:ShoppingCart,key:'marketplace'},
    {to:'/schemes',icon:Landmark,key:'schemes'},
    {to:'/calendar',icon:CalendarDays,key:'calendar'},
    {to:'/community',icon:Sprout,key:'community'},
  ]

  return (
    <Layout>
      <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>

      {/* ── Hero — the register's cover page ─────────────────────────────── */}
      <div className="rounded-md overflow-hidden mb-8 bg-[#1B2A3D]">
        <div className="px-8 pt-8 pb-5">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-[#8A97A6] text-xs font-medium mb-1 font-mono">
                {clock.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})} · {clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </div>
              <h1 className="font-display text-4xl font-bold text-white mb-2">
                {greeting}, {user?.name?.split(' ')[0]}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#1B2A3D] bg-[#D9A62E] px-3 py-1 rounded font-semibold capitalize">{t(user?.role)||user?.role}</span>
                {user?.state&&(
                  <span className="text-xs text-[#B7C0CC] bg-white/10 px-3 py-1 rounded flex items-center gap-1">
                    <MapPin size={12} strokeWidth={2} />{user.state}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="plaque"><span className="plaque-value">{stats.platform_open_jobs??'—'}</span><span className="plaque-label">{t('open_jobs')}</span></div>
              <div className="plaque"><span className="plaque-value">{stats.platform_available_workers??'—'}</span><span className="plaque-label">{t('available_workers')}</span></div>
            </div>
          </div>
        </div>
        {prices.length>0&&(
          <div className="border-t border-white/10 px-8 py-2.5 bg-black/20 flex items-center gap-4">
            <span className="text-xs font-bold text-[#D9A62E] uppercase tracking-widest shrink-0 flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9A62E] animate-pulse"/>Live
            </span>
            <Ticker prices={prices}/>
          </div>
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isFarmer?<>
          <Plaque Icon={Briefcase}     label={t('jobs_posted')}      value={stats.jobs_posted}           accent="#D9A62E" spark={sp.a}/>
          <Plaque Icon={ClipboardList} label={t('applications')}     value={stats.applications_received} accent="#5B6E44" spark={sp.b}/>
          <Plaque Icon={Tractor}       label={t('equipment_booked')} value={stats.equipment_booked}      accent="#C1440E" spark={sp.c}/>
          <Plaque Icon={Wallet}        label={t('total_spent')}      value={`₹${Number(stats.total_spent||0).toLocaleString('en-IN')}`} accent="#1B2A3D" spark={sp.d}/>
        </>:<>
          <Plaque Icon={ClipboardList} label={t('jobs_applied')}  value={stats.jobs_applied}  accent="#D9A62E" spark={sp.a}/>
          <Plaque Icon={CheckCircle2}  label={t('accepted')}      value={stats.jobs_accepted} accent="#5B6E44" spark={sp.b}/>
          <Plaque Icon={Wallet}        label={t('earned')}        value={`₹${Number(stats.total_earned||0).toLocaleString('en-IN')}`} accent="#C1440E" spark={sp.d}/>
          <Plaque Icon={Star}          label={t('rating')}        value={stats.rating||'New'} accent="#1B2A3D"/>
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
            {QUICK.map(({to,icon:Icon,key})=>(
              <Link key={to} to={to}
                className="flex flex-col items-center gap-2 py-4 rounded-md border border-[#DFD8BF] bg-[#FBF9F1] hover:border-[#1B2A3D] transition-colors group">
                <Icon size={22} strokeWidth={1.5} className="text-[#1B2A3D] group-hover:text-[#D9A62E] transition-colors" />
                <span className="text-xs font-semibold text-center leading-tight text-[#2A2A28]">{t(key)}</span>
              </Link>
            ))}
          </div>

          {/* Recent jobs — as ledger entries */}
          <div className="flex items-center justify-between mb-1">
            <div className="section-title mb-0 border-b-0">{t('recent_jobs')}</div>
            <Link to="/jobs" className="text-[#1B2A3D] text-xs font-semibold hover:underline flex items-center gap-1">{t('view_all')} <ArrowRight size={12} /></Link>
          </div>
          <div className="card !pt-1">
            {jobs.length===0&&<div className="text-center py-8 text-[#5B6B7C] text-sm">{t('no_jobs')}</div>}
            {jobs.map(job=>(
              <div key={job.id} className="ledger-row">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#1B2A3D] leading-tight">{job.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#5B6B7C] flex items-center gap-1"><MapPin size={11} />{job.location||job.state||'—'}</span>
                    <span className="badge bg-[#1B2A3D]/5 text-[#1B2A3D] text-xs capitalize">{job.job_type}</span>
                  </div>
                </div>
                <span className="font-mono font-semibold text-sm text-[#5B6E44] shrink-0">₹{job.wage_per_day}/d</span>
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
            <div className="section-title mb-0 border-b-0">{t('seed_prices')}</div>
            <div className="flex gap-1">
              {['all','grain','pulse','oilseed','cash'].map(c=>(
                <button key={c} onClick={()=>setSeedFilter(c)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all capitalize ${seedFilter===c?'bg-[#1B2A3D] text-white':'bg-[#FBF9F1] text-[#5B6B7C] hover:bg-white'}`}
                  style={seedFilter===c?{}:{border:'1px solid #DFD8BF'}}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#FBF9F1] rounded-md overflow-hidden border border-[#DFD8BF]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#DFD8BF]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#5B6B7C] uppercase tracking-wide">Crop</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-[#5B6B7C] uppercase tracking-wide">MSP ₹/q</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-[#5B6B7C] uppercase tracking-wide">Market</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-[#5B6B7C] uppercase tracking-wide">Global $/t</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-[#5B6B7C] uppercase tracking-wide">7d</th>
                </tr>
              </thead>
              <tbody>
                {seedRows.map((p,i)=>{
                  const live=vary(p.market,p.name)
                  const up=live>=p.msp
                  return (
                    <tr key={p.name} className="border-t border-[#DFD8BF]/60 hover:bg-white/60">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-[#1B2A3D]">{p.name}</div>
                        <span className="text-xs px-1.5 py-0.5 rounded capitalize font-medium" style={{ color:CAT_COLOR[p.cat], background:`${CAT_COLOR[p.cat]}15` }}>{p.cat}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#5B6B7C] tabular-nums font-mono">{p.msp.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-bold tabular-nums font-mono ${up?'text-[#5B6E44]':'text-[#C1440E]'}`}>{live.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#5B6B7C] text-xs tabular-nums font-mono">${p.world}</td>
                      <td className={`px-4 py-2.5 text-right text-xs font-bold font-mono flex items-center justify-end gap-1 ${p.trend.startsWith('-')?'text-[#C1440E]':'text-[#5B6E44]'}`}>
                        {p.trend.startsWith('-') ? <TrendingDown size={12} /> : <TrendingUp size={12} />}{p.trend}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-[#DFD8BF] text-xs text-[#5B6B7C]">
              Market above MSP in olive · below MSP in sindoor · Source: CACP / Agmarknet
            </div>
          </div>
        </div>

        {/* Right: Calendar + Community */}
        <div className="space-y-5">
          <div className="bg-[#FBF9F1] rounded-md overflow-hidden border border-[#DFD8BF]">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#DFD8BF]">
              <div className="section-title mb-0 border-b-0 flex items-center gap-1.5"><CalendarDays size={14} />{t('farm_schedule')}</div>
              <Link to="/calendar" className="text-[#1B2A3D] text-xs font-semibold hover:underline">{t('add_event')}</Link>
            </div>
            <div className="px-3">
              {events.length===0?(
                <div className="text-center py-6 text-[#5B6B7C] text-xs">
                  <CalendarDays size={24} strokeWidth={1.5} className="mx-auto mb-1 opacity-50" />
                  <div>{t('no_events')}</div>
                  <Link to="/calendar" className="text-[#1B2A3D] text-xs mt-1 inline-block font-semibold">{t('schedule_now')}</Link>
                </div>
              ):events.map(ev=>{
                const ec = evColor[ev.event_type]||evColor.other
                return (
                  <div key={ev.id} className="ledger-row">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background:ec.bg }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-[#1B2A3D] leading-tight">{ev.title}</div>
                      <div className="text-xs text-[#5B6B7C] capitalize mt-0.5">{ev.event_type}</div>
                    </div>
                    <div className="text-xs font-mono text-[#5B6B7C] shrink-0">{ev.event_date?.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-[#FBF9F1] rounded-md overflow-hidden border border-[#DFD8BF]">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#DFD8BF]">
              <div className="section-title mb-0 border-b-0 flex items-center gap-1.5"><Sprout size={14} />{t('community_posts')}</div>
              <Link to="/community" className="text-[#1B2A3D] text-xs font-semibold hover:underline flex items-center gap-1">{t('view_all')} <ArrowRight size={11} /></Link>
            </div>
            <div className="px-3">
              {posts.length===0?(
                <div className="text-center py-6 text-[#5B6B7C] text-xs">
                  <Sprout size={24} strokeWidth={1.5} className="mx-auto mb-1 opacity-50" />
                  <div>{t('no_posts')}</div>
                  <Link to="/community" className="text-[#1B2A3D] text-xs mt-1 inline-block font-semibold">{t('share_tip')}</Link>
                </div>
              ):posts.map(p=>(
                <div key={p.id} className="ledger-row">
                  <div className="w-7 h-7 rounded flex items-center justify-center text-[#1B2A3D] font-bold text-xs shrink-0 bg-[#D9A62E]/20">{p.author?.[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-[#1B2A3D] leading-tight truncate">{p.title}</div>
                    <div className="text-xs text-[#5B6B7C] mt-0.5">{p.author}</div>
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