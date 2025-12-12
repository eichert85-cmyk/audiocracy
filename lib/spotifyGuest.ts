import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  decrypt,
  encrypt,
  GUEST_SPOTIFY_ACCESS_COOKIE,
  GUEST_SPOTIFY_REFRESH_COOKIE,
  GUEST_SPOTIFY_EXPIRES_COOKIE,
} from "@/lib/spotifyGuestCrypto";
import { GUEST_ID_COOKIE_NAME } from "@/lib/guestSession";

/**
 * Retrieves a valid access token for the Guest.
 * If the current access token is expired, it uses the refresh token to get a new one
 * and updates the cookies.
 */
export async function getValidGuestSpotifyToken(): Promise<{ access_token: string }> {
  const cookieStore = await cookies();

  // 1. Get raw cookie values
  const accessEnc = cookieStore.get(GUEST_SPOTIFY_ACCESS_COOKIE)?.value;
  const refreshEnc = cookieStore.get(GUEST_SPOTIFY_REFRESH_COOKIE)?.value;
  const expiresStr = cookieStore.get(GUEST_SPOTIFY_EXPIRES_COOKIE)?.value;

  if (!accessEnc || !refreshEnc || !expiresStr) {
    throw new Error("Missing guest session cookies. Please login again.");
  }

  // 2. Check if expired
  const expiresAt = parseInt(expiresStr, 10);
  const now = Date.now();

  // If we are within 5 minutes of expiry (or past it), refresh.
  if (now > expiresAt - 5 * 60 * 1000) {
    console.log("Guest token expired or expiring soon. Refreshing...");
    
    // Decrypt refresh token
    const refreshToken = await decrypt(refreshEnc);

    // Hit OFFICIAL Spotify Token Endpoint
    const res = await fetch("https://accounts.spotify.com/api/token", {
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
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Token Refresh Failed:", res.status, errText);
      throw new Error("Failed to refresh Spotify token");
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    const newExpiresIn = data.expires_in; // Seconds

    // Update Cookies
    // Note: In Server Actions/Route Handlers, we can set cookies directly.
    const secure = process.env.NODE_ENV === "production";
    
    await cookieStore.set({
      name: GUEST_SPOTIFY_ACCESS_COOKIE,
      value: await encrypt(newAccessToken),
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    // Update expiry
    await cookieStore.set({
      name: GUEST_SPOTIFY_EXPIRES_COOKIE,
      value: (Date.now() + newExpiresIn * 1000).toString(),
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    // If Spotify returned a new refresh token (they sometimes do), update it
    if (data.refresh_token) {
      await cookieStore.set({
        name: GUEST_SPOTIFY_REFRESH_COOKIE,
        value: await encrypt(data.refresh_token),
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return { access_token: newAccessToken };
  }

  // 3. If not expired, just decrypt and return the existing access token
  try {
    const accessToken = await decrypt(accessEnc);
    return { access_token: accessToken };
  } catch (err) {
    console.error("Failed to decrypt current access token", err);
    throw new Error("Session corrupted. Please login again.");
  }
}

/**
 * Checks if the user is connected to Spotify and retrieves their profile info.
 */
export async function getGuestSpotifyConnection() {
  const cookieStore = await cookies();
  const hasToken = cookieStore.has(GUEST_SPOTIFY_ACCESS_COOKIE);
  const guestId = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value;

  if (!hasToken || !guestId) {
    return { 
      connected: false,
      guestId: null,
      displayName: null
    };
  }

  // Attempt to fetch display name from Supabase
  let displayName = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("guests")
      .select("display_name")
      .eq("spotify_id", guestId)
      .single();
    
    if (data) {
      displayName = data.display_name;
    }
  } catch (e) {
    console.error("Failed to fetch guest display name", e);
  }

  return { 
    connected: true,
    guestId: guestId,
    displayName: displayName 
  };
}