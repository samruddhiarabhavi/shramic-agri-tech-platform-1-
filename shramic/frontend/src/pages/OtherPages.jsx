// ============================================================
//  Shramic Agri Tech — Remaining Pages (all in one file)
//  Pages: Equipment, Marketplace, Calendar, Schemes,
//         MarketPrices, Community, Payments, Profile
// ============================================================

import { useEffect, useState } from 'react'
import api from '../api.js'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../context/Langcontext.jsx'

// ─────────────────────────────────────────────────────────────
//  EQUIPMENT BOOKING
// ─────────────────────────────────────────────────────────────
const EQ_TYPES = ['tractor','harvester','rotavator','sprayer','thresher','other']
const STATES   = ['Andhra Pradesh','Assam','Bihar','Gujarat','Haryana','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Uttar Pradesh','West Bengal']

function BookModal({ eq, onClose, onBooked }) {
  const [form, setForm] = useState({ start_date:'', end_date:'', notes:'' })
  const [loading, setLoading] = useState(false)
  const days = form.start_date && form.end_date
    ? Math.max(1, Math.ceil((new Date(form.end_date)-new Date(form.start_date))/86400000)+1) : 0
  const total = days * (eq.rent_per_day || 0)

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try { await api.post(`/equipment/${eq.id}/book`, form); onBooked(); onClose() }
    catch(err) { alert(err.response?.data?.error || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-display font-bold">Book {eq.name}</h3>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start Date</label>
              <input className="input" type="date" required value={form.start_date}
                onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} /></div>
            <div><label className="label">End Date</label>
              <input className="input" type="date" required value={form.end_date}
                onChange={e=>setForm(f=>({...f,end_date:e.target.value}))} /></div>
          </div>
          {days > 0 && (
            <div className="bg-green-50 rounded-xl p-3 text-sm">
              <div className="text-gray-600">{days} day(s) × ₹{eq.rent_per_day}/day</div>
              <div className="text-primary font-bold text-lg">Total: ₹{total}</div>
            </div>
          )}
          <textarea className="input h-16" placeholder="Notes for owner…"
            value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Booking…' : `Confirm Booking ₹${total}`}
          </button>
        </form>
      </div>
    </div>
  )
}

