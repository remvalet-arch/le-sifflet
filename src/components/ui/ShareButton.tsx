"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type ShareButtonProps = {
  title: string;
  text: string;
  url: string;
  label: string;
  labelCopy: string;
  labelCopied: string;
  labelWhatsApp: string;
  labelSms: string;
  className?: string;
};

export function ShareButton({
  title,
  text,
  url,
  label,
  labelCopy,
  labelCopied,
  labelWhatsApp,
  labelSms,
  className = "",
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setTimeout(() => setShowMenu(false), 0);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showMenu]);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, text, url }).catch(() => {
        setShowMenu(true);
      });
    } else {
      setShowMenu((v) => !v);
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(`${text}\n\n${url}`);
    setCopied(true);
    setShowMenu(false);
    toast.success(labelCopied);
    setTimeout(() => setCopied(false), 2000);
  }

  const encoded = encodeURIComponent(`${text}\n\n${url}`);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800/80 px-3 py-2 text-xs font-black text-zinc-300 transition hover:bg-zinc-700 border border-white/5 backdrop-blur-md"
      >
        <Share2 className="h-3.5 w-3.5 text-whistle" />
        {label}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-2xl border border-white/10 bg-zinc-900 py-1 shadow-xl">
          <a
            href={`https://wa.me/?text=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowMenu(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-green-400" />
            {labelWhatsApp}
          </a>
          <a
            href={`sms:?body=${encoded}`}
            onClick={() => setShowMenu(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-blue-400" />
            {labelSms}
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            {copied ? (
              <Check className="h-4 w-4 shrink-0 text-green-400" />
            ) : (
              <Copy className="h-4 w-4 shrink-0" />
            )}
            {copied ? labelCopied : labelCopy}
          </button>
        </div>
      )}
    </div>
  );
}
