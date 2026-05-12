"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const PULL_THRESHOLD = 72;

export function usePullToRefresh() {
  const router = useRouter();
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullPct, setPullPct] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 4) return;
    startY.current = e.touches[0]!.clientY;
    pulling.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    const diff = e.touches[0]!.clientY - startY.current;
    if (diff <= 0) {
      setPullPct(0);
      return;
    }
    setPullPct(Math.min(diff / PULL_THRESHOLD, 1));
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullPct >= 1 && !isRefreshing) {
      setIsRefreshing(true);
      router.refresh();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullPct(0);
      }, 1200);
    } else {
      setPullPct(0);
    }
    startY.current = 0;
  }, [pullPct, isRefreshing, router]);

  return { pullPct, isRefreshing, onTouchStart, onTouchMove, onTouchEnd };
}
