import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Booking, PaymentInformation } from '@/types';

const SETTINGS_COLLECTION = 'settings';
const SETTINGS_ID = 'paymentInformation';

export const DEFAULT_PAYMENT_INFORMATION: PaymentInformation = {
  bankName: '',
  branchName: '',
  accountName: '',
  accountNumber: '',
  currency: 'JPY',
  messageTemplate:
    '{{guestName}} 您好，以下是住宿付款資訊：\n\n' +
    '銀行：{{bankName}}\n' +
    '分行：{{branchName}}\n' +
    '戶名：{{accountName}}\n' +
    '帳號：{{accountNumber}}\n' +
    '付款金額：{{currency}} {{amount}}\n\n' +
    '匯款完成後，請回覆帳號末五碼，謝謝。',
};

export function watchPaymentInformation(
  cb: (information: PaymentInformation) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, SETTINGS_COLLECTION, SETTINGS_ID),
    (snapshot) => {
      const data = snapshot.exists()
        ? snapshot.data() as Partial<PaymentInformation>
        : {};
      cb({
        ...DEFAULT_PAYMENT_INFORMATION,
        ...data,
      });
    },
    (error) => onError?.(error)
  );
}

export async function savePaymentInformation(
  information: PaymentInformation
): Promise<void> {
  await setDoc(
    doc(db, SETTINGS_COLLECTION, SETTINGS_ID),
    {
      bankName: information.bankName.trim(),
      branchName: information.branchName.trim(),
      accountName: information.accountName.trim(),
      accountNumber: information.accountNumber.trim(),
      currency: information.currency.trim() || DEFAULT_PAYMENT_INFORMATION.currency,
      messageTemplate: information.messageTemplate.trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function renderPaymentMessage(
  information: PaymentInformation,
  booking?: Booking
): string {
  const variables: Record<string, string> = {
    guestName: booking?.guestName || '房客',
    bankName: information.bankName,
    branchName: information.branchName,
    accountName: information.accountName,
    accountNumber: information.accountNumber,
    currency: information.currency,
    amount: booking ? booking.amount.toLocaleString('en-US') : '',
    checkInDate: booking ? formatDate(booking.checkIn.toDate()) : '',
    checkOutDate: booking ? formatDate(booking.checkOut.toDate()) : '',
  };

  return information.messageTemplate.replace(
    /\{\{(\w+)\}\}/g,
    (match, key: string) => key in variables ? variables[key] : match
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  }).format(date);
}
