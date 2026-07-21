import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestLayout } from '@/guest/GuestLayout';

const HomeTab = lazy(() => import('@/guest/tabs/HomeTab').then((module) => ({ default: module.HomeTab })));
const CheckinTab = lazy(() => import('@/guest/tabs/CheckinTab').then((module) => ({ default: module.CheckinTab })));
const ArrivalTab = lazy(() => import('@/guest/tabs/ArrivalTab').then((module) => ({ default: module.ArrivalTab })));
const TransitTab = lazy(() => import('@/guest/tabs/TransitTab').then((module) => ({ default: module.TransitTab })));
const MessageBoardTab = lazy(() => import('@/guest/tabs/MessageBoardTab').then((module) => ({ default: module.MessageBoardTab })));
const AirportTransitTab = lazy(() => import('@/guest/tabs/AirportTransitTab').then((module) => ({ default: module.AirportTransitTab })));
const FacilitiesTab = lazy(() => import('@/guest/tabs/FacilitiesTab').then((module) => ({ default: module.FacilitiesTab })));
const ItemsTab = lazy(() => import('@/guest/tabs/ItemsTab').then((module) => ({ default: module.ItemsTab })));
const ServicesTab = lazy(() => import('@/guest/tabs/ServicesTab').then((module) => ({ default: module.ServicesTab })));
const RestaurantTab = lazy(() => import('@/guest/tabs/RestaurantTab').then((module) => ({ default: module.RestaurantTab })));
const CityguideTab = lazy(() => import('@/guest/tabs/CityguideTab').then((module) => ({ default: module.CityguideTab })));
const FaqTab = lazy(() => import('@/guest/tabs/FaqTab').then((module) => ({ default: module.FaqTab })));

export default function GuestApp() {
  return (
    <Routes>
      <Route element={<GuestLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<HomeTab />} />
        <Route path="checkin" element={<CheckinTab />} />
        <Route path="arrival" element={<ArrivalTab />} />
        <Route path="transit" element={<TransitTab />} />
        <Route path="messages" element={<MessageBoardTab />} />
        <Route path="airport" element={<AirportTransitTab />} />
        <Route path="facilities" element={<FacilitiesTab />} />
        <Route path="items" element={<ItemsTab />} />
        <Route path="services" element={<ServicesTab />} />
        <Route path="restaurant" element={<RestaurantTab />} />
        <Route path="cityguide" element={<CityguideTab />} />
        <Route path="faq" element={<FaqTab />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>
    </Routes>
  );
}
