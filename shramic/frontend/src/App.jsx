import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { LangProvider } from './context/Langcontext.jsx'

import AIAdvisoryPage from './pages/AIAdvisoryPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import CommunityPage from './pages/CommunityPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EquipmentPage from './pages/EquipmentPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MarketplacePage from './pages/MarketplacePage.jsx'
import MarketPricePage from './pages/MarketPricePage.jsx'
import PaymentsPage from './pages/PaymentsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import SchemesPage from './pages/SchemesPage.jsx'
import TrackingPage from './pages/TrackingPage.jsx'
import WorkersPage from './pages/WorkersPage.jsx'

// 🔐 Protected Route
function ProtectedRoute({ children }) {
  const { isAuth } = useAuth()

  // If not logged in → go to login
  if (!isAuth) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
            <Route path="/workers" element={<ProtectedRoute><WorkersPage /></ProtectedRoute>} />
            <Route path="/tracking" element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />
            <Route path="/equipment" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
            <Route path="/ai" element={<ProtectedRoute><AIAdvisoryPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/schemes" element={<ProtectedRoute><SchemesPage /></ProtectedRoute>} />
            <Route path="/prices" element={<ProtectedRoute><MarketPricePage /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Catch-all (fallback) */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  )
}
