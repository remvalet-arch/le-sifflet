import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { ShopClient } from "@/components/shop/ShopClient";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopItemRow, BoosterCatalogRow } from "@/types/database";

// Catalog is the same for all users — cache for 1h
const getCatalog = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const [{ data: items }, { data: boosters }] = await Promise.all([
      admin
        .from("shop_items")
        .select("*")
        .eq("is_active", true)
        .order("price_pts", { ascending: true }),
      admin
        .from("boosters_catalog")
        .select("*")
        .eq("is_active", true)
        .order("price_pts", { ascending: true }),
    ]);
    return {
      items: (items ?? []) as ShopItemRow[],
      boosters: (boosters ?? []) as BoosterCatalogRow[],
    };
  },
  ["shop-catalog"],
  { revalidate: 3600 },
);

export const metadata = { title: "Boutique — Le Sifflet" };

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [
    { items, boosters },
    { data: profile },
    { data: inventory },
    { data: boosterInv },
  ] = await Promise.all([
    getCatalog(),
    supabase
      .from("profiles")
      .select(
        "sifflets_balance, rank, equipped_avatar_id, equipped_border_id, equipped_effect_id",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_shop_inventory")
      .select("shop_item_id, is_equipped")
      .eq("user_id", user.id),
    supabase
      .from("user_boosters_inventory")
      .select("booster_id, consumed_at")
      .eq("user_id", user.id)
      .is("consumed_at", null),
  ]);

  const ownedIds = new Set((inventory ?? []).map((r) => r.shop_item_id));
  const boosterCounts = ((boosterInv ?? []) as { booster_id: string }[]).reduce<
    Record<string, number>
  >((acc, r) => {
    acc[r.booster_id] = (acc[r.booster_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <ShopClient
      items={items}
      ownedIds={[...ownedIds]}
      balance={profile?.sifflets_balance ?? 0}
      userRank={profile?.rank ?? ""}
      equippedAvatarId={profile?.equipped_avatar_id ?? null}
      equippedBorderId={profile?.equipped_border_id ?? null}
      equippedEffectId={profile?.equipped_effect_id ?? null}
      boosters={boosters}
      boosterCounts={boosterCounts}
    />
  );
}
