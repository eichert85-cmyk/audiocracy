// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Default redirect path after successful auth
  let next = requestUrl.searchParams.get("next") ?? "/dashboard";
  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  if (!code) {
    console.error("❌ No OAuth code found in callback");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login`
    );
  }

  // Next.js 16: cookies() must be awaited
  const cookieStore = await cookies();

  // Supabase server client with full cookie read/write capabilities
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  // Exchange OAuth code → Supabase session (sets Supabase auth cookies)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  console.log("AUTH CALLBACK SESSION:", data);
  console.log("AUTH CALLBACK ERROR:", error);

  if (error || !data?.session) {
    console.error("❌ Failed to exchange code for session");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login`
    );
  }

  const session = data.session as any;

  // Capture provider_token (Spotify access token) on first login
  const providerToken: string | undefined = session?.provider_token;
  if (providerToken) {
    // Store Spotify token in a secure HTTP-only cookie for use in /api/spotify/sync
    cookieStore.set({
      name: "sb-spotify-provider-token",
      value: providerToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // Spotify tokens are typically short-lived; 1 hour is a reasonable default
      maxAge: 60 * 60,
    });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? `${requestUrl.origin}`;

  return NextResponse.redirect(`${appUrl}${next}`);
}
