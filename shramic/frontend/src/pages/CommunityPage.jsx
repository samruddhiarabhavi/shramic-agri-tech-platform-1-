import { useEffect, useState } from 'react'
import api from '../api.js'
import Layout from '../components/Layout.jsx'
import { useLang } from '../context/Langcontext.jsx'

const CAT_META = {
  tip:     {icon:'💡',bg:'bg-green-100',  text:'text-green-700',  border:'border-green-200', key:'farming_tip'},
  disease: {icon:'🦠',bg:'bg-red-100',    text:'text-red-700',    border:'border-red-200',   key:'disease_alert'},
  scheme:  {icon:'🏛️',bg:'bg-blue-100',   text:'text-blue-700',   border:'border-blue-200',  key:'govt_scheme'},
  market:  {icon:'📈',bg:'bg-orange-100', text:'text-orange-700', border:'border-orange-200',key:'market_update'},
  general: {icon:'🌱',bg:'bg-gray-100',   text:'text-gray-600',   border:'border-gray-200',  key:'general'},
}

const TRENDING = [
  {tag:'#RicePaddy',posts:124},{tag:'#WheatBlast',posts:89},{tag:'#PMKisan',posts:67},
  {tag:'#DroughtTips',posts:55},{tag:'#OrganicFarming',posts:48},
]

