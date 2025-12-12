import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
// Removed: import { getUSTop50Ids } from "@/lib/spotifyHost"; // FIX: Removed unused import

// FIX: Corrected function signature to match Next.js App Router standard (NextRequest + destructured context)
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const roomCode = params.code; // Access code directly from params
  const supabase = await createSupabaseServerClient();

  try {
    // 1. Verify Host Identity
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get Room ID
    const { data: room } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", roomCode)
      .eq("owner_id", user.id)
      .single();

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // 3. AGGREGATE ARTISTS
    const { data: artists } = await supabase
      .from("guest_top_artists")
      .select("artist_name, guest_spotify_id, image_url, genre")
      .eq("room_id", room.id);

    const artistCounts: Record<string, { count: number, image: string | null, genre: string | null, guests: Set<string> }> = {};

    (artists || []).forEach((row) => {
      const name = row.artist_name;
      if (!artistCounts[name]) {
        artistCounts[name] = { 
          count: 0, 
          image: row.image_url, 
          genre: row.genre, 
          guests: new Set() 
        };
      }
      if (!artistCounts[name].guests.has(row.guest_spotify_id)) {
        artistCounts[name].guests.add(row.guest_spotify_id);
        artistCounts[name].count += 1;
      }
    });

    const topArtists = Object.entries(artistCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        image: data.image,
        genre: data.genre
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. AGGREGATE TRACKS & INTELLIGENCE
    const { data: tracks } = await supabase
      .from("guest_top_tracks")
      .select("track_id, track_name, artist_name, guest_spotify_id, image_url, release_year, energy, valence, danceability, tempo")
      .eq("room_id", room.id);

    const trackCounts: Record<string, { count: number, name: string, artist: string, image: string | null, guests: Set<string> }> = {};
    
    // Intelligence Aggregators
    const yearCounts: Record<string, number> = {};
    let totalEnergy = 0;
    let totalValence = 0;
    let totalDanceability = 0;
    let totalTempo = 0;
    let vibeCount = 0;
    const vibePoints: Array<{ x: number, y: number }> = [];

    // Removed Trend Analysis Preparation (uniqueTrackIds set)

    (tracks || []).forEach((row) => {
      // Removed: Collect IDs for Trend Score

      // A. Track Popularity Logic
      const key = `${row.track_name}:::${row.artist_name}`;
      
      if (!trackCounts[key]) {
        trackCounts[key] = { 
          count: 0, 
          name: row.track_name,
          artist: row.artist_name,
          image: row.image_url,
          guests: new Set() 
        };
      }
      if (!trackCounts[key].guests.has(row.guest_spotify_id)) {
        trackCounts[key].guests.add(row.guest_spotify_id);
        trackCounts[key].count += 1;
      }

      // B. Era Logic
      if (row.release_year) {
        const year = row.release_year.toString();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }

      // C. Vibe Logic
      if (typeof row.energy === 'number' && typeof row.valence === 'number') {
        totalEnergy += row.energy;
        totalValence += row.valence;
        totalDanceability += (row.danceability || 0);
        totalTempo += (row.tempo || 0);
        vibeCount++;
        vibePoints.push({ x: row.valence, y: row.energy });
      }
    });

    // 5. CALCULATE US TREND SCORE - ENTIRE SECTION REMOVED (Lines 114-127)

    // Finalize Track List
    const topTracks = Object.values(trackCounts)
      .map((data) => ({
        name: data.name,
        artist: data.artist,
        count: data.count,
        image: data.image
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Finalize Vibe Averages
    const averages = vibeCount > 0 ? {
      energy: totalEnergy / vibeCount,
      valence: totalValence / vibeCount,
      danceability: totalDanceability / vibeCount,
      tempo: totalTempo / vibeCount
    } : null;

    return NextResponse.json({ 
      success: true, 
      topArtists, 
      topTracks,
      years: yearCounts,
      vibe: {
        averages,
        points: vibePoints
      }
      // Removed: trend object
    }, { status: 200 });

  } catch (err) {
    console.error("Insights Error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}