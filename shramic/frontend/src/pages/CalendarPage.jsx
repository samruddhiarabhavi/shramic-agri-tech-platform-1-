import { useEffect, useState } from 'react'
import api from '../api.js'
import Layout from '../components/Layout.jsx'
import { useLang } from '../context/Langcontext.jsx'

const EVENT_TYPES = ['sowing','irrigation','fertilizer','harvest','spraying','other']
const TYPE_META = {
  sowing:     {icon:'🌱',bg:'bg-emerald-500',light:'bg-emerald-50 text-emerald-700 border-emerald-200'},
  irrigation: {icon:'💧',bg:'bg-blue-500',   light:'bg-blue-50 text-blue-700 border-blue-200'},
  fertilizer: {icon:'🧪',bg:'bg-yellow-500', light:'bg-yellow-50 text-yellow-700 border-yellow-200'},
  harvest:    {icon:'🌾',bg:'bg-orange-500', light:'bg-orange-50 text-orange-700 border-orange-200'},
  spraying:   {icon:'💊',bg:'bg-purple-500', light:'bg-purple-50 text-purple-700 border-purple-200'},
  other:      {icon:'📌',bg:'bg-gray-400',   light:'bg-gray-50 text-gray-600 border-gray-200'},
}
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const SEASONAL_TIPS = {
  0:['Rabi crops (wheat, mustard) near maturity — monitor for diseases','Harvest chickpea and lentil in southern states'],
  1:['Harvest wheat in southern states','Apply potassium to standing rabi crops'],
  2:['Harvest wheat and mustard','Prepare for summer crop planting','Irrigate orchards before summer heat'],
  3:['Plant summer vegetables','Apply first irrigation to orchards','Prepare kharif seed stock'],
  4:['Pre-monsoon tillage and field preparation','Apply FYM/compost','Purchase kharif seeds — treat with Thiram'],
  5:['Kharif sowing begins (rice, maize, cotton)','Monitor for stem borer in early rice','Apply basal DAP at sowing'],
  6:['Weed management in kharif crops','First top dressing of urea in rice (30 DAT)','Scout for fall armyworm in maize'],
  7:['Active kharif growth — monitor irrigation','Blast in rice, blight in potato — scout now','Second dose of urea in rice'],
  8:['Rice panicle initiation — critical irrigation stage','Apply potash in cotton','Prepare rabi field — deep plowing'],
  9:['Kharif harvest begins — rice, maize, soybean','Rabi sowing starts — wheat, mustard, chickpea'],
  10:['Main rabi sowing month — wheat, barley, mustard','Apply basal DAP at wheat sowing'],
  11:['Apply first irrigation to wheat (CRI stage)','Monitor rabi crops for disease','Top dress urea on wheat'],
}

