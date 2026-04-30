"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { LineupRow } from "@/types/database";

// ── Odds ──────────────────────────────────────────────────────────────────────

const SCORER_ODDS = 3.5;

const SCORE_GRID = [
  { score: "1-0", odds: 4.5 }, { score: "0-0", odds: 11.0 }, { score: "0-1", odds: 4.5 },
  { score: "2-0", odds: 7.0 }, { score: "1-1", odds: 5.5  }, { score: "0-2", odds: 7.0 },
  { score: "2-1", odds: 6.5 }, { score: "1-2", odds: 6.5  }, { score: "3-0", odds: 13.0 },
  { score: "0-3", odds: 13.0 }, { score: "2-2", odds: 9.0 }, { score: "3-1", odds: 11.0 },
];

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  matchId: string;
  userId: string;
  siffletsBalance: number;
  teamHome: string;
  teamAway: string;
  onBetSuccess: (amountStaked: number) => void;
};

// ── Mise input réutilisable ───────────────────────────────────────────────────

function BetInput({
  balance,
  amount,
  setAmount,
  odds,
  onSubmit,
  submitting,
}: {
  balance: number;
  amount: string;
  setAmount: (v: string) => void;
  odds: number;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const parsed   = parseInt(amount) || 0;
  const reward   = Math.round(parsed * odds);
  const isValid  = parsed >= 10 && parsed <= balance;
  const PRESETS  = [10, 50, 100];

  return (
    <div className="mt-3 rounded-xl border border-white/8 bg-zinc-800/60 p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
        Mise (min. 10 Sifflets)
      </p>
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(String(p))}
            disabled={p > balance}
            className={`flex-1 rounded-lg py-1.5 text-xs font-black transition ${
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
          className={`flex-1 rounded-lg py-1.5 text-xs font-black transition ${
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
          Gain potentiel :{" "}
          <span className="font-black text-green-400">
            {reward.toLocaleString("fr-FR")} Sifflets
          </span>{" "}
          (×{odds})
        </p>
      )}
      <button
        onClick={onSubmit}
        disabled={!isValid || submitting}
        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-green-500 font-black uppercase tracking-wide text-zinc-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? <LoaderCircle className="h-4 w-4 animate-spin" />
          : "Parier"
        }
      </button>
    </div>
  );
}

// ── Accordéon ─────────────────────────────────────────────────────────────────

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

// ── Composant principal ───────────────────────────────────────────────────────

