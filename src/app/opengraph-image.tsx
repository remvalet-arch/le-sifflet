import { ImageResponse } from "next/og";

export const alt = "VAR TIME — L'app du match en direct";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #064e3b 0%, #09090b 60%)",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "rgba(34,197,94,0.12)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "rgba(234,179,8,0.08)",
        }}
      />

      {/* Logo badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(34,197,94,0.15)",
          border: "2px solid rgba(34,197,94,0.4)",
          borderRadius: 20,
          padding: "12px 32px",
          marginBottom: 32,
        }}
      >
        <span style={{ fontSize: 36, marginRight: 12 }}>📺</span>
        <span
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "#4ade80",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          vartime.app
        </span>
      </div>

      {/* Main title */}
      <div
        style={{
          fontSize: 88,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          textAlign: "center",
          lineHeight: 1,
          marginBottom: 24,
        }}
      >
        VAR TIME
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: "rgba(255,255,255,0.65)",
          textAlign: "center",
          letterSpacing: "0.02em",
        }}
      >
        L&apos;app du match en direct
      </div>

      {/* Pills row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 48,
        }}
      >
        {["Pronos", "VAR en direct", "Ligues entre potes"].map((label) => (
          <div
            key={label}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 999,
              padding: "8px 20px",
              fontSize: 22,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 700,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
