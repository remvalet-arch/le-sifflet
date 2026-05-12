type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
};

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  size = "md",
}: ToggleProps) {
  const trackSz = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const thumbSz = size === "sm" ? "size-3.5" : "size-4.5";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex shrink-0 items-center rounded-pill border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whistle focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${trackSz} ${checked ? "bg-whistle" : "bg-zinc-700"}`}
      >
        <span
          className={`inline-block rounded-full bg-white shadow-sm transition-transform ${thumbSz} ${checked ? translate : "translate-x-0.5"}`}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-zinc-300">{label}</span>
      )}
    </label>
  );
}
