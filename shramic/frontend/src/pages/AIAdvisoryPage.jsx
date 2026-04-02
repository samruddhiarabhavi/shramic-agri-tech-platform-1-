import { useState } from 'react'
import Layout from '../components/Layout.jsx'
import api from '../api.js'

// ── Crop Recommendation ────────────────────────────────────────────────────────
function CropAdvisor() {
  const [form, setForm] = useState({ N:'',P:'',K:'',temperature:'',humidity:'',ph:'',rainfall:'' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/ai/crop-recommend', {
        N: +form.N, P: +form.P, K: +form.K,
        temperature: +form.temperature, humidity: +form.humidity,
        ph: +form.ph, rainfall: +form.rainfall
      })
      setResult(data)
    } catch(err) { setError(err.response?.data?.error || 'AI service unavailable') }
    finally { setLoading(false) }
  }

  const FIELDS = [
    { k:'N',           label:'Nitrogen (N)',     unit:'mg/kg', placeholder:'90' },
    { k:'P',           label:'Phosphorus (P)',   unit:'mg/kg', placeholder:'42' },
    { k:'K',           label:'Potassium (K)',    unit:'mg/kg', placeholder:'43' },
    { k:'temperature', label:'Temperature',      unit:'°C',    placeholder:'25' },
    { k:'humidity',    label:'Humidity',         unit:'%',     placeholder:'80' },
    { k:'ph',          label:'Soil pH',          unit:'',      placeholder:'6.5' },
    { k:'rainfall',    label:'Rainfall',         unit:'mm',    placeholder:'200' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(({k,label,unit,placeholder}) => (
            <div key={k}>
              <label className="label">{label} {unit && <span className="normal-case">({unit})</span>}</label>
              <input className="input" type="number" step="any" placeholder={placeholder}
                required value={form[k]} onChange={set(k)} />
            </div>
          ))}
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? '⏳ Analysing…' : '🌾 Get Crop Recommendation'}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="text-5xl mb-3 text-center">🌱</div>
            <div className="text-center">
              <div className="text-2xl font-display font-bold text-primary capitalize">{result.recommended_crop}</div>
              <div className="text-sm text-gray-500 mt-1">Recommended crop</div>
              <div className="mt-3 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-semibold">
                {result.confidence}% confidence
              </div>
            </div>
          </div>
          {result.alternatives?.length > 0 && (
            <div className="card">
              <div className="text-sm font-semibold text-gray-600 mb-3">Alternatives</div>
              <div className="space-y-2">
                {result.alternatives.map(a => (
                  <div key={a.crop} className="flex items-center justify-between">
                    <span className="capitalize text-sm">{a.crop}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-primary rounded-full" style={{width:`${a.confidence}%`}} />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{a.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Disease Detection ─────────────────────────────────────────────────────────
function DiseaseDetector() {
  const [image, setImage]   = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setResult(null)
    setPreview(URL.createObjectURL(file))
  }

  const submit = async e => {
    e.preventDefault()
    if (!image) return
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', image)
      const { data } = await api.post('/ai/disease-detect', fd, { headers:{'Content-Type':'multipart/form-data'} })
      setResult(data)
    } catch(err) { setError(err.response?.data?.error || 'AI service unavailable') }
    finally { setLoading(false) }
  }

  const severityColor = s => s==='High'?'bg-red-100 text-red-700':s==='Medium'?'bg-orange-100 text-orange-700':'bg-green-100 text-green-700'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <label className="block">
          <div className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
            ${preview ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary'}`}>
            {preview
              ? <img src={preview} alt="plant" className="mx-auto max-h-48 rounded-xl object-contain" />
              : <>
                  <div className="text-5xl mb-3">📷</div>
                  <div className="text-gray-500 text-sm">Click to upload a plant leaf photo</div>
                  <div className="text-gray-400 text-xs mt-1">JPG, PNG up to 10MB</div>
                </>
            }
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </label>
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}
        <button onClick={submit} disabled={!image||loading} className="btn-primary w-full py-3">
          {loading ? '⏳ Detecting…' : '🔍 Detect Disease'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-lg font-display font-bold text-gray-900">{result.plant}</div>
                <div className="text-primary font-semibold">{result.disease?.replace(/_/g,' ')}</div>
              </div>
              <span className={`badge ${severityColor(result.severity)}`}>{result.severity} severity</span>
            </div>
            <div className="text-sm text-gray-500 mb-1">Confidence: <strong>{result.confidence}%</strong></div>
          </div>
          <div className="card border-l-4 border-accent">
            <div className="font-semibold text-sm text-gray-700 mb-2">💊 Treatment Recommendation</div>
            <p className="text-sm text-gray-600 leading-relaxed">{result.treatment}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Soil & Yield Advisor ───────────────────────────────────────────────────────
const SEASONS = ['Kharif','Rabi','Whole Year','Summer','Autumn','Winter']
const STATES  = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Gujarat','Haryana','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu',
  'Telangana','Uttar Pradesh','Uttarakhand','West Bengal']

function SoilAdvisor() {
  const [form, setForm] = useState({ crop:'Rice', season:'Kharif', state:'Karnataka', area:'100', fertilizer:'500', pesticide:'10' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/ai/soil-recommend', {
        ...form, area: +form.area, fertilizer: +form.fertilizer, pesticide: +form.pesticide
      })
      setResult(data)
    } catch(err) { setError(err.response?.data?.error || 'AI service unavailable') }
    finally { setLoading(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Crop</label>
          <input className="input" value={form.crop} onChange={set('crop')} placeholder="e.g. Rice, Wheat" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Season</label>
            <select className="input" value={form.season} onChange={set('season')}>
              {SEASONS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">State</label>
            <select className="input" value={form.state} onChange={set('state')}>
              {STATES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Area (ha)</label>
            <input className="input" type="number" step="any" value={form.area} onChange={set('area')} />
          </div>
          <div>
            <label className="label">Fertilizer (kg)</label>
            <input className="input" type="number" step="any" value={form.fertilizer} onChange={set('fertilizer')} />
          </div>
          <div>
            <label className="label">Pesticide (kg)</label>
            <input className="input" type="number" step="any" value={form.pesticide} onChange={set('pesticide')} />
          </div>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? '⏳ Analysing…' : '🧪 Get Soil & Yield Analysis'}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-orange-200 text-center">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-3xl font-display font-bold text-gray-900">
              {result.predicted_yield} <span className="text-base font-normal text-gray-400">t/ha</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">Predicted Yield</div>
          </div>
          <div className="card border-l-4 border-primary">
            <div className="font-semibold text-sm mb-1">🌿 Fertilizer Suggestion</div>
            <p className="text-sm text-gray-600">{result.fertilizer_suggestion}</p>
          </div>
          <div className="card border-l-4 border-blue-400">
            <div className="font-semibold text-sm mb-1">💡 Advisory</div>
            <p className="text-sm text-gray-600">{result.advice}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main AI Page ───────────────────────────────────────────────────────────────
const TABS = [
  { id:'crop',    icon:'🌾', label:'Crop Recommendation' },
  { id:'disease', icon:'🔬', label:'Disease Detection' },
  { id:'soil',    icon:'🧪', label:'Soil & Yield' },
]

export default function AIAdvisoryPage() {
  const [tab, setTab] = useState('crop')
  return (
    <Layout title="🤖 AI Agricultural Advisory">
      <div className="max-w-4xl mx-auto">
        {/* Tab switcher */}
        <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-2xl w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                ${tab===t.id ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="card">
          {tab === 'crop'    && <CropAdvisor />}
          {tab === 'disease' && <DiseaseDetector />}
          {tab === 'soil'    && <SoilAdvisor />}
        </div>
      </div>
    </Layout>
  )
}
