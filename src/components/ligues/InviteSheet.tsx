"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Link2, QrCode, X } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  inviteCode: string;
  squadName: string;
  onClose: () => void;
};

export function InviteSheet({ inviteCode, squadName, onClose }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const inviteUrl = `https://vartime.app/join/${inviteCode}`;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function copyLink() {
    void navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function copyCode() {
    void navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    toast.success(`Code ${inviteCode} copié !`);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-sheet-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className="relative z-10 w-full max-w-lg animate-in slide-in-from-bottom-4 rounded-t-3xl border-t border-white/10 bg-zinc-950 px-5 pb-10 pt-5 duration-200"
        style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom))" }}
      >
        {/* Handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-700" />

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Inviter dans
            </p>
            <h2
              id="invite-sheet-title"
              className="mt-0.5 text-lg font-black text-white"
            >
              {squadName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* QR Code */}
        <div className="mb-5 flex justify-center">
          <div className="rounded-2xl border border-white/10 bg-white p-4">
            <QRCodeSVG
              value={inviteUrl}
              size={180}
              bgColor="#ffffff"
              fgColor="#09090b"
              level="M"
            />
          </div>
        </div>

        {/* Code display */}
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3">
          <span className="font-mono text-2xl font-black tracking-[0.25em] text-whistle">
            {inviteCode}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-4 py-3.5 text-left transition hover:bg-zinc-800 active:scale-[0.99]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
              {copiedLink ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Link2 className="h-4 w-4 text-whistle" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">Copier le lien</p>
              <p className="truncate text-[11px] text-zinc-500">{inviteUrl}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={copyCode}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-4 py-3.5 text-left transition hover:bg-zinc-800 active:scale-[0.99]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
              {copiedCode ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <QrCode className="h-4 w-4 text-whistle" />
              )}
            </div>
            <div>
              <p className="text-sm font-black text-white">
                Copier le code seul
              </p>
              <p className="text-[11px] text-zinc-500">
                Partage juste le code à taper manuellement
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
