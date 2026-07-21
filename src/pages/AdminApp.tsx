import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/admin/AdminLayout';

const RevenueOverview = lazy(() => import('@/admin/RevenueOverview').then((module) => ({ default: module.RevenueOverview })));
const CalendarView = lazy(() => import('@/admin/CalendarView').then((module) => ({ default: module.CalendarView })));
const BookingList = lazy(() => import('@/admin/BookingList').then((module) => ({ default: module.BookingList })));
const NotificationSettingsPage = lazy(() => import('@/admin/NotificationSettingsPage').then((module) => ({ default: module.NotificationSettingsPage })));
const UserManagement = lazy(() => import('@/admin/UserManagement').then((module) => ({ default: module.UserManagement })));
const GuestCodeManagement = lazy(() => import('@/admin/GuestCodeManagement').then((module) => ({ default: module.GuestCodeManagement })));
const KeyManagement = lazy(() => import('@/admin/KeyManagement').then((module) => ({ default: module.KeyManagement })));
const RecommendationManagement = lazy(() => import('@/admin/RecommendationManagement').then((module) => ({ default: module.RecommendationManagement })));
const MessageManagement = lazy(() => import('@/admin/MessageManagement').then((module) => ({ default: module.MessageManagement })));

export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="revenue" replace />} />
        <Route path="revenue" element={<RevenueOverview />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="bookings" element={<BookingList />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="keys" element={<KeyManagement />} />
        <Route path="guest-codes" element={<GuestCodeManagement />} />
        <Route path="recommendations" element={<RecommendationManagement />} />
        <Route path="notifications" element={<NotificationSettingsPage />} />
        <Route path="messages" element={<MessageManagement />} />
        <Route path="*" element={<Navigate to="revenue" replace />} />
      </Route>
    </Routes>
  );
}
