import { useEffect, useState } from 'react';

export function PwaStatus() {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const markOnline = () => setOffline(false);
    const markOffline = () => setOffline(true);

    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);

    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let disposed = false;
    let refreshing = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    let updateTimer: number | undefined;

    const showWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (!disposed && registration.waiting) {
        setWaitingWorker(registration.waiting);
      }
    };

    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      showWaitingWorker(registration);

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(installingWorker);
          }
        });
      });

      updateTimer = window.setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 60 * 1000);
    };

    navigator.serviceWorker.ready.then(watchRegistration).catch(() => {});

    const reloadForUpdate = () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', reloadForUpdate);

    return () => {
      disposed = true;
      if (updateTimer) window.clearInterval(updateTimer);
      navigator.serviceWorker.removeEventListener('controllerchange', reloadForUpdate);
    };
  }, []);

  if (!offline && !waitingWorker) return null;

  const applyUpdate = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <div className="pwa-status-stack" aria-live="polite">
      {offline && (
        <div className="pwa-status pwa-status-offline" role="status">
          目前沒有網路連線，重新連線後即可繼續管理。
        </div>
      )}
      {waitingWorker && (
        <div className="pwa-status pwa-status-update" role="status">
          <span>藏前管理有新版本。</span>
          <button type="button" onClick={applyUpdate}>
            立即更新
          </button>
        </div>
      )}
    </div>
  );
}
