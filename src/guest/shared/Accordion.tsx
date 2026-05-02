import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface Props {
  /** Optional anchor id for cross-tab jumps (jumpTo target) */
  id?: string;
  /** Emoji or short icon shown in the gold-tinted square */
  icon?: ReactNode;
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Accordion({ id, icon, title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const location = useLocation();

  useEffect(() => {
    const anchor = (location.state as { anchor?: string } | null)?.anchor;
    if (id && anchor === id) setOpen(true);
  }, [id, location.state]);

  return (
    <div className="accordion" id={id}>
      <div
        className={`acc-header${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <div className="acc-title">
          {icon !== undefined && <span className="acc-title-icon">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className={`acc-arrow${open ? ' open' : ''}`} aria-hidden>
          ▼
        </div>
      </div>
      <div className={`acc-body${open ? ' open' : ''}`}>{children}</div>
    </div>
  );
}
