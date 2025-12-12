// proxy.ts
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 🚀 This is the NEW Next.js 15/16 API.
// You must export a function named `proxy`.
export function proxy(request: NextRequest, _event: NextFetchEvent) {
  const response = NextResponse.next();

  // Get existing guest cookie
  const existingGuestId = request.cookies.get("guest_id")?.value;

  // If missing, create a guest ID using Edge-safe randomUUID
  if (!existingGuestId) {
    const newGuestId = crypto.randomUUID();

    response.cookies.set({
      name: "guest_id",
      value: newGuestId,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return response;
}
