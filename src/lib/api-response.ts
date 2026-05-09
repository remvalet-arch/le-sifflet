import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function rateLimitResponse(retryAfter = 60) {
  return NextResponse.json(
    { ok: false, error: "rate_limited", retryAfter },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}
