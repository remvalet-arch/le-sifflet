export const RATE_LIMITS = {
  "claim-daily-streak": { windowMs: 60_000, max: 5 },
  "claim-rsa": { windowMs: 60_000, max: 5 },
  "admin-finish-match": { windowMs: 60_000, max: 10 },
  "admin-resolve-event": { windowMs: 60_000, max: 20 },
} as const;

export type RateLimitRoute = keyof typeof RATE_LIMITS;
