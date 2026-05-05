"use client";

import { Component, type ReactNode } from "react";

type State = { hasError: boolean; message: string };

export class LeagueHubBoundary extends Component<
  { children: ReactNode; leagueName?: string },
  State
> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    const message =
      err instanceof Error ? err.message : "Erreur d'affichage inconnue";
    return { hasError: true, message };
  }

  override render() {
    if (this.state.hasError) {
      const name = this.props.leagueName ?? "cette compétition";
      return (
        <div className="rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-10 text-center">
          <p className="text-sm font-bold text-zinc-400">
            Données indisponibles pour {name}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Relance le script d&apos;import pour synchroniser les matchs.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
