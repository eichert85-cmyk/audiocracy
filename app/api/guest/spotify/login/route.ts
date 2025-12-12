import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GUEST_ID_COOKIE_NAME,
  GUEST_ROOM_ID_COOKIE_NAME,
  GUEST_ROOM_CODE_COOKIE_NAME,
} from "@/lib/guestSession";

export async function GET() {
  const cookieStore = await cookies();

  const guest_id = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value;
  const guest_room_id = cookieStore.get(GUEST_ROOM_ID_COOKIE_NAME)?.value;
  const guest_room_code = cookieStore.get(GUEST_ROOM_CODE_COOKIE_NAME)?.value;

  // Guest must already be in a room before connecting Spotify
  if (!guest_id || !guest_room_id || !guest_room_code) {
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

  // Encode guest + roomCode in base64 JSON
  // Added timestamp to prevent state caching
  const statePayload = {
    guestId: guest_id,
    roomCode: guest_room_code,
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