function PostCard({ post, t }) {
  const meta = CAT_META[post.category]||CAT_META.general
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(post.likes||0)
  const timeAgo = d => { const diff=Date.now()-new Date(d); const m=Math.floor(diff/60000); if(m<60)return`${m}m`; const h=Math.floor(m/60); if(h<24)return`${h}h`; return`${Math.floor(h/24)}d` }
  return (
    <div className="bg-white rounded-2xl p-5 hover:shadow-md transition-all" style={{border:'1px solid rgba(0,0,0,0.06)'}}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-bold text-base shrink-0">{post.author?.[0]?.toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{post.author}</span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${meta.bg} ${meta.text}`}>{meta.icon} {t(meta.key)}</span>
        </div>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2 leading-snug">{post.title}</h3>
      {post.content&&<p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-4">{post.content}</p>}
      {post.video_url&&(
        <a href={post.video_url} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 text-xs text-red-600 hover:text-red-700 font-medium mb-3 w-fit bg-red-50 px-3 py-1.5 rounded-lg">▶ Watch Video</a>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <button onClick={()=>{if(!liked){setLiked(true);setLikes(l=>l+1)}}}
          className={`flex items-center gap-1.5 text-xs font-medium transition-all ${liked?'text-red-500':'text-gray-400 hover:text-red-400'}`}>
          {liked?'❤️':'🤍'} {likes}
        </button>
        <span className="text-xs text-gray-300">{new Date(post.created_at).toLocaleDateString('en-IN')}</span>
      </div>
    </div>
  )
}

function PostModal({ onClose, onPosted, t }) {
  const [form, setForm] = useState({title:'',content:'',video_url:'',category:'tip'})
  const [loading, setLoading] = useState(false)
  const [chars, setChars] = useState(0)
  const submit = async e => {
    e.preventDefault(); if(!form.title.trim())return; setLoading(true)
    try { await api.post('/community',form); onPosted(); onClose() }
    catch(err) { alert(err.response?.data?.error||'Error') }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg">{t('share_knowledge')}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="label">{t('category')}</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(CAT_META).map(([key,meta])=>(
                <button type="button" key={key} onClick={()=>setForm(f=>({...f,category:key}))}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.category===key?`${meta.bg} ${meta.text} ${meta.border} border`:'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {meta.icon} {t(meta.key)}
                </button>
              ))}
            </div>
          </div>
          <div><label className="label">{t('post_title')} *</label>
            <input className="input" required maxLength={200} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
          <div>
            <div className="flex justify-between mb-1.5"><label className="label mb-0">{t('your_message')}</label><span className="text-xs text-gray-400">{chars}/1000</span></div>
            <textarea className="input h-28 resize-none" maxLength={1000} value={form.content}
              onChange={e=>{setForm(f=>({...f,content:e.target.value}));setChars(e.target.value.length)}}/>
          </div>
          <div><label className="label">{t('video_link')}</label>
            <input className="input" type="url" placeholder="https://youtube.com/…" value={form.video_url} onChange={e=>setForm(f=>({...f,video_url:e.target.value}))}/></div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1">{t('cancel')}</button>
            <button type="submit" disabled={loading||!form.title.trim()} className="btn-primary flex-1">{loading?`⏳ ${t('publishing')}`:`🌱 ${t('publish')}`}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CommunityPage() {
  const { t } = useLang()
  const [posts, setPosts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch]     = useState('')
  const [sortBy, setSortBy]     = useState('newest')
  const [showPost, setShowPost] = useState(false)

  const load = () => { setLoading(true); api.get('/community').then(r=>setPosts(r.data||[])).finally(()=>setLoading(false)) }
  useEffect(()=>{ load() },[])

  const filtered = posts
    .filter(p=>activeCat==='all'||p.category===activeCat)
    .filter(p=>!search||p.title?.toLowerCase().includes(search.toLowerCase())||p.content?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>sortBy==='newest'?new Date(b.created_at)-new Date(a.created_at):(b.likes||0)-(a.likes||0))

  const CATS = ['all',...Object.keys(CAT_META)]

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">🌱 {t('community')}</h1>
        <button onClick={()=>setShowPost(true)} className="btn-primary">{t('share_post')}</button>
      </div>

      <div className="flex gap-6">
        {/* Main feed */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input className="input pl-9" placeholder={t('search_posts')} value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="input w-36" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="newest">{t('newest_first')}</option>
              <option value="popular">{t('most_liked')}</option>
            </select>
          </div>

          <div className="flex gap-2 flex-wrap mb-6">
            {CATS.map(cat=>{
              const meta=CAT_META[cat]
              const cnt=cat==='all'?posts.length:posts.filter(p=>p.category===cat).length
              return (
                <button key={cat} onClick={()=>setActiveCat(cat)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${activeCat===cat?'bg-green-700 text-white border-green-700':'bg-white border-gray-200 text-gray-600 hover:border-green-400'}`}>
                  {meta?.icon||'🌾'} {cat==='all'?t('all_posts'):t(meta.key)}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeCat===cat?'bg-white/20 text-white':'bg-gray-100 text-gray-500'}`}>{cnt}</span>
                </button>
              )
            })}
          </div>

          {loading?(
            <div className="space-y-4">
              {[1,2,3].map(i=>(
                <div key={i} className="bg-white rounded-2xl p-5 animate-pulse" style={{border:'1px solid rgba(0,0,0,0.05)'}}>
                  <div className="flex gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-gray-100"/><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-32"/><div className="h-3 bg-gray-100 rounded w-20"/></div></div>
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"/><div className="h-3 bg-gray-100 rounded w-full"/>
                </div>
              ))}
            </div>
          ):filtered.length===0?(
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🌱</div>
              <div className="font-display font-bold text-xl text-gray-700 mb-2">{t('no_posts')}</div>
              <p className="text-gray-400 text-sm mb-6">{search?t('no_posts_found'):`Be the first to share!`}</p>
              <button onClick={()=>setShowPost(true)} className="btn-primary">{t('share_post')}</button>
            </div>
          ):(
            <div className="space-y-4">
              {filtered.map(post=><PostCard key={post.id} post={post} t={t}/>)}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden xl:flex flex-col gap-5 w-72 shrink-0">
          <div className="rounded-2xl p-5 text-white" style={{background:'linear-gradient(135deg,#1b4332,#40916c)'}}>
            <div className="text-2xl mb-2">🌾</div>
            <div className="font-display font-bold text-lg mb-1">{t('share_knowledge')}</div>
            <p className="text-green-200 text-sm mb-4 leading-relaxed">Help fellow farmers with your experience.</p>
            <button onClick={()=>setShowPost(true)} className="w-full bg-white text-green-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-green-50 transition-colors">{t('write_post')}</button>
          </div>

          <div className="bg-white rounded-2xl p-5" style={{border:'1px solid rgba(0,0,0,0.05)'}}>
            <div className="section-title">🔥 {t('trending')}</div>
            <div className="space-y-3">
              {TRENDING.map((tr,i)=>(
                <div key={tr.tag} className="flex items-center justify-between">
                  <div><div className="text-xs text-gray-400">#{i+1}</div><div className="text-sm font-semibold text-green-700">{tr.tag}</div></div>
                  <div className="text-xs text-gray-400">{tr.posts} posts</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="font-semibold text-amber-800 text-sm mb-1">📞 Kisan Call Centre</div>
            <div className="text-2xl font-display font-bold text-amber-700 mb-1">1800-180-1551</div>
            <p className="text-amber-600 text-xs">Free · 6AM–10PM · All languages</p>
          </div>
        </div>
      </div>

      {showPost&&<PostModal onClose={()=>setShowPost(false)} onPosted={load} t={t}/>}
    </Layout>
  )
}