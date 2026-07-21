import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import PreviewPage from '@/pages/PreviewPage';
import LoginPage from '@/pages/LoginPage';
import GuestCodeLoginPage from '@/pages/GuestCodeLoginPage';
import PendingApprovalPage from '@/pages/PendingApprovalPage';

const GuestApp = lazy(() => import('@/pages/GuestApp'));
const AdminApp = lazy(() => import('@/pages/AdminApp'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<div className="full-page-center" role="status">載入中…</div>}>
          <Routes>
          <Route path="/" element={<PreviewPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/code-login" element={<GuestCodeLoginPage />} />
          <Route path="/pending" element={<PendingApprovalPage />} />

          <Route
            path="/guest/*"
            element={
              <ProtectedRoute requireRoles={['guest', 'admin']}>
                <GuestApp />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requireRoles={['admin']} requireActive={false}>
                <AdminApp />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
