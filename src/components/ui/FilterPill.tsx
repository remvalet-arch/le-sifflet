type FilterPillProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
};

export function FilterPill({
  active,
  onClick,
  children,
  className = "",
}: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-none snap-start rounded-pill border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition ${
        active
          ? "border-whistle bg-whistle/20 text-whistle"
          : "border-white/10 bg-zinc-800/90 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
      } ${className}`}
    >
      {children}
    </button>
  );
}
