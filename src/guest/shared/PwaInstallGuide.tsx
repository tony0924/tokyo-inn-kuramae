import { useEffect, useRef, useState } from 'react';
import { usePwaInstall } from '@/pwa/guestInstall';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PwaInstallGuide({ open, onClose }: Props) {
  const {
    device,
    installed,
    installAvailable,
    isIosSafari,
    isInAppBrowser,
    requestInstall,
  } = usePwaInstall();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [installResult, setInstallResult] = useState<'accepted' | 'dismissed' | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const heading = installed
    ? '已從主畫面開啟'
    : device === 'ios'
      ? '加入 iPhone 主畫面'
      : device === 'android'
        ? '安裝到 Android 手機'
        : '將網站安裝成 App';

  return (
    <div className="pwa-guide-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="pwa-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-guide-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="pwa-guide-close"
          aria-label="關閉安裝教學"
          onClick={onClose}
        >
          ×
        </button>
        <div className="pwa-guide-heading">
          <span className="pwa-guide-app-icon" aria-hidden="true">藏前</span>
          <p>ADD TO HOME SCREEN</p>
          <h2 id="pwa-guide-title">{heading}</h2>
          <span>安裝後可直接從手機主畫面開啟，不必再尋找網址。</span>
        </div>

        {installed ? (
          <div className="pwa-guide-success" role="status">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>已經設定完成</strong>
              <p>你現在正以 KURACHEN Stay App 模式瀏覽。</p>
            </div>
          </div>
        ) : device === 'ios' ? (
          <>
            {!isIosSafari && (
              <div className="pwa-guide-browser-note">
                <strong>{isInAppBrowser ? '請先改用 Safari 開啟' : '建議使用 Safari 安裝'}</strong>
                <p>
                  點選目前瀏覽器的分享或更多選單，選擇「在 Safari 中開啟」，再依下列步驟操作。
                </p>
              </div>
            )}
            <ol className="pwa-guide-steps">
              <InstallStep number="1" icon="🧭" title="使用 Safari 開啟">
                確認目前是在 iPhone 的 Safari 瀏覽器中。
              </InstallStep>
              <InstallStep number="2" icon="□↑" title="點選分享">
                點選 Safari 工具列的分享按鈕；新版介面也可能先從「更多」進入分享。
              </InstallStep>
              <InstallStep number="3" icon="＋" title="加入主畫面">
                向下捲動並點選「加入主畫面」。若沒看到，可在「編輯動作」加入。
              </InstallStep>
              <InstallStep number="4" icon="✓" title="確認加入">
                保留名稱 KURACHEN Stay，點選右上角「加入」。
              </InstallStep>
            </ol>
          </>
        ) : device === 'android' ? (
          <>
            {installAvailable ? (
              <button
                type="button"
                className="pwa-guide-install-button"
                onClick={async () => {
                  const result = await requestInstall();
                  if (result !== 'unavailable') setInstallResult(result);
                }}
              >
                安裝 KURACHEN Stay
              </button>
            ) : null}
            <ol className="pwa-guide-steps">
              <InstallStep number="1" icon="⋮" title="開啟 Chrome 選單">
                點選網址列右側的「更多」圖示。
              </InstallStep>
              <InstallStep number="2" icon="＋" title="加到主畫面">
                點選「加到主畫面」，接著選擇「安裝」。
              </InstallStep>
              <InstallStep number="3" icon="✓" title="完成安裝">
                依畫面指示完成後，就能從手機主畫面開啟。
              </InstallStep>
            </ol>
          </>
        ) : (
          <ol className="pwa-guide-steps">
            <InstallStep number="1" icon="⋮" title="開啟瀏覽器選單">
              在 Chrome 選單中找到「將頁面安裝為應用程式」或網址列的安裝圖示。
            </InstallStep>
            <InstallStep number="2" icon="✓" title="確認安裝">
              按照瀏覽器提示完成，即可從電腦的應用程式列表開啟。
            </InstallStep>
          </ol>
        )}

        {installResult === 'dismissed' && (
          <p className="pwa-guide-result" role="status">這次沒有安裝，之後仍可從使用指南重新操作。</p>
        )}
        <p className="pwa-guide-footnote">
          安裝不會建立新的帳號；仍需使用原本的 Gmail 或訪客碼進入房客網站。
        </p>
        <button type="button" className="pwa-guide-done" onClick={onClose}>
          {installed ? '完成' : '我知道了'}
        </button>
      </section>
    </div>
  );
}

function InstallStep({
  number,
  icon,
  title,
  children,
}: {
  number: string;
  icon: string;
  title: string;
  children: string;
}) {
  return (
    <li>
      <span className="pwa-guide-step-number">{number}</span>
      <span className="pwa-guide-step-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </li>
  );
}
