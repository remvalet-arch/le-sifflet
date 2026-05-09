export const RATE_LIMITS = {
  "claim-daily-streak": { windowMs: 60_000, max: 5 },
  "claim-rsa": { windowMs: 60_000, max: 5 },
} as const;

export type RateLimitRoute = keyof typeof RATE_LIMITS;
