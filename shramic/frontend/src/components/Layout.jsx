import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV = [
  { to: '/',           icon: '🏠', label: 'Dashboard' },
  { to: '/jobs',       icon: '💼', label: 'Jobs' },
  { to: '/workers',    icon: '👷', label: 'Workers' },
  { to: '/equipment',  icon: '🚜', label: 'Equipment' },
  { to: '/marketplace',icon: '🛒', label: 'Marketplace' },
  { to: '/ai',         icon: '🤖', label: 'AI Advisory' },
  { to: '/calendar',   icon: '📅', label: 'Calendar' },
  { to: '/schemes',    icon: '🏛️', label: 'Schemes' },
  { to: '/prices',     icon: '📈', label: 'Market Prices' },
  { to: '/community',  icon: '🌱', label: 'Community' },
  { to: '/payments',   icon: '💳', label: 'Payments' },
  { to: '/profile',    icon: '👤', label: 'Profile' },
]

export default function Layout({ children, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shadow-sm shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <div>
              <div className="font-display font-bold text-primary text-sm leading-tight">Shramic</div>
              <div className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Agri Tech</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-[11px] text-gray-400 capitalize">{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full text-xs text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors font-medium">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {title && (
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-8 py-4">
            <h1 className="text-xl font-display font-bold text-gray-900">{title}</h1>
          </div>
        )}
        <div className="px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
