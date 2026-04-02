import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

// Pages
import LoginPage    from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import Dashboard    from './pages/Dashboard.jsx'
import JobsPage     from './pages/JobsPage.jsx'
import WorkersPage  from './pages/WorkersPage.jsx'
import EquipmentPage from './pages/EquipmentPage.jsx'
import MarketplacePage from './pages/MarketplacePage.jsx'
import AIAdvisoryPage from './pages/AIAdvisoryPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import SchemesPage  from './pages/SchemesPage.jsx'
import MarketPricePage from './pages/MarketPricePage.jsx'
import CommunityPage from './pages/CommunityPage.jsx'
import PaymentsPage from './pages/PaymentsPage.jsx'
import ProfilePage  from './pages/ProfilePage.jsx'

function ProtectedRoute({ children }) {
  const { isAuth } = useAuth()
  return isAuth ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/jobs"       element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
          <Route path="/workers"    element={<ProtectedRoute><WorkersPage /></ProtectedRoute>} />
          <Route path="/equipment"  element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
          <Route path="/ai"         element={<ProtectedRoute><AIAdvisoryPage /></ProtectedRoute>} />
          <Route path="/calendar"   element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/schemes"    element={<ProtectedRoute><SchemesPage /></ProtectedRoute>} />
          <Route path="/prices"     element={<ProtectedRoute><MarketPricePage /></ProtectedRoute>} />
          <Route path="/community"  element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/payments"   element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
          <Route path="/profile"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*"           element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
