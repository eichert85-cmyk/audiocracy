import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  GUEST_ID_COOKIE_NAME,
  GUEST_ROOM_ID_COOKIE_NAME,
  GUEST_ROOM_CODE_COOKIE_NAME,
} from "@/lib/guestSession";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryRoomCode = searchParams.get("roomCode");

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();

  let guestId = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value;
  let roomId = cookieStore.get(GUEST_ROOM_ID_COOKIE_NAME)?.value;
  let roomCode = cookieStore.get(GUEST_ROOM_CODE_COOKIE_NAME)?.value;

  // 1. RECOVERY LOGIC: If cookies are missing but we have a roomCode query param (from QR code flow)
  if (queryRoomCode && (!roomId || !roomCode)) {
    // Look up the room ID
    const { data: room } = await supabase
      .from("rooms")
      .select("id, code, is_active")
      .ilike("code", queryRoomCode)
      .single();

    if (room && room.is_active) {
      // Ensure values are strings before setting cookies
      const resolvedRoomId = room.id.toString();
      const resolvedRoomCode = room.code;

      roomId = resolvedRoomId;
      roomCode = resolvedRoomCode;

      // Set the missing cookies now so the session is valid
      // Note: cookieStore.set can only be called in Server Actions or Route Handlers
      // We pass the object directly as arguments since Next.js cookies().set supports overloads but explicit objects are safer
      cookieStore.set({
          name: GUEST_ROOM_ID_COOKIE_NAME,
          value: resolvedRoomId,
          httpOnly: true,
          path: "/",
          maxAge: 60 * 60 * 24 // 1 day
      });
      
      cookieStore.set({
          name: GUEST_ROOM_CODE_COOKIE_NAME,
          value: resolvedRoomCode,
          httpOnly: true,
          path: "/",
          maxAge: 60 * 60 * 24 
      });
    }
  }

  // 2. Generate a Guest ID if missing (First time visitor)
  if (!guestId) {
    guestId = crypto.randomUUID();
    cookieStore.set({
      name: GUEST_ID_COOKIE_NAME,
      value: guestId,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365 // 1 year
    });
  }

  // 3. Final Check: Do we have everything needed to proceed?
  if (!guestId || !roomId || !roomCode) {
    // If still missing context, we must fallback to the manual entry page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/enter`);
  }

  // ────────────────────────────────────────────────
  // Build Spotify Authorization URL
  // ────────────────────────────────────────────────
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI_GUEST!;

  const scope = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
  ].join(" ");

  // Encode context in state so it survives the round trip to Spotify
  const statePayload = {
    guestId: guestId,
    roomCode: roomCode,
    ts: Date.now(), 
  };

  const rawState = JSON.stringify(statePayload);
  const state = Buffer.from(rawState, "utf-8").toString("base64");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  return NextResponse.redirect(spotifyAuthUrl);
}