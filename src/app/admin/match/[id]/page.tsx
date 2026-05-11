import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/constants/permissions";
import type { MarketEventRow } from "@/types/database";
import { AdminMatchClient } from "./AdminMatchClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("team_home, team_away")
    .eq("id", id)
    .maybeSingle();
  return {
    title: data
      ? `Admin — ${data.team_home} / ${data.team_away}`
      : "Admin — Match",
  };
}

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !isAdminRole(profile.role)) redirect("/lobby");

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!match) notFound();

  const { data: events } = await supabase
    .from("market_events")
    .select("*")
    .eq("match_id", id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const eventsWithAge: { event: MarketEventRow; ageMin: number }[] = (
    events ?? []
  ).map((e) => ({
    event: e,
    ageMin: Math.floor((now - new Date(e.created_at).getTime()) / 60_000),
  }));

  return <AdminMatchClient match={match} eventsWithAge={eventsWithAge} />;
}
