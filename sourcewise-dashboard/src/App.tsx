import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AdminLayout from './components/admin/AdminLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminUserDetailPage = lazy(() => import('./pages/AdminUserDetailPage'))
const AdminUsagePage = lazy(() => import('./pages/AdminUsagePage'))
const AdminProvidersPage = lazy(() => import('./pages/AdminProvidersPage'))
const AdminSystemPage = lazy(() => import('./pages/AdminSystemPage'))
const AdminPlansPage = lazy(() => import('./pages/AdminPlansPage'))
const AdminContentPage = lazy(() => import('./pages/AdminContentPage'))
const AdminMoodPage = lazy(() => import('./pages/AdminMoodPage'))

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 border-3 border-[#E8845F] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const hydrateFromToken = useAuthStore((s) => s.hydrateFromToken)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)

  useEffect(() => {
    hydrateFromToken()
  }, [hydrateFromToken])

  if (!hasHydrated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FFF8DC 0%, #F5E6C8 50%, #FAEBD7 100%)' }}
      >
        <div className="w-8 h-8 border-3 border-amber-warm/30 border-t-amber-warm rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminDashboardPage />} />
            <Route path="/users" element={<AdminUsersPage />} />
            <Route path="/users/:id" element={<AdminUserDetailPage />} />
            <Route path="/usage" element={<AdminUsagePage />} />
            <Route path="/providers" element={<AdminProvidersPage />} />
            <Route path="/system" element={<AdminSystemPage />} />
            <Route path="/plans" element={<AdminPlansPage />} />
            <Route path="/content" element={<AdminContentPage />} />
            <Route path="/mood" element={<AdminMoodPage />} />
          </Route>
          <Route path="*" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold">404 Not Found</h1></div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
