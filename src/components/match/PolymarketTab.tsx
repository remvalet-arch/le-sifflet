"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { calculateDynamicOdds } from "@/lib/odds";
import type { PlayerRow } from "@/types/database";

function normalizeTeam(name: string): string {
  return name
    .replace(/\b(F\.C\.|FC|AFC|RFC|SC|AC|AS|OGC|RC)\b\.?\s*/gi, "")
    .trim()
    .toLowerCase();
}
function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeam(a); const nb = normalizeTeam(b);
  return na.includes(nb) || nb.includes(na);
}

const SCORER_ODDS = 3.5;

const SCORE_BASE_ODDS: Record<string, number> = {
  "1-0": 5.0,  "0-0": 8.0,  "0-1": 5.0,
  "2-0": 8.0,  "1-1": 5.0,  "0-2": 8.0,
  "2-1": 5.0,  "1-2": 5.0,  "3-0": 12.0,
  "0-3": 12.0, "2-2": 8.0,  "3-1": 12.0,
  "1-3": 12.0, "3-2": 16.0, "2-3": 16.0,
  "4-0": 20.0, "0-4": 20.0, "4-1": 20.0, "1-4": 20.0,
};

function getBaseOdds(score: string): number {
  return SCORE_BASE_ODDS[score] ?? 20.0;
}

const POSITION_GROUPS: { key: string; label: string }[] = [
  { key: "A", label: "Attaquants" },
  { key: "M", label: "Milieux"    },
  { key: "D", label: "Défenseurs" },
];

/** Même logique que le terrain : seuls A/D sont stricts ; M + libellés TSDB non mappés → groupe Milieux. */
function playerInScorerPositionGroup(pos: string | null | undefined, key: string): boolean {
  const p = (pos ?? "").trim();
  if (key === "A") return p === "A";
  if (key === "D") return p === "D";
  if (key === "M") return p === "M" || (p !== "" && p !== "G" && p !== "D" && p !== "A");
  return false;
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  matchId: string;
  userId: string;
  siffletsBalance: number;
  teamHome: string;
  teamAway: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  onBetSuccess: (amountStaked: number) => void;
};

type OddsData = { counts: Record<string, number>; total: number };

// ── BetInput ─────────────────────────────────────────────────────────────────

