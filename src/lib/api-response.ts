import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function notFound(what = "Resource") {
  return jsonError(`${what} not found`, 404);
}
