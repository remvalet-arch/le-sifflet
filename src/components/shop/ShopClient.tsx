"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useBcp47 } from "@/lib/use-bcp47";
import { EmptyState } from "@/components/shared/EmptyState";

import type { ShopItemRow, BoosterCatalogRow } from "@/types/database";
import { track } from "@/lib/analytics";

type Tab = "avatar" | "border" | "effect" | "boosters" | "mes-items";
type ItemFilter = "all" | "available" | "owned";

const BORDER_STYLES: Record<string, string> = {
  gold: "ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)]",
  neon: "ring-4 ring-green-400 shadow-[0_0_20px_rgba(74,222,128,0.6)]",
  inferno: "ring-4 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]",
  elite: "ring-4 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]",
};

function getBorderClass(assetUrl: string) {
  return BORDER_STYLES[assetUrl] ?? "ring-2 ring-white/20";
}

type Props = {
  items: ShopItemRow[];
  ownedIds: string[];
  balance: number;
  userRank: string;
  equippedAvatarId: string | null;
  equippedBorderId: string | null;
  equippedEffectId: string | null;
  boosters?: BoosterCatalogRow[];
  boosterCounts?: Record<string, number>;
};

export function ShopClient({
  items,
  ownedIds: initialOwnedIds,
  balance: initialBalance,
  userRank,
  equippedAvatarId: initialAvatar,
  equippedBorderId: initialBorder,
  equippedEffectId: initialEffect,
  boosters = [],
  boosterCounts: initialBoosterCounts = {},
}: Props) {
  const t = useTranslations("Shop");
  const bcp47 = useBcp47();
  const [activeTab, setActiveTab] = useState<Tab>("avatar");
  const [balance, setBalance] = useState(initialBalance);
  const [ownedIds, setOwnedIds] = useState(new Set(initialOwnedIds));
  const [equippedAvatar, setEquippedAvatar] = useState(initialAvatar);
  const [equippedBorder, setEquippedBorder] = useState(initialBorder);
  const [equippedEffect, setEquippedEffect] = useState(initialEffect);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [boosterCounts, setBoosterCounts] = useState(initialBoosterCounts);

  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "avatar", label: t("tabAvatars"), emoji: "🎽" },
    { key: "border", label: t("tabBorders"), emoji: "✨" },
    { key: "effect", label: t("tabEffects"), emoji: "⚡" },
    { key: "boosters", label: t("tabBoosters"), emoji: "🧪" },
    { key: "mes-items", label: t("tabMyItems"), emoji: "🏆" },
  ];

  const displayed = items.filter((i) => {
    if (i.category !== activeTab) return false;
    if (itemFilter === "owned") return ownedIds.has(i.id);
    if (itemFilter === "available") return !ownedIds.has(i.id);
    return true;
  });

  function getEquipped(item: ShopItemRow) {
    if (item.category === "avatar") return equippedAvatar === item.id;
    if (item.category === "border") return equippedBorder === item.id;
    if (item.category === "effect") return equippedEffect === item.id;
    return false;
  }

  function isRankUnlocked(item: ShopItemRow) {
    if (!item.unlock_rank) return false;
    return userRank.toLowerCase().includes(item.unlock_rank.toLowerCase());
  }

  function getEffectivePrice(item: ShopItemRow) {
    return isRankUnlocked(item) ? 0 : item.price_pts;
  }

  async function handlePurchase(item: ShopItemRow) {
    if (loadingId) return;
    const price = getEffectivePrice(item);
    if (price > balance) {
      toast.error("Solde insuffisant pour cet achat !");
      return;
    }
    setLoadingId(item.id);
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { new_balance: number; free: boolean };
        error?: string;
      };
      if (res.status === 429) {
        toast.error("Doucement l'arbitre, tu siffles trop vite !");
        return;
      }
      if (!json.ok) {
        toast.error(json.error ?? "Achat impossible");
        return;
      }
      setOwnedIds((prev) => new Set([...prev, item.id]));
      if (json.data?.new_balance !== undefined)
        setBalance(json.data.new_balance);
      track("shop_purchase", {
        item_category: "cosmetic",
        item_slug: item.id,
        sifflets_spent: json.data?.free ? 0 : price,
        purchase_quantity: 1,
      });
      if (json.data?.free) {
        toast.success(`${item.asset_url} ${item.name} débloqué gratuitement !`);
      } else {
        toast.success(`🎉 ${item.name} ajouté à ton inventaire !`);
      }
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleEquip(item: ShopItemRow) {
    if (loadingId) return;
    const isEquipped = getEquipped(item);
    setLoadingId(item.id);
    try {
      const body = isEquipped
        ? { unequip_category: item.category }
        : { item_id: item.id };

      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        toast.error(json.error ?? "Opération impossible");
        return;
      }
      const newId = isEquipped ? null : item.id;
      if (item.category === "avatar") setEquippedAvatar(newId);
      else if (item.category === "border") setEquippedBorder(newId);
      else if (item.category === "effect") setEquippedEffect(newId);

      if (isEquipped) {
        toast.success("Déséquipé !");
      } else {
        toast.success(`${item.asset_url} ${item.name} équipé !`);
      }
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleBuyBooster(booster: BoosterCatalogRow) {
    if (loadingId) return;
    if (booster.price_pts > balance) {
      toast.error("Solde insuffisant pour ce booster !");
      return;
    }
    setLoadingId(booster.id);
    try {
      const res = await fetch("/api/boosters/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booster_id: booster.id }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { new_balance: number };
        error?: string;
      };
      if (res.status === 429) {
        toast.error("Doucement l'arbitre, tu siffles trop vite !");
        return;
      }
      if (!json.ok) {
        toast.error(json.error ?? "Achat impossible");
        return;
      }
      if (json.data?.new_balance !== undefined)
        setBalance(json.data.new_balance);
      setBoosterCounts((prev) => ({
        ...prev,
        [booster.id]: (prev[booster.id] ?? 0) + 1,
      }));
      track("shop_purchase", {
        item_category: "booster",
        item_slug: booster.effect_type,
        sifflets_spent: booster.price_pts,
        purchase_quantity: 1,
      });
      toast.success(`⚡ ${booster.name} ajouté à ton inventaire !`);
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setLoadingId(null);
    }
  }

  const previewAvatar =
    items.find((i) => i.id === equippedAvatar)?.asset_url ?? "🎽";
  const previewBorderClass = equippedBorder
    ? getBorderClass(
        items.find((i) => i.id === equippedBorder)?.asset_url ?? "",
      )
    : "ring-2 ring-white/20";
  const previewEffect = equippedEffect
    ? items.find((i) => i.id === equippedEffect)
    : null;
  const EFFECT_OVERLAYS: Record<string, string> = {
    lightning: "⚡",
    fire: "🔥",
    crown: "👑",
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Solde — affiché en haut du contenu */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5">
            <span className="text-sm font-black tabular-nums text-green-400">
              {balance.toLocaleString(bcp47)}
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-green-500/60">
              🪙
            </span>
          </div>
        </div>
        {/* Live preview */}
        <button
          type="button"
          onClick={() => setActiveTab("mes-items")}
          className="flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-zinc-900 p-4 text-left transition hover:border-white/15 active:scale-[0.99]"
        >
          <div className="relative shrink-0">
            <div
              className={`flex size-16 items-center justify-center rounded-full bg-zinc-800 text-2xl ${previewBorderClass}`}
            >
              {previewAvatar}
            </div>
            {previewEffect && (
              <span className="absolute -bottom-1 -right-1 text-lg leading-none">
                {EFFECT_OVERLAYS[previewEffect.asset_url] ?? "✨"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
              {t("preview")}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {equippedAvatar
                ? (items.find((i) => i.id === equippedAvatar)?.name ?? "—")
                : t("defaultAvatar")}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {[
                equippedBorder
                  ? items.find((i) => i.id === equippedBorder)?.name
                  : null,
                previewEffect?.name,
              ]
                .filter(Boolean)
                .join(" · ") || t("noEquipment")}
            </p>
          </div>
          <span className="text-[10px] font-black text-zinc-500">
            {t("tabMyItems")} →
          </span>
        </button>

        {/* Tabs — scroll horizontal sur mobile */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`shrink-0 rounded-xl px-4 py-2 text-[11px] font-black transition ${
                  activeTab === t.key
                    ? "bg-whistle text-zinc-950"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div
            className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-zinc-950 to-transparent"
            aria-hidden
          />
        </div>

        {/* Quick filter (shop tabs only) */}
        {activeTab !== "boosters" && activeTab !== "mes-items" && (
          <div className="flex gap-1.5">
            {(["all", "available", "owned"] as ItemFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setItemFilter(f)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-black transition ${
                  itemFilter === f
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f === "all"
                  ? t("filterAll")
                  : f === "available"
                    ? t("filterAvailable")
                    : t("filterOwned")}
              </button>
            ))}
          </div>
        )}

        {/* Mes items tab */}
        {activeTab === "mes-items" && (
          <div className="flex flex-col gap-5">
            {(["avatar", "border", "effect", "boosters"] as const).map(
              (cat) => {
                const catItems =
                  cat === "boosters"
                    ? []
                    : items.filter(
                        (i) => i.category === cat && ownedIds.has(i.id),
                      );
                const ownedBoosters =
                  cat === "boosters"
                    ? boosters.filter((b) => (boosterCounts[b.id] ?? 0) > 0)
                    : [];

                const hasItems =
                  cat === "boosters"
                    ? ownedBoosters.length > 0
                    : catItems.length > 0;

                return (
                  <div key={cat}>
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      {cat === "avatar"
                        ? t("tabAvatars")
                        : cat === "border"
                          ? t("tabBorders")
                          : cat === "effect"
                            ? t("tabEffects")
                            : t("tabBoosters")}
                    </h3>
                    {!hasItems ? (
                      <EmptyState
                        variant="no-data"
                        title={t("myItemsEmpty")}
                        cta={
                          <button
                            type="button"
                            onClick={() => setActiveTab(cat as Tab)}
                            className="rounded-xl bg-whistle px-4 py-2 text-xs font-black text-zinc-950 transition hover:opacity-90 active:scale-95"
                          >
                            {t("myItemsEmptyCta")}
                          </button>
                        }
                      />
                    ) : cat === "boosters" ? (
                      <div className="flex flex-col gap-2">
                        {ownedBoosters.map((booster) => {
                          const count = boosterCounts[booster.id] ?? 0;
                          const BOOSTER_EMOJIS: Record<string, string> = {
                            double_xp: "💎",
                            cote_plus: "📈",
                            safety_net: "🛡️",
                            vision: "👁️",
                          };
                          return (
                            <div
                              key={booster.id}
                              className="flex items-center gap-3 rounded-xl border border-white/8 bg-zinc-900 px-3 py-2.5"
                            >
                              <span className="text-2xl">
                                {BOOSTER_EMOJIS[booster.effect_type] ?? "⚡"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-white">
                                  {booster.name}
                                </p>
                              </div>
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-400">
                                ×{count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {catItems.map((item) => {
                          const equipped = getEquipped(item);
                          const loading = loadingId === item.id;
                          return (
                            <div
                              key={item.id}
                              className={`relative flex flex-col gap-2 rounded-2xl border p-3 transition ${
                                equipped
                                  ? "border-whistle/40 bg-whistle/8"
                                  : "border-green-500/20 bg-zinc-900"
                              }`}
                            >
                              {equipped && (
                                <span className="absolute right-2 top-2 rounded-full bg-whistle px-1.5 py-0.5 text-[9px] font-black text-zinc-950">
                                  {t("equipped")}
                                </span>
                              )}
                              <div className="flex h-12 items-center justify-center">
                                {item.category === "avatar" ? (
                                  <span className="text-3xl">
                                    {item.asset_url}
                                  </span>
                                ) : item.category === "border" ? (
                                  <div
                                    className={`flex size-9 items-center justify-center rounded-full bg-zinc-800 text-base ${getBorderClass(item.asset_url)}`}
                                  >
                                    🎽
                                  </div>
                                ) : (
                                  <span className="text-3xl">
                                    {item.asset_url === "lightning"
                                      ? "⚡"
                                      : item.asset_url === "fire"
                                        ? "🔥"
                                        : "👑"}
                                  </span>
                                )}
                              </div>
                              <p className="text-center text-[11px] font-black leading-tight text-white">
                                {item.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => void handleEquip(item)}
                                disabled={loading}
                                className={`w-full rounded-xl py-1.5 text-[11px] font-black transition ${
                                  loading
                                    ? "bg-zinc-700 text-zinc-500"
                                    : equipped
                                      ? "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                      : "border border-whistle/40 bg-whistle/10 text-whistle hover:bg-whistle/20"
                                }`}
                              >
                                {loading
                                  ? "…"
                                  : equipped
                                    ? t("unequip")
                                    : t("equip")}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}

        {/* Boosters grid (separate tab) */}
        {activeTab === "boosters" && (
          <div className="flex flex-col gap-3">
            {boosters.map((booster) => {
              const count = boosterCounts[booster.id] ?? 0;
              const loading = loadingId === booster.id;
              const canAfford = booster.price_pts <= balance;
              const BOOSTER_EMOJIS: Record<string, string> = {
                double_xp: "💎",
                cote_plus: "📈",
                safety_net: "🛡️",
                vision: "👁️",
              };
              return (
                <div
                  key={booster.id}
                  className="flex items-center gap-4 rounded-2xl border border-white/8 bg-zinc-900 p-4"
                >
                  <span className="text-3xl">
                    {BOOSTER_EMOJIS[booster.effect_type] ?? "⚡"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white">
                      {booster.name}
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      {booster.description}
                    </p>
                    {count > 0 && (
                      <p className="mt-1 text-[10px] font-black text-amber-400">
                        {t("inStock", { count })}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleBuyBooster(booster)}
                    disabled={loading || !canAfford}
                    className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-black transition ${
                      loading
                        ? "bg-zinc-700 text-zinc-500"
                        : canAfford
                          ? "bg-whistle text-zinc-950 hover:opacity-90 active:scale-95"
                          : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                    }`}
                  >
                    {loading ? "…" : `${booster.price_pts} 🪙`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Items grid */}
        {activeTab !== "boosters" &&
          activeTab !== "mes-items" &&
          displayed.length === 0 && (
            <EmptyState
              variant="no-data"
              emoji="🛒"
              title={t("shopEmptyTab")}
            />
          )}
        {activeTab !== "boosters" &&
          activeTab !== "mes-items" &&
          displayed.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {displayed.map((item) => {
                const owned = ownedIds.has(item.id);
                const equipped = getEquipped(item);
                const price = getEffectivePrice(item);
                const rankUnlocked = isRankUnlocked(item);
                const canAfford = price <= balance;
                const loading = loadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`relative flex flex-col gap-3 rounded-2xl border p-4 transition ${
                      equipped
                        ? "border-whistle/40 bg-whistle/8"
                        : owned
                          ? "border-green-500/20 bg-zinc-900"
                          : "border-white/8 bg-zinc-900"
                    }`}
                  >
                    {equipped && (
                      <span className="absolute right-2 top-2 rounded-full bg-whistle px-1.5 py-0.5 text-[9px] font-black text-zinc-950">
                        {t("equipped")}
                      </span>
                    )}
                    {owned && !equipped && (
                      <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-green-500/20 text-[10px] font-black text-green-400">
                        ✓
                      </span>
                    )}

                    {/* Item visual */}
                    <div className="flex h-14 items-center justify-center">
                      {item.category === "avatar" ? (
                        <span className="text-4xl">{item.asset_url}</span>
                      ) : item.category === "border" ? (
                        <div
                          className={`flex size-10 items-center justify-center rounded-full bg-zinc-800 text-lg ${getBorderClass(item.asset_url)}`}
                        >
                          🎽
                        </div>
                      ) : (
                        <span className="text-4xl">
                          {item.asset_url === "lightning"
                            ? "⚡"
                            : item.asset_url === "fire"
                              ? "🔥"
                              : "👑"}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-black leading-tight text-white">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                        {item.description}
                      </p>
                      {rankUnlocked && !owned && (
                        <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-green-400">
                          {t("rankUnlocked")}
                        </p>
                      )}
                      {item.unlock_rank && !rankUnlocked && !owned && (
                        <p className="mt-1 text-[9px] text-zinc-600">
                          {t("freeAtRank", { rank: item.unlock_rank })}
                        </p>
                      )}
                      <p
                        className={`mt-1.5 text-[11px] font-black tabular-nums ${
                          owned
                            ? "text-zinc-600"
                            : rankUnlocked
                              ? "text-green-400"
                              : canAfford
                                ? "text-amber-400"
                                : "text-red-400/80"
                        }`}
                      >
                        {owned
                          ? t("owned")
                          : rankUnlocked
                            ? t("claimFree")
                            : `${price.toLocaleString(bcp47)} 🪙`}
                      </p>
                    </div>

                    {/* Price + action */}
                    {!owned ? (
                      <button
                        type="button"
                        onClick={() => void handlePurchase(item)}
                        disabled={loading || (!canAfford && !rankUnlocked)}
                        className={`mt-auto w-full rounded-xl py-2 text-[11px] font-black transition ${
                          loading
                            ? "bg-zinc-700 text-zinc-500"
                            : canAfford || rankUnlocked
                              ? "bg-whistle text-zinc-950 hover:opacity-90 active:scale-95"
                              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                        }`}
                      >
                        {loading
                          ? "…"
                          : rankUnlocked
                            ? t("claimFree")
                            : canAfford
                              ? t("buy", { price: price.toLocaleString(bcp47) })
                              : `${price.toLocaleString(bcp47)} 🪙`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleEquip(item)}
                        disabled={loading}
                        className={`mt-auto w-full rounded-xl py-2 text-[11px] font-black transition ${
                          loading
                            ? "bg-zinc-700 text-zinc-500"
                            : equipped
                              ? "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                              : "border border-whistle/40 bg-whistle/10 text-whistle hover:bg-whistle/20"
                        }`}
                      >
                        {loading ? "…" : equipped ? t("unequip") : t("equip")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        {/* Apple compliance note */}
        <p className="pb-4 text-center text-[10px] text-zinc-600">
          {t("virtualCurrencyNote")}
        </p>
      </div>
    </div>
  );
}
