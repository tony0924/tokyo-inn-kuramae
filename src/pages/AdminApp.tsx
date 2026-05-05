import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/admin/AdminLayout';
import { RevenueOverview } from '@/admin/RevenueOverview';
import { CalendarView } from '@/admin/CalendarView';
import { BookingList } from '@/admin/BookingList';
import { NotificationSettingsPage } from '@/admin/NotificationSettingsPage';
import { UserManagement } from '@/admin/UserManagement';
import { GuestCodeManagement } from '@/admin/GuestCodeManagement';
import { KeyManagement } from '@/admin/KeyManagement';
import { RecommendationManagement } from '@/admin/RecommendationManagement';

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
        <Route path="*" element={<Navigate to="revenue" replace />} />
      </Route>
    </Routes>
  );
}
