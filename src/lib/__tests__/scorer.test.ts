import { describe, it, expect } from "vitest";
import {
  expandScorers,
  resizeSlots,
  aggregateSlots,
} from "@/components/pronos/ScorerAllocationEditor";

describe("expandScorers", () => {
  it("expands scorers to flat slots", () => {
    const scorers = [
      { name: "Mbappé", goals: 2 },
      { name: "Giroud", goals: 1 },
    ];
    expect(expandScorers(scorers, 3)).toEqual(["Mbappé", "Mbappé", "Giroud"]);
  });

  it("pads with empty strings when count > total goals", () => {
    const scorers = [{ name: "Mbappé", goals: 1 }];
    expect(expandScorers(scorers, 3)).toEqual(["Mbappé", "", ""]);
  });

  it("truncates when count < total goals", () => {
    const scorers = [{ name: "Mbappé", goals: 3 }];
    expect(expandScorers(scorers, 2)).toEqual(["Mbappé", "Mbappé"]);
  });

  it("returns empty array for count = 0", () => {
    expect(expandScorers([{ name: "X", goals: 1 }], 0)).toEqual([]);
  });
});

describe("resizeSlots", () => {
  it("pads short array with empty strings", () => {
    expect(resizeSlots(["A", "B"], 4)).toEqual(["A", "B", "", ""]);
  });

  it("truncates long array", () => {
    expect(resizeSlots(["A", "B", "C"], 2)).toEqual(["A", "B"]);
  });

  it("returns empty array for count <= 0", () => {
    expect(resizeSlots(["A"], 0)).toEqual([]);
    expect(resizeSlots(["A"], -1)).toEqual([]);
  });

  it("is a no-op for same length", () => {
    expect(resizeSlots(["A", "B"], 2)).toEqual(["A", "B"]);
  });
});

describe("aggregateSlots", () => {
  it("counts occurrences of each name", () => {
    const result = aggregateSlots(["Mbappé", "Mbappé", "Giroud"]);
    expect(result).toEqual(
      expect.arrayContaining([
        { name: "Mbappé", goals: 2 },
        { name: "Giroud", goals: 1 },
      ]),
    );
  });

  it("ignores empty strings", () => {
    expect(aggregateSlots(["", "Mbappé", ""])).toEqual([
      { name: "Mbappé", goals: 1 },
    ]);
  });

  it("returns empty array for all empty slots", () => {
    expect(aggregateSlots(["", ""])).toEqual([]);
  });
});
