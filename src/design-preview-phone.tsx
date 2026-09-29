import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './guest/legacy.css';
import './admin/admin.css';
import './design-preview.css';

const menuItems = ['財務總覽', '支出管理', '付款資訊', '使用者', '鑰匙管理', '訪客碼', '推薦地點', '通知設定', 'Email 管理'];

function PhonePreview() {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragRef = useRef<{ id: number; startY: number; started: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function show() {
    setDragY(0);
    setClosing(false);
    setEntered(false);
    setOpen(true);
  }

  function hide() {
    if (timerRef.current || !open) return;
    setDragging(false);
    setEntered(false);
    setClosing(true);
    timerRef.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setDragY(0);
      timerRef.current = null;
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 220);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    dragRef.current = { id: event.pointerId, startY: event.clientY, started: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id !== event.pointerId) return;
    setDragY(Math.max(0, event.clientY - dragRef.current.startY));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const distance = Math.max(0, event.clientY - drag.startY);
    const velocity = distance / Math.max(1, performance.now() - drag.started);
    dragRef.current = null;
    setDragging(false);
    if (distance > 110 || (distance > 38 && velocity > 0.7)) hide();
    else setDragY(0);
  }

  return (
    <div className="design-phone-page">
      <div className="design-phone-header"><span className="admin-brand-mark">藏前</span><span>管理後台</span><span className="design-phone-bell">♧</span></div>
      <div className="design-phone-content">
        <div className="design-review-number">TODAY / OVERVIEW</div>
        <h1>今日營運</h1>
        <p>需要的資訊，打開就看得見。</p>
        <div className="design-phone-stat"><span>今日入住</span><strong>1 組</strong><small>15:00 後可入住</small></div>
        <div className="design-phone-stat"><span>待處理事項</span><strong>2 件</strong><small>訪客確認 · 鑰匙交接</small></div>
      </div>
      <nav className="admin-mobile-nav" aria-label="示意導覽">
        {['今日', '行事曆', '預約', '推薦牆'].map((item, index) => <button key={item} className={`admin-mobile-nav-item${index === 0 ? ' active' : ''}`} type="button"><span className="design-phone-icon">{['⌂', '▦', '▤', '✧'][index]}</span><span>{item}</span></button>)}
        <button className={`admin-mobile-nav-item${open ? ' active' : ''}`} type="button" onClick={show}><span className="design-phone-icon">•••</span><span>更多</span></button>
      </nav>
      {open && <div className={`admin-more-menu${entered ? ' entered' : ''}${closing ? ' closing' : ''}${dragging ? ' dragging' : ''}`} style={{ '--more-drag': `${dragY}px`, '--more-backdrop-opacity': Math.max(0.35, 0.72 - dragY / 800) } as CSSProperties}>
        <button className="admin-more-backdrop" type="button" onClick={hide} aria-label="關閉更多選單" />
        <section className="admin-more-sheet" role="dialog" aria-modal="true" aria-labelledby="phone-more-title">
          <div className="admin-more-handle-zone" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}><div className="admin-more-handle" /></div>
          <div className="admin-more-heading"><div><p>KURACHEN 管理</p><h2 id="phone-more-title">更多功能</h2></div><button type="button" onClick={hide} aria-label="關閉更多選單">×</button></div>
          <div className="admin-more-grid">{menuItems.map((item, index) => <button type="button" className="admin-more-link" key={item} onClick={hide}><span className="design-phone-menu-icon">{['◫', '◈', '▣', '♙', '⚿', '⌗', '⌖', '◎', '✉'][index]}</span>{item}</button>)}</div>
          <div className="admin-more-actions"><button type="button" className="btn-ghost" onClick={hide}>查看房客頁面</button></div>
        </section>
      </div>}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<PhonePreview />);
