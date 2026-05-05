"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { PlayerRow } from "@/types/database";
import {
  convertOddToPoints,
  SCORER_DEFAULT_ODDS,
  SCORER_MAX_POINTS,
  EXACT_SCORE_DEFAULT_ODD,
} from "@/lib/odds";

const BUNKER_REWARD = convertOddToPoints(18.0, 220);

function getScorerReward(pos: string | null | undefined): number {
  const odd = SCORER_DEFAULT_ODDS[(pos ?? "").trim()] ?? 7.0;
  return convertOddToPoints(odd, SCORER_MAX_POINTS);
}

function normalizeTeam(name: string): string {
  return name
    .replace(/\b(F\.C\.|FC|AFC|RFC|SC|AC|AS|OGC|RC)\b\.?\s*/gi, "")
    .trim()
    .toLowerCase();
}
function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeam(a);
  const nb = normalizeTeam(b);
  return na.includes(nb) || nb.includes(na);
}

const POSITION_GROUPS: { key: string; label: string; reward: number }[] = [
  {
    key: "A",
    label: "Attaquants",
    reward: convertOddToPoints(SCORER_DEFAULT_ODDS.A ?? 3.5, SCORER_MAX_POINTS),
  },
  {
    key: "M",
    label: "Milieux",
    reward: convertOddToPoints(SCORER_DEFAULT_ODDS.M ?? 7.0, SCORER_MAX_POINTS),
  },
  {
    key: "D",
    label: "Défenseurs",
    reward: convertOddToPoints(
      SCORER_DEFAULT_ODDS.D ?? 15.0,
      SCORER_MAX_POINTS,
    ),
  },
];

function playerInGroup(pos: string | null | undefined, key: string): boolean {
  const p = (pos ?? "").trim();
  if (key === "A") return p === "A";
  if (key === "D") return p === "D";
  return p === "M" || (p !== "" && p !== "G" && p !== "D" && p !== "A");
}

type Props = {
  matchId: string;
  teamHome: string;
  teamAway: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  oddsHome?: number | null;
  oddsDraw?: number | null;
  oddsAway?: number | null;
};

// ── TeamBadge ─────────────────────────────────────────────────────────────────

