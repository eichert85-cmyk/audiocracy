import { NextRequest, NextResponse } from "next/server";
import { getValidGuestSpotifyToken } from "@/lib/spotifyGuest"; // Guest token logic restored

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing search query." },
        { status: 400 }
      );
    }

    // --- MANDATORY LOGIN ENFORCEMENT ---
    // If this call fails (no valid guest token), the request is rejected, 
    // leading the client to display the login button.
    const { access_token } = await getValidGuestSpotifyToken();

    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", "10");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "Spotify search failed." },
        { status: 500 }
      );
    }

    const json = await res.json();

    const tracks =
      json?.tracks?.items?.map((track: any) => {
        const albumImages = track.album?.images ?? [];
        const smallest = albumImages[albumImages.length - 1]?.url ?? null;
        
        // Parse Year
        const releaseDate = track.album?.release_date || "";
        const releaseYear = releaseDate.split("-")[0] ? parseInt(releaseDate.split("-")[0]) : null;

        return {
          id: track.id,
          name: track.name,
          artist: track.artists?.[0]?.name ?? "Unknown Artist",
          albumArt: smallest,
          popularity: track.popularity ?? 0,
          releaseYear: releaseYear
        };
      }) ?? [];

    return NextResponse.json({ success: true, tracks });
  } catch (err) {
    console.error("Search error:", err);
    // This error will often be the result of a missing token, forcing the client to redirect.
    return NextResponse.json(
      { success: false, error: "Server Error" },
      { status: 500 }
    );
  }
}