import Link from "next/link";
import { signOut } from "@/app/actions/auth";

type AppHeaderProps = {
  username: string;
  siffletsBalance: number;
};

export function AppHeader({ username, siffletsBalance }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-pitch-900/95 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <Link
          href="/lobby"
          className="min-w-0 shrink font-black uppercase tracking-tight text-white"
        >
          <span className="truncate text-sm sm:text-base">VAR Time</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden min-w-0 truncate text-right text-xs text-green-100/90 sm:block sm:text-sm">
            <span className="font-semibold text-white">{username}</span>
          </div>
          <div className="rounded-full border border-whistle/40 bg-black/30 px-2.5 py-1 text-xs font-bold text-whistle sm:px-3 sm:text-sm">
            {siffletsBalance.toLocaleString("fr-FR")}{" "}
            <span className="font-normal text-whistle/80">pts</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-white/20 sm:text-sm"
            >
              Déco
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
