const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Gets Server Access Token
 */
export async function getSpotifyServerToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    next: { revalidate: 3000 }, 
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Spotify Auth Error:", txt);
    throw new Error("Failed to get Spotify Server Token");
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken!;
}

/**
 * Fetches IDs of US Top 50 (Fallback to Global if US fails)
 */
export async function getUSTop50Ids(): Promise<Set<string>> {
  try {
    const token = await getSpotifyServerToken();
    const usPlaylistId = "37i9dQZEVXbLRQDuF5jeBp"; 
    
    let res = await fetch(`https://api.spotify.com/v1/playlists/${usPlaylistId}/tracks?fields=items(track(id))&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 * 6 }, 
    });

    // FALLBACK LOGIC: If US Not Found (404), try Global Top 50
    if (!res.ok && res.status === 404) {
        console.warn(`US Top 50 fetch failed (404). Falling back to Global Top 50...`);
        const globalPlaylistId = "37i9dQZEVXbMDoHDwVN2tF";
        res = await fetch(`https://api.spotify.com/v1/playlists/${globalPlaylistId}/tracks?fields=items(track(id))&limit=50`, {
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate: 3600 * 6 },
        });
    }

    if (!res.ok) {
        console.error("Failed to fetch Top 50 data after fallback attempt:", await res.text());
        return new Set();
    }

    const data = await res.json();
    const ids = new Set<string>();
    
    data.items?.forEach((item: any) => {
        if (item.track?.id) ids.add(item.track.id);
    });

    return ids;
  } catch (err) {
      console.error("Top 50 Exception:", err);
      return new Set();
  }
}