export function PolymarketTab({
  matchId,
  siffletsBalance,
  teamHome,
  teamAway,
  onBetSuccess,
}: Props) {
  const [lineups, setLineups]       = useState<LineupRow[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(true);
  const [existingBets, setExistingBets] = useState<{ bet_type: string; bet_value: string }[]>([]);

  // Accordéon
  const [scorerOpen, setScorerOpen] = useState(true);
  const [scoreOpen, setScoreOpen]   = useState(false);

  // Buteur
  const [selectedScorer, setSelectedScorer] = useState<string | null>(null);
  const [scorerAmount, setScorerAmount]     = useState("");
  const [scorerSubmitting, setScorerSubmitting] = useState(false);

  // Score exact
  const [selectedScore, setSelectedScore]   = useState<string | null>(null);
  const [scoreAmount, setScoreAmount]       = useState("");
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Joueurs offensifs et milieux
    void supabase
      .from("lineups")
      .select("*")
      .eq("match_id", matchId)
      .in("position", ["A", "M"])
      .eq("status", "starter")
      .order("position", { ascending: true })
      .then(({ data }) => {
        setLineups(data ?? []);
        setLoadingLineups(false);
      });

    // Paris déjà placés par l'utilisateur
    void supabase
      .from("long_term_bets")
      .select("bet_type, bet_value")
      .eq("match_id", matchId)
      .then(({ data }) => setExistingBets(data ?? []));
  }, [matchId]);

  function hasAlreadyBet(betType: string, betValue: string): boolean {
    return existingBets.some((b) => b.bet_type === betType && b.bet_value === betValue);
  }

  async function placeBet(betType: "scorer" | "exact_score", betValue: string, amount: string, odds: number) {
    const parsed = parseInt(amount);
    if (isNaN(parsed) || parsed < 10) { toast.error("Mise minimum : 10 Sifflets"); return false; }
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
    toast.success(`Pari long terme enregistré ! (×${odds})`);
    return true;
  }

  async function handleScorerBet() {
    if (!selectedScorer) { toast.error("Sélectionne un buteur"); return; }
    setScorerSubmitting(true);
    const ok = await placeBet("scorer", selectedScorer, scorerAmount, SCORER_ODDS);
    if (ok) { setSelectedScorer(null); setScorerAmount(""); }
    setScorerSubmitting(false);
  }

  async function handleScoreBet() {
    if (!selectedScore) { toast.error("Sélectionne un score"); return; }
    const entry = SCORE_GRID.find((s) => s.score === selectedScore);
    if (!entry) return;
    setScoreSubmitting(true);
    const ok = await placeBet("exact_score", selectedScore, scoreAmount, entry.odds);
    if (ok) { setSelectedScore(null); setScoreAmount(""); }
    setScoreSubmitting(false);
  }

  const homeAttackers = lineups.filter((p) => p.team_side === "home");
  const awayAttackers = lineups.filter((p) => p.team_side === "away");

  return (
    <div className="mt-4 flex flex-col gap-3 pb-4">
      <p className="text-center text-xs text-zinc-500">
        Paris long terme — résultats connus à la fin du match
      </p>

      {/* ── Buteur(s) ── */}
      <Accordion
        title="⚽ Buteur(s)"
        open={scorerOpen}
        onToggle={() => setScorerOpen((v) => !v)}
      >
        {loadingLineups ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          </div>
        ) : lineups.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-500">Compositions non disponibles</p>
        ) : (
          <>
            {homeAttackers.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {teamHome}
                </p>
                <div className="flex flex-wrap gap-2">
                  {homeAttackers.map((p) => {
                    const bet = hasAlreadyBet("scorer", p.player_name);
                    const sel = selectedScorer === p.player_name;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { if (!bet) setSelectedScorer(sel ? null : p.player_name); }}
                        disabled={bet}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          bet
                            ? "cursor-default border border-green-700/40 bg-green-900/20 text-green-400 line-through"
                            : sel
                              ? "border border-green-500 bg-green-600 text-white"
                              : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500"
                        }`}
                      >
                        {p.player_name}
                        {!bet && <span className="ml-1.5 text-[10px] text-zinc-400">×{SCORER_ODDS}</span>}
                        {bet && <span className="ml-1.5 text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {awayAttackers.length > 0 && (
              <div className="mb-1">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {teamAway}
                </p>
                <div className="flex flex-wrap gap-2">
                  {awayAttackers.map((p) => {
                    const bet = hasAlreadyBet("scorer", p.player_name);
                    const sel = selectedScorer === p.player_name;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { if (!bet) setSelectedScorer(sel ? null : p.player_name); }}
                        disabled={bet}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          bet
                            ? "cursor-default border border-green-700/40 bg-green-900/20 text-green-400 line-through"
                            : sel
                              ? "border border-green-500 bg-green-600 text-white"
                              : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500"
                        }`}
                      >
                        {p.player_name}
                        {!bet && <span className="ml-1.5 text-[10px] text-zinc-400">×{SCORER_ODDS}</span>}
                        {bet && <span className="ml-1.5 text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {selectedScorer && (
              <BetInput
                balance={siffletsBalance}
                amount={scorerAmount}
                setAmount={setScorerAmount}
                odds={SCORER_ODDS}
                onSubmit={() => { void handleScorerBet(); }}
                submitting={scorerSubmitting}
              />
            )}
          </>
        )}
      </Accordion>

      {/* ── Score exact ── */}
      <Accordion
        title="🎯 Score Exact"
        open={scoreOpen}
        onToggle={() => setScoreOpen((v) => !v)}
      >
        <div className="grid grid-cols-3 gap-2">
          {SCORE_GRID.map(({ score, odds }) => {
            const bet = hasAlreadyBet("exact_score", score);
            const sel = selectedScore === score;
            return (
              <button
                key={score}
                onClick={() => { if (!bet) setSelectedScore(sel ? null : score); }}
                disabled={bet}
                className={`flex flex-col items-center rounded-xl border py-2.5 text-xs font-black transition ${
                  bet
                    ? "cursor-default border-green-700/40 bg-green-900/20 text-green-400"
                    : sel
                      ? "border-green-500 bg-green-600 text-white"
                      : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-500"
                }`}
              >
                <span className="text-base leading-none">{score}</span>
                <span className="mt-0.5 text-[10px] text-zinc-400">×{odds}</span>
                {bet && <span className="text-[10px] text-green-400">✓ Parié</span>}
              </button>
            );
          })}
        </div>
        {selectedScore && (() => {
          const entry = SCORE_GRID.find((s) => s.score === selectedScore);
          if (!entry) return null;
          return (
            <BetInput
              balance={siffletsBalance}
              amount={scoreAmount}
              setAmount={setScoreAmount}
              odds={entry.odds}
              onSubmit={() => { void handleScoreBet(); }}
              submitting={scoreSubmitting}
            />
          );
        })()}
      </Accordion>
    </div>
  );
}
