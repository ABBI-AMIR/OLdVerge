import { useEffect, useRef } from 'react';

// Focus trap for dialogs and drawers: focus moves in, Tab stays inside, Escape closes, and focus returns to the trigger.
export function useDialogFocus(open, onClose) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const panel = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (!panel) return undefined;
    const previousFocus = document.activeElement;
    const getFocusable = () => [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((element) => element.getClientRects().length > 0);
    const focusables = getFocusable();
    (panel.querySelector('[autofocus]') || focusables[0])?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const current = getFocusable();
      if (!current.length) { event.preventDefault(); return; }
      const first = current[0];
      const last = current[current.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);
}
