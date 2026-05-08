"use client";

import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";

type MatchStub = { id: string };

function dayDiffDays(dk1: string, dk2: string): number {
  return Math.round(
    (new Date(dk2).getTime() - new Date(dk1).getTime()) / 86_400_000,
  );
}

function getDayPill(dayKey: string): {
  abbrev: string;
  num: string;
  sub?: string;
} {
  const [y, mo, d] = dayKey.split("-").map(Number);
  const date = new Date(y!, mo! - 1, d!);
  if (isToday(date)) return { abbrev: "Auj.", num: "" };
  const abbrev = format(date, "EEE", { locale: fr });
  const num = format(date, "d", { locale: fr });
  if (isTomorrow(date)) return { abbrev, num, sub: "Demain" };
  return { abbrev, num };
}

function getDayFullLabel(dayKey: string): string {
  const [y, mo, d] = dayKey.split("-").map(Number);
  const date = new Date(y!, mo! - 1, d!);
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return "Demain";
  return format(date, "EEEE d MMMM", { locale: fr });
}

type Props = {
  dayOrder: string[];
  dayMap: Map<string, Map<string, MatchStub[]>>;
  selectedDay: string;
  onSelectedDayChange: (day: string) => void;
  isMatchDone: (matchId: string) => boolean;
};

export function MatchFilterBar({
  dayOrder,
  dayMap,
  selectedDay,
  onSelectedDayChange,
  isMatchDone,
}: Props) {
  const selectedCompMap = dayMap.get(selectedDay);

  return (
    <>
      {/* Day navbar — horizontal scroll */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dayOrder.map((dk, i) => {
          const prevDk = dayOrder[i - 1];
          const hasGap = prevDk !== undefined && dayDiffDays(prevDk, dk) > 1;
          const cm = dayMap.get(dk)!;
          const dayTotal = Array.from(cm.values()).reduce(
            (s, ms) => s + ms.length,
            0,
          );
          const dayDone = Array.from(cm.values()).reduce(
            (s, ms) => s + ms.filter((m) => isMatchDone(m.id)).length,
            0,
          );
          const allDone = dayDone === dayTotal;
          const isSelected = dk === selectedDay;
          const pill = getDayPill(dk);

          return (
            <span key={dk} className="flex shrink-0 items-center gap-2">
            {hasGap && (
              <span className="self-center text-zinc-700 select-none" aria-hidden>·</span>
            )}
            <button
              type="button"
              onClick={() => onSelectedDayChange(dk)}
              className={`relative flex shrink-0 flex-col items-center rounded-2xl px-4 py-2.5 transition active:scale-[0.96] ${
                isSelected
                  ? "bg-whistle text-pitch-900"
                  : "bg-zinc-800/70 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <span className="text-[11px] font-black capitalize leading-tight">
                {pill.abbrev}
              </span>
              {pill.num && (
                <span
                  className={`text-[13px] font-black leading-tight tabular-nums ${
                    isSelected ? "text-pitch-900" : "text-zinc-300"
                  }`}
                >
                  {pill.num}
                </span>
              )}
              {pill.sub && (
                <span
                  className={`text-[8px] font-bold leading-tight ${isSelected ? "text-pitch-900/70" : "text-zinc-500"}`}
                >
                  {pill.sub}
                </span>
              )}
              <span
                className={`mt-1 h-1 w-1 rounded-full transition-colors ${
                  allDone
                    ? isSelected
                      ? "bg-pitch-900/50"
                      : "bg-green-400"
                    : isSelected
                      ? "bg-pitch-900/30"
                      : "bg-zinc-600"
                }`}
              />
            </button>
            </span>
          );
        })}
      </div>

      {/* Selected day label */}
      {selectedDay && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-chalk capitalize">
            {getDayFullLabel(selectedDay)}
          </span>
          {selectedCompMap && (
            <>
              <span className="text-[10px] text-zinc-500">
                {Array.from(selectedCompMap.values()).reduce(
                  (s, ms) => s + ms.filter((m) => isMatchDone(m.id)).length,
                  0,
                )}
                /
                {Array.from(selectedCompMap.values()).reduce(
                  (s, ms) => s + ms.length,
                  0,
                )}
              </span>
              <div className="h-px flex-1 bg-white/8" />
            </>
          )}
        </div>
      )}
    </>
  );
}
