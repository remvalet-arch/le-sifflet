"use client";

import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { LoaderCircle } from "lucide-react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function PullToRefresh({ children, className }: Props) {
  const { pullPct, isRefreshing, onTouchStart, onTouchMove, onTouchEnd } =
    usePullToRefresh();

  const visible = pullPct > 0 || isRefreshing;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={className}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: visible ? `${Math.round(pullPct * 40)}px` : "0px" }}
        aria-hidden="true"
      >
        <LoaderCircle
          className={`size-5 text-whistle transition-opacity ${
            isRefreshing ? "animate-spin opacity-100" : "opacity-60"
          }`}
          style={{ transform: `rotate(${pullPct * 360}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}
