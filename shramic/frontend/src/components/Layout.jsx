import {
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronsLeft, ChevronsRight,
  CircleUser,
  Cpu,
  CreditCard,
  HardHat,
  Landmark,
  Languages,
  LayoutGrid,
  LineChart,
  LogOut,
  MapPin,
  ShoppingCart,
  Sprout,
  Tractor
} from 'lucide-react'
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
    { to:'/',            Icon:LayoutGrid,  key:'dashboard' },
    { to:'/jobs',        Icon:Briefcase,   key:'jobs' },
    { to:'/workers',     Icon:HardHat,     key:'workers' },
    { to:'/tracking',    Icon:MapPin,      key:'live_tracking' },
    { to:'/equipment',   Icon:Tractor,     key:'equipment' },
    { to:'/marketplace', Icon:ShoppingCart,key:'marketplace' },
    { to:'/ai',          Icon:Cpu,         key:'ai_advisory' },
    { to:'/calendar',    Icon:CalendarDays,key:'calendar' },
    { to:'/schemes',     Icon:Landmark,    key:'schemes' },
    { to:'/prices',      Icon:LineChart,   key:'market_prices' },
    { to:'/community',   Icon:Sprout,      key:'community' },
    { to:'/payments',    Icon:CreditCard,  key:'payments' },
    { to:'/profile',     Icon:CircleUser,  key:'profile' },
  ]

  const curLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2EEDD]">

      {/* Sidebar — the ledger spine */}
      <aside
        className={`${collapsed ? 'w-[72px]' : 'w-60'} bg-[#1B2A3D] flex flex-col shrink-0 transition-all duration-300`}>

        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-4' : 'gap-3 px-5'} py-5 border-b border-white/10`}>
          <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 border-2 border-[#D9A62E]">
            <span className="font-display font-bold text-[#D9A62E] text-lg leading-none">S</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-white text-lg leading-tight tracking-wide">SHRAMIC</div>
              <div className="text-[10px] text-[#8A97A6] tracking-[0.2em] uppercase font-medium">Khata Board</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)}
              className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8A97A6] shrink-0">
              <ChevronsLeft size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {NAV.map(({ to, Icon, key }) => (
            <NavLink key={to} to={to} end={to === '/'}
              title={collapsed ? t(key) : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded text-sm font-medium transition-all duration-150 group border-l-2
                ${collapsed ? 'px-0 py-3 justify-center border-l-0' : 'px-3 py-2.5'}
                ${isActive ? 'text-[#D9A62E] bg-white/[0.06] border-[#D9A62E]' : 'text-[#B7C0CC] hover:bg-white/[0.04] hover:text-white border-transparent'}`
              }>
              <Icon size={collapsed ? 20 : 17} strokeWidth={1.75} className="shrink-0" />
              {!collapsed && <span className="truncate">{t(key)}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 space-y-2">

          {/* Language selector */}
          <div className="relative">
            <button onClick={() => setLangOpen(o => !o)}
              title={collapsed ? 'Language' : undefined}
              className={`w-full flex items-center gap-2.5 ${collapsed ? 'justify-center px-0' : 'px-3'} py-2.5 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors`}>
              <Languages size={17} strokeWidth={1.75} className="shrink-0 text-[#B7C0CC]" />
              {!collapsed && (
                <>
                  <span className="text-sm font-semibold text-white flex-1 text-left">{curLang.native}</span>
                  <ChevronDown size={14} strokeWidth={2} className="text-[#8A97A6] transition-transform" style={{ transform: langOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                </>
              )}
            </button>

            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className={`absolute z-50 bg-[#FBF9F1] rounded-md shadow-2xl overflow-hidden border-t-2 border-[#D9A62E]
                  ${collapsed ? 'bottom-0 left-16 w-52' : 'bottom-12 left-0 right-0'}`}
                  style={{ border:'1px solid #DFD8BF', borderTop:'2px solid #D9A62E' }}>
                  <div className="p-1.5 max-h-80 overflow-y-auto">
                    <div className="text-[10px] font-bold text-[#5B6B7C] uppercase tracking-widest px-3 py-2">
                      {t('interface_language')}
                    </div>
                    {LANGUAGES.map(l => (
                      <button key={l.code}
                        onClick={() => { changeLang(l.code); setLangOpen(false) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all text-left mb-0.5
                          ${lang === l.code ? 'bg-[#1B2A3D] text-[#D9A62E]' : 'text-[#2A2A28] hover:bg-black/[0.03]'}`}>
                        <span className="text-xl">{l.flag}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold leading-tight">{l.native}</div>
                          <div className={`text-xs ${lang===l.code?'text-[#8A97A6]':'text-gray-400'}`}>{l.label}</div>
                        </div>
                        {lang === l.code && <Check size={16} strokeWidth={2.5} />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User */}
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded bg-white/[0.04] ${collapsed?'justify-center px-0':''}`}>
            <div className="w-8 h-8 rounded flex items-center justify-center text-[#1B2A3D] text-sm font-bold shrink-0 bg-[#D9A62E]">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                <div className="text-[11px] text-[#8A97A6] capitalize">{t(user?.role) || user?.role}</div>
              </div>
            )}
          </div>

          {/* Expand / sign out */}
          <div className="flex gap-2">
            {collapsed ? (
              <button onClick={() => setCollapsed(false)}
                className="flex-1 py-2.5 rounded bg-white/5 hover:bg-white/10 text-[#8A97A6] flex items-center justify-center transition-colors">
                <ChevronsRight size={16} strokeWidth={1.75} />
              </button>
            ) : (
              <button onClick={handleLogout}
                className="w-full py-2 rounded text-xs font-semibold text-[#E06B32] hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5">
                <LogOut size={14} strokeWidth={2} />
                {t('sign_out')}
              </button>
            )}
            {collapsed && (
              <button onClick={handleLogout}
                className="flex-1 py-2.5 rounded bg-white/5 hover:bg-white/10 text-[#E06B32] flex items-center justify-center transition-colors">
                <LogOut size={16} strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Topbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-10 py-3.5"
          style={{ background:'rgba(242,238,221,0.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid #DFD8BF' }}>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#5B6E44] animate-pulse" />
            <span className="text-xs text-[#5B6B7C] font-mono font-medium">
              {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">{curLang.flag}</span>
            <span className="text-xs text-[#5B6B7C] font-medium">{curLang.native}</span>
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