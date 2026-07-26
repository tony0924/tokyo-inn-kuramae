import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import PreviewPage from '@/pages/PreviewPage';

const AuthenticatedApp = lazy(() => import('@/pages/AuthenticatedApp'));

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<div className="full-page-center" role="status">載入中…</div>}>
        <Routes>
          <Route path="/" element={<PreviewPage />} />
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
