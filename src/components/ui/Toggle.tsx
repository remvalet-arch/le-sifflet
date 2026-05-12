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
  const thumbSz = size === "sm" ? "size-3.5" : "size-4";
  const thumbOn = size === "sm" ? "translate-x-4" : "translate-x-5";

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
        className={`relative inline-block shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whistle focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${trackSz} ${checked ? "bg-whistle" : "bg-zinc-700"}`}
      >
        <span
          className={`absolute top-1/2 left-0.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200 ${thumbSz} ${checked ? thumbOn : "translate-x-0"}`}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-zinc-300">{label}</span>
      )}
    </label>
  );
}
