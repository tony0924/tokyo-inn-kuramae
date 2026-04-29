import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * If the current location has state.anchor, scroll to that element
 * and apply jump-highlight animation. Used by destination tab.
 */
export function useJumpAnchor() {
  const location = useLocation();

  useEffect(() => {
    const anchor = (location.state as { anchor?: string } | null)?.anchor;
    if (!anchor) return;

    // Wait for DOM render + fadeUp animation
    const timer = window.setTimeout(() => {
      const el = document.getElementById(anchor);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.remove('jump-highlight');
      void el.offsetWidth; // force reflow to restart animation
      el.classList.add('jump-highlight');
      window.setTimeout(() => el.classList.remove('jump-highlight'), 1400);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [location]);
}

export function useJumpTo() {
  const navigate = useNavigate();
  return (tabId: string, anchorId: string) => {
    navigate(`/guest/${tabId}`, { state: { anchor: anchorId } });
  };
}
