import { useState } from 'react'
import api from '../api.js'
import Layout from '../components/Layout.jsx'
import { useLang } from '../context/Langcontext.jsx'

const SEASONS = ['Kharif','Rabi','Whole Year','Summer','Autumn','Winter']
const STATES  = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Gujarat','Haryana','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu',
  'Telangana','Uttar Pradesh','Uttarakhand','West Bengal']

function CropAdvisor({ t }) {
  const [form, setForm] = useState({N:'',P:'',K:'',temperature:'',humidity:'',ph:'',rainfall:''})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try { const {data}=await api.post('/ai/crop-recommend',{N:+form.N,P:+form.P,K:+form.K,temperature:+form.temperature,humidity:+form.humidity,ph:+form.ph,rainfall:+form.rainfall}); setResult(data) }
    catch(err) { setError(err.response?.data?.error||'AI service unavailable') }
    finally { setLoading(false) }
  }
  const FIELDS = [
    {k:'N',label:'Nitrogen (N)',unit:'mg/kg',ph:'90'},{k:'P',label:'Phosphorus (P)',unit:'mg/kg',ph:'42'},
    {k:'K',label:'Potassium (K)',unit:'mg/kg',ph:'43'},{k:'temperature',label:'Temperature',unit:'°C',ph:'25'},
    {k:'humidity',label:'Humidity',unit:'%',ph:'80'},{k:'ph',label:'Soil pH',unit:'',ph:'6.5'},
    {k:'rainfall',label:'Rainfall',unit:'mm',ph:'200'},
  ]
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(({k,label,unit,ph})=>(
            <div key={k}><label className="label">{label}{unit&&` (${unit})`}</label>
              <input className="input" type="number" step="any" placeholder={ph} required value={form[k]} onChange={set(k)}/></div>
          ))}
        </div>
        {error&&<div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading?`⏳ ${t('analysing')}…`:`🌾 ${t('get_recommendation')}`}
        </button>
      </form>
      {result&&(
        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-center">
            <div className="text-5xl mb-3">🌱</div>
            <div className="text-2xl font-display font-bold text-green-700 capitalize">{result.recommended_crop}</div>
            <div className="text-sm text-gray-500 mt-1">{t('recommended_crop')}</div>
            <div className="mt-3 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-semibold">{result.confidence}% {t('confidence')}</div>
          </div>
          {result.alternatives?.length>0&&(
            <div className="card">
              <div className="text-sm font-semibold text-gray-600 mb-3">{t('alternatives')}</div>
              <div className="space-y-2">
                {result.alternatives.map(a=>(
                  <div key={a.crop} className="flex items-center justify-between">
                    <span className="capitalize text-sm">{a.crop}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{width:`${a.confidence}%`}}/></div>
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

function DiseaseDetector({ t }) {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const handleFile = e => { const f=e.target.files[0]; if(!f)return; setImage(f); setResult(null); setPreview(URL.createObjectURL(f)) }
  const submit = async e => {
    e.preventDefault(); if(!image)return; setError(''); setLoading(true)
    try { const fd=new FormData(); fd.append('image',image); const{data}=await api.post('/ai/disease-detect',fd,{headers:{'Content-Type':'multipart/form-data'}}); setResult(data) }
    catch(err) { setError(err.response?.data?.error||'AI service unavailable') }
    finally { setLoading(false) }
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block">
            <div className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${preview?'border-green-500 bg-green-50':'border-gray-200 hover:border-green-400'}`}>
              {preview?<img src={preview} alt="plant" className="mx-auto max-h-48 rounded-xl object-contain"/>
                :<><div className="text-6xl mb-3">📷</div><div className="text-gray-600 font-medium">{t('upload_photo')}</div><div className="text-gray-400 text-sm mt-1">JPG, PNG</div></>}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile}/>
            </div>
          </label>
          {error&&<div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}
          <button onClick={submit} disabled={!image||loading} className="btn-primary w-full py-3">
            {loading?`⏳ ${t('detecting')}…`:`🔍 ${t('detect_disease')}`}
          </button>
        </div>
        <div className="card bg-blue-50/50 border-blue-100">
          <div className="font-bold text-sm text-blue-800 mb-3">📌 Tips</div>
          <div className="space-y-2">
            {['Take a clear close-up of the infected leaf','Use natural daylight','Make sure the diseased spot is visible','One leaf per photo gives best results'].map((tip,i)=>(
              <div key={i} className="flex gap-2 text-sm text-blue-700"><span className="font-bold">✓</span>{tip}</div>
            ))}
          </div>
        </div>
      </div>
      {result&&(
        <div className="space-y-4 border-t border-gray-100 pt-6">
          <div className="card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-2xl font-display font-bold text-gray-900">{result.plant}</div>
                <div className="text-lg text-green-700 font-semibold mt-0.5">{result.disease?.replace(/_/g,' ')}</div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`badge text-sm px-4 py-1.5 ${result.severity==='High'?'bg-red-100 text-red-700':result.severity==='Medium'?'bg-orange-100 text-orange-700':'bg-green-100 text-green-700'}`}>
                  {result.severity==='High'?'🔴':result.severity==='Medium'?'🟡':'🟢'} {result.severity}
                </span>
                <span className="text-sm font-semibold text-gray-500">{result.confidence}% confidence</span>
              </div>
            </div>
            {result.top3&&(
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                {result.top3.map((tp,i)=>(
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-xs text-gray-400 w-4">{i+1}.</div>
                    <div className="flex-1 text-xs text-gray-700">{tp.class}</div>
                    <div className="w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${i===0?'bg-green-500':'bg-gray-300'}`} style={{width:`${tp.confidence}%`}}/></div>
                    <div className="text-xs font-bold text-gray-500 w-10 text-right">{tp.confidence}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {result.treatment?.summary&&(
            <div className={`card border-l-4 ${result.severity==='High'?'border-red-500 bg-red-50/40':result.severity==='Medium'?'border-orange-400 bg-orange-50/40':'border-green-500 bg-green-50/40'}`}>
              <div className="font-bold text-gray-800 mb-2">📋 {t('what_is_this')}</div>
              <p className="text-sm text-gray-700 leading-relaxed">{result.treatment.summary}</p>
            </div>
          )}
          {result.treatment?.immediate&&(
            <div className="card border-l-4 border-red-500 bg-red-50/40">
              <div className="font-bold text-red-700 mb-2">⚡ {t('do_now')}</div>
              <p className="text-sm text-red-800 font-semibold leading-relaxed">{result.treatment.immediate}</p>
            </div>
          )}
          {result.treatment?.steps?.length>0&&(
            <div className="card">
              <div className="font-bold text-gray-800 mb-4">📝 {t('step_by_step')}</div>
              <div className="space-y-4">
                {result.treatment.steps.map((step,i)=>(
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center shrink-0">{i+1}</div>
                    <p className="text-sm text-gray-700 leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.treatment?.products?.length>0&&(
              <div className="card border-l-4 border-blue-500">
                <div className="font-bold text-gray-800 mb-3">🏪 {t('recommended_products')}</div>
                <div className="space-y-2">
                  {result.treatment.products.map((p,i)=>(
                    <div key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-blue-500 font-bold">→</span>{p}</div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">Available at your local agri shop</div>
              </div>
            )}
            {result.treatment?.prevention&&(
              <div className="card border-l-4 border-green-500">
                <div className="font-bold text-gray-800 mb-3">🛡️ {t('prevention')}</div>
                <p className="text-sm text-gray-600 leading-relaxed">{result.treatment.prevention}</p>
              </div>
            )}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">👨‍🌾</span>
            <div>
              <div className="font-semibold text-amber-800 text-sm">{t('need_help')}</div>
              <p className="text-amber-700 text-xs mt-0.5">{t('kisan_helpline')}: <strong>1800-180-1551</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SoilAdvisor({ t }) {
  const [form, setForm] = useState({crop:'Rice',season:'Kharif',state:'Karnataka',area:'100',fertilizer:'500',pesticide:'10'})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try { const{data}=await api.post('/ai/soil-recommend',{...form,area:+form.area,fertilizer:+form.fertilizer,pesticide:+form.pesticide}); setResult(data) }
    catch(err) { setError(err.response?.data?.error||'AI service unavailable') }
    finally { setLoading(false) }
  }
  const sc = s=>({Adequate:'bg-green-50 border-green-200 text-green-700',Optimal:'bg-green-50 border-green-200 text-green-700',Low:'bg-red-50 border-red-200 text-red-600',High:'bg-yellow-50 border-yellow-200 text-yellow-700',Acidic:'bg-red-50 border-red-200 text-red-600',Alkaline:'bg-yellow-50 border-yellow-200 text-yellow-700'}[s]||'bg-gray-50 border-gray-200 text-gray-600')
  const yc = c=>({Low:'bg-red-100 text-red-700',Moderate:'bg-yellow-100 text-yellow-700',Good:'bg-green-100 text-green-700',Excellent:'bg-emerald-100 text-emerald-700'}[c]||'bg-gray-100 text-gray-600')
  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Crop</label>
          <input className="input" list="crop-list" value={form.crop} onChange={set('crop')} required/>
          <datalist id="crop-list">{['Rice','Wheat','Maize','Bajra','Groundnut','Soyabean','Cotton(lint)','Sugarcane','Potato','Onion','Tomato','Arhar/Tur','Gram','Moong(Green Gram)'].map(c=><option key={c} value={c}/>)}</datalist>
        </div>
        <div><label className="label">{t('season')}</label><select className="input" value={form.season} onChange={set('season')}>{SEASONS.map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label className="label">{t('state')}</label><select className="input" value={form.state} onChange={set('state')}>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label className="label">Area (ha)</label><input className="input" type="number" step="any" value={form.area} onChange={set('area')}/></div>
        <div><label className="label">Fertilizer used (kg)</label><input className="input" type="number" step="any" value={form.fertilizer} onChange={set('fertilizer')}/></div>
        <div><label className="label">Pesticide used (kg)</label><input className="input" type="number" step="any" value={form.pesticide} onChange={set('pesticide')}/></div>
        {error&&<div className="col-span-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}
        <div className="col-span-2"><button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading?`⏳ ${t('analysing')}…`:`🧪 ${t('get_analysis')}`}</button></div>
      </form>
      {result&&(
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-orange-200 text-center">
              <div className="text-4xl mb-1">📊</div>
              <div className="text-3xl font-display font-bold text-gray-900">{result.predicted_yield}<span className="text-sm font-normal text-gray-400 ml-1">t/ha</span></div>
              <div className="text-xs text-gray-500 mt-1">{t('predicted_yield')}</div>
              <span className={`badge mt-2 ${yc(result.yield_category)}`}>{result.yield_category}</span>
            </div>
            <div className="card text-center">
              <div className="text-3xl mb-1">🌾</div>
              <div className="text-2xl font-display font-bold text-gray-900">{result.total_production}</div>
              <div className="text-xs text-gray-500">{t('total_production')} (t)</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl mb-1">⏱️</div>
              <div className="text-2xl font-display font-bold text-gray-900">{result.crop_info?.duration_days}</div>
              <div className="text-xs text-gray-500">{t('crop_duration')}</div>
            </div>
          </div>
          <div className="card border-l-4 border-green-500 bg-green-50/50">
            <p className="text-sm text-gray-700 leading-relaxed">{result.advice}</p>
            {result.source_note&&<p className="text-xs text-gray-400 mt-1">{result.source_note}</p>}
          </div>
          {result.soil_profile&&(
            <div className="card">
              <div className="font-semibold text-sm mb-3">🧱 {t('soil_profile')} — {result.input?.state}</div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[{lb:'Nitrogen (N)',v:result.soil_profile.N,u:'kg/ha',s:result.soil_profile.N_status},{lb:'Phosphorus (P)',v:result.soil_profile.P,u:'kg/ha',s:result.soil_profile.P_status},{lb:'Potassium (K)',v:result.soil_profile.K,u:'kg/ha',s:result.soil_profile.K_status},{lb:'Soil pH',v:result.soil_profile.pH,u:'',s:result.soil_profile.pH_status}].map(({lb,v,u,s})=>(
                  <div key={lb} className={`rounded-xl p-3 border ${sc(s)}`}>
                    <div className="text-xl font-bold">{v}</div>
                    <div className="text-xs opacity-70">{u}</div>
                    <div className="text-xs font-semibold mt-0.5 truncate">{lb}</div>
                    <div className="text-xs font-bold mt-1 opacity-80">{s}</div>
                  </div>
                ))}
              </div>
              {result.fertilizer_recommendation?.ph_correction&&<div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800">⚗️ {result.fertilizer_recommendation.ph_correction}</div>}
            </div>
          )}
          {result.fertilizer_recommendation&&(
            <div className="card">
              <div className="font-semibold text-sm mb-3">💊 {t('fertilizer_rec')} (per hectare)</div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[{n:'Urea',kg:result.fertilizer_recommendation.Urea_kg_per_ha,c:'bg-blue-50 border-blue-200 text-blue-700'},{n:'DAP',kg:result.fertilizer_recommendation.DAP_kg_per_ha,c:'bg-purple-50 border-purple-200 text-purple-700'},{n:'MOP',kg:result.fertilizer_recommendation.MOP_kg_per_ha,c:'bg-orange-50 border-orange-200 text-orange-700'}].map(({n,kg,c})=>(
                  <div key={n} className={`rounded-xl p-3 border text-center ${c}`}><div className="text-2xl font-bold">{kg}</div><div className="text-xs font-semibold">kg/ha</div><div className="text-xs mt-0.5">{n}</div></div>
                ))}
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 text-center">💰 {result.fertilizer_recommendation.estimated_cost}</div>
            </div>
          )}
          {result.application_schedule?.length>0&&(
            <div className="card">
              <div className="font-semibold text-sm mb-3">📅 {t('application_schedule')}</div>
              <div className="space-y-3">
                {result.application_schedule.map((s,i)=>(
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i+1}</div>
                    <div><div className="text-xs font-bold text-green-700">{s.time}</div><div className="text-sm text-gray-600 mt-0.5">{s.application}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.crop_info&&(
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card border-l-4 border-teal-400">
                <div className="font-semibold text-sm mb-2">🌿 {t('companion_crops')}</div>
                <ul className="space-y-1">{result.crop_info.companion_crops?.map(c=><li key={c} className="text-sm text-gray-600 flex gap-2"><span className="text-teal-500">✓</span>{c}</li>)}</ul>
              </div>
              <div className="card border-l-4 border-amber-400">
                <div className="font-semibold text-sm mb-2">🌾 {t('harvest_tips')}</div>
                <p className="text-sm text-gray-600">{result.crop_info.harvest_tips}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const TABS = [
  {id:'crop',    icon:'🌾', key:'crop_recommendation'},
  {id:'disease', icon:'🔬', key:'disease_detection'},
  {id:'soil',    icon:'🧪', key:'soil_yield'},
]

export default function AIAdvisoryPage() {
  const { t } = useLang()
  const [tab, setTab] = useState('crop')
  return (
    <Layout>
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">🤖 {t('ai_advisory')}</h1>
      <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab===tb.id?'bg-white shadow-sm text-green-700':'text-gray-500 hover:text-gray-700'}`}>
            {tb.icon} {t(tb.key)}
          </button>
        ))}
      </div>
      <div className={tab==='crop'?'max-w-4xl':''}>
        <div className="card">
          {tab==='crop'    &&<CropAdvisor t={t}/>}
          {tab==='disease' &&<DiseaseDetector t={t}/>}
          {tab==='soil'    &&<SoilAdvisor t={t}/>}
        </div>
      </div>
    </Layout>
  )
}