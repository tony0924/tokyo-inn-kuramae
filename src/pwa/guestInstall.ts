import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type PwaDeviceKind = 'ios' | 'android' | 'desktop' | 'other';

export interface PwaInstallState {
  device: PwaDeviceKind;
  installed: boolean;
  installAvailable: boolean;
  isIosSafari: boolean;
  isInAppBrowser: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator
      && (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

function detectEnvironment(): Omit<PwaInstallState, 'installAvailable'> {
  const userAgent = navigator.userAgent;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|MessengerForiOS/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent)
    && !isInAppBrowser;

  return {
    device: isAppleMobile
      ? 'ios'
      : isAndroid
        ? 'android'
        : /Macintosh|Windows|Linux/i.test(userAgent)
          ? 'desktop'
          : 'other',
    installed: isStandalone(),
    isIosSafari: isAppleMobile && isSafari,
    isInAppBrowser,
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function usePwaInstall(): PwaInstallState & {
  requestInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
} {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const update = () => setRevision((current) => current + 1);
    listeners.add(update);
    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', update);
    return () => {
      listeners.delete(update);
      media.removeEventListener?.('change', update);
    };
  }, []);

  const requestInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable' as const;
    const prompt = deferredPrompt;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') deferredPrompt = null;
    notify();
    return choice.outcome;
  }, []);

  void revision;
  return {
    ...detectEnvironment(),
    installAvailable: Boolean(deferredPrompt),
    requestInstall,
  };
}

export function applyGuestPwaMetadata(): () => void {
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  const applicationName = document.querySelector<HTMLMetaElement>('meta[name="application-name"]');
  const previousManifest = manifest?.href;
  const previousAppleTitle = appleTitle?.content;
  const previousApplicationName = applicationName?.content;

  manifest?.setAttribute('href', '/guest-manifest.webmanifest');
  appleTitle?.setAttribute('content', 'KURACHEN Stay');
  applicationName?.setAttribute('content', 'KURACHEN Stay');

  return () => {
    if (manifest && previousManifest) manifest.href = previousManifest;
    if (appleTitle && previousAppleTitle) appleTitle.content = previousAppleTitle;
    if (applicationName && previousApplicationName) {
      applicationName.content = previousApplicationName;
    }
  };
}
