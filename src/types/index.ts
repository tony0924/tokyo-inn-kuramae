import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'guest' | 'pending';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type StayType = 'paid_guest' | 'self' | 'family' | 'complimentary' | 'other';
export type BookingPaymentKind = 'payment' | 'refund';
export type BookingPaymentMethod = 'cash' | 'transfer' | 'card' | 'platform' | 'other';

export interface KeyLoanRecord {
  keyCode: string;
  lentAt: Timestamp;
  returnedAt: Timestamp | null;
}

export interface UserDoc {
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  active: boolean;
  bookingId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BookingDoc {
  guestUid: string | null;
  guestEmail: string;
  guestName: string;
  guestAccessCode?: string | null;
  partySize: number;
  checkIn: Timestamp;
  checkOut: Timestamp;
  amount: number;
  stayType?: StayType;
  expectedRevenue?: number;
  paymentStatus: PaymentStatus;
  paymentNotes: string;
  keyCode: string | null;
  keyLentAt: Timestamp | null;
  keyReturnedAt: Timestamp | null;
  keyHistory?: KeyLoanRecord[];
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Booking extends BookingDoc {
  id: string;
}

export interface BookingPaymentDoc {
  bookingId: string;
  guestName: string;
  amount: number;
  kind: BookingPaymentKind;
  method: BookingPaymentMethod;
  receivedAt: Timestamp;
  note: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BookingPayment extends BookingPaymentDoc {
  id: string;
}

export interface User extends UserDoc {
  uid: string;
}

export interface EmailAccessDoc {
  email: string;
  role: Extract<UserRole, 'admin' | 'guest'>;
  active: boolean;
  bookingId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EmailAccess extends EmailAccessDoc {
  id: string;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
}

export interface NotificationSettings {
  senderName: string;
  senderEmail: string;
  reminderTemplateVersion: number;
  bookingCreatedReminder: NotificationTemplate;
  checkInReminder: NotificationTemplate;
  checkoutAdminReminder: NotificationTemplate;
  updatedAt?: Timestamp;
}

export interface GuestAccessCodeDoc {
  code: string;
  label: string;
  bookingId?: string | null;
  guestEmail?: string | null;
  guestName?: string | null;
  active: boolean;
  startsAt: Timestamp;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GuestAccessCode extends GuestAccessCodeDoc {
  id: string;
}

export interface GuestGuideSearchEntry {
  section: string;
  tab: string;
  title: string;
  content: string;
  anchor?: string;
}

export interface GuestGuidePrivateContent {
  accommodation: {
    buildingName: string;
    address: string;
    roomLabel: string;
    roomDirections: string;
    mapUrl: string;
  };
  wifi: {
    ssid: string;
    password: string;
  };
  arrival: {
    steps: string[];
    buildingAccess: string[];
  };
  doorLock: {
    instructions: string[];
  };
  garbageLocation: string;
  searchEntries: GuestGuideSearchEntry[];
  updatedAt?: Timestamp;
}

export type GuestPageViewEventType = 'page_view' | 'code_login';
export type GuestPageViewVisitorType = 'gmail' | 'guest_code' | 'admin_preview';

export interface GuestPageViewDoc {
  eventType: GuestPageViewEventType;
  visitorType: GuestPageViewVisitorType;
  path: string;
  userUid: string | null;
  userEmail: string | null;
  userName: string | null;
  guestAccessCode: string | null;
  guestEmail: string | null;
  guestName: string | null;
  userAgent: string;
  deviceId: string;
  createdAt: Timestamp;
}

export interface GuestPageView extends GuestPageViewDoc {
  id: string;
}

export type AdminNotificationStatus =
  | 'pending'
  | 'sent'
  | 'partial'
  | 'failed'
  | 'no_devices';

export interface AdminNotificationDoc {
  title: string;
  body: string;
  url: string;
  tag: string;
  badge: string;
  status: AdminNotificationStatus;
  deviceCount: number;
  successCount: number;
  failureCount: number;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

export interface AdminNotification extends AdminNotificationDoc {
  id: string;
}

export interface AdminNotificationReadState {
  ownerUid: string;
  lastReadAt: Timestamp;
  updatedAt: Timestamp;
}

export type GuestMessageAuthorType = 'guest' | 'admin';

export interface GuestCommunityMessageDoc {
  authorType: GuestMessageAuthorType;
  authorName: string;
  body: string;
  createdAt: Timestamp;
}

export interface GuestCommunityMessage extends GuestCommunityMessageDoc {
  id: string;
}

export interface KeyDoc {
  code: string;
  label: string;
  active: boolean;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface KeyItem extends KeyDoc {
  id: string;
}

export interface AdminPushDeviceDoc {
  ownerUid: string;
  token: string;
  label: string;
  userAgent: string;
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeenAt: Timestamp;
}

export interface AdminPushDevice extends AdminPushDeviceDoc {
  id: string;
}

export type RecommendationSection = 'services' | 'restaurant' | 'cityguide';
export type RecommendationCategory =
  | 'convenience'
  | 'supermarket'
  | 'restaurant'
  | 'cafe'
  | 'sight';

export interface RecommendationDoc {
  section: RecommendationSection;
  category: RecommendationCategory;
  source?: 'default' | 'admin';
  defaultKey?: string | null;
  placeId?: string | null;
  address?: string;
  name: string;
  lat: number;
  lng: number;
  url: string;
  note: string;
  rating?: number;
  active: boolean;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Recommendation extends RecommendationDoc {
  id: string;
}

export interface GuestWeatherCondition {
  type: string;
  description: string;
  emoji: string;
}

export interface GuestWeatherDay {
  date: string;
  condition: GuestWeatherCondition;
  maxTemperature: number | null;
  minTemperature: number | null;
  precipitationProbability: number | null;
}

export interface GuestWeatherData {
  locationName: string;
  sourceName: string;
  sourceUrl: string;
  current: {
    temperature: number;
    feelsLikeTemperature: number | null;
    condition: GuestWeatherCondition;
    humidity: number | null;
  };
  days: GuestWeatherDay[];
  advice: string;
  updatedAt: string;
  stale: boolean;
}
