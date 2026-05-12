"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className = "",
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 animate-[modal-fade-in_200ms_ease-out_both] bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full max-w-lg animate-[modal-sheet_320ms_cubic-bezier(0.16,1,0.3,1)_both] rounded-t-sheet border border-white/10 bg-zinc-900 shadow-2xl ${className}`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-500 transition hover:text-white"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
