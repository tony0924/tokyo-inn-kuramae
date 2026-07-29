import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { getStoredGuestAccessCode, validateGuestAccessCode } from '@/lib/guestAccessCodes';
import {
  createGuestCommunityMessage,
  watchGuestCommunityMessages,
} from '@/lib/guestMessages';
import type { GuestCommunityMessage } from '@/types';

export function MessageBoardTab() {
  const { user } = useAuth();
  const [guestAccessCode, setGuestAccessCode] = useState<string | null>(null);
  const [canPost, setCanPost] = useState(false);
  const [messages, setMessages] = useState<GuestCommunityMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const guestCode = !user ? getStoredGuestAccessCode() : null;

    async function loadAccess() {
      setCanPost(false);
      setGuestAccessCode(null);
      if (guestCode) {
        const access = await validateGuestAccessCode(guestCode);
        if (!cancelled && access) {
          setGuestAccessCode(access.code);
          setCanPost(true);
        }
        return;
      }

      if (user && (user.role === 'admin' || (user.role === 'guest' && user.active))) {
        setCanPost(true);
      }
    }

    loadAccess().catch(() => !cancelled && setError('無法確認留言權限，請稍後再試。'));
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    return watchGuestCommunityMessages(
      setMessages,
      () => setError('無法載入大家的留言，請稍後再試。')
    );
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canPost || sending) return;
    setSending(true);
    setError(null);
    try {
      await createGuestCommunityMessage({
        guestAccessCode,
        body,
      });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '留言送出失敗，請稍後再試。');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="section active">
      <div className="page-header"><div className="page-header-icon">💬</div><h2>訪客推薦牆</h2></div>
      <div className="glass-card">
        <p className="airport-lead">發現好吃的餐廳、喜歡的小店或實用的旅行情報嗎？歡迎分享給接下來入住的旅人，所有訪客都看得到大家的推薦。</p>
        <div className="message-thread">
          {messages.length === 0 ? <p className="message-empty">目前還沒有推薦，歡迎分享第一個私房景點或美食。</p> : messages.map((message) => (
            <article key={message.id} className={`message-bubble ${message.authorType}`}>
              <div className="message-meta"><strong>{message.authorType === 'admin' ? `管理員・${message.authorName}` : message.authorName}</strong><span>{formatMessageTime(message)}</span></div>
              <p>{message.body}</p>
            </article>
          ))}
        </div>
        <form className="message-compose" onSubmit={handleSubmit}>
          <label htmlFor="guest-message">分享你的推薦</label>
          <textarea id="guest-message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="例如：藏前站附近的咖啡店、餐廳、景點或旅行小提醒…" rows={4} disabled={!canPost} />
          {error && <p className="message-error">{error}</p>}
          {!canPost && <p className="message-error">請使用有效的訪客碼或已核准的訪客帳號登入後再留言。</p>}
          <button type="submit" className="btn-gold" disabled={!canPost || sending || !body.trim()}>{sending ? '送出中…' : '分享推薦'}</button>
        </form>
      </div>
    </div>
  );
}

function formatMessageTime(message: GuestCommunityMessage): string {
  return message.createdAt?.toDate?.().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || '剛剛';
}
