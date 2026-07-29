import { useEffect, useState, type FormEvent } from 'react';
import {
  createGuestCommunityMessage,
  deleteGuestCommunityMessage,
  watchGuestCommunityMessages,
} from '@/lib/guestMessages';
import { clearAppBadge } from '@/lib/pushNotifications';
import type { GuestCommunityMessage } from '@/types';

export function MessageManagement() {
  const [messages, setMessages] = useState<GuestCommunityMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void clearAppBadge();
  }, []);

  useEffect(
    () => watchGuestCommunityMessages(
      (next) => {
        setMessages(next);
        setLoadError(null);
      },
      () => setLoadError('無法載入推薦牆，請重新整理後再試。'),
      500
    ),
    []
  );

  async function handleReply(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await createGuestCommunityMessage({ body });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '回覆送出失敗，請稍後再試。');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(message: GuestCommunityMessage) {
    if (!window.confirm(`確定要刪除「${message.authorName}」的這則留言嗎？`)) return;
    setDeletingId(message.id);
    setError(null);
    try {
      await deleteGuestCommunityMessage(message.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗，請稍後再試。');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">推薦牆管理</h1>
          <p className="admin-page-subtitle">查看所有訪客的公開留言、直接回覆或移除不適當內容。</p>
        </div>
      </div>

      {loadError ? (
        <div className="admin-empty-state">{loadError}</div>
      ) : (
        <section className="admin-message-thread admin-community-thread">
          <div className="admin-message-thread-head">
            <span className="admin-message-avatar" aria-hidden="true">牆</span>
            <span>
              <strong>訪客推薦牆</strong>
              <small>共 {messages.length} 則公開留言</small>
            </span>
          </div>
          <div className="message-thread">
            {messages.length === 0 ? (
              <div className="admin-empty-state">目前還沒有訪客留言。</div>
            ) : messages.map((message) => (
              <article key={message.id} className={`message-bubble ${message.authorType}`}>
                <div className="message-meta">
                  <strong>{message.authorType === 'admin' ? `管理員・${message.authorName}` : message.authorName}</strong>
                  <span>{formatMessageTime(message)}</span>
                </div>
                <p>{message.body}</p>
                <button
                  type="button"
                  className="admin-message-delete"
                  disabled={deletingId === message.id}
                  onClick={() => void handleDelete(message)}
                >
                  {deletingId === message.id ? '刪除中…' : '刪除'}
                </button>
              </article>
            ))}
          </div>
          <form className="message-compose" onSubmit={handleReply}>
            <label htmlFor="admin-reply">公開回覆推薦牆</label>
            <textarea id="admin-reply" value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder="輸入所有訪客都能看到的回覆…" rows={4} />
            {error && <p className="message-error">{error}</p>}
            <button type="submit" className="btn-gold" disabled={sending || !body.trim()}>{sending ? '送出中…' : '公開回覆'}</button>
          </form>
        </section>
      )}
    </div>
  );
}

function formatMessageTime(message: GuestCommunityMessage): string {
  return message.createdAt?.toDate?.().toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) || '剛剛';
}
