import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-wide ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label ?? i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                className="size-3 shrink-0 text-zinc-600"
                aria-hidden
              />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-zinc-500 transition hover:text-zinc-300"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-white" : "text-zinc-500"}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