function TeamBadge({ name, logo }: { name: string; logo?: string | null }) {
  const isUrl = logo?.startsWith("http");
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-700">
        {isUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo!} alt={name} className="h-10 w-10 object-contain" />
        ) : (
          <span className="text-lg font-black text-white">
            {name[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-400">
        {name}
      </p>
    </div>
  );
}

// ── Accordion ─────────────────────────────────────────────────────────────────

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5"
      >
        <span className="text-sm font-black uppercase tracking-wide text-white">
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function PolymarketTab({
  matchId,
  teamHome,
  teamAway,
  homeTeamLogo,
  awayTeamLogo,
  oddsHome,
  oddsDraw,
  oddsAway,
}: Props) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(true);
  const [existingPronos, setExistingPronos] = useState<
    { prono_type: string; prono_value: string }[]
  >([]);
  const [scorerOpen, setScorerOpen] = useState(false);

  // Score exact
  const [homeScoreInput, setHomeScoreInput] = useState("");
  const [awayScoreInput, setAwayScoreInput] = useState("");
  const [scoreSubmitting, setScoreSubmitting] = useState(false);
  const [scoreSuccess, setScoreSuccess] = useState(false);

  // Buteur
  const [selectedScorer, setSelectedScorer] = useState<string | null>(null);
  const [selectedScorerPos, setSelectedScorerPos] = useState<string | null>(
    null,
  );
  const [scorerSubmitting, setScorerSubmitting] = useState(false);
  const [scorerSuccess, setScorerSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    void supabase
      .from("players")
      .select("*")
      .in("position", ["D", "M", "A"])
      .order("position", { ascending: true })
      .order("player_name", { ascending: true })
      .then(({ data }) => {
        const filtered = (data ?? []).filter(
          (p) =>
            teamsMatch(p.team_name, teamHome) ||
            teamsMatch(p.team_name, teamAway),
        );
        setPlayers(filtered);
        setLoadingLineups(false);
      });

    void supabase
      .from("pronos")
      .select("prono_type, prono_value")
      .eq("match_id", matchId)
      .then(({ data }) => setExistingPronos(data ?? []));
  }, [matchId, teamHome, teamAway]);

  function hasProno(type: string, value: string): boolean {
    return existingPronos.some(
      (p) => p.prono_type === type && p.prono_value === value,
    );
  }

  const hNum = parseInt(homeScoreInput);
  const aNum = parseInt(awayScoreInput);
  const scoreInputsValid =
    homeScoreInput !== "" &&
    awayScoreInput !== "" &&
    !isNaN(hNum) &&
    !isNaN(aNum) &&
    hNum >= 0 &&
    aNum >= 0;
  const derivedScore = scoreInputsValid ? `${hNum}-${aNum}` : null;
  const isBunker = scoreInputsValid && hNum === 0 && aNum === 0;

  // Utilise la vraie cote 1N2 si disponible, sinon la valeur par défaut
  const implied1N2Odd = scoreInputsValid
    ? hNum > aNum
      ? (oddsHome ?? null)
      : hNum === aNum
        ? (oddsDraw ?? null)
        : (oddsAway ?? null)
    : null;
  const scoreReward = isBunker
    ? BUNKER_REWARD
    : convertOddToPoints(implied1N2Odd ?? EXACT_SCORE_DEFAULT_ODD, 220);
  const alreadyBetScore = derivedScore
    ? hasProno("exact_score", derivedScore)
    : false;

  async function handleScoreProno() {
    if (!derivedScore) {
      toast.error("Saisis les deux scores");
      return;
    }
    setScoreSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("place_prono", {
      p_match_id: matchId,
      p_prono_type: "exact_score",
      p_prono_value: derivedScore,
      p_reward_amount: scoreReward,
    });
    setScoreSubmitting(false);
    if (error) {
      toast.error(
        error.message.includes("unique") || error.message.includes("UNIQUE")
          ? "Tu as déjà un prono sur ce score !"
          : `Erreur : ${error.message}`,
      );
      return;
    }
    setExistingPronos((prev) => [
      ...prev,
      { prono_type: "exact_score", prono_value: derivedScore },
    ]);
    setScoreSuccess(true);
    toast.success(
      `Prono enregistré ! +${scoreReward.toLocaleString("fr-FR")} Pts si tu as raison 🎯`,
    );
    setTimeout(() => {
      setScoreSuccess(false);
      setHomeScoreInput("");
      setAwayScoreInput("");
    }, 2000);
  }

  async function handleScorerProno() {
    if (!selectedScorer) {
      toast.error("Sélectionne un buteur");
      return;
    }
    setScorerSubmitting(true);
    const reward = getScorerReward(selectedScorerPos);
    const supabase = createClient();
    const { error } = await supabase.rpc("place_prono", {
      p_match_id: matchId,
      p_prono_type: "scorer",
      p_prono_value: selectedScorer,
      p_reward_amount: reward,
    });
    setScorerSubmitting(false);
    if (error) {
      toast.error(
        error.message.includes("unique") || error.message.includes("UNIQUE")
          ? "Tu as déjà un prono sur ce buteur !"
          : `Erreur : ${error.message}`,
      );
      return;
    }
    const name = selectedScorer;
    setExistingPronos((prev) => [
      ...prev,
      { prono_type: "scorer", prono_value: name },
    ]);
    setScorerSuccess(true);
    toast.success(
      `Prono enregistré ! +${reward.toLocaleString("fr-FR")} Pts si ${name} marque 🎯`,
    );
    setTimeout(() => {
      setScorerSuccess(false);
      setSelectedScorer(null);
      setSelectedScorerPos(null);
    }, 2000);
  }

  const homePlayers = players.filter((p) => teamsMatch(p.team_name, teamHome));
  const awayPlayers = players.filter((p) => teamsMatch(p.team_name, teamAway));

  return (
    <div className="mt-6 flex flex-col gap-3 pb-4">
      <p className="text-center text-xs text-zinc-500">
        Pronos gratuits — gagne des Pts si tu as raison
      </p>

      {/* ── Score Exact ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
        <p className="mb-4 text-sm font-black uppercase tracking-wide text-white">
          🎯 Score Exact
        </p>

        <div className="flex items-center justify-between gap-3">
          <TeamBadge name={teamHome} logo={homeTeamLogo} />
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              value={homeScoreInput}
              onChange={(e) => setHomeScoreInput(e.target.value)}
              placeholder="–"
              className="h-16 w-16 rounded-xl border-2 border-zinc-600 bg-zinc-900 text-center text-2xl font-black text-white focus:border-green-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-xl font-black text-zinc-500">-</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              value={awayScoreInput}
              onChange={(e) => setAwayScoreInput(e.target.value)}
              placeholder="–"
              className="h-16 w-16 rounded-xl border-2 border-zinc-600 bg-zinc-900 text-center text-2xl font-black text-white focus:border-green-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <TeamBadge name={teamAway} logo={awayTeamLogo} />
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            scoreInputsValid
              ? "mt-4 max-h-[min(90vh,560px)] opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          {alreadyBetScore ? (
            <p className="py-2 text-center text-sm font-bold text-green-400">
              ✓ Prono déjà enregistré pour ce score
            </p>
          ) : (
            <>
              {isBunker ? (
                <div
                  className="mb-4 flex min-h-[148px] flex-col items-center justify-center rounded-2xl bg-slate-950 px-4 py-8 text-center ring-2 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  role="status"
                >
                  <p className="text-balance text-xl font-black tracking-tight text-amber-50 sm:text-2xl">
                    🛡️ AUCUN BUTEUR (+{BUNKER_REWARD.toLocaleString("fr-FR")}{" "}
                    Pts)
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-zinc-800/60 px-4 py-2.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                        Score exact
                      </p>
                      <p className="text-base font-black text-white">
                        {derivedScore}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                        Gain de base
                      </p>
                      <p className="text-xl font-black text-white">
                        +{scoreReward.toLocaleString("fr-FR")} pts
                      </p>
                    </div>
                  </div>
                  {!implied1N2Odd && (
                    <p className="mb-2 text-center text-[10px] italic text-zinc-500">
                      Cotes en attente
                    </p>
                  )}
                  <div className="mb-4 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 border border-amber-500/20">
                    <span className="text-[10px] font-black uppercase tracking-wide text-amber-500">
                      + Jusqu&apos;à 100 pts (Prime Contre-Pied)
                    </span>
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  void handleScoreProno();
                }}
                disabled={!scoreInputsValid || scoreSubmitting || scoreSuccess}
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-wide transition-all ${
                  scoreSuccess
                    ? "bg-green-700 text-green-300"
                    : "bg-green-500 text-zinc-950 hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                }`}
              >
                {scoreSuccess ? (
                  <>
                    <Check className="h-5 w-5" /> Prono enregistré ! 🎯
                  </>
                ) : scoreSubmitting ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  `VALIDER MON PRONO : ${derivedScore ?? "–"}`
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Buteur — masqué si 0-0 sélectionné ─────────────────────────────── */}
      {!isBunker && (
        <Accordion
          title="⚽ Buteur(s)"
          open={scorerOpen}
          onToggle={() => setScorerOpen((v) => !v)}
        >
          {loadingLineups ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            </div>
          ) : players.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-500">
              Effectif non synchronisé — importe l&apos;effectif via le panneau
              modérateur
            </p>
          ) : (
            <>
              {[
                {
                  teamName: teamHome,
                  teamLogo: homeTeamLogo,
                  teamPlayers: homePlayers,
                },
                {
                  teamName: teamAway,
                  teamLogo: awayTeamLogo,
                  teamPlayers: awayPlayers,
                },
              ].map(({ teamName, teamLogo, teamPlayers }) => {
                if (teamPlayers.length === 0) return null;
                const isUrl = teamLogo?.startsWith("http");
                return (
                  <div key={teamName} className="mb-5 last:mb-1">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-700">
                        {isUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={teamLogo!}
                            alt={teamName}
                            className="h-5 w-5 object-contain"
                          />
                        ) : (
                          <span className="text-[9px] font-black text-white">
                            {teamName[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {teamName}
                      </p>
                    </div>

                    {POSITION_GROUPS.map(({ key, label, reward }) => {
                      const group = teamPlayers.filter((p) =>
                        playerInGroup(p.position, key),
                      );
                      if (group.length === 0) return null;
                      return (
                        <div key={key} className="mb-3 last:mb-0">
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                              {label}
                            </p>
                            <p className="text-[9px] font-black text-green-500">
                              +{reward.toLocaleString("fr-FR")} Pts
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {group.map((p) => {
                              const already = hasProno("scorer", p.player_name);
                              const sel = selectedScorer === p.player_name;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    if (!already) {
                                      setSelectedScorer(
                                        sel ? null : p.player_name,
                                      );
                                      setSelectedScorerPos(
                                        sel ? null : p.position,
                                      );
                                    }
                                  }}
                                  disabled={already}
                                  className={`relative flex min-h-[60px] flex-col items-start justify-center gap-0.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                                    already
                                      ? "cursor-default border-green-700/40 bg-green-900/20"
                                      : sel
                                        ? "border-green-500 bg-green-500/10 shadow-[0_0_14px_rgba(34,197,94,0.25)]"
                                        : "border-zinc-700 bg-zinc-800 active:scale-95 hover:border-zinc-500"
                                  }`}
                                >
                                  <span
                                    className={`absolute right-2 top-1.5 text-[8px] font-black ${
                                      already
                                        ? "text-green-600"
                                        : sel
                                          ? "text-green-500"
                                          : "text-zinc-600"
                                    }`}
                                  >
                                    {p.position}
                                  </span>
                                  {sel && (
                                    <Check className="absolute bottom-1.5 right-2 h-3 w-3 text-green-400" />
                                  )}
                                  <span
                                    className={`pr-5 text-xs font-bold leading-tight ${
                                      already
                                        ? "text-green-400 line-through"
                                        : sel
                                          ? "text-white"
                                          : "text-zinc-200"
                                    }`}
                                  >
                                    {p.player_name}
                                  </span>
                                  <span
                                    className={`text-[10px] font-black ${
                                      already
                                        ? "text-green-500"
                                        : sel
                                          ? "text-green-400"
                                          : "text-zinc-500"
                                    }`}
                                  >
                                    {already
                                      ? "✓ Prono"
                                      : `+${reward.toLocaleString("fr-FR")}`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {selectedScorer && (
                <div className="mt-4 rounded-xl border border-white/8 bg-zinc-800/60 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-zinc-300">
                      Buteur :{" "}
                      <span className="font-black text-white">
                        {selectedScorer}
                      </span>
                    </p>
                    <p className="text-sm font-black text-green-400">
                      +
                      {getScorerReward(selectedScorerPos).toLocaleString(
                        "fr-FR",
                      )}{" "}
                      Pts
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      void handleScorerProno();
                    }}
                    disabled={scorerSubmitting || scorerSuccess}
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wide transition-all ${
                      scorerSuccess
                        ? "bg-green-700 text-green-300"
                        : "bg-green-500 text-zinc-950 hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                    }`}
                  >
                    {scorerSuccess ? (
                      <>
                        <Check className="h-4 w-4" /> Prono enregistré ! ⚽
                      </>
                    ) : scorerSubmitting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      "VALIDER MON PRONO"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </Accordion>
      )}
    </div>
  );
}
