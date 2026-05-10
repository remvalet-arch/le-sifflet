export const RATE_LIMITS = {
  "claim-daily-streak": { windowMs: 60_000, max: 5 },
  "claim-rsa": { windowMs: 60_000, max: 5 },
  "admin-finish-match": { windowMs: 60_000, max: 10 },
  "admin-resolve-event": { windowMs: 60_000, max: 20 },
  "create-squad": { windowMs: 60_000, max: 3 },
  "join-squad": { windowMs: 60_000, max: 10 },
  "squad-message": { windowMs: 60_000, max: 20 },
  "direct-message": { windowMs: 60_000, max: 20 },
  "friend-request": { windowMs: 60_000, max: 15 },
} as const;

export type RateLimitRoute = keyof typeof RATE_LIMITS;
