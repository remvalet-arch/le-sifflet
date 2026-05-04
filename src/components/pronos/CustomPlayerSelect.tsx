import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { PlayerForSelect } from "./PronosticsHubClient";

function getPosLabel(pos: string | null | undefined) {
  if (pos === "G") return "Gardien";
  if (pos === "D") return "Défenseur";
  if (pos === "M") return "Milieu";
  if (pos === "A") return "Attaquant";
  return "";
}

export function CustomPlayerSelect({
  value,
  onChange,
  playersList,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  playersList: PlayerForSelect[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedPlayer = playersList.find((p) => p.player_name === value);

  // Group by position
  const filtered = playersList.filter((p) =>
    p.player_name.toLowerCase().includes(search.toLowerCase()),
  );

  const csc = filtered.filter((p) => p.player_name === "CSC");
  const att = filtered.filter((p) => p.position === "A");
  const mil = filtered.filter((p) => p.position === "M");
  const def = filtered.filter((p) => p.position === "D");
  const gk = filtered.filter((p) => p.position === "G");
  const others = filtered.filter(
    (p) =>
      !["A", "M", "D", "G"].includes(p.position || "") &&
      p.player_name !== "CSC",
  );

  return (
    <div className="relative min-w-0 flex-1" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm outline-none transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedPlayer ? (
            <>
              <PlayerAvatar player={selectedPlayer} size="sm" />
              <div className="flex flex-col items-start truncate">
                <span className="truncate font-bold text-white">
                  {selectedPlayer.player_name}
                </span>
                {selectedPlayer.position &&
                  selectedPlayer.player_name !== "CSC" && (
                    <span className="text-[10px] uppercase text-zinc-500">
                      {getPosLabel(selectedPlayer.position)}
                    </span>
                  )}
              </div>
            </>
          ) : (
            <span className="text-zinc-500">Sélectionner un buteur...</span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[100] mt-1 flex max-h-80 w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/5 bg-zinc-950/50 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="p-3 text-center text-xs text-zinc-500">
                Aucun joueur trouvé
              </p>
            )}

            {csc.length > 0 && (
              <PlayerGroup
                players={csc}
                onSelect={(v) => {
                  onChange(v);
                  setOpen(false);
                }}
              />
            )}
            {att.length > 0 && (
              <PlayerGroup
                label="Attaquants"
                players={att}
                onSelect={(v) => {
                  onChange(v);
                  setOpen(false);
                }}
              />
            )}
            {mil.length > 0 && (
              <PlayerGroup
                label="Milieux"
                players={mil}
                onSelect={(v) => {
                  onChange(v);
                  setOpen(false);
                }}
              />
            )}
            {def.length > 0 && (
              <PlayerGroup
                label="Défenseurs"
                players={def}
                onSelect={(v) => {
                  onChange(v);
                  setOpen(false);
                }}
              />
            )}
            {gk.length > 0 && (
              <PlayerGroup
                label="Gardiens"
                players={gk}
                onSelect={(v) => {
                  onChange(v);
                  setOpen(false);
                }}
              />
            )}
            {others.length > 0 && (
              <PlayerGroup
                label="Autres"
                players={others}
                onSelect={(v) => {
                  onChange(v);
                  setOpen(false);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerGroup({
  label,
  players,
  onSelect,
}: {
  label?: string;
  players: PlayerForSelect[];
  onSelect: (v: string) => void;
}) {
  return (
    <div className="mb-2 last:mb-0">
      {label && (
        <p className="mb-1 px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          {label}
        </p>
      )}
      {players.map((p) => (
        <button
          key={p.player_name}
          onClick={() => onSelect(p.player_name)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5 transition"
        >
          <PlayerAvatar player={p} size="md" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">
              {p.player_name}
            </span>
            {p.player_name !== "CSC" && (
              <span className="text-[10px] text-zinc-500">
                {getPosLabel(p.position)}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function PlayerAvatar({
  player,
  size,
}: {
  player: PlayerForSelect;
  size: "sm" | "md";
}) {
  const d = size === "sm" ? "h-6 w-6 text-[9px]" : "h-10 w-10 text-xs";

  if (player.player_name === "CSC") {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-red-500/20 font-bold text-red-500 ${d}`}
      >
        {size === "sm" ? "C" : "CSC"}
      </div>
    );
  }

  const img = player.cutout_url || player.image_url;
  if (img) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={img}
        alt={player.player_name}
        className={`shrink-0 rounded-full object-cover bg-zinc-800 border border-white/5 ${d}`}
      />
    );
  }

  const init = player.player_name.substring(0, 2).toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-zinc-400 border border-white/5 ${d}`}
    >
      {init}
    </div>
  );
}
