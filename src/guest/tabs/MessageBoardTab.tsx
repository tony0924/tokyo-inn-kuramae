import { useEffect, useState, type FormEvent } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { getStoredGuestAccessCode, validateGuestAccessCode } from '@/lib/guestAccessCodes';
import { createGuestMessage, watchGuestMessages } from '@/lib/guestMessages';
import type { BookingDoc, GuestMessage } from '@/types';

type BoardInfo = { code: string; guestName: string; guestEmail: string | null };

export function MessageBoardTab() {
  const { user } = useAuth();
  const [board, setBoard] = useState<BoardInfo | null>(null);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const guestCode = !user ? getStoredGuestAccessCode() : null;

    async function loadBoard() {
      setBoard(null);
      setMessages([]);
      if (guestCode) {
        const access = await validateGuestAccessCode(guestCode);
        if (!cancelled && access) {
          setBoard({ code: access.code, guestName: access.guestName || '訪客', guestEmail: access.guestEmail || null });
        }
        return;
      }

      if (user?.role === 'guest' && user.active && user.bookingId) {
        const snap = await getDoc(doc(db, 'bookings', user.bookingId));
        if (!cancelled && snap.exists()) {
          const booking = snap.data() as BookingDoc;
          if (booking.guestAccessCode) {
            setBoard({
              code: booking.guestAccessCode,
              guestName: booking.guestName || user.displayName || '訪客',
              guestEmail: booking.guestEmail || user.email,
            });
          }
        }
      }
    }

    loadBoard().catch(() => !cancelled && setError('無法載入留言板，請稍後再試。'));
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!board) return;
    return watchGuestMessages(board.code, setMessages);
  }, [board]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!board || sending) return;
    setSending(true);
    setError(null);
    try {
      await createGuestMessage({
        guestAccessCode: board.code,
        guestName: board.guestName,
        guestEmail: board.guestEmail,
        body,
      });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '留言送出失敗，請稍後再試。');
    } finally {
      setSending(false);
    }
  }

  if (!board) {
    return (
      <div className="section active">
        <div className="page-header"><div className="page-header-icon">💬</div><h2>留言板</h2></div>
        <div className="glass-card"><p className="airport-lead">請使用有效的訪客碼或已核准的訪客帳號登入後，再使用留言板。</p></div>
      </div>
    );
  }

  return (
    <div className="section active">
      <div className="page-header"><div className="page-header-icon">💬</div><h2>留言板</h2></div>
      <div className="glass-card">
        <p className="airport-lead">有任何問題或需要協助都可以在這裡留言，管理員回覆後會即時顯示。</p>
        <div className="message-thread">
          {messages.length === 0 ? <p className="message-empty">目前還沒有留言，歡迎留下第一則訊息。</p> : messages.map((message) => (
            <article key={message.id} className={`message-bubble ${message.authorType}`}>
              <div className="message-meta"><strong>{message.authorType === 'admin' ? '管理員' : message.authorName}</strong><span>{formatMessageTime(message)}</span></div>
              <p>{message.body}</p>
            </article>
          ))}
        </div>
        <form className="message-compose" onSubmit={handleSubmit}>
          <label htmlFor="guest-message">留下留言</label>
          <textarea id="guest-message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="請輸入想詢問的內容…" rows={4} />
          {error && <p className="message-error">{error}</p>}
          <button type="submit" className="btn-gold" disabled={sending || !body.trim()}>{sending ? '送出中…' : '送出留言'}</button>
        </form>
      </div>
    </div>
  );
}

function formatMessageTime(message: GuestMessage): string {
  return message.createdAt?.toDate?.().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || '剛剛';
}
