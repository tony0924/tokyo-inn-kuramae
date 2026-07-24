const SERVICE_WORKER_URL = '/sw.js';

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error: unknown) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
