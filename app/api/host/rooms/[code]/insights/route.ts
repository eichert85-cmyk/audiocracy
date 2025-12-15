import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createSupabaseServerClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get Room ID
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", code)
      .eq("owner_id", user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    // 2. Fetch Artists (RESTORED)
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

    // 3. Fetch Tracks (RESTORED ALL COLUMNS)
    // Included track_name, artist_name, image_url for the UI
    const { data: history, error: historyError } = await supabase
      .from("guest_top_tracks")
      .select("track_name, artist_name, image_url, valence, energy, danceability, tempo, release_year, track_id, guest_spotify_id")
      .eq("room_id", room.id);

    if (historyError) {
      console.error("Error fetching history:", historyError);
    }

    const totalHistoryTracks = history?.length || 0;

    // --- Aggregations ---
    
    // A. Top Tracks Logic
    const trackCounts: Record<string, { count: number, name: string, artist: string, image: string | null, guests: Set<string> }> = {};
    
    // B. Vibe Logic
    let totalEnergy = 0;
    let totalValence = 0;
    let totalDanceability = 0;
    let totalTempo = 0;
    let vibeCount = 0;
    
    // C. Decade Logic
    const decadeCounts: Record<string, number> = {};

    history?.forEach(track => {
        // Track Popularity
        const key = track.track_id; 
        if (!trackCounts[key]) {
            trackCounts[key] = {
                count: 0,
                name: track.track_name,
                artist: track.artist_name,
                image: track.image_url,
                guests: new Set()
            };
        }
        if (!trackCounts[key].guests.has(track.guest_spotify_id)) {
            trackCounts[key].guests.add(track.guest_spotify_id);
            trackCounts[key].count += 1;
        }

        // Vibe Stats
        if (typeof track.energy === 'number') {
            totalEnergy += track.energy || 0;
            totalValence += track.valence || 0;
            totalDanceability += track.danceability || 0;
            totalTempo += track.tempo || 0;
            vibeCount++;
        }

        // Decades
        if (track.release_year) {
            const decade = Math.floor(track.release_year / 10) * 10;
            const decKey = `${decade}s`;
            decadeCounts[decKey] = (decadeCounts[decKey] || 0) + 1;
        }
    });

    const topTracks = Object.values(trackCounts)
        .map(t => ({
            name: t.name,
            artist: t.artist,
            image: t.image,
            count: t.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const averages = vibeCount > 0 ? {
        energy: totalEnergy / vibeCount,
        valence: totalValence / vibeCount,
        danceability: totalDanceability / vibeCount,
        tempo: totalTempo / vibeCount
    } : null;

    // D. Return JSON in the structure RoomInsights.tsx expects
    return NextResponse.json({
      success: true,
      topArtists, 
      topTracks,  
      years: decadeCounts,
      vibe: {
        averages,
        points: [] 
      }
    });

  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}