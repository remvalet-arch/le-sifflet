"use client";

import type { ReactNode } from "react";

type EmptyStateVariant =
  | "no-data"
  | "no-results"
  | "no-permission"
  | "error"
  | "offline";

const VARIANT_DEFAULTS: Record<
  EmptyStateVariant,
  { emoji: string; bg: string; border: string }
> = {
  "no-data": {
    emoji: "📭",
    bg: "bg-zinc-900",
    border: "border-white/8",
  },
  "no-results": {
    emoji: "🔍",
    bg: "bg-zinc-900",
    border: "border-white/8",
  },
  "no-permission": {
    emoji: "🔒",
    bg: "bg-zinc-900",
    border: "border-white/8",
  },
  error: {
    emoji: "⚠️",
    bg: "bg-red-950/20",
    border: "border-red-500/20",
  },
  offline: {
    emoji: "📡",
    bg: "bg-zinc-900",
    border: "border-white/8",
  },
};

type EmptyStateProps = {
  variant?: EmptyStateVariant;
  emoji?: string;
  title: string;
  description?: string;
  cta?: ReactNode;
  className?: string;
};

export function EmptyState({
  variant = "no-data",
  emoji,
  title,
  description,
  cta,
  className = "",
}: EmptyStateProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const icon = emoji ?? defaults.emoji;

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border px-6 py-10 text-center ${defaults.bg} ${defaults.border} ${className}`}
    >
      <span className="text-3xl">{icon}</span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-black text-white">{title}</p>
        {description && (
          <p className="max-w-[220px] text-xs text-zinc-500">{description}</p>
        )}
      </div>
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}
