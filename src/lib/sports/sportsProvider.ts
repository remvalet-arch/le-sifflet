export type VerifyResult = "SUCCESS" | "FAILURE" | "WAIT";

// Simule une API de stats football externe (Opta, Stats Perform…).
// En production : remplacer par un vrai appel HTTP vers le provider de données.
export async function verifyEventWithAPI(): Promise<VerifyResult> {
  const rand = Math.random();
  if (rand < 0.35) return "SUCCESS";
  if (rand < 0.70) return "FAILURE";
  return "WAIT";
}
