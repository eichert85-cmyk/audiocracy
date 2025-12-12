import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

// 1. Import Session Identifiers
import {
  GUEST_ID_COOKIE_NAME,
  GUEST_ROOM_ID_COOKIE_NAME,
  GUEST_ROOM_CODE_COOKIE_NAME,
} from "@/lib/guestSession";

// 2. Import Spotify Tokens (These live in the Crypto file)
import {
  GUEST_SPOTIFY_ACCESS_COOKIE,
  GUEST_SPOTIFY_REFRESH_COOKIE,
  GUEST_SPOTIFY_EXPIRES_COOKIE,
} from "@/lib/spotifyGuestCrypto";

export async function POST() {
  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value;
  const roomId = cookieStore.get(GUEST_ROOM_ID_COOKIE_NAME)?.value;

  if (guestId && roomId) {
    const supabase = await createSupabaseServerClient();
    
    // 1. Delete Harvested Intelligence Data (Privacy First)
    // Using .match() is cleaner for multiple delete criteria
    await supabase.from("guest_top_artists").delete().match({ guest_spotify_id: guestId, room_id: roomId });
    await supabase.from("guest_top_tracks").delete().match({ guest_spotify_id: guestId, room_id: roomId });
    
    // 2. Detach Guest from Room (Updates Guest Count)
    await supabase.from("guests").update({ wedding_id: null }).eq("spotify_id", guestId);
  }

  // 3. Destroy All Session Cookies
  cookieStore.delete(GUEST_ID_COOKIE_NAME);
  cookieStore.delete(GUEST_ROOM_ID_COOKIE_NAME);
  cookieStore.delete(GUEST_ROOM_CODE_COOKIE_NAME);
  cookieStore.delete(GUEST_SPOTIFY_ACCESS_COOKIE);
  cookieStore.delete(GUEST_SPOTIFY_REFRESH_COOKIE);
  cookieStore.delete(GUEST_SPOTIFY_EXPIRES_COOKIE);

  return NextResponse.json({ success: true });
}