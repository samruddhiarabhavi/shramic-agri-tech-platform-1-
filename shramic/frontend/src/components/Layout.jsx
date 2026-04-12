import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { LANGUAGES, useLang } from '../context/Langcontext.jsx'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { lang, changeLang, t } = useLang()
  const navigate = useNavigate()
  const [langOpen, setLangOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const NAV = [
    { to:'/',            icon:'🏠', key:'dashboard' },
    { to:'/jobs',        icon:'💼', key:'jobs' },
    { to:'/workers',     icon:'👷', key:'workers' },
    { to:'/tracking',    icon:'📍', key:'live_tracking' },
    { to:'/equipment',   icon:'🚜', key:'equipment' },
    { to:'/marketplace', icon:'🛒', key:'marketplace' },
    { to:'/ai',          icon:'🤖', key:'ai_advisory' },
    { to:'/calendar',    icon:'📅', key:'calendar' },
    { to:'/schemes',     icon:'🏛️', key:'schemes' },
    { to:'/prices',      icon:'📈', key:'market_prices' },
    { to:'/community',   icon:'🌱', key:'community' },
    { to:'/payments',    icon:'💳', key:'payments' },
    { to:'/profile',     icon:'👤', key:'profile' },
  ]

  const curLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f4]">

      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-[72px]' : 'w-60'} bg-white flex flex-col shrink-0 transition-all duration-300`}
        style={{ boxShadow: '2px 0 24px rgba(45,106,79,0.08)' }}>

        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-4' : 'gap-3 px-5'} py-5 border-b border-gray-100`}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'linear-gradient(135deg,#1b4332 0%,#40916c 100%)' }}>
            🌾
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-gray-900 text-[15px]">Shramic</div>
              <div className="text-[10px] text-gray-400 tracking-[0.15em] uppercase font-medium">Agri Tech</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)}
              className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-xs shrink-0">
              ‹‹
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {NAV.map(({ to, icon, key }) => (
            <NavLink key={to} to={to} end={to === '/'}
              title={collapsed ? t(key) : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 group
                ${collapsed ? 'px-0 py-3 justify-center' : 'px-3 py-2.5'}
                ${isActive ? 'text-white shadow-md' : 'text-gray-600 hover:bg-green-50 hover:text-green-800'}`
              }
              style={({ isActive }) => isActive
                ? { background: 'linear-gradient(135deg,#2d6a4f,#52b788)', boxShadow:'0 4px 12px rgba(45,106,79,0.25)' }
                : {}
              }>
              <span className={`${collapsed ? 'text-xl' : 'text-base'} shrink-0 leading-none`}>{icon}</span>
              {!collapsed && <span className="truncate">{t(key)}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3 space-y-2">

          {/* Language selector */}
          <div className="relative">
            <button onClick={() => setLangOpen(o => !o)}
              title={collapsed ? 'Language' : undefined}
              className={`w-full flex items-center gap-2.5 ${collapsed ? 'justify-center px-0' : 'px-3'} py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors`}>
              <span className="text-lg shrink-0">🌐</span>
              {!collapsed && (
                <>
                  <span className="text-sm font-semibold text-gray-700 flex-1 text-left">{curLang.native}</span>
                  <span className="text-gray-400 text-xs transition-transform" style={{ transform: langOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                </>
              )}
            </button>

            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className={`absolute z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden
                  ${collapsed ? 'bottom-0 left-16 w-52' : 'bottom-12 left-0 right-0'}`}
                  style={{ boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
                  <div className="p-1.5 max-h-80 overflow-y-auto">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2">
                      {t('interface_language')}
                    </div>
                    {LANGUAGES.map(l => (
                      <button key={l.code}
                        onClick={() => { changeLang(l.code); setLangOpen(false) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left mb-0.5
                          ${lang === l.code ? 'text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                        style={lang === l.code ? { background:'linear-gradient(135deg,#2d6a4f,#52b788)' } : {}}>
                        <span className="text-xl">{l.flag}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold leading-tight">{l.native}</div>
                          <div className={`text-xs ${lang===l.code?'text-green-200':'text-gray-400'}`}>{l.label}</div>
                        </div>
                        {lang === l.code && <span className="text-white text-sm">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User */}
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${collapsed?'justify-center px-0':''}`}
            style={{ background:'linear-gradient(135deg,rgba(45,106,79,0.08),rgba(82,183,136,0.08))' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background:'linear-gradient(135deg,#2d6a4f,#52b788)' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{user?.name}</div>
                <div className="text-[11px] text-gray-500 capitalize">{t(user?.role) || user?.role}</div>
              </div>
            )}
          </div>

          {/* Expand / sign out */}
          <div className="flex gap-2">
            {collapsed ? (
              <button onClick={() => setCollapsed(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition-colors">
                ›
              </button>
            ) : (
              <button onClick={handleLogout}
                className="w-full py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                {t('sign_out')}
              </button>
            )}
            {collapsed && (
              <button onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 text-sm transition-colors">
                ↩
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Topbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-10 py-3.5"
          style={{ background:'rgba(245,247,244,0.9)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(45,106,79,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500 font-medium">
              {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">{curLang.flag}</span>
            <span className="text-xs text-gray-500 font-medium">{curLang.native}</span>
          </div>
        </div>

        {/* Page */}
        <div className="flex-1 px-10 py-8 max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}