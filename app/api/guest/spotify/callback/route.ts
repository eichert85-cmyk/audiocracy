import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  encrypt,
  GUEST_SPOTIFY_ACCESS_COOKIE,
  GUEST_SPOTIFY_REFRESH_COOKIE,
  GUEST_SPOTIFY_EXPIRES_COOKIE,
} from "@/lib/spotifyGuestCrypto";
import {
  GUEST_ID_COOKIE_NAME,
  GUEST_ROOM_ID_COOKIE_NAME,
} from "@/lib/guestSession";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/enter?error=spotify_denied`);
    if (!code || !state) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/enter?error=missing_params`);

    // 1. Decode State
    let stateRoomCode: string | null = null;
    try {
      const decoded = Buffer.from(state, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      stateRoomCode = parsed.roomCode;
    } catch (e) {
      console.error("State decode failed", e);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/enter?error=state_decode_failed`);
    }

    if (!stateRoomCode) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/enter?error=no_room_code`);

    const supabase = await createSupabaseServerClient();

    // 2. Resolve Room ID
    const cookieStore = await cookies();
    let roomId = cookieStore.get(GUEST_ROOM_ID_COOKIE_NAME)?.value;

    if (!roomId) {
      console.log("Cookie missing, fetching room ID from DB...");
      const { data: room } = await supabase
        .from("rooms")
        .select("id")
        .eq("code", stateRoomCode)
        .single();
      
      if (room) roomId = room.id.toString();
    }

    if (!roomId) {
        console.error("Could not resolve Room ID for code:", stateRoomCode);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/enter?error=invalid_room`);
    }

    // 3. Exchange Tokens
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI_GUEST!,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/enter?error=token_exchange_failed`);
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // 4. Get User Profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    if (!profileRes.ok) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/enter?error=profile_fetch_failed`);
    }

    const profile = await profileRes.json();
    const spotifyId = profile.id;

    // 5. Update Guest Profile (WITH DEBUGGING)
    // We explicitly capture the error here to see why it fails
    const { error: insertError } = await supabase.from("guests").upsert(
      {
          wedding_id: parseInt(roomId),
          spotify_id: spotifyId,
          display_name: profile.display_name,
          avatar_url: profile.images?.[0]?.url || null,
          connected_at: new Date().toISOString(),
      },
      { onConflict: "spotify_id" }
    );

    if (insertError) {
        // 🛑 THIS IS THE CRITICAL LOG
        console.error("🚨 GUEST INSERT FAILED:", insertError);
        console.error("Payload attempted:", {
            wedding_id: parseInt(roomId),
            spotify_id: spotifyId,
            display_name: profile.display_name
        });
    } else {
        console.log("✅ Guest inserted successfully:", spotifyId);
    }

    // 6. Harvest Data (Background)
    fetch("https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term", {
        headers: { Authorization: `Bearer ${access_token}` },
    }).then(async (res) => {
        if (res.ok) {
            const data = await res.json();
            const rows = data.items.map((a: any, i: number) => ({
            guest_spotify_id: spotifyId,
            guest_id: spotifyId,
            room_id: parseInt(roomId!),
            artist_id: a.id,
            artist_name: a.name,
            image_url: a.images?.[0]?.url || null,
            genre: a.genres?.[0] || null,
            rank: i + 1
            }));
            if (rows.length) await supabase.from("guest_top_artists").upsert(rows, { onConflict: "guest_spotify_id, artist_id" });
        }
    });

    fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term", {
        headers: { Authorization: `Bearer ${access_token}` },
    }).then(async (res) => {
        if (res.ok) {
            const data = await res.json();
            // Get Audio Features
            const trackIds = data.items.map((t: any) => t.id).join(",");
            let featuresMap: Record<string, any> = {};
            if (trackIds) {
                 try {
                    const featRes = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
                        headers: { Authorization: `Bearer ${access_token}` },
                    });
                    if (featRes.ok) {
                        const featJson = await featRes.json();
                        featJson.audio_features.forEach((f: any) => { if(f) featuresMap[f.id] = f; });
                    }
                 } catch(e) {}
            }

            const rows = data.items.map((t: any, i: number) => {
                const f = featuresMap[t.id] || {};
                const releaseDate = t.album?.release_date || "";
                const releaseYear = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;

                return {
                    guest_spotify_id: spotifyId,
                    guest_id: spotifyId,
                    room_id: parseInt(roomId!),
                    track_id: t.id,
                    track_name: t.name,
                    artist_name: t.artists?.[0]?.name || "Unknown",
                    image_url: t.album?.images?.[0]?.url || null,
                    rank: i + 1,
                    release_year: releaseYear,
                    danceability: f.danceability || null,
                    energy: f.energy || null,
                    valence: f.valence || null,
                    tempo: f.tempo || null
                };
            });
            if (rows.length) await supabase.from("guest_top_tracks").upsert(rows, { onConflict: "guest_spotify_id, track_id" });
        }
    });

    // 7. Set Cookies & Redirect
    const secure = process.env.NODE_ENV === "production";
    
    await cookieStore.set({
      name: GUEST_ID_COOKIE_NAME,
      value: spotifyId,
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    if (!cookieStore.has(GUEST_ROOM_ID_COOKIE_NAME)) {
         await cookieStore.set({
            name: GUEST_ROOM_ID_COOKIE_NAME,
            value: roomId,
            httpOnly: true,
            path: "/"
        });
    }

    await cookieStore.set({
      name: GUEST_SPOTIFY_ACCESS_COOKIE,
      value: await encrypt(access_token),
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    if (refresh_token) {
      await cookieStore.set({
        name: GUEST_SPOTIFY_REFRESH_COOKIE,
        value: await encrypt(refresh_token),
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    if (expires_in) {
      await cookieStore.set({
        name: GUEST_SPOTIFY_EXPIRES_COOKIE,
        value: (Date.now() + expires_in * 1000).toString(),
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/guest/room/${stateRoomCode}`
    );

  } catch (err) {
    console.error("Callback Fatal Error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/enter?error=fatal_callback_exception`);
  }
}