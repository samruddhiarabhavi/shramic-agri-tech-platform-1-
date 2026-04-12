import { useEffect, useState } from 'react'
import api from '../api.js'
import { LANGUAGES, VoiceInput, useLang } from '../components/LanguageVoice.jsx'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const STATES = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Gujarat','Haryana','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana',
  'Uttar Pradesh','Uttarakhand','West Bengal']

const SKILLS = ['sowing','harvesting','irrigation','spraying','ploughing','transplanting',
  'weeding','tractor driving','pesticide application','drip irrigation','greenhouse management','other']

function StatBadge({ icon, label, value, color }) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-100',
    blue:  'bg-blue-50 text-blue-700 border-blue-100',
    orange:'bg-orange-50 text-orange-700 border-orange-100',
    purple:'bg-purple-50 text-purple-700 border-purple-100',
  }
  return (
    <div className={`rounded-2xl border p-4 text-center ${colors[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-display font-bold">{value ?? '—'}</div>
      <div className="text-xs opacity-75 mt-0.5">{label}</div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, login, token } = useAuth()
  const { lang, changeLang, t } = useLang()

  const [profile, setProfile] = useState({
    name: user?.name || '', phone: '', location: '', state: '',
  })
  const [workerProfile, setWorkerProfile] = useState({
    skills: [], experience_years: 0, preferred_state: '',
    daily_wage: '', bio: '', is_available: true,
  })
  const [stats, setStats]     = useState({})
  const [payments, setPayments] = useState([])
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [activeTab, setActiveTab] = useState('profile')

  const isWorker = user?.role === 'worker'
  const isFarmer = user?.role === 'farmer'

  useEffect(() => {
    api.get('/auth/me').then(r => {
      setProfile({ name:r.data.name||'', phone:r.data.phone||'', location:r.data.location||'', state:r.data.state||'' })
    })
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(()=>{})
    api.get('/payments/my').then(r => setPayments(r.data||[])).catch(()=>{})
    if (isWorker) {
      api.get('/workers/me').then(r => {
        if (r.data) setWorkerProfile({
          skills: typeof r.data.skills === 'string' ? JSON.parse(r.data.skills||'[]') : (r.data.skills||[]),
          experience_years: r.data.experience_years || 0,
          preferred_state: r.data.preferred_state || '',
          daily_wage: r.data.daily_wage || '',
          bio: r.data.bio || '',
          is_available: r.data.is_available ?? true,
        })
      }).catch(()=>{})
    }
  }, [])

  const saveProfile = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/auth/profile', profile)
      // Update auth context name
      login({ ...user, name: profile.name }, token)
      setMsg('✓ Profile saved successfully!')
    } catch { setMsg('Error saving profile') }
    finally { setSaving(false); setTimeout(()=>setMsg(''),3000) }
  }

  const saveWorkerProfile = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/workers/me', workerProfile)
      setMsg('✓ Worker profile updated!')
    } catch { setMsg('Error saving') }
    finally { setSaving(false); setTimeout(()=>setMsg(''),3000) }
  }

  const toggleSkill = s => setWorkerProfile(p => ({
    ...p, skills: p.skills.includes(s) ? p.skills.filter(x=>x!==s) : [...p.skills, s]
  }))

  const toggleAvail = async () => {
    const newVal = !workerProfile.is_available
    await api.patch('/workers/availability', { is_available: newVal })
    setWorkerProfile(p=>({...p, is_available: newVal}))
  }

  const TABS = [
    { id:'profile',  icon:'👤', label:'Profile' },
    { id:'worker',   icon:'🛠️', label:'Skills',   show: isWorker },
    { id:'language', icon:'🌐', label:'Language & Voice' },
    { id:'history',  icon:'📊', label:'Activity' },
  ].filter(t => t.show !== false)

  return (
    <Layout title="👤 My Profile">
      <div className="max-w-3xl mx-auto">
        {/* Profile header card */}
        <div className="bg-gradient-to-br from-primary-dark to-primary rounded-3xl p-6 mb-6 text-white relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-white font-display font-bold text-3xl shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-display font-bold text-2xl">{user?.name}</div>
              <div className="text-green-200 text-sm">{user?.email}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge bg-white/20 text-white border border-white/20 capitalize text-xs">{user?.role}</span>
                {isWorker && (
                  <button onClick={toggleAvail}
                    className={`badge border text-xs font-semibold cursor-pointer transition-all
                      ${workerProfile.is_available ? 'bg-green-400/30 text-green-100 border-green-400/30' : 'bg-gray-400/30 text-gray-100 border-gray-400/30'}`}>
                    {workerProfile.is_available ? '● Available' : '○ Unavailable'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {isFarmer ? <>
            <StatBadge icon="💼" label="Jobs Posted"   value={stats.jobs_posted}           color="green" />
            <StatBadge icon="👷" label="Applications"  value={stats.applications_received} color="blue" />
            <StatBadge icon="🚜" label="Equipment"     value={stats.equipment_booked}      color="orange" />
            <StatBadge icon="💰" label="Total Spent"   value={`₹${Number(stats.total_spent||0).toLocaleString('en-IN')}`} color="purple" />
          </> : <>
            <StatBadge icon="📋" label="Applied"   value={stats.jobs_applied}  color="green" />
            <StatBadge icon="✅" label="Accepted"  value={stats.jobs_accepted} color="blue" />
            <StatBadge icon="⭐" label="Rating"    value={stats.rating||'New'} color="orange" />
            <StatBadge icon="💰" label="Earned"    value={`₹${Number(stats.total_earned||0).toLocaleString('en-IN')}`} color="purple" />
          </>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all
                ${activeTab===tab.id ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg}
          </div>
        )}

        {/* ── Profile tab ────────────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <form onSubmit={saveProfile} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-display font-bold text-gray-800 mb-2">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Full Name</label>
                <input className="input" value={profile.name}
                  onChange={e=>setProfile(p=>({...p,name:e.target.value}))} />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input className="input" type="tel" placeholder="10-digit mobile number"
                  value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))} />
              </div>
              <div>
                <label className="label">State</label>
                <select className="input" value={profile.state} onChange={e=>setProfile(p=>({...p,state:e.target.value}))}>
                  <option value="">Select state</option>
                  {STATES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Village / Location</label>
                <input className="input" placeholder="Village name, district"
                  value={profile.location} onChange={e=>setProfile(p=>({...p,location:e.target.value}))} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-gray-400">Member since {new Date().getFullYear()}</div>
              <button type="submit" disabled={saving} className="btn-primary px-8">
                {saving ? '⏳ Saving…' : '💾 Save Profile'}
              </button>
            </div>
          </form>
        )}

        {/* ── Worker skills tab ─────────────────────────────────────────────── */}
        {activeTab === 'worker' && isWorker && (
          <form onSubmit={saveWorkerProfile} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5 shadow-sm">
            <h3 className="font-display font-bold text-gray-800">Worker Profile</h3>

            {/* Availability toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <div className="font-semibold text-sm">Availability Status</div>
                <div className="text-xs text-gray-500 mt-0.5">Farmers can see and contact you when available</div>
              </div>
              <button type="button" onClick={toggleAvail}
                className={`relative w-14 h-7 rounded-full transition-colors ${workerProfile.is_available ? 'bg-primary' : 'bg-gray-300'}`}>
                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${workerProfile.is_available ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            {/* Skills */}
            <div>
              <label className="label">Your Skills</label>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(s => (
                  <button type="button" key={s} onClick={()=>toggleSkill(s)}
                    className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-all capitalize
                      ${workerProfile.skills.includes(s)
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-gray-600 hover:border-primary/40'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Experience (years)</label>
                <input className="input" type="number" min="0" max="60"
                  value={workerProfile.experience_years}
                  onChange={e=>setWorkerProfile(p=>({...p,experience_years:+e.target.value}))} />
              </div>
              <div>
                <label className="label">Expected Daily Wage (₹)</label>
                <input className="input" type="number" placeholder="e.g. 500"
                  value={workerProfile.daily_wage}
                  onChange={e=>setWorkerProfile(p=>({...p,daily_wage:+e.target.value}))} />
              </div>
            </div>

            <div>
              <label className="label">Preferred State for Work</label>
              <select className="input" value={workerProfile.preferred_state}
                onChange={e=>setWorkerProfile(p=>({...p,preferred_state:e.target.value}))}>
                <option value="">Any state</option>
                {STATES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Bio / About Yourself</label>
              <textarea className="input h-24 resize-none"
                placeholder="Describe your experience, the crops you've worked with, tools you can operate…"
                value={workerProfile.bio}
                onChange={e=>setWorkerProfile(p=>({...p,bio:e.target.value}))} />
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full py-3">
              {saving ? '⏳ Saving…' : '💾 Save Worker Profile'}
            </button>
          </form>
        )}

        {/* ── Language & Voice tab ──────────────────────────────────────────── */}
        {activeTab === 'language' && (
          <div className="space-y-4">
            {/* Language selector */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-display font-bold text-gray-800 mb-4">🌐 Interface Language</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => changeLang(l.code)}
                    className={`p-3 rounded-xl border-2 text-left transition-all
                      ${lang===l.code ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-bold text-gray-900">{l.native}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{l.label}</div>
                    {lang===l.code && <div className="text-xs text-primary font-semibold mt-1">✓ Active</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice input demo */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-display font-bold text-gray-800 mb-2">🎙 Voice Input</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Hold the microphone button and speak in your language to fill forms.
                Works on Chrome browser. Useful for farmers who find typing difficult.
              </p>
              <VoiceInput
                lang={lang}
                placeholder={`Speak in ${LANGUAGES.find(l=>l.code===lang)?.native || 'your language'}…`}
                onResult={text => console.log('Voice result:', text)}
              />
              <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                <strong>How to use:</strong> Hold the 🎙 button → speak your message → release. The text appears automatically. Works for job search, posting notes, and more.
              </div>
            </div>

            {/* Text to speech */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-display font-bold text-gray-800 mb-2">🔊 Text to Speech</h3>
              <p className="text-sm text-gray-500 mb-4">
                Click the 🔊 speaker icon next to any text in the app to hear it read aloud in your chosen language.
              </p>
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <span className="text-sm text-gray-700">Example: Crop recommendation result</span>
                <button
                  onClick={() => {
                    if (window.speechSynthesis) {
                      const utt = new SpeechSynthesisUtterance(
                        lang==='hi' ? 'आपके खेत के लिए गेहूं की फसल सबसे अच्छी रहेगी।' :
                        lang==='kn' ? 'ನಿಮ್ಮ ಹೊಲಕ್ಕೆ ಗೋಧಿ ಬೆಳೆ ಸೂಕ್ತವಾಗಿದೆ.' :
                        'Wheat crop is recommended for your field.'
                      )
                      utt.lang = lang==='hi'?'hi-IN':lang==='kn'?'kn-IN':'en-IN'
                      window.speechSynthesis.speak(utt)
                    }
                  }}
                  className="btn-outline text-sm py-1.5 px-3">🔊 Play sample</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Activity tab ──────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Recent payments */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-display font-bold text-gray-800">Recent Transactions</h3>
              </div>
              {payments.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-400">
                  <div className="text-3xl mb-2">💳</div>
                  <div className="text-sm">No transactions yet</div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 border-b">
                      <th className="text-left px-5 py-3">Type</th>
                      <th className="text-right px-5 py-3">Amount</th>
                      <th className="text-right px-5 py-3">Status</th>
                      <th className="text-right px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0,10).map((p,i) => (
                      <tr key={p.id} className={`border-t border-gray-50 ${i%2===1?'bg-gray-50/40':''}`}>
                        <td className="px-5 py-3">
                          <span className="badge bg-blue-50 text-blue-700 capitalize text-xs">{p.type?.replace('_',' ')}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                        <td className={`px-5 py-3 text-right text-xs font-semibold capitalize
                          ${p.status==='success'?'text-green-600':p.status==='failed'?'text-red-500':'text-yellow-600'}`}>
                          {p.status}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-400 text-xs">
                          {new Date(p.created_at).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}