export function EquipmentPage() {
  const { user } = useAuth()
  const [list, setList]       = useState([])
  const [bookings, setBookings] = useState([])
  const [filter, setFilter]   = useState({ type:'', state:'' })
  const [booking, setBooking] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name:'', type:'tractor', description:'', rent_per_day:'', location:'', state:'' })

  const load = () => {
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filter).filter(([,v])=>v))).toString()
    api.get(`/equipment?${p}`).then(r=>setList(r.data))
    api.get('/bookings/my').then(r=>setBookings(r.data))
  }
  useEffect(()=>load(),[filter])

  const addEquipment = async e => {
    e.preventDefault()
    await api.post('/equipment', {...addForm, rent_per_day:+addForm.rent_per_day})
    setShowAdd(false)
    load()
  }

  return (
    <Layout title="🚜 Equipment Booking">
      <div className="flex gap-3 mb-6 flex-wrap">
        <select className="input w-40" value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))}>
          <option value="">All Types</option>
          {EQ_TYPES.map(t=><option key={t} className="capitalize">{t}</option>)}
        </select>
        <select className="input w-48" value={filter.state} onChange={e=>setFilter(f=>({...f,state:e.target.value}))}>
          <option value="">All States</option>
          {STATES.map(s=><option key={s}>{s}</option>)}
        </select>
        <div className="flex-1"/>
        <button onClick={()=>setShowAdd(true)} className="btn-primary">+ List Equipment</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {list.map(eq=>(
          <div key={eq.id} className="card hover:shadow-md transition-all">
            <div className="text-3xl mb-3">{eq.type==='tractor'?'🚜':eq.type==='harvester'?'🌾':eq.type==='sprayer'?'💧':'⚙️'}</div>
            <div className="font-semibold text-gray-900 mb-0.5">{eq.name}</div>
            <div className="text-sm text-gray-500 mb-2">{eq.owner_name} • {eq.location}</div>
            <span className="badge bg-blue-100 text-blue-700 capitalize mb-3">{eq.type}</span>
            {eq.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{eq.description}</p>}
            <div className="flex items-center justify-between">
              <span className="text-primary font-bold">₹{eq.rent_per_day}/day</span>
              {user?.role === 'farmer' && (
                <button onClick={()=>setBooking(eq)} className="btn-primary text-sm py-1.5 px-4">Book</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {bookings.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-gray-800 mb-4">My Bookings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map(b=>(
              <div key={b.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-semibold">{b.equipment_name}</div>
                  <div className="text-xs text-gray-400">{b.start_date?.slice(0,10)} — {b.end_date?.slice(0,10)}</div>
                  <span className={`badge mt-1 ${b.status==='confirmed'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{b.status}</span>
                </div>
                <div className="text-primary font-bold">₹{b.total_amount}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {booking && <BookModal eq={booking} onClose={()=>setBooking(null)} onBooked={load} />}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-display font-bold">List Your Equipment</h3>
              <button onClick={()=>setShowAdd(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={addEquipment} className="p-5 space-y-4">
              <div><label className="label">Equipment Name</label>
                <input className="input" placeholder="e.g. Mahindra 575 DI" required
                  value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Type</label>
                  <select className="input" value={addForm.type} onChange={e=>setAddForm(f=>({...f,type:e.target.value}))}>
                    {EQ_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select></div>
                <div><label className="label">Rent/day (₹)</label>
                  <input className="input" type="number" required value={addForm.rent_per_day}
                    onChange={e=>setAddForm(f=>({...f,rent_per_day:e.target.value}))} /></div>
              </div>
              <div><label className="label">Location</label>
                <input className="input" value={addForm.location} onChange={e=>setAddForm(f=>({...f,location:e.target.value}))} /></div>
              <div><label className="label">State</label>
                <select className="input" value={addForm.state} onChange={e=>setAddForm(f=>({...f,state:e.target.value}))}>
                  <option value="">Select</option>{STATES.map(s=><option key={s}>{s}</option>)}
                </select></div>
              <button type="submit" className="btn-primary w-full">List Equipment</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────
//  MARKETPLACE
// ─────────────────────────────────────────────────────────────
const CATEGORIES = ['seeds','fertilizer','pesticide','nursery','tools','other']

export function MarketplacePage() {
  const [items, setItems]   = useState([])
  const [filter, setFilter] = useState({ category:'', state:'' })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]     = useState({ title:'', category:'seeds', description:'', price:'', unit:'kg', stock:'', state:'', contact:'' })

  const load = () => {
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filter).filter(([,v])=>v))).toString()
    api.get(`/marketplace?${p}`).then(r=>setItems(r.data))
  }
  useEffect(()=>load(),[filter])

  const addItem = async e => {
    e.preventDefault()
    await api.post('/marketplace', {...form, price:+form.price, stock:+form.stock})
    setShowAdd(false); load()
  }

  const catIcon = c => ({'seeds':'🌱','fertilizer':'🧪','pesticide':'🧴','nursery':'🌿','tools':'🔧','other':'📦'}[c]||'📦')

  return (
    <Layout title="🛒 Nursery & Input Marketplace">
      <div className="flex gap-3 mb-6 flex-wrap">
        <select className="input w-40" value={filter.category} onChange={e=>setFilter(f=>({...f,category:e.target.value}))}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c} className="capitalize">{c}</option>)}
        </select>
        <select className="input w-48" value={filter.state} onChange={e=>setFilter(f=>({...f,state:e.target.value}))}>
          <option value="">All States</option>
          {STATES.map(s=><option key={s}>{s}</option>)}
        </select>
        <div className="flex-1"/>
        <button onClick={()=>setShowAdd(true)} className="btn-primary">+ Add Listing</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(item=>(
          <div key={item.id} className="card hover:shadow-md transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-2xl shrink-0">{catIcon(item.category)}</div>
              <div>
                <div className="font-semibold text-sm">{item.title}</div>
                <div className="text-xs text-gray-400">{item.seller_name} • {item.state}</div>
              </div>
            </div>
            {item.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>}
            <div className="flex items-center justify-between">
              <div><span className="text-primary font-bold">₹{item.price}</span><span className="text-gray-400 text-xs">/{item.unit}</span></div>
              {item.contact && <a href={`tel:${item.contact}`} className="text-xs text-primary hover:underline">📞 Contact</a>}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-display font-bold">New Listing</h3>
              <button onClick={()=>setShowAdd(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={addItem} className="p-5 space-y-4">
              <div><label className="label">Title</label>
                <input className="input" required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select></div>
                <div><label className="label">Price (₹)</label>
                  <input className="input" type="number" required value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Unit</label>
                  <input className="input" placeholder="kg, bag, litre" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} /></div>
                <div><label className="label">Stock</label>
                  <input className="input" type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} /></div>
              </div>
              <div><label className="label">Contact / WhatsApp</label>
                <input className="input" value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} /></div>
              <div><label className="label">State</label>
                <select className="input" value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))}>
                  <option value="">Select</option>{STATES.map(s=><option key={s}>{s}</option>)}
                </select></div>
              <div><label className="label">Description</label>
                <textarea className="input h-16" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
              <button type="submit" className="btn-primary w-full">Add Listing</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────
//  AGRICULTURE CALENDAR
// ─────────────────────────────────────────────────────────────
const EVENT_TYPES = ['sowing','irrigation','fertilizer','harvest','spraying','other']
const EVENT_COLORS = { sowing:'bg-green-100 text-green-700 border-green-200', irrigation:'bg-blue-100 text-blue-700 border-blue-200',
  fertilizer:'bg-yellow-100 text-yellow-700 border-yellow-200', harvest:'bg-orange-100 text-orange-700 border-orange-200',
  spraying:'bg-purple-100 text-purple-700 border-purple-200', other:'bg-gray-100 text-gray-700 border-gray-200' }

export function CalendarPage() {
  const [events, setEvents] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]     = useState({ title:'', event_type:'sowing', event_date:'', notes:'' })

  const load = () => api.get('/calendar').then(r=>setEvents(r.data))
  useEffect(()=>load(),[])

  const add = async e => {
    e.preventDefault()
    await api.post('/calendar', form)
    setShowAdd(false); setForm({title:'',event_type:'sowing',event_date:'',notes:''}); load()
  }
  const del = async id => { await api.delete(`/calendar/${id}`); load() }

  const grouped = events.reduce((acc,ev)=>{
    const m = ev.event_date?.slice(0,7)||'Unknown'
    if(!acc[m]) acc[m]=[]
    acc[m].push(ev)
    return acc
  },{})

  return (
    <Layout title="📅 Agriculture Calendar">
      <div className="flex justify-end mb-6">
        <button onClick={()=>setShowAdd(true)} className="btn-primary">+ Add Event</button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">📅</div>
          <div>No events yet. Add your farming schedule!</div>
        </div>
      ) : Object.entries(grouped).sort().map(([month, evs])=>(
        <div key={month} className="mb-8">
          <h2 className="font-display font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">
            {new Date(month+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evs.map(ev=>(
              <div key={ev.id} className={`card border-2 ${EVENT_COLORS[ev.event_type]}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm">{ev.title}</div>
                    <div className="text-xs opacity-75 mt-0.5">{ev.event_date?.slice(0,10)}</div>
                    <span className={`badge mt-1.5 capitalize ${EVENT_COLORS[ev.event_type]}`}>{ev.event_type}</span>
                    {ev.notes && <p className="text-xs mt-2 opacity-75">{ev.notes}</p>}
                  </div>
                  <button onClick={()=>del(ev.id)} className="text-gray-300 hover:text-red-400 text-sm ml-2">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-display font-bold">Add Calendar Event</h3>
              <button onClick={()=>setShowAdd(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={add} className="p-5 space-y-4">
              <div><label className="label">Event Title</label>
                <input className="input" required placeholder="e.g. Sow wheat seeds" value={form.title}
                  onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Type</label>
                  <select className="input" value={form.event_type} onChange={e=>setForm(f=>({...f,event_type:e.target.value}))}>
                    {EVENT_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select></div>
                <div><label className="label">Date</label>
                  <input className="input" type="date" required value={form.event_date}
                    onChange={e=>setForm(f=>({...f,event_date:e.target.value}))} /></div>
              </div>
              <div><label className="label">Notes</label>
                <textarea className="input h-16" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
              <button type="submit" className="btn-primary w-full">Add Event</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────
//  GOVERNMENT SCHEMES
// ─────────────────────────────────────────────────────────────
export function SchemesPage() {
  const [schemes, setSchemes] = useState([])
  const { t } = useLang()
  useEffect(()=>{ api.get('/schemes').then(r=>setSchemes(r.data)) },[])
  return (
    <Layout>
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">🏛️ {t('schemes')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {schemes.map(s=>(
          <div key={s.id} className="card border-l-4 border-green-600 hover:shadow-md transition-all">
            <div className="font-display font-bold text-gray-900 mb-1">{s.name}</div>
            <div className="text-xs text-gray-400 mb-2">{s.ministry}</div>
            <p className="text-sm text-gray-600 mb-3">{s.description}</p>
            <div className="flex items-center justify-between">
              <span className="badge bg-green-100 text-green-700">💰 {s.benefit}</span>
              {s.link&&<a href={s.link} target="_blank" rel="noreferrer" className="text-xs text-green-700 hover:underline font-semibold">{t('apply')}</a>}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────
//  MARKET PRICES
// ─────────────────────────────────────────────────────────────
export function MarketPricePage() {
  const [data, setData] = useState({ prices:[], updated_at:null, source:'indicative' })
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/market-prices').then(r=>setData(r.data)).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[])

  return (
    <Layout title="📈 Agri Market Prices">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {data.updated_at && (
            <span className="text-xs text-gray-400">Updated: {new Date(data.updated_at).toLocaleTimeString('en-IN')}</span>
          )}
          <span className={`badge text-xs ${data.source==='live' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {data.source==='live' ? '🟢 Live · Agmarknet' : '🟡 Indicative · Daily updated'}
          </span>
        </div>
        <button onClick={load} disabled={loading}
          className="btn-outline text-sm py-1.5 px-4">
          {loading ? '⏳ Loading…' : '↻ Refresh'}
        </button>
      </div>

      <div className="card p-0 overflow-hidden max-w-3xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs border-b">
              <th className="text-left px-5 py-3.5 font-semibold">Crop</th>
              <th className="text-right px-5 py-3.5 font-semibold">Modal (₹/q)</th>
              <th className="text-right px-5 py-3.5 font-semibold">Min</th>
              <th className="text-right px-5 py-3.5 font-semibold">Max</th>
              <th className="text-right px-5 py-3.5 font-semibold">Change</th>
              <th className="text-right px-5 py-3.5 font-semibold">Market</th>
            </tr>
          </thead>
          <tbody>
            {data.prices.map((p,i)=>(
              <tr key={p.crop} className={`border-t border-gray-50 hover:bg-gray-50 transition-colors ${i%2===1?'bg-gray-50/50':''}`}>
                <td className="px-5 py-3 font-semibold text-gray-800">{p.crop}</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums">{p.price?.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3 text-right text-gray-400 text-xs tabular-nums">{p.min?.toLocaleString('en-IN') || '—'}</td>
                <td className="px-5 py-3 text-right text-gray-400 text-xs tabular-nums">{p.max?.toLocaleString('en-IN') || '—'}</td>
                <td className={`px-5 py-3 text-right text-xs font-bold ${p.change?.startsWith('-')?'text-red-500':'text-green-600'}`}>
                  {p.change?.startsWith('-') ? '▼' : '▲'} {p.change}
                </td>
                <td className="px-5 py-3 text-right text-gray-400 text-xs">{p.market}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-4">
        Source: Agmarknet / data.gov.in · Prices in ₹ per quintal (100 kg)
      </p>
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────
//  COMMUNITY
// ─────────────────────────────────────────────────────────────
const POST_CATS = ['tip','disease','scheme','market','general']

export function CommunityPage() {
  const [posts, setPosts]   = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]     = useState({ title:'', content:'', video_url:'', category:'general' })

  const load = () => api.get('/community').then(r=>setPosts(r.data))
  useEffect(()=>load(),[])

  const add = async e => {
    e.preventDefault()
    await api.post('/community', form)
    setShowAdd(false); setForm({title:'',content:'',video_url:'',category:'general'}); load()
  }

  const catColor = c => ({tip:'bg-green-100 text-green-700',disease:'bg-red-100 text-red-700',
    scheme:'bg-blue-100 text-blue-700',market:'bg-orange-100 text-orange-700',general:'bg-gray-100 text-gray-600'}[c]||'bg-gray-100 text-gray-600')

  return (
    <Layout title="🌱 Community Knowledge">
      <div className="flex justify-end mb-6">
        <button onClick={()=>setShowAdd(true)} className="btn-primary">+ Share Tip</button>
      </div>

      <div className="max-w-2xl space-y-5">
        {posts.map(p=>(
          <div key={p.id} className="card">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {p.author?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{p.title}</div>
                <div className="text-xs text-gray-400">{p.author} • {new Date(p.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              <span className={`badge shrink-0 capitalize ${catColor(p.category)}`}>{p.category}</span>
            </div>
            {p.content && <p className="text-sm text-gray-600 leading-relaxed mb-3">{p.content}</p>}
            {p.video_url && (
              <a href={p.video_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-primary hover:underline">
                ▶ Watch video tutorial
              </a>
            )}
          </div>
        ))}
        {posts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🌱</div>
            <div>No posts yet. Be the first to share!</div>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-display font-bold">Share Farming Knowledge</h3>
              <button onClick={()=>setShowAdd(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={add} className="p-5 space-y-4">
              <div><label className="label">Title</label>
                <input className="input" required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></div>
              <div><label className="label">Category</label>
                <select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {POST_CATS.map(c=><option key={c}>{c}</option>)}
                </select></div>
              <div><label className="label">Content</label>
                <textarea className="input h-28" value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} /></div>
              <div><label className="label">Video URL (optional)</label>
                <input className="input" type="url" placeholder="https://youtube.com/…" value={form.video_url}
                  onChange={e=>setForm(f=>({...f,video_url:e.target.value}))} /></div>
              <button type="submit" className="btn-primary w-full">Publish Post</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────
//  PAYMENTS
// ─────────────────────────────────────────────────────────────
export function PaymentsPage() {
  const [payments, setPayments] = useState([])
  useEffect(()=>{ api.get('/payments/my').then(r=>setPayments(r.data)) },[])

  const typeColor = t=>({worker_wage:'bg-blue-100 text-blue-700',equipment_booking:'bg-orange-100 text-orange-700',
    consultation:'bg-purple-100 text-purple-700',marketplace:'bg-green-100 text-green-700'}[t]||'bg-gray-100 text-gray-600')
  const statusColor = s=>({success:'text-green-600',failed:'text-red-500',pending:'text-yellow-600',refunded:'text-blue-500'}[s]||'')

  return (
    <Layout title="💳 Payment History">
      <div className="max-w-2xl">
        {payments.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">💳</div>
            <div>No transactions yet.</div>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500">
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-right px-5 py-3">Amount</th>
                  <th className="text-right px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p,i)=>(
                  <tr key={p.id} className={`border-t border-gray-50 ${i%2===1?'bg-gray-50/50':''}`}>
                    <td className="px-5 py-3">
                      <span className={`badge capitalize ${typeColor(p.type)}`}>{p.type.replace('_',' ')}</span>
                      {p.transaction_id && <div className="text-xs text-gray-300 mt-0.5">{p.transaction_id}</div>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">₹{p.amount}</td>
                    <td className={`px-5 py-3 text-right text-xs font-semibold capitalize ${statusColor(p.status)}`}>{p.status}</td>
                    <td className="px-5 py-3 text-right text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: user?.name||'', phone:'', location:'', state:'' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(()=>{
    api.get('/auth/me').then(r=>{
      setForm({ name:r.data.name||'', phone:r.data.phone||'', location:r.data.location||'', state:r.data.state||'' })
    })
  },[])

  const save = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      // Basic profile update — extend backend if needed
      setMsg('Profile saved (UI demo — add PUT /api/auth/me endpoint to persist)')
    } finally { setLoading(false) }
    setTimeout(()=>setMsg(''),3000)
  }

  return (
    <Layout title="👤 My Profile">
      <div className="max-w-lg">
        <div className="card mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-display font-bold text-xl">{user?.name}</div>
            <div className="text-sm text-gray-400 capitalize">{user?.role} · {user?.email}</div>
          </div>
        </div>

        <form onSubmit={save} className="card space-y-4">
          <h3 className="font-display font-bold">Edit Profile</h3>
          {msg && <div className="text-sm text-green-700 bg-green-50 p-3 rounded-xl">{msg}</div>}
          <div><label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <div><label className="label">Phone</label>
            <input className="input" type="tel" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
          <div><label className="label">Location</label>
            <input className="input" placeholder="Village / District" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} /></div>
          <div><label className="label">State</label>
            <select className="input" value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))}>
              <option value="">Select state</option>
              {STATES.map(s=><option key={s}>{s}</option>)}
            </select></div>
          <button type="submit" disabled={loading} className="btn-primary">{loading?'Saving…':'Save Changes'}</button>
        </form>
      </div>
    </Layout>
  )
}