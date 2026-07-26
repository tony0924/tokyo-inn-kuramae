import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface LightboxContextValue {
  open: (src: string, alt?: string) => void;
  close: () => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox(): LightboxContextValue {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error('useLightbox must be used within LightboxProvider');
  return ctx;
}

interface State {
  src: string;
  alt: string;
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const open = (src: string, alt = '') => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setState({ src, alt });
  };
  const close = () => setState(null);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      returnFocusRef.current?.focus();
    };
  }, [state]);

  return (
    <LightboxContext.Provider value={{ open, close }}>
      {children}
      {state &&
        createPortal(
          <div className="lightbox open" onClick={close} role="dialog" aria-modal="true" aria-label="圖片放大檢視">
            <button ref={closeRef} type="button" className="lightbox-close" onClick={close} aria-label="關閉圖片檢視">
              ✕
            </button>
            <img
              src={state.src}
              alt={state.alt}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="lightbox-caption">點擊任意處關閉 · ESC</div>
          </div>,
          document.body
        )}
    </LightboxContext.Provider>
  );
}

interface ZoomableImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
}

export function ZoomableImg({ src, alt = '', ...rest }: ZoomableImgProps) {
  const { open } = useLightbox();
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={(e) => e.currentTarget.classList.add('loaded')}
      onClick={() => open(src, alt)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(src, alt);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={alt ? `放大查看：${alt}` : '放大查看圖片'}
      style={{ cursor: 'zoom-in' }}
      {...rest}
    />
  );
}
