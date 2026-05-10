"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BoosterCatalogRow } from "@/types/database";

type BoosterOption = {
  boosterId: string;
  booster: BoosterCatalogRow;
  count: number;
};

export function BoosterPickerForPronos({
  selectedBoosterId,
  onSelect,
  disabled,
}: {
  selectedBoosterId: string | null;
  onSelect: (boosterId: string | null) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<BoosterOption[]>([]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("user_boosters_inventory")
      .select("booster_id, boosters_catalog(*)")
      .is("consumed_at", null)
      .then(({ data }) => {
        if (!data) return;
        const countMap = new Map<
          string,
          { booster: BoosterCatalogRow; count: number }
        >();
        for (const row of data) {
          const catalog =
            row.boosters_catalog as unknown as BoosterCatalogRow | null;
          if (!catalog || catalog.effect_type === "vision") continue;
          const existing = countMap.get(row.booster_id);
          if (existing) {
            existing.count += 1;
          } else {
            countMap.set(row.booster_id, { booster: catalog, count: 1 });
          }
        }
        setOptions(
          Array.from(countMap.entries()).map(
            ([boosterId, { booster, count }]) => ({
              boosterId,
              booster,
              count,
            }),
          ),
        );
      });
  }, []);

  if (options.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
        Booster (optionnel)
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selectedBoosterId === opt.boosterId;
          return (
            <button
              key={opt.boosterId}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(isSelected ? null : opt.boosterId)}
              aria-pressed={isSelected}
              className={`rounded-xl px-3 py-2 text-[11px] font-black transition disabled:opacity-40 ${
                isSelected
                  ? "border border-amber-500/40 bg-amber-500/20 text-amber-400"
                  : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              ⚡ {opt.booster.name}
              {opt.count > 1 && (
                <span className="ml-1 text-[9px] text-zinc-500">
                  ×{opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedBoosterId && (
        <p className="mt-1.5 text-[10px] text-amber-400/80">
          {
            options.find((o) => o.boosterId === selectedBoosterId)?.booster
              .description
          }
        </p>
      )}
    </div>
  );
}
