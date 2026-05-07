import { describe, it, expect } from "vitest";

// stoppageResult is a private function in the cron route.
// We replicate its logic here for unit testing.
function stoppageResult(
  extra: number | null,
  elapsed: number | null,
  baseMinute: number,
): string | null {
  if (extra != null && extra > 0) {
    const n = Math.max(1, Math.round(extra));
    return n >= 6 ? "6+" : String(n);
  }
  if (elapsed != null && elapsed > baseMinute) {
    const n = Math.max(1, elapsed - baseMinute);
    return n >= 6 ? "6+" : String(n);
  }
  return null;
}

describe("stoppageResult", () => {
  it("returns null when no extra time and elapsed <= base", () => {
    expect(stoppageResult(null, 45, 45)).toBeNull();
    expect(stoppageResult(null, 44, 45)).toBeNull();
    expect(stoppageResult(0, 90, 90)).toBeNull();
  });

  it("uses extra time when provided and > 0", () => {
    expect(stoppageResult(3, 48, 45)).toBe("3");
    expect(stoppageResult(5, 50, 45)).toBe("5");
    expect(stoppageResult(1.7, 47, 45)).toBe("2");
  });

  it("caps at 6+", () => {
    expect(stoppageResult(7, 97, 90)).toBe("6+");
    expect(stoppageResult(6, 96, 90)).toBe("6+");
  });

  it("falls back to elapsed - base when extra is null", () => {
    expect(stoppageResult(null, 48, 45)).toBe("3");
    expect(stoppageResult(null, 95, 90)).toBe("5");
  });

  it("caps elapsed fallback at 6+", () => {
    expect(stoppageResult(null, 100, 90)).toBe("6+");
  });

  it("ensures minimum of 1", () => {
    expect(stoppageResult(0.3, 45, 45)).toBe("1");
  });
});
