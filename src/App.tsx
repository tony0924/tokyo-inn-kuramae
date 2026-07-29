import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import PreviewPage from '@/pages/PreviewPage';

const AuthenticatedApp = lazy(() => import('@/pages/AuthenticatedApp'));

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PageTitle />
      <Suspense fallback={<div className="full-page-center" role="status">載入中…</div>}>
        <Routes>
          <Route path="/" element={<PreviewPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

const ROUTE_TITLES: Record<string, string> = {
  '/': '東京住宿指南',
  '/login': '房客登入',
  '/code-login': '訪客碼登入',
  '/pending': '帳號審核中',
  '/guest/home': '房客首頁',
  '/guest/guide': '使用指南',
  '/guest/checkin': '入住與退房',
  '/guest/arrival': '抵達指南',
  '/guest/transit': '地鐵／公車',
  '/guest/messages': '訪客推薦牆',
  '/guest/airport': '機場交通',
  '/guest/facilities': '設施說明',
  '/guest/items': '備品清單',
  '/guest/services': '附近購物',
  '/guest/restaurant': '餐廳推薦',
  '/guest/cityguide': '景點推薦',
  '/guest/faq': '常見問題',
  '/admin/today': '今日營運',
  '/admin/revenue': '收入總覽',
  '/admin/calendar': '行事曆',
  '/admin/bookings': '預約清單',
  '/admin/messages': '推薦牆管理',
  '/admin/users': '使用者管理',
  '/admin/keys': '鑰匙管理',
  '/admin/guest-codes': '訪客碼管理',
  '/admin/recommendations': '推薦地點管理',
  '/admin/notification-history': '通知紀錄',
  '/admin/notifications': '通知設定',
};

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${ROUTE_TITLES[pathname] || '住宿資訊'}｜藏前 NEXT`;
  }, [pathname]);

  return null;
}
