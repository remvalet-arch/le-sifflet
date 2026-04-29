import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
