"use client";

import { useEffect } from "react";

export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // When scrollY === 0 (always the case in our h-[100dvh] shell layout),
    // applying position:fixed triggers iOS Safari to recalculate safe-area
    // insets and causes layout jumps in fixed modals. Skip it when not needed.
    if (scrollY === 0) {
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }

    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.paddingRight = "";
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
