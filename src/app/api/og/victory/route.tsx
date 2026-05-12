import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// Template types
type Template = "var_win" | "exact_score" | "promotion" | "champion";

function getTemplate(type: string): Template {
  if (type === "exact_score") return "exact_score";
  if (type === "promotion") return "promotion";
  if (type === "champion") return "champion";
  return "var_win";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? "Arbitre";
  const pts = searchParams.get("pts") ?? "0";
  const match = searchParams.get("match") ?? "Match VAR TIME";
  const type = getTemplate(searchParams.get("type") ?? "var_win");

  const configs: Record<
    Template,
    { emoji: string; label: string; bg: string; accent: string }
  > = {
    var_win: {
      emoji: "⚡",
      label: "PARI VAR GAGNÉ",
      bg: "#18181b",
      accent: "#22c55e",
    },
    exact_score: {
      emoji: "🎯",
      label: "SCORE EXACT PARFAIT",
      bg: "#1c1400",
      accent: "#facc15",
    },
    promotion: {
      emoji: "🏆",
      label: "PROMOTION",
      bg: "#0f1b0f",
      accent: "#4ade80",
    },
    champion: {
      emoji: "👑",
      label: "CHAMPION DU MOIS",
      bg: "#1a1000",
      accent: "#f59e0b",
    },
  };

  const { emoji, label, bg, accent } = configs[type];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* VAR TIME badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            border: `1px solid rgba(255,255,255,0.3)`,
            padding: "4px 10px",
            color: "white",
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: 4,
          }}
        >
          VAR
        </div>
        <span
          style={{
            color: "white",
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: 4,
          }}
        >
          TIME
        </span>
      </div>

      {/* Emoji + label */}
      <div style={{ fontSize: 72, marginBottom: 8 }}>{emoji}</div>
      <div
        style={{
          color: accent,
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        {label}
      </div>

      {/* Points */}
      <div
        style={{
          color: "white",
          fontWeight: 900,
          fontSize: 80,
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        +{pts}
      </div>
      <div
        style={{
          color: accent,
          fontWeight: 700,
          fontSize: 24,
          marginBottom: 32,
        }}
      >
        🪙 gagnés
      </div>

      {/* Username */}
      <div
        style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {username}
      </div>

      {/* Match */}
      <div
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 32,
        }}
      >
        {match}
      </div>

      {/* Footer */}
      <div
        style={{
          color: "rgba(255,255,255,0.25)",
          fontSize: 12,
          letterSpacing: 2,
        }}
      >
        vartime.app · Gratuit · Pronostics foot
      </div>
    </div>,
    {
      width: 600,
      height: 400,
    },
  );
}
