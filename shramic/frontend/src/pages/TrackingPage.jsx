import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import api from '../api.js'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// Mock coordinates for Indian states (center points)
const STATE_COORDS = {
  'Karnataka':       [15.3173, 75.7139], 'Maharashtra':    [19.7515, 75.7139],
  'Punjab':          [31.1471, 75.3412], 'Haryana':        [29.0588, 76.0856],
  'Uttar Pradesh':   [26.8467, 80.9462], 'Gujarat':        [22.2587, 71.1924],
  'Tamil Nadu':      [11.1271, 78.6569], 'Andhra Pradesh': [15.9129, 79.7400],
  'Telangana':       [18.1124, 79.0193], 'West Bengal':    [22.9868, 87.8550],
  'Madhya Pradesh':  [22.9734, 78.6569], 'Rajasthan':      [27.0238, 74.2179],
  'Bihar':           [25.0961, 85.3131], 'Odisha':         [20.9517, 85.0985],
  'Assam':           [26.2006, 92.9376], 'Kerala':         [10.8505, 76.2711],
}

function MapView({ workers, userLocation }) {
  // Simple SVG map of India with worker dots
  // In production: replace with Google Maps or Leaflet
  const svgRef = useRef()

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-gray-100 overflow-hidden">
      {/* Map header */}
      <div className="bg-white/80 backdrop-blur px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-gray-700">Live Worker Locations</span>
        </div>
        <span className="text-xs text-gray-400">{workers.length} workers tracked</span>
      </div>

      {/* Mock map area */}
      <div className="relative h-80 flex items-center justify-center">
        {/* India outline SVG */}
        <svg viewBox="0 0 400 450" className="absolute inset-0 w-full h-full opacity-20">
          <path d="M200,20 L280,40 L320,80 L340,140 L380,180 L370,240 L340,280 L300,340 L260,400 L200,430 L140,400 L100,340 L60,280 L30,240 L20,180 L60,140 L80,80 L120,40 Z"
            fill="#2d6a4f" stroke="#2d6a4f" strokeWidth="2"/>
        </svg>

        {/* Worker location dots */}
        {workers.map((w, i) => {
          const coords = STATE_COORDS[w.state] || [20, 78]
          // Convert lat/lng to SVG coords (rough approximation for India)
          const x = ((coords[1] - 68) / (98 - 68)) * 360 + 20
          const y = ((37 - coords[0]) / (37 - 8)) * 380 + 35
          const skills = Array.isArray(w.skills) ? w.skills : JSON.parse(w.skills || '[]')
          return (
            <div key={w.id}
              style={{ left: `${(x/400)*100}%`, top: `${(y/450)*100}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10">
              <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow-lg animate-pulse" />
              {/* Tooltip */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl p-3 w-40 hidden group-hover:block z-20 border border-gray-100">
                <div className="font-semibold text-xs text-gray-900">{w.name}</div>
                <div className="text-xs text-gray-400">{w.state}</div>
                <div className="text-xs text-primary font-semibold mt-1">₹{w.daily_wage}/day</div>
                {skills.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1 capitalize">{skills.slice(0,2).join(', ')}</div>
                )}
                {w.phone && (
                  <a href={`tel:${w.phone}`} className="text-xs text-blue-600 mt-1 block">📞 {w.phone}</a>
                )}
              </div>
            </div>
          )
        })}

        {workers.length === 0 && (
          <div className="text-center text-gray-400 z-10">
            <div className="text-4xl mb-2">📍</div>
            <div className="text-sm">No workers sharing location</div>
            <div className="text-xs mt-1">Workers need to enable location sharing</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white/80 backdrop-blur px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> Available</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400" /> En route</div>
        <div className="text-gray-400">· Hover worker dot for details · Click to contact</div>
      </div>
    </div>
  )
}

function WorkerLocationSharer() {
  const [sharing, setSharing] = useState(false)
  const [status, setStatus] = useState('')
  const watchRef = useRef(null)
  const socketRef = useRef(null)

  const startSharing = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported on this device')
      return
    }
    socketRef.current = io('http://localhost:4000')
    setSharing(true)
    setStatus('📍 Sharing location…')

    watchRef.current = navigator.geolocation.watchPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          await api.patch('/workers/location', { lat, lng })
          setStatus(`📍 Location updated: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        } catch { }
      },
      err => setStatus(`Error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
  }

  const stopSharing = () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    if (socketRef.current) socketRef.current.disconnect()
    setSharing(false)
    setStatus('Location sharing stopped')
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="font-semibold text-gray-800 mb-3">📱 Share Your Location</div>
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">
        Enable location sharing so farmers can find and track you in real time.
        Your location is only visible to farmers when you're marked Available.
      </p>
      {status && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">{status}</div>
      )}
      <button
        onClick={sharing ? stopSharing : startSharing}
        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
          sharing ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'btn-primary'
        }`}>
        {sharing ? '⏹ Stop Sharing' : '▶ Start Sharing Location'}
      </button>
    </div>
  )
}

export default function TrackingPage() {
  const { user } = useAuth()
  const [workers, setWorkers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState({ skill:'', state:'' })
  const socketRef = useRef(null)

  const SKILLS = ['sowing','harvesting','irrigation','spraying','ploughing','transplanting']
  const STATES = ['Andhra Pradesh','Assam','Bihar','Gujarat','Haryana','Karnataka','Kerala',
    'Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Uttar Pradesh','West Bengal']

  const load = () => {
    setLoading(true)
    api.get('/workers?available=true').then(r => setWorkers(r.data || [])).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Connect socket for real-time updates
    socketRef.current = io('http://localhost:4000')
    socketRef.current.on('worker_availability_update', () => load())
    socketRef.current.on('worker_location_update', () => load())
    return () => socketRef.current?.disconnect()
  }, [])

  const filtered = workers.filter(w => {
    const skills = Array.isArray(w.skills) ? w.skills : JSON.parse(w.skills || '[]')
    const skillOk = !filter.skill || skills.includes(filter.skill)
    const stateOk = !filter.state || w.state === filter.state
    return skillOk && stateOk
  })

  return (
    <Layout title="📍 Live Worker Tracking">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map — full width on mobile, 2/3 on desktop */}
        <div className="lg:col-span-2 space-y-4">
          <MapView workers={filtered} />

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select className="input w-44" value={filter.skill} onChange={e=>setFilter(f=>({...f,skill:e.target.value}))}>
              <option value="">All Skills</option>
              {SKILLS.map(s=><option key={s} className="capitalize">{s}</option>)}
            </select>
            <select className="input w-48" value={filter.state} onChange={e=>setFilter(f=>({...f,state:e.target.value}))}>
              <option value="">All States</option>
              {STATES.map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={load} className="btn-outline text-sm px-4">↻ Refresh</button>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Worker self location share (only for workers) */}
          {user?.role === 'worker' && <WorkerLocationSharer />}

          {/* Available workers list */}
          <div className="bg-white border border-gray-100 rounded-2xl">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-sm text-gray-800">Available Workers</div>
              <span className="badge bg-green-100 text-green-700">{filtered.length} online</span>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <div className="text-3xl mb-2">👷</div>
                  <div className="text-sm">No available workers</div>
                </div>
              ) : filtered.map(w => {
                const skills = Array.isArray(w.skills) ? w.skills : JSON.parse(w.skills || '[]')
                return (
                  <div key={w.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {w.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">{w.name}</div>
                        <div className="text-xs text-gray-400">{w.state} · {w.experience_years}yr exp</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {skills.slice(0,2).map(s=>(
                            <span key={s} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-primary">₹{w.daily_wage||'—'}</div>
                        <div className="text-xs text-gray-400">/day</div>
                        {w.phone && (
                          <a href={`tel:${w.phone}`} className="text-xs text-blue-600 hover:underline block mt-1">📞</a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <div className="font-semibold mb-1">ℹ️ How tracking works</div>
            <ul className="text-xs space-y-1 text-amber-700 leading-relaxed">
              <li>· Workers tap "Start Sharing Location" on their phone</li>
              <li>· Their dot appears on the map in real time</li>
              <li>· Location updates every 10 seconds</li>
              <li>· Sharing stops when worker marks themselves unavailable</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  )
}