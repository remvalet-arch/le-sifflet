"use client";

import { useEffect, useRef } from "react";

function collectFocusable(root: HTMLElement): HTMLElement[] {
  const sel = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return [...root.querySelectorAll<HTMLElement>(sel)].filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
}

/** Traps keyboard focus inside containerRef when isActive is true. Restores focus on deactivation. */
export function useFocusTrap(
  isActive: boolean,
  onClose: () => void,
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const prevActive = document.activeElement as HTMLElement | null;
    const root = ref.current;
    if (!root) return;

    const focusables = collectFocusable(root);
    (focusables[0] ?? root).focus();

    function onKeyDown(e: KeyboardEvent) {
      const trapRoot = ref.current;
      if (!trapRoot) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = collectFocusable(trapRoot);
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevActive?.focus?.();
    };
  }, [isActive, onClose]);

  return ref;
}
