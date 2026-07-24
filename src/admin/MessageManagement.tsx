import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { createAdminReply, watchAllGuestMessages } from '@/lib/guestMessages';
import { clearAppBadge } from '@/lib/pushNotifications';
import type { GuestMessage } from '@/types';

type MessageBoard = {
  code: string;
  guestName: string;
  guestEmail: string | null;
  messages: GuestMessage[];
  latestAt: number;
};

export function MessageManagement() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void clearAppBadge();
  }, []);

  useEffect(
    () => watchAllGuestMessages(
      (next) => {
        setMessages(next);
        setLoadError(null);
      },
      () => setLoadError('無法載入訪客留言，請重新整理後再試。')
    ),
    []
  );

  const boards = useMemo<MessageBoard[]>(() => {
    const grouped = new Map<string, MessageBoard>();
    for (const message of messages) {
      const existing = grouped.get(message.guestAccessCode);
      if (existing) {
        existing.messages.push(message);
        continue;
      }
      grouped.set(message.guestAccessCode, {
        code: message.guestAccessCode,
        guestName: message.guestName || '訪客',
        guestEmail: message.guestEmail,
        messages: [message],
        latestAt: message.createdAt?.toMillis?.() || 0,
      });
    }
    return [...grouped.values()].sort((a, b) => b.latestAt - a.latestAt);
  }, [messages]);

  useEffect(() => {
    if (boards.length && !boards.some((board) => board.code === selectedCode)) setSelectedCode(boards[0].code);
  }, [boards, selectedCode]);

  const selectedBoard = boards.find((board) => board.code === selectedCode) ?? null;
  const thread = selectedBoard ? [...selectedBoard.messages].reverse() : [];

  async function handleReply(event: FormEvent) {
    event.preventDefault();
    if (!selectedBoard || sending) return;
    setSending(true);
    setError(null);
    try {
      await createAdminReply({
        guestAccessCode: selectedBoard.code,
        guestName: selectedBoard.guestName,
        guestEmail: selectedBoard.guestEmail,
        adminName: user?.displayName || user?.email || '管理員',
        body,
      });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '回覆送出失敗，請稍後再試。');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1 className="admin-page-title">留言板</h1><p className="admin-page-subtitle">查看訪客留言並直接回覆。</p></div>
      </div>

      {loadError ? <div className="admin-empty-state">{loadError}</div> : boards.length === 0 ? <div className="admin-empty-state">目前還沒有訪客留言。</div> : (
        <div className="admin-message-layout">
          <div className="admin-message-boards">
            {boards.map((board) => (
              <button key={board.code} type="button" onClick={() => setSelectedCode(board.code)} className={`admin-message-board ${board.code === selectedCode ? 'active' : ''}`}>
                <strong>{board.guestName}</strong><span>{board.guestEmail || `訪客碼 ${board.code}`}</span><small>{board.messages[0]?.body}</small>
              </button>
            ))}
          </div>
          {selectedBoard && <section className="admin-message-thread">
            <div className="admin-message-thread-head"><strong>{selectedBoard.guestName}</strong><span>{selectedBoard.guestEmail || `訪客碼 ${selectedBoard.code}`}</span></div>
            <div className="message-thread">
              {thread.map((message) => <article key={message.id} className={`message-bubble ${message.authorType}`}><div className="message-meta"><strong>{message.authorType === 'admin' ? '管理員' : message.authorName}</strong><span>{formatMessageTime(message)}</span></div><p>{message.body}</p></article>)}
            </div>
            <form className="message-compose" onSubmit={handleReply}>
              <label htmlFor="admin-reply">回覆訪客</label>
              <textarea id="admin-reply" value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder="輸入回覆內容…" rows={4} />
              {error && <p className="message-error">{error}</p>}
              <button type="submit" className="btn-gold" disabled={sending || !body.trim()}>{sending ? '送出中…' : '送出回覆'}</button>
            </form>
          </section>}
        </div>
      )}
    </div>
  );
}

function formatMessageTime(message: GuestMessage): string {
  return message.createdAt?.toDate?.().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || '剛剛';
}