function BetInput({
  balance,
  amount,
  setAmount,
  odds,
  onSubmit,
  submitting,
  success,
  submitLabel,
}: {
  balance: number;
  amount: string;
  setAmount: (v: string) => void;
  odds: number;
  onSubmit: () => void;
  submitting: boolean;
  success?: boolean;
  submitLabel?: string;
}) {
  const parsed  = parseInt(amount) || 0;
  const reward  = Math.round(parsed * odds);
  const isValid = parsed >= 10 && parsed <= balance;

  return (
    <div className="mt-3 rounded-xl border border-white/8 bg-zinc-800/60 p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
        Engagement (min. 10 Pts)
      </p>
      <div className="flex gap-2">
        {[10, 50, 100].map((p) => (
          <button
            key={p}
            onClick={() => setAmount(String(p))}
            disabled={p > balance}
            className={`h-11 flex-1 rounded-lg text-xs font-black transition ${
              amount === String(p)
                ? "bg-green-600 text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-40"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => setAmount(String(balance))}
          className={`h-11 flex-1 rounded-lg text-xs font-black transition ${
            amount === String(balance)
              ? "bg-green-600 text-white"
              : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          }`}
        >
          MAX
        </button>
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={10}
        max={balance}
        placeholder="Montant…"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-green-500/50 focus:outline-none"
      />
      {parsed >= 10 && (
        <p className="mt-1.5 text-right text-xs text-zinc-400">
          Récompense :{" "}
          <span className="font-black text-green-400">
            {reward.toLocaleString("fr-FR")} Pts
          </span>{" "}
          (×{odds.toFixed(2)})
        </p>
      )}
      <button
        onClick={onSubmit}
        disabled={!isValid || submitting || success}
        className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wide transition-all ${
          success
            ? "bg-green-700 text-green-300"
            : "bg-green-500 text-zinc-950 hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
        }`}
      >
        {success ? (
          <><Check className="h-4 w-4" /> Pari enregistré ! ⚽</>
        ) : submitting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          submitLabel ?? "Parier"
        )}
      </button>
    </div>
  );
}

// ── Accordion (buteurs only) ──────────────────────────────────────────────────

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
        <span className="text-sm font-black uppercase tracking-wide text-white">{title}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-zinc-400" />
          : <ChevronDown className="h-4 w-4 text-zinc-400" />
        }
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Team logo helper ──────────────────────────────────────────────────────────

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
      <p className="line-clamp-2 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-400 leading-tight">
        {name}
      </p>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function PolymarketTab({
  matchId,
  siffletsBalance,
  teamHome,
  teamAway,
  homeTeamLogo,
  awayTeamLogo,
  onBetSuccess,
}: Props) {
  const [players, setPlayers]               = useState<PlayerRow[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(true);
  const [existingBets, setExistingBets]     = useState<{ bet_type: string; bet_value: string }[]>([]);
  const [oddsData, setOddsData]             = useState<OddsData>({ counts: {}, total: 0 });

  const [scorerOpen, setScorerOpen] = useState(false);

  // Buteur
  const [selectedScorer, setSelectedScorer]     = useState<string | null>(null);
  const [scorerAmount, setScorerAmount]         = useState("");
  const [scorerSubmitting, setScorerSubmitting] = useState(false);
  const [scorerSuccess, setScorerSuccess]       = useState(false);

  // Score exact — deux inputs libres
  const [homeScoreInput, setHomeScoreInput] = useState("");
  const [awayScoreInput, setAwayScoreInput] = useState("");
  const [scoreAmount, setScoreAmount]       = useState("");
  const [scoreSubmitting, setScoreSubmitting] = useState(false);
  const [scoreSuccess, setScoreSuccess]     = useState(false);

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
          (p) => teamsMatch(p.team_name, teamHome) || teamsMatch(p.team_name, teamAway),
        );
        setPlayers(filtered);
        setLoadingLineups(false);
      });

    void supabase
      .from("long_term_bets")
      .select("bet_type, bet_value")
      .eq("match_id", matchId)
      .then(({ data }) => setExistingBets(data ?? []));

    void fetch(`/api/long-term-odds?match_id=${matchId}`)
      .then((res) => res.json())
      .then((json: { ok: boolean; data?: OddsData }) => {
        if (json.ok && json.data) setOddsData(json.data);
      })
      .catch(() => {/* silencieux */});
  }, [matchId, teamHome, teamAway]);

  function hasAlreadyBet(betType: string, betValue: string): boolean {
    return existingBets.some((b) => b.bet_type === betType && b.bet_value === betValue);
  }

  function getScoreOdds(score: string, baseOdds: number): number {
    return calculateDynamicOdds(baseOdds, oddsData.counts[score] ?? 0, oddsData.total);
  }

  async function placeBet(
    betType: "scorer" | "exact_score",
    betValue: string,
    amount: string,
    odds: number,
  ): Promise<boolean> {
    const parsed = parseInt(amount);
    if (isNaN(parsed) || parsed < 10) { toast.error("Engagement minimum : 10 Pts"); return false; }
    if (parsed > siffletsBalance) { toast.error("Solde insuffisant !"); return false; }

    const potentialReward = Math.round(parsed * odds);
    const supabase = createClient();
    const { error } = await supabase.rpc("place_long_term_bet", {
      p_match_id:         matchId,
      p_bet_type:         betType,
      p_bet_value:        betValue,
      p_amount_staked:    parsed,
      p_potential_reward: potentialReward,
    });

    if (error) {
      if (error.message.includes("unique") || error.message.includes("UNIQUE")) {
        toast.error("Tu as déjà un pari sur cette option !");
      } else if (error.message.includes("insuffisant")) {
        toast.error("Solde insuffisant !");
      } else {
        toast.error("Erreur : " + error.message);
      }
      return false;
    }

    onBetSuccess(parsed);
    setExistingBets((prev) => [...prev, { bet_type: betType, bet_value: betValue }]);
    setOddsData((prev) => ({
      counts: { ...prev.counts, [betValue]: (prev.counts[betValue] ?? 0) + 1 },
      total:  prev.total + 1,
    }));
    toast.success(`Pari enregistré ! (×${odds.toFixed(2)})`);
    return true;
  }

  async function handleScorerBet() {
    if (!selectedScorer) { toast.error("Sélectionne un buteur"); return; }
    setScorerSubmitting(true);
    const ok = await placeBet("scorer", selectedScorer, scorerAmount, SCORER_ODDS);
    if (ok) {
      setScorerSuccess(true);
      setTimeout(() => {
        setScorerSuccess(false);
        setSelectedScorer(null);
        setScorerAmount("");
      }, 2000);
    }
    setScorerSubmitting(false);
  }

  // Score exact — valeurs dérivées
  const hNum = parseInt(homeScoreInput);
  const aNum = parseInt(awayScoreInput);
  const scoreInputsValid =
    homeScoreInput !== "" && awayScoreInput !== "" &&
    !isNaN(hNum) && !isNaN(aNum) && hNum >= 0 && aNum >= 0;
  const derivedScore    = scoreInputsValid ? `${hNum}-${aNum}` : null;
  const derivedBaseOdds = derivedScore ? getBaseOdds(derivedScore) : 1;
  const derivedOdds     = derivedScore ? getScoreOdds(derivedScore, derivedBaseOdds) : 1;
  const alreadyBetScore = derivedScore ? hasAlreadyBet("exact_score", derivedScore) : false;
  const scoreAmountNum  = parseInt(scoreAmount) || 0;

  async function handleScoreBet() {
    if (!derivedScore) { toast.error("Saisis les deux scores"); return; }
    const odds = getScoreOdds(derivedScore, getBaseOdds(derivedScore));
    setScoreSubmitting(true);
    const ok = await placeBet("exact_score", derivedScore, scoreAmount, odds);
    if (ok) {
      setScoreSuccess(true);
      setTimeout(() => {
        setScoreSuccess(false);
        setHomeScoreInput("");
        setAwayScoreInput("");
        setScoreAmount("");
      }, 2000);
    }
    setScoreSubmitting(false);
  }

  const homePlayers = players.filter((p) => teamsMatch(p.team_name, teamHome));
  const awayPlayers = players.filter((p) => teamsMatch(p.team_name, teamAway));

  return (
    <div className="mt-4 flex flex-col gap-3 pb-4">
      <p className="text-center text-xs text-zinc-500">
        Paris long terme — résultats connus à la fin du match
      </p>

      {/* ── Score Exact — toujours visible, en premier ── */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
        <p className="mb-4 text-sm font-black uppercase tracking-wide text-white">
          🎯 Score Exact
        </p>

        {/* Team badges + inputs */}
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

        {/* Reveal fluide quand les deux inputs sont remplis */}
        <div className={`overflow-hidden transition-all duration-300 ease-out ${scoreInputsValid ? "mt-4 max-h-[400px] opacity-100" : "max-h-0 opacity-0"}`}>
          {alreadyBetScore ? (
            <p className="py-2 text-center text-sm font-bold text-green-400">
              ✓ Tu as déjà parié sur ce score
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-zinc-800/60 px-4 py-2.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Score</p>
                  <p className="text-base font-black text-white">{derivedScore}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Cote</p>
                  <p className="text-2xl font-black text-green-400">×{derivedOdds.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex gap-2">
                  {[10, 50, 100].map((p) => (
                    <button
                      key={p}
                      onClick={() => setScoreAmount(String(p))}
                      disabled={p > siffletsBalance}
                      className={`h-11 flex-1 rounded-lg text-xs font-black transition ${
                        scoreAmount === String(p)
                          ? "bg-green-600 text-white"
                          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-40"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setScoreAmount(String(siffletsBalance))}
                    className={`h-11 flex-1 rounded-lg text-xs font-black transition ${
                      scoreAmount === String(siffletsBalance)
                        ? "bg-green-600 text-white"
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}
                  >
                    MAX
                  </button>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={siffletsBalance}
                  placeholder="Montant…"
                  value={scoreAmount}
                  onChange={(e) => setScoreAmount(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-green-500/50 focus:outline-none"
                />
                {scoreAmountNum >= 10 && (
                  <p className="mt-1.5 text-right text-xs text-zinc-400">
                    Récompense :{" "}
                    <span className="font-black text-green-400">
                      {Math.round(scoreAmountNum * derivedOdds).toLocaleString("fr-FR")} Pts
                    </span>
                  </p>
                )}
              </div>

              <button
                onClick={() => { void handleScoreBet(); }}
                disabled={
                  !scoreInputsValid ||
                  scoreSubmitting ||
                  scoreAmountNum < 10 ||
                  scoreAmountNum > siffletsBalance ||
                  scoreSuccess
                }
                className={`mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-wide transition-all ${
                  scoreSuccess
                    ? "bg-green-700 text-green-300"
                    : "bg-green-500 text-zinc-950 hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                }`}
              >
                {scoreSuccess ? (
                  <><Check className="h-5 w-5" /> Pari enregistré ! ⚽</>
                ) : scoreSubmitting ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  `VALIDER MON SCORE : ${derivedScore ?? "–"}`
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Buteurs — accordéon en dessous ── */}
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
            Effectif non synchronisé — importe l&apos;effectif via le panneau modérateur
          </p>
        ) : (
          <>
            {[
              { teamName: teamHome, teamLogo: homeTeamLogo, teamPlayers: homePlayers },
              { teamName: teamAway, teamLogo: awayTeamLogo, teamPlayers: awayPlayers },
            ].map(({ teamName, teamLogo, teamPlayers }) => {
              if (teamPlayers.length === 0) return null;
              const isUrl = teamLogo?.startsWith("http");
              return (
                <div key={teamName} className="mb-5 last:mb-1">
                  {/* Team header */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-700">
                      {isUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={teamLogo!} alt={teamName} className="h-5 w-5 object-contain" />
                      ) : (
                        <span className="text-[9px] font-black text-white">{teamName[0]}</span>
                      )}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {teamName}
                    </p>
                  </div>

                  {/* Groups by position */}
                  {POSITION_GROUPS.map(({ key, label }) => {
                    const group = teamPlayers.filter((p) => playerInScorerPositionGroup(p.position, key));
                    if (group.length === 0) return null;
                    return (
                      <div key={key} className="mb-3 last:mb-0">
                        <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                          {label}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {group.map((p) => {
                            const bet = hasAlreadyBet("scorer", p.player_name);
                            const sel = selectedScorer === p.player_name;
                            return (
                              <button
                                key={p.id}
                                onClick={() => { if (!bet) setSelectedScorer(sel ? null : p.player_name); }}
                                disabled={bet}
                                className={`relative flex min-h-[60px] flex-col items-start justify-center gap-0.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                                  bet
                                    ? "cursor-default border-green-700/40 bg-green-900/20"
                                    : sel
                                      ? "border-green-500 bg-green-500/10 shadow-[0_0_14px_rgba(34,197,94,0.25)]"
                                      : "border-zinc-700 bg-zinc-800 active:scale-95 hover:border-zinc-500"
                                }`}
                              >
                                {/* Position badge top-right */}
                                <span className={`absolute right-2 top-1.5 text-[8px] font-black ${bet ? "text-green-600" : sel ? "text-green-500" : "text-zinc-600"}`}>
                                  {p.position}
                                </span>
                                {sel && (
                                  <Check className="absolute right-2 bottom-1.5 h-3 w-3 text-green-400" />
                                )}
                                <span className={`text-xs font-bold leading-tight pr-5 ${bet ? "text-green-400 line-through" : sel ? "text-white" : "text-zinc-200"}`}>
                                  {p.player_name}
                                </span>
                                <span className={`text-[10px] font-black ${bet ? "text-green-500" : sel ? "text-green-400" : "text-zinc-500"}`}>
                                  {bet ? "✓ Parié" : `×${SCORER_ODDS}`}
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
              <BetInput
                balance={siffletsBalance}
                amount={scorerAmount}
                setAmount={setScorerAmount}
                odds={SCORER_ODDS}
                onSubmit={() => { void handleScorerBet(); }}
                submitting={scorerSubmitting}
                success={scorerSuccess}
                submitLabel={`Parier sur ${selectedScorer}`}
              />
            )}
          </>
        )}
      </Accordion>
    </div>
  );
}