function AddModal({ onClose, onSaved, prefill, t }) {
  const [form, setForm] = useState({title:'',event_type:'sowing',event_date:prefill||new Date().toISOString().slice(0,10),notes:''})
  const [loading, setLoading] = useState(false)
  const meta = TYPE_META[form.event_type]
  const submit = async e => {
    e.preventDefault(); setLoading(true)
    try { await api.post('/calendar',form); onSaved(); onClose() }
    catch(err) { alert(err.response?.data?.error||'Error') }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg">{t('add_event_title')}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="label">{t('event_type')}</label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map(et=>{
                const m=TYPE_META[et]
                return (
                  <button type="button" key={et} onClick={()=>setForm(f=>({...f,event_type:et}))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium capitalize transition-all ${form.event_type===et?`border-green-600 ${m.light}`:'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <span className="text-xl">{m.icon}</span><span>{et}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div><label className="label">{t('event_title')} *</label>
            <input className="input" required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
          <div><label className="label">{t('date')} *</label>
            <input className="input" type="date" required value={form.event_date} onChange={e=>setForm(f=>({...f,event_date:e.target.value}))}/></div>
          <div><label className="label">Notes</label>
            <textarea className="input h-16 resize-none" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading?'…':`${meta.icon} ${t('add_event_title')}`}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MonthGrid({ year, month, events, onDayClick, onDelete }) {
  const first   = new Date(year,month,1).getDay()
  const daysInM = new Date(year,month+1,0).getDate()
  const today   = new Date()
  const byDay   = {}
  events.forEach(ev=>{
    const d=new Date(ev.event_date)
    if(d.getFullYear()===year&&d.getMonth()===month){
      const day=d.getDate(); if(!byDay[day]) byDay[day]=[]
      byDay[day].push(ev)
    }
  })
  const cells=[]
  for(let i=0;i<first;i++) cells.push(null)
  for(let d=1;d<=daysInM;d++) cells.push(d)
  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d=><div key={d} className="text-center text-xs font-bold text-gray-400 py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day,i)=>{
          if(!day) return <div key={`e${i}`}/>
          const isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day
          const evs=byDay[day]||[]
          const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          return (
            <div key={day} onClick={()=>onDayClick(dateStr)}
              className={`min-h-16 p-1.5 rounded-xl border cursor-pointer transition-all group ${isToday?'border-green-500 bg-green-50':'border-gray-100 hover:border-green-300 hover:bg-gray-50'}`}>
              <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday?'bg-green-600 text-white':'text-gray-700 group-hover:text-green-700'}`}>{day}</div>
              <div className="space-y-0.5">
                {evs.slice(0,3).map(ev=>{
                  const m=TYPE_META[ev.event_type]||TYPE_META.other
                  return <div key={ev.id} onClick={e=>{e.stopPropagation();onDelete(ev)}} title={`${ev.title} — click to delete`}
                    className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-70 transition-opacity ${m.light} border`}>{m.icon} {ev.title}</div>
                })}
                {evs.length>3&&<div className="text-xs text-gray-400 pl-1">+{evs.length-3}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { t } = useLang()
  const [events, setEvents]  = useState([])
  const [loading, setLoading]= useState(true)
  const [showAdd, setShowAdd]= useState(false)
  const [prefill, setPrefill]= useState('')
  const [view, setView]      = useState('calendar')
  const [filterType, setFilter]= useState('all')
  const today = new Date()
  const [navYear, setNavYear]  = useState(today.getFullYear())
  const [navMonth, setNavMonth]= useState(today.getMonth())

  const load = ()=>{ setLoading(true); api.get('/calendar').then(r=>setEvents(r.data||[])).finally(()=>setLoading(false)) }
  useEffect(()=>{ load() },[])

  const del = async ev=>{ if(!confirm(`Delete "${ev.title}"?`))return; await api.delete(`/calendar/${ev.id}`); load() }
  const onDayClick = d=>{ setPrefill(d); setShowAdd(true) }
  const prevMonth=()=>{ if(navMonth===0){setNavMonth(11);setNavYear(y=>y-1)}else setNavMonth(m=>m-1) }
  const nextMonth=()=>{ if(navMonth===11){setNavMonth(0);setNavYear(y=>y+1)}else setNavMonth(m=>m+1) }
  const goToday=()=>{ setNavYear(today.getFullYear()); setNavMonth(today.getMonth()) }

  const upcoming=events.filter(ev=>new Date(ev.event_date)>=today).sort((a,b)=>new Date(a.event_date)-new Date(b.event_date))
  const typeCounts=EVENT_TYPES.reduce((acc,t2)=>{ acc[t2]=events.filter(e=>e.event_type===t2).length; return acc },{})
  const filtered=(filterType==='all'?events:events.filter(e=>e.event_type===filterType)).sort((a,b)=>new Date(a.event_date)-new Date(b.event_date))
  const tips=SEASONAL_TIPS[navMonth]||[]

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">📅 {t('calendar')}</h1>
        <button onClick={()=>{setPrefill('');setShowAdd(true)}} className="btn-primary">+ {t('add_event_title')}</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[[events.length,t('total_events'),'text-green-700'],[upcoming.length,t('upcoming'),'text-blue-600'],[events.length-upcoming.length,t('done_events'),'text-orange-500'],[upcoming[0]?Math.max(0,Math.ceil((new Date(upcoming[0].event_date)-today)/86400000)):null,t('next_event'),'text-purple-600']].map(([v,l,c])=>(
          <div key={l} className="bg-white rounded-2xl p-4 text-center" style={{border:'1px solid rgba(0,0,0,0.05)'}}>
            <div className={`text-2xl font-display font-bold ${c}`}>{v===null?'—':v===0?t('today'):v===1?t('tomorrow'):`${v}d`}</div>
            <div className="text-xs text-gray-500 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {['calendar','list'].map(v=>(
                <button key={v} onClick={()=>setView(v)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${view===v?'bg-white shadow-sm text-green-700':'text-gray-500 hover:text-gray-700'}`}>
                  {v==='calendar'?`📅 ${t('calendar_view')}`:`📋 ${t('list_view')}`}
                </button>
              ))}
            </div>
            {view==='calendar'&&(
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:border-green-400 flex items-center justify-center text-gray-600">‹</button>
                <span className="font-semibold text-gray-800 min-w-40 text-center">{MONTHS[navMonth]} {navYear}</span>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:border-green-400 flex items-center justify-center text-gray-600">›</button>
                <button onClick={goToday} className="text-xs text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 font-medium">{t('today')}</button>
              </div>
            )}
            {view==='list'&&(
              <select className="input w-40" value={filterType} onChange={e=>setFilter(e.target.value)}>
                <option value="all">All Types</option>
                {EVENT_TYPES.map(tt=><option key={tt} value={tt} className="capitalize">{tt}</option>)}
              </select>
            )}
          </div>

          {view==='calendar'&&(
            <div className="bg-white rounded-2xl p-5" style={{border:'1px solid rgba(0,0,0,0.05)',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
              {loading?<div className="text-center py-16 text-gray-400">Loading…</div>
                :<MonthGrid year={navYear} month={navMonth} events={events} onDayClick={onDayClick} onDelete={del}/>}
              <p className="text-xs text-gray-400 text-center mt-4">{t('click_date')}</p>
            </div>
          )}

          {view==='list'&&(
            <div className="space-y-3">
              {filtered.length===0?<div className="text-center py-16 text-gray-400"><div className="text-5xl mb-3">📅</div><div>{t('no_events')}</div></div>
                :filtered.map(ev=>{
                  const meta=TYPE_META[ev.event_type]||TYPE_META.other
                  const isPast=new Date(ev.event_date)<today
                  const daysAway=Math.ceil((new Date(ev.event_date)-today)/86400000)
                  return (
                    <div key={ev.id} className={`bg-white rounded-2xl p-4 flex items-start gap-4 transition-all hover:shadow-sm ${isPast?'opacity-60':''}`} style={{border:'1px solid rgba(0,0,0,0.05)'}}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${meta.light} border`}>{meta.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{ev.title}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${meta.light}`}>{ev.event_type}</span>
                          <span className="text-xs text-gray-400">📅 {new Date(ev.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                          {!isPast&&<span className={`text-xs font-semibold ${daysAway===0?'text-red-500':daysAway<=3?'text-orange-500':'text-gray-400'}`}>
                            {daysAway===0?`🔴 ${t('today')}`:daysAway===1?`🟡 ${t('tomorrow')}`:`in ${daysAway} days`}
                          </span>}
                          {isPast&&<span className="text-xs text-gray-400">✓ Done</span>}
                        </div>
                        {ev.notes&&<p className="text-xs text-gray-500 mt-1">{ev.notes}</p>}
                      </div>
                      <button onClick={()=>del(ev)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">🗑</button>
                    </div>
                  )
                })
              }
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:flex flex-col gap-5 w-64 shrink-0">
          <div className="bg-white rounded-2xl p-4" style={{border:'1px solid rgba(0,0,0,0.05)'}}>
            <div className="section-title">⏰ {t('upcoming_events')}</div>
            {upcoming.length===0?<p className="text-xs text-gray-400">{t('no_events')}</p>:(
              <div className="space-y-2">
                {upcoming.slice(0,6).map(ev=>{
                  const meta=TYPE_META[ev.event_type]||TYPE_META.other
                  const d=Math.ceil((new Date(ev.event_date)-today)/86400000)
                  return (
                    <div key={ev.id} className={`flex items-center gap-2.5 p-2 rounded-xl ${meta.light} border`}>
                      <span className="text-base shrink-0">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{ev.title}</div>
                        <div className="text-xs opacity-70">{d===0?t('today'):d===1?t('tomorrow'):`${d}d`}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4" style={{border:'1px solid rgba(0,0,0,0.05)'}}>
            <div className="section-title">📊 {t('by_type')}</div>
            <div className="space-y-2">
              {EVENT_TYPES.map(et=>{
                const meta=TYPE_META[et]; const cnt=typeCounts[et]||0
                const pct=events.length>0?Math.round(cnt/events.length*100):0
                return (
                  <div key={et} className="flex items-center gap-2">
                    <span className="text-sm shrink-0">{meta.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5"><span className="text-xs text-gray-600 capitalize">{et}</span><span className="text-xs font-semibold text-gray-500">{cnt}</span></div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${meta.bg}`} style={{width:`${pct}%`}}/></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4">
            <div className="font-semibold text-green-800 text-sm mb-3">🌿 {MONTHS[navMonth]} Tips</div>
            <div className="space-y-2">
              {tips.map((tip,i)=><div key={i} className="flex gap-2 text-xs text-green-700 leading-relaxed"><span className="font-bold shrink-0 mt-0.5">·</span><span>{tip}</span></div>)}
            </div>
          </div>
        </div>
      </div>

      {showAdd&&<AddModal onClose={()=>setShowAdd(false)} onSaved={load} prefill={prefill} t={t}/>}
    </Layout>
  )
}