import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LightboxProvider, ZoomableImg } from './guest/shared/Lightbox';
import { Modal } from './admin/Modal';
import './styles/tokens.css';
import './guest/legacy.css';
import './admin/admin.css';
import './design-preview.css';

const illustration = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700">
  <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#b8c8cb"/><stop offset="1" stop-color="#ede4cf"/></linearGradient></defs>
  <rect width="1000" height="700" fill="url(#sky)"/>
  <circle cx="785" cy="142" r="82" fill="#eee5c9" opacity=".8"/>
  <path d="M0 490h1000v210H0z" fill="#aa9c8b"/><path d="M0 555h1000" stroke="#e7dbca" stroke-width="5"/>
  <path d="M75 105h350v425H75z" fill="#6c746e"/><path d="M450 220h270v310H450z" fill="#8e8e7d"/><path d="M735 158h225v372H735z" fill="#777f7b"/>
  <g fill="#dbcdb3"><path d="M105 138h90v145h-90zM220 138h90v145h-90zM335 138h60v145h-60zM105 310h90v145h-90zM220 310h90v145h-90zM335 310h60v145h-60z"/><path d="M480 250h80v115h-80zM590 250h95v115h-95zM480 390h80v115h-80zM590 390h95v115h-95z"/><path d="M760 188h75v120h-75zM855 188h75v120h-75zM760 335h75v120h-75zM855 335h75v120h-75z"/></g>
  <path d="M40 510h920" stroke="#4d514a" stroke-width="11"/>
  <path d="M502 522v178" stroke="#706959" stroke-width="8"/><path d="M492 580h20" stroke="#eee5c9" stroke-width="9"/>
  <text x="500" y="642" text-anchor="middle" font-family="serif" font-size="32" fill="#f6efe2" letter-spacing="9">蔵前 · KURAMAE</text>
</svg>`)} `;

function DesignPreview() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <LightboxProvider>
      <main className="design-review-page">
        <header className="design-review-header">
          <span className="design-review-kicker">KURACHEN STAY / LOCAL PREVIEW</span>
          <h1>互動改版預覽</h1>
          <p>保留藏前民宿的深色與金色語氣，先改善圖片檢視、手機選單和管理對話框。</p>
          <div className="design-review-note">這是本機展示頁，使用示意資料；正式網站尚未更新。</div>
        </header>

        <div className="design-review-grid">
          <section className="design-review-card">
            <div className="design-review-number">01 / GUEST</div>
            <h2>圖片檢視</h2>
            <p>點擊照片放大。手機可向下滑動關閉，照片會跟著手指移動；Esc、背景點擊和關閉按鈕也保留。</p>
            <ZoomableImg className="design-review-photo" src={illustration} alt="藏前街景示意圖" />
            <div className="design-review-hint">點擊圖片試試看 ↗</div>
          </section>

          <section className="design-review-card">
            <div className="design-review-number">02 / ADMIN</div>
            <h2>管理對話框</h2>
            <p>開啟時用輕微位移交代空間關係，鍵盤焦點留在對話框內；Esc 和背景點擊可關閉。</p>
            <div className="design-review-modal-sample">
              <span>預約摘要</span>
              <strong>入住資料清楚呈現</strong>
              <small>適合預約、支出與通知設定等表單。</small>
            </div>
            <button type="button" className="design-review-action" onClick={() => setModalOpen(true)}>開啟對話框 <span>↗</span></button>
          </section>

          <section className="design-review-card design-review-phone-card">
            <div className="design-review-number">03 / MOBILE ADMIN</div>
            <h2>手機「更多」選單</h2>
            <p>選單從底部進出，可用上方把手向下拖曳；操作中的位置即時跟隨手指。</p>
            <div className="design-review-phone-shell">
              <iframe title="手機版後台選單互動預覽" src="/design-preview-phone.html" />
            </div>
          </section>
        </div>
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="design-review-dialog">
          <div className="design-review-number">ADMIN / DIALOG</div>
          <h2>預約資料</h2>
          <p>這裡以示意內容呈現新版對話框動態。實際功能仍使用原本的表單與資料權限。</p>
          <div className="design-review-dialog-row"><span>入住日期</span><strong>10 月 12 日</strong></div>
          <div className="design-review-dialog-row"><span>退房日期</span><strong>10 月 15 日</strong></div>
          <button type="button" className="design-review-action" onClick={() => setModalOpen(false)}>完成</button>
        </div>
      </Modal>
    </LightboxProvider>
  );
}

createRoot(document.getElementById('root')!).render(<DesignPreview />);
