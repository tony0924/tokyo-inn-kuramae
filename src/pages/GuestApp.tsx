import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestLayout } from '@/guest/GuestLayout';
import { HomeTab } from '@/guest/tabs/HomeTab';
import { CheckinTab } from '@/guest/tabs/CheckinTab';
import { ArrivalTab } from '@/guest/tabs/ArrivalTab';
import { FacilitiesTab } from '@/guest/tabs/FacilitiesTab';
import { ItemsTab } from '@/guest/tabs/ItemsTab';
import { ServicesTab } from '@/guest/tabs/ServicesTab';
import { RestaurantTab } from '@/guest/tabs/RestaurantTab';
import { CityguideTab } from '@/guest/tabs/CityguideTab';
import { EmergencyTab } from '@/guest/tabs/EmergencyTab';

export default function GuestApp() {
  return (
    <Routes>
      <Route element={<GuestLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<HomeTab />} />
        <Route path="checkin" element={<CheckinTab />} />
        <Route path="arrival" element={<ArrivalTab />} />
        <Route path="facilities" element={<FacilitiesTab />} />
        <Route path="items" element={<ItemsTab />} />
        <Route path="services" element={<ServicesTab />} />
        <Route path="restaurant" element={<RestaurantTab />} />
        <Route path="cityguide" element={<CityguideTab />} />
        <Route path="emergency" element={<EmergencyTab />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>
    </Routes>
  );
}
