import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

  const open = (src: string, alt = '') => setState({ src, alt });
  const close = () => setState(null);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [state]);

  return (
    <LightboxContext.Provider value={{ open, close }}>
      {children}
      {state &&
        createPortal(
          <div className="lightbox open" onClick={close}>
            <span className="lightbox-close" onClick={close}>
              ✕
            </span>
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
      onLoad={(e) => e.currentTarget.classList.add('loaded')}
      onClick={() => open(src, alt)}
      style={{ cursor: 'zoom-in' }}
      {...rest}
    />
  );
}
