import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface GalleryImage {
  src: string;
  alt: string;
}

interface LightboxContextValue {
  open: (src: string, alt?: string, gallery?: readonly GalleryImage[]) => void;
  close: () => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox(): LightboxContextValue {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error('useLightbox must be used within LightboxProvider');
  return ctx;
}

interface State {
  images: readonly GalleryImage[];
  index: number;
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [closing, setClosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startTime: number; axis: 'x' | 'y' | null } | null>(null);
  const isOpen = state !== null;

  const open = useCallback((src: string, alt = '', gallery?: readonly GalleryImage[]) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dragRef.current = null;
    setDragging(false);
    setClosing(false);
    setDrag({ x: 0, y: 0 });
    const index = gallery?.findIndex((image) => image.src === src) ?? -1;
    setState(index >= 0 && gallery ? { images: [...gallery], index } : { images: [{ src, alt }], index: 0 });
  }, []);

  const close = useCallback(() => {
    if (closeTimerRef.current || !isOpen) return;
    dragRef.current = null;
    setDragging(false);
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setState(null);
      setClosing(false);
      setDrag({ x: 0, y: 0 });
      closeTimerRef.current = null;
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 220);
  }, [isOpen]);

  const move = useCallback((direction: number) => {
    if (closeTimerRef.current) return;
    setDrag({ x: 0, y: 0 });
    setState((current) => current ? {
      ...current,
      index: (current.index + direction + current.images.length) % current.images.length,
    } : null);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLImageElement>) {
    if (event.button !== 0 || !event.isPrimary || closing) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startTime: performance.now(), axis: null };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLImageElement>) {
    const start = dragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const x = event.clientX - start.startX;
    const y = event.clientY - start.startY;
    if (!start.axis && Math.max(Math.abs(x), Math.abs(y)) > 10) {
      start.axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y';
    }
    setDrag({ x: start.axis === 'x' && (state?.images.length ?? 0) > 1 ? x : 0, y: start.axis === 'y' ? Math.max(0, y) : 0 });
  }

  function resetDrag() {
    dragRef.current = null;
    setDragging(false);
    setDrag({ x: 0, y: 0 });
  }

  function handlePointerUp(event: PointerEvent<HTMLImageElement>) {
    const start = dragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const x = event.clientX - start.startX;
    const y = Math.max(0, event.clientY - start.startY);
    const duration = Math.max(1, performance.now() - start.startTime);
    resetDrag();
    if (start.axis === 'x' && state && state.images.length > 1 &&
      (Math.abs(x) > 60 || (Math.abs(x) > 30 && Math.abs(x) / duration > 0.5))) {
      move(x < 0 ? 1 : -1);
    } else if (start.axis === 'y' && (y > 110 || (y > 38 && y / duration > 0.7))) {
      close();
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
      if (event.key === 'Tab') {
        const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (buttons.length) {
          event.preventDefault();
          buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [isOpen, close, move]);

  const image = state?.images[state.index];
  return (
    <LightboxContext.Provider value={{ open, close }}>
      {children}
      {state && image && createPortal(
        <div
          ref={dialogRef}
          className={`lightbox open${closing ? ' closing' : ''}${dragging ? ' dragging' : ''}`}
          style={{ '--lightbox-drag-x': `${drag.x}px`, '--lightbox-drag': `${drag.y}px`, '--lightbox-dim': Math.max(0.56, 0.92 - drag.y / 800), '--lightbox-scale': Math.max(0.88, 1 - drag.y / 1800) } as CSSProperties}
          onClick={(event) => { if (event.target === event.currentTarget) close(); }}
          role="dialog"
          aria-modal="true"
          aria-label="圖片放大檢視"
        >
          <button ref={closeRef} type="button" className="lightbox-close" onClick={close} aria-label="關閉圖片檢視">✕</button>
          {state.images.length > 1 && <>
            <button type="button" className="lightbox-nav lightbox-prev" onClick={() => move(-1)} aria-label="上一張照片">‹</button>
            <button type="button" className="lightbox-nav lightbox-next" onClick={() => move(1)} aria-label="下一張照片">›</button>
          </>}
          <img
            src={image.src}
            alt={image.alt}
            draggable={false}
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => event.preventDefault()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={resetDrag}
            onLostPointerCapture={() => { if (dragRef.current) resetDrag(); }}
          />
          <div className="lightbox-caption">
            <div className="lightbox-photo-info" aria-live="polite" aria-atomic="true">
              <strong>{image.alt}</strong>
              {state.images.length > 1 && <span>{state.index + 1} / {state.images.length}</span>}
            </div>
            <span className="lightbox-help">{state.images.length > 1 ? '左右滑動切換 · ' : ''}向下滑動關閉 · Esc</span>
          </div>
        </div>, document.body
      )}
    </LightboxContext.Provider>
  );
}

interface ZoomableImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  gallery?: readonly GalleryImage[];
}

export function ZoomableImg({ src, alt = '', gallery, style, ...rest }: ZoomableImgProps) {
  const { open } = useLightbox();
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={(event) => event.currentTarget.classList.add('loaded')}
      onClick={(event) => { event.currentTarget.focus(); open(src, alt, gallery); }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open(src, alt, gallery);
        }
      }}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={alt ? `放大查看：${alt}` : '放大查看圖片'}
      style={{ cursor: 'zoom-in', ...style }}
      {...rest}
    />
  );
}
