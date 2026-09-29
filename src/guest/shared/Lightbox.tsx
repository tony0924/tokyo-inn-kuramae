import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
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
  const [closing, setClosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ pointerId: number; startY: number; startTime: number } | null>(null);

  const open = (src: string, alt = '') => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setClosing(false);
    setDragY(0);
    setState({ src, alt });
  };
  const close = () => {
    if (closeTimerRef.current || !state) return;
    setDragging(false);
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setState(null);
      setClosing(false);
      setDragY(0);
      closeTimerRef.current = null;
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 220);
  };

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLImageElement>) {
    if (event.button !== 0 || closing) return;
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startTime: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLImageElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    setDragY(Math.max(0, event.clientY - dragRef.current.startY));
  }

  function handlePointerUp(event: PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.max(0, event.clientY - drag.startY);
    const velocity = distance / Math.max(1, performance.now() - drag.startTime);
    dragRef.current = null;
    setDragging(false);
    if (distance > 110 || (distance > 38 && velocity > 0.7)) close();
    else setDragY(0);
  }

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        e.preventDefault();
        closeRef.current?.focus();
      }
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
          <div
            className={`lightbox open${closing ? ' closing' : ''}${dragging ? ' dragging' : ''}`}
            style={{ '--lightbox-drag': `${dragY}px`, '--lightbox-dim': Math.max(0.56, 0.92 - dragY / 800), '--lightbox-scale': Math.max(0.88, 1 - dragY / 1800) } as CSSProperties}
            onClick={(event) => { if (event.target === event.currentTarget) close(); }}
            role="dialog"
            aria-modal="true"
            aria-label="圖片放大檢視"
          >
            <button ref={closeRef} type="button" className="lightbox-close" onClick={close} aria-label="關閉圖片檢視">
              ✕
            </button>
            <img
              src={state.src}
              alt={state.alt}
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => e.preventDefault()}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            <div className="lightbox-caption">向下滑動或點擊背景關閉 · ESC</div>
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
