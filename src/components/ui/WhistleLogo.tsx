type Size = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<Size, { box: string; svg: number }> = {
  sm: { box: "h-8 w-8 rounded-xl",  svg: 16 },
  md: { box: "h-10 w-10 rounded-xl", svg: 20 },
  lg: { box: "h-16 w-16 rounded-2xl", svg: 32 },
  xl: { box: "h-24 w-24 rounded-3xl", svg: 48 },
};

export function WhistleLogo({
  size = "md",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  const { box, svg } = SIZE_MAP[size];
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-green-500 ${box} ${className}`}
    >
      <svg
        width={svg}
        height={svg}
        viewBox="0 0 24 24"
        fill="white"
        aria-hidden
      >
        {/* Round chamber — main body */}
        <circle cx="8" cy="12" r="8" />
        {/* Mouthpiece tube */}
        <rect x="14" y="8" width="10" height="8" rx="4" />
      </svg>
    </div>
  );